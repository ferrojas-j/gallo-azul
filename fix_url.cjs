const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find and fix the fetch URL - add back date range and status filter for full 591 count
const oldUrl="const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount&order=booking_date.desc&limit=2000';";
const newUrl="const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount'+\n    '&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)'+\n    '&booking_date=gte.2024-01-01&booking_date=lte.2027-12-31'+\n    '&order=booking_date.desc&limit=2000';";

console.log('URL match:',h.includes(oldUrl));
if(h.includes(oldUrl)) h=h.replace(oldUrl,newUrl);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
