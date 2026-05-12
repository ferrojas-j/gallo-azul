const fs=require('fs');
let html=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Replace complex pagination loop with simple single fetch
const oldFetch=`  try{
    let offset=0; const PAGE=1000;
    while(true){
      const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)&booking_date=gte.2025-01-01&booking_date=lte.2026-12-31&order=booking_date.desc&limit='+PAGE+'&offset='+offset;
      const r=await fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Prefer':'count=none'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const batch=await r.json();
      if(!Array.isArray(batch)||batch.length===0)break;
      allData=allData.concat(batch);
      if(batch.length<PAGE)break;
      offset+=PAGE;
    }`;

const newFetch=`  try{
    const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount&order=booking_date.desc&limit=2000';
    const r=await fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Prefer':'count=none'}});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const batch=await r.json();
    allData=Array.isArray(batch)?batch:[];`;

const match=html.includes(oldFetch);
console.log('Match:',match);
if(match) html=html.replace(oldFetch,newFetch);

fs.writeFileSync('public/finanzas_corporativas/index.html',html,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
