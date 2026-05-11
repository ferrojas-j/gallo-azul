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

      // Only confirmed statuses. Hostaway uses: new, reserved, confirmed, ownerStay, approved, pending.
      // Exclude: inquiry, cancelled, declined, expired, noshow.
      const CONFIRMED_STATUSES = new Set(['new', 'reserved', 'confirmed', 'ownerStay', 'modified', 'approved', 'pending']);

      // Log all statuses coming from API for debugging
      console.log('Raw Hostaway statuses:', rawResults.map((r: any) => `${r.id}:${r.guestName}:${r.status}`).join(', '));

      const uniqueMap = new Map();
      // Sort by id desc so the most recent reservation for the same room/date wins
      const sortedResults = [...rawResults].sort((a: any, b: any) => b.id - a.id);

      sortedResults.forEach((r: any) => {
        // Strict whitelist: skip anything not in confirmed statuses
        if (!CONFIRMED_STATUSES.has(r.status)) {
          console.log(`Skipping ${r.guestName} (id:${r.id}) — status: ${r.status}`);
          return;
        }
        // Deduplicate by reservation ID (unique per booking)
        // Use composite key only as fallback uniqueness within the same room+date
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
          const sourceName = (r.sourceName || r.channelName || "").toLowerCase();
          const channelId = r.channelId;
          
          let isPaid = pStatus === 'paid' || r.isPaid === true || r.isPaid === 1 || (paidAmount >= (totalAmount - 0.01) && totalAmount > 0) || noteText.includes('PAID');
          // Just use Hostaway's native fields and our custom 'PAID' note to determine status.
          // We no longer force OTAs to be paid, allowing manual overrides and accurate mirroring.
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
            isPaid: isPaid,
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

      console.log(`Returning ${uniqueMap.size} confirmed reservations out of ${rawResults.length} total`);

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

      const resUrl = `https://api.hostaway.com/v1/reservations?departureStartDate=${arrivalDate}&limit=200`;
      const resResponse = await fetch(resUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const resData = await resResponse.json();
      
      const activeStatuses = ['new', 'modified', 'approved', 'pending', 'reserved', 'confirmed', 'ownerStay'];
      const overlapping = (resData.result || []).filter((r: any) => {
        if (!activeStatuses.includes(r.status)) return false;
        return (r.arrivalDate < departureDate) && (r.departureDate > arrivalDate);
      });
      const occupiedListingIds = new Set(overlapping.map((r: any) => r.listingMapId));

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
      
      if (typeof isPaid === 'boolean') {
        const getRes = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getRes.ok) {
          const resData = await getRes.json();
          let currentNote = resData?.result?.hostNote || "";
          
          if (isPaid) {
            if (!currentNote.includes("PAID")) {
              hostNoteToUpdate = currentNote ? `${currentNote} | PAID` : "PAID";
            }
            paidAmountToUpdate = resData?.result?.totalPrice || resData?.result?.totalAmount || 0;
            paymentStatusToUpdate = 'paid';
          } else {
            if (currentNote.includes("PAID")) {
              currentNote = currentNote.replace(/\s*\|\s*PAID/g, "").replace(/PAID/g, "").trim();
              hostNoteToUpdate = currentNote;
            }
            paidAmountToUpdate = 0;
            paymentStatusToUpdate = 'unpaid';
          }
        }
      }

      const updatePayload: any = {};
      if (status) updatePayload.status = status;
      if (typeof noShow === 'boolean') updatePayload.noShow = noShow ? 1 : 0;
      if (typeof isPaid === 'boolean') updatePayload.isPaid = isPaid ? 1 : 0;
      if (hostNoteToUpdate !== undefined) updatePayload.hostNote = hostNoteToUpdate;
      if (paidAmountToUpdate !== undefined) updatePayload.paidAmount = paidAmountToUpdate;
      if (paymentStatusToUpdate !== undefined) updatePayload.paymentStatus = paymentStatusToUpdate;

      if (status === 'cancelled') {
        // Fetch reservation first to get listing and dates for unblocking
        const getRes = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let listingMapId, arrivalDate, unblockEndDate;
        if (getRes.ok) {
          const resData = await getRes.json();
          if (resData && resData.result) {
             listingMapId = resData.result.listingMapId;
             arrivalDate = resData.result.arrivalDate;
             if (resData.result.departureDate) {
               const d = new Date(resData.result.departureDate);
               d.setDate(d.getDate() - 1);
               unblockEndDate = d.toISOString().split('T')[0];
             }
          }
        }

        const cancelResponse = await fetch(`https://api.hostaway.com/v1/reservations/${reservationId}/statuses/cancelled`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'X-Hostaway-Account-Id': HOSTAWAY_ACCOUNT_ID,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cancelledBy: params.cancelledBy || 'host' }),
        });
        
        if (!cancelResponse.ok) {
          const err = await cancelResponse.text();
          throw new Error(`Hostaway cancel error: ${err}`);
        }

        // Explicitly unblock the calendar dates
        if (listingMapId && arrivalDate && unblockEndDate) {
           const days = [];
           let curr = new Date(arrivalDate);
           const end = new Date(unblockEndDate);
           while (curr <= end) {
             days.push({
               date: curr.toISOString().split('T')[0],
               status: 'available'
             });
             curr.setDate(curr.getDate() + 1);
           }
           
           await fetch(`https://api.hostaway.com/v1/listings/${listingMapId}/calendar`, {
             method: 'PUT',
             headers: { 
               'Authorization': `Bearer ${token}`,
               'Cache-Control': 'no-cache',
               'Content-Type': 'application/json' 
             },
             body: JSON.stringify({ days })
           });
        }

        const cancelData = await cancelResponse.json();
        return new Response(JSON.stringify(cancelData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        type: 'charge',
        status: 'paid',
        scheduledDate: `${todayDate} 12:00:00`,
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

  } catch (error: any) {
    console.error("PROXY ERROR STACK:", error.stack || error.message || error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
