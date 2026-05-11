const HOSTAWAY_ACCOUNT_ID = '52921';
const HOSTAWAY_API_KEY = 'd18081d891cedbf0f66fe083a3c4cd030705ecaf85eb92b8da79e39abc03e65c';

async function run() {
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

  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token;
  
  const reservationId = 59076234;

  const payloads = [
    { title: "Test", amount: 240, type: "charge", currency: "USD", paymentMethod: "cash", status: "paid" },
    { title: "Test", amount: 240, type: "charge", currency: "USD", paymentMethod: "cash", status: "paid", isManual: 1 },
    { title: "Test", amount: 240, type: "charge", currency: "USD", paymentMethod: "cash", status: "paid", date: "2026-05-10" },
    { name: "Test", amount: 240, type: "charge", currency: "USD", paymentMethod: "cash", status: "paid" },
  ];

  for (const payload of payloads) {
    const resResponse = await fetch(`https://api.hostaway.com/v1/guestPayments/charges`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Hostaway-Account-Id': HOSTAWAY_ACCOUNT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({...payload, reservationId: reservationId}),
    });

    const resData = await resResponse.text();
    console.log("POST /charges without id:", resResponse.status, resData);
  }
}

run();
