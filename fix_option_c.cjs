const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// 1. Fix the fetch URL to use arrival_date for range, keep booking_date for ordering/display
const oldUrl="const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount'\n    +'&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)'\n    +'&booking_date=gte.2024-01-01&booking_date=lte.2027-12-31'\n    +'&order=booking_date.desc&limit=2000';";
const newUrl="var y=filterYear==='all'?null:filterYear;\n    var dateFilter=y?('&arrival_date=gte.'+y+'-01-01&arrival_date=lte.'+y+'-12-31'):'&arrival_date=gte.2020-01-01&arrival_date=lte.2030-12-31';\n    const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount'\n      +'&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)'\n      +dateFilter\n      +'&order=booking_date.desc&limit=2000';";

console.log('URL match:',h.includes(oldUrl));
if(h.includes(oldUrl)) h=h.replace(oldUrl,newUrl);

// 2. Fix applyFilters: remove year filter (it's now server-side), keep month on arrival_date, keep channel
const oldFilter="function applyFilters(){\n  let rows=allData;\n  if(filterYear!=='all')rows=rows.filter(r=>r.booking_date&&r.booking_date.slice(0,4)===filterYear);\n  if(filterMonth!=='all')rows=rows.filter(r=>r.booking_date&&r.booking_date.slice(5,7)===filterMonth);\n  if(filterChannel!=='all')rows=rows.filter(r=>r.source_name===filterChannel);\n  renderTable(rows);\n}";
const newFilter="function applyFilters(){\n  var rows=allData;\n  if(filterMonth!=='all')rows=rows.filter(function(r){return r.arrival_date&&r.arrival_date.slice(5,7)===filterMonth;});\n  if(filterChannel!=='all')rows=rows.filter(function(r){return r.source_name===filterChannel;});\n  renderTable(rows);\n}";
console.log('applyFilters match:',h.includes(oldFilter));
if(h.includes(oldFilter)) h=h.replace(oldFilter,newFilter);

// 3. Year pill click should reload data (re-fetch with new year)
const oldYearEvt="document.querySelectorAll('.year-pill').forEach(b=>b.addEventListener('click',()=>{\n  document.querySelectorAll('.year-pill').forEach(x=>x.classList.remove('active'));\n  b.classList.add('active');filterYear=b.dataset.year;applyFilters();\n}));";
const newYearEvt="document.querySelectorAll('.year-pill').forEach(function(b){b.addEventListener('click',function(){\n  document.querySelectorAll('.year-pill').forEach(function(x){x.classList.remove('active');});\n  b.classList.add('active');filterYear=b.dataset.year;filterMonth='all';\n  document.querySelectorAll('.month-pill').forEach(function(x){x.classList.remove('active');});\n  document.querySelector('.month-pill[data-month=\"all\"]').classList.add('active');\n  loadHotelData();\n});});";
console.log('yearEvt match:',h.includes(oldYearEvt));
if(h.includes(oldYearEvt)) h=h.replace(oldYearEvt,newYearEvt);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
