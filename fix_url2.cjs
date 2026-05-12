const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find the exact URL section using slice
const urlStart=h.indexOf("const url=SB+'/rest/v1/financial_reservations");
const urlEnd=h.indexOf("'&order=booking_date.desc&limit=2000';",urlStart)+37;
console.log('URL range:',urlStart,urlEnd);
console.log('Old URL:',h.slice(urlStart,urlEnd));

const newUrlBlock=
  "var y=filterYear==='all'?null:filterYear;\n    var df=y?('&arrival_date=gte.'+y+'-01-01&arrival_date=lte.'+y+'-12-31'):'&arrival_date=gte.2020-01-01&arrival_date=lte.2030-12-31';\n    const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount'+\n      '&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)'+\n      df+'&order=booking_date.desc&limit=2000';";

h=h.slice(0,urlStart)+newUrlBlock+h.slice(urlEnd);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);

// Verify
console.log('Has arrival_date filter:',h.includes('arrival_date=gte'));
console.log('Has dynamic year:',h.includes("filterYear==='all'"));
