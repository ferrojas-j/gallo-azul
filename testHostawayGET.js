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
    { amount: 240 },
    { amount: 240, name: "Test" },
    { amount: 240, title: "Test" },
    { amount: 240, description: "Test" },
    { amount: 240, title: "Test", chargeType: "payment" },
    { amount: 240, title: "Test", type: "charge" },
    { amount: 240, title: "Test", paymentMethod: "cash" },
    { amount: 240, title: "Test", paymentMethod: "creditCard" },
    { amount: 240, title: "Test", paymentMethod: "card" },
    { amount: 240, name: "Test", isPaid: 1 },
    { amount: 240, title: "Test", isPaid: 1 },
    { amount: 240, title: "Test", paymentMethod: "creditCard", isPaid: 1 },
    { amount: 240, title: "Test", paymentMethod: "creditCard", isPaid: 1, date: "2026-05-10" },
    { amount: 240, title: "Test", paymentMethod: "creditCard", isPaid: 1, date: "2026-05-10", type: "payment" },
    { amount: 240, title: "Test", paymentMethod: "creditCard", isPaid: 1, date: "2026-05-10", type: "charge" },
  ];

  for (const payload of payloads) {
    const resResponse = await fetch(`https://api.hostaway.com/v1/guestPayments/charges/${reservationId}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Hostaway-Account-Id': HOSTAWAY_ACCOUNT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    const resData = await resResponse.text();
    console.log(JSON.stringify(payload), "=>", resResponse.status, resData);
  }
}

run();
