import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const HOSTAWAY_ACCOUNT_ID = '52921';
    const HOSTAWAY_API_KEY = 'd18081d891cedbf0f66fe083a3c4cd030705ecaf85eb92b8da79e39abc03e65c';

    // Parse action and params from POST body
    let action = 'getCheckins';
    let params: any = {};
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        action = body.action || 'getCheckins';
        params = body.params || {};
      } catch (e) {
        console.log("No body found, defaulting to getCheckins");
      }
    }

    console.log(`Action: ${action}`);

    // 1. Get Token
    const tokenResponse = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: HOSTAWAY_ACCOUNT_ID,
        client_secret: HOSTAWAY_API_KEY,
        scope: 'general',
      }),
    });

    if (!tokenResponse.ok) throw new Error(`Failed to get Hostaway token: ${tokenResponse.status}`);
    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    // --- ACTION: getCheckins ---
    if (action === 'getCheckins') {
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(now);
      const nextMonthDate = new Date(now);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      const nextMonthStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(nextMonthDate);

      // IMPORTANT FIX: Fetch based on departureStartDate to include "In-House" guests (who arrived yesterday) 
      // AND upcoming checkins (who arrive today or tomorrow and depart later).
      const resUrl = `https://api.hostaway.com/v1/reservations?departureStartDate=${todayStr}&departureEndDate=${nextMonthStr}&limit=100`;
      const resResponse = await fetch(resUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      const resData = await resResponse.json();
      
      const listingsUrl = `https://api.hostaway.com/v1/listings?limit=100`;
      const listingsResponse = await fetch(listingsUrl, {
        headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      const listingsData = await listingsResponse.json();
      const listingsMap = Object.fromEntries(
        (listingsData.result || []).map((l: any) => [l.id, l.name])
      );

      const rawResults = resData.result || [];
      const uniqueMap = new Map();
      const sortedResults = [...rawResults].sort((a: any, b: any) => b.id - a.id);

      sortedResults.forEach((r: any) => {
        if (r.status === 'cancelled' || r.status === 'declined') return;
        const compositeKey = `${r.listingMapId}_${r.arrivalDate}`;
        if (!uniqueMap.has(compositeKey)) {
          const g = r.guestDetails || {};
          const phone = r.guestPhone || r.guestMobilePhone || g.phone || g.mobilePhone || r.phone || "";
          const email = r.guestEmail || g.email || r.email || "";
          const firstName = r.guestFirstName || g.firstName || "";
          const lastName = r.guestLastName || g.lastName || "";
          const city = r.guestCity || g.city || r.city || "";
          const countryRaw = r.guestCountry || g.country || r.country || "";
          const address = r.guestAddress || g.address || r.address || "";
          
          const totalAmount = parseFloat(r.totalAmount || r.totalPrice || r.price || 0);
          const paidAmount = parseFloat(r.paidAmount || 0);
          const pStatus = (r.paymentStatus || "").toLowerCase();
          const noteText = ((r.hostNote || "") + " " + (r.guestNote || "")).toUpperCase();
          const isPaid = pStatus === 'paid' || r.isPaid === true || r.isPaid === 1 || (paidAmount >= (totalAmount - 0.01) && totalAmount > 0) || noteText.includes('PAID');

          uniqueMap.set(compositeKey, {
            id: r.id,
            guestName: r.guestName || `${firstName} ${lastName}`.trim(),
            guestEmail: email,
            guestPhone: phone,
            guestCountry: countryRaw,
            guestCity: city,
            guestAddress: address,
            totalAmount: totalAmount,
            currency: r.currency || "USD",
            paymentStatus: isPaid ? 'Pagado' : 'Por Pagar',
            roomName: listingsMap[r.listingMapId] || `Habitación ${r.listingMapId}`,
            arrivalDate: r.arrivalDate,
            departureDate: r.departureDate,
            nights: r.nights,
            status: r.status,
            adults: r.adults,
            children: r.children,
            sourceName: r.sourceName || r.channelName || ""
          });
        }
      });
      return new Response(JSON.stringify(Array.from(uniqueMap.values())), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ACTION: getAvailableListings ---
    if (action === 'getAvailableListings') {
      const { arrivalDate, departureDate } = params;
      if (!arrivalDate || !departureDate) throw new Error("Missing arrivalDate or departureDate");

      const listingsResponse = await fetch('https://api.hostaway.com/v1/listings?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const listingsData = await listingsResponse.json();
      const allListings = listingsData.result || [];

      const resUrl = `https://api.hostaway.com/v1/reservations?arrivalStartDate=${arrivalDate}&arrivalEndDate=${departureDate}&limit=100`;
      const resResponse = await fetch(resUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const resData = await resResponse.json();
      const occupiedListingIds = new Set((resData.result || []).map((r: any) => r.listingMapId));

      const available = allListings.filter((l: any) => !occupiedListingIds.has(l.id))
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          basePrice: l.standardPrice || l.price || 0,
          currency: l.currency || "USD"
        }));

      return new Response(JSON.stringify(available), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ACTION: createReservation ---
    if (action === 'createReservation') {
      const payload = {
        ...params,
        channelId: 2000,
        totalPrice: params.totalPrice || params.totalAmount,
      };
      
      delete payload.totalAmount;
      delete payload.status;

      const resResponse = await fetch('https://api.hostaway.com/v1/reservations', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Hostaway-Account-Id': HOSTAWAY_ACCOUNT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!resResponse.ok) {
        const err = await resResponse.text();
        throw new Error(`Hostaway error: ${err}`);
      }
      const resData = await resResponse.json();
      return new Response(JSON.stringify(resData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ACTION: updateReservationStatus ---
    if (action === 'updateReservationStatus') {
      const { reservationId, status, noShow, isPaid } = params;
      if (!reservationId) throw new Error("Missing reservationId");

      let hostNoteToUpdate = undefined;
      let paidAmountToUpdate = undefined;
      let paymentStatusToUpdate = undefined;
      
      if (typeof isPaid === 'boolean' && isPaid) {
        // Fetch current reservation to append PAID to hostNote without overwriting and get total price
        const getRes = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getRes.ok) {
          const resData = await getRes.json();
          const currentNote = resData?.result?.hostNote || "";
          if (!currentNote.includes("PAID")) {
            hostNoteToUpdate = currentNote ? `${currentNote} | PAID` : "PAID";
          }
          paidAmountToUpdate = resData?.result?.totalPrice || resData?.result?.totalAmount || 0;
          paymentStatusToUpdate = 'paid';
        }
      }

      const updatePayload: any = {};
      if (status) updatePayload.status = status;
      if (typeof noShow === 'boolean') updatePayload.noShow = noShow ? 1 : 0;
      if (typeof isPaid === 'boolean') updatePayload.isPaid = isPaid ? 1 : 0;
      if (hostNoteToUpdate !== undefined) updatePayload.hostNote = hostNoteToUpdate;
      if (paidAmountToUpdate !== undefined) updatePayload.paidAmount = paidAmountToUpdate;
      if (paymentStatusToUpdate !== undefined) updatePayload.paymentStatus = paymentStatusToUpdate;

      const resResponse = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Hostaway-Account-Id': HOSTAWAY_ACCOUNT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload),
      });

      if (!resResponse.ok) {
        const err = await resResponse.text();
        throw new Error(`Hostaway error: ${err}`);
      }
      const resData = await resResponse.json();
      return new Response(JSON.stringify(resData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ACTION: addTransaction ---
    if (action === 'addTransaction') {
      const { reservationId, title, description, amount, currency, paymentMethod } = params;
      if (!reservationId) throw new Error("Missing reservationId");

      const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mazatlan' }).format(new Date());

      const payload = {
        title: title || 'Pago de reserva',
        description: description || 'Pago registrado en recepción',
        amount: parseFloat(amount),
        currency: currency || 'USD',
        paymentMethod: paymentMethod || 'cash',
        isPaid: 1,
        date: todayDate,
      };

      console.log('addTransaction payload:', JSON.stringify(payload));

      const resResponse = await fetch(`https://api.hostaway.com/v1/guestPayments/charges/${reservationId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Hostaway-Account-Id': HOSTAWAY_ACCOUNT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!resResponse.ok) {
        const err = await resResponse.text();
        throw new Error(`Hostaway error: ${err}`);
      }
      const resData = await resResponse.json();
      return new Response(JSON.stringify(resData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
