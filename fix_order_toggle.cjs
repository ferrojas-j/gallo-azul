const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// ─────────────────────────────────────────────
// 1. Restore default sort to booking_date.desc
// ─────────────────────────────────────────────
h=h.replace("df+'&order=arrival_date.desc&limit=2000';;",
            "df+'&order='+(filterOrder==='checkin'?'arrival_date':'booking_date')+'.desc&limit=2000';;");
console.log('sort dynamic:',h.includes("filterOrder==='checkin'?'arrival_date'"));

// ─────────────────────────────────────────────
// 2. Add filterOrder variable
// ─────────────────────────────────────────────
h=h.replace(
  "let allData=[], filterYear='2026', filterMonth='all', filterChannel='all';",
  "let allData=[], filterYear='2026', filterMonth='all', filterChannel='all', filterOrder='booking_date';"
);
console.log('filterOrder var:',h.includes("filterOrder='booking_date'"));

// ─────────────────────────────────────────────
// 3. Add ORDEN filter row HTML (after canal pills row)
// ─────────────────────────────────────────────
const afterCanal='</div>\n    </div>';   // closes hotel-filter-bar
const ordenRow=`
      <div class="hotel-filter-row">
        <span class="hotel-filter-label" style="color:#f59e0b">ORDEN</span>
        <div class="hotel-filter-pills-cell" id="hotel-order-pills">
          <button class="order-pill active" data-order="booking_date" style="background:#4f46e5;color:#fff;border-color:#4f46e5">Por fecha de reserva</button>
          <button class="order-pill" data-order="checkin">Por check-in</button>
        </div>
      </div>`;

// Insert before the closing of hotel-filter-bar
const filterBarClose='</div>\n    </div>';
const filterBarEnd=h.indexOf(filterBarClose, h.indexOf('hotel-channel-pills'));
if(filterBarEnd>-1){
  h=h.slice(0,filterBarEnd)+ordenRow+h.slice(filterBarEnd);
  console.log('ORDEN row inserted at:',filterBarEnd);
} else {
  console.log('ERROR: hotel-filter-bar closing not found');
}

// ─────────────────────────────────────────────
// 4. Update applyFilters: filter month by the right field
// ─────────────────────────────────────────────
h=h.replace(
  "if(filterMonth!=='all')rows=rows.filter(function(r){return r.arrival_date&&r.arrival_date.slice(5,7)===filterMonth;});",
  "var dateField=filterOrder==='checkin'?'arrival_date':'booking_date';\n  if(filterMonth!=='all')rows=rows.filter(function(r){return r[dateField]&&r[dateField].slice(5,7)===filterMonth;});"
);
console.log('applyFilters updated:',h.includes("filterOrder==='checkin'?'arrival_date':'booking_date'"));

// ─────────────────────────────────────────────
// 5. Update renderTable to dynamically swap columns
// ─────────────────────────────────────────────
// Replace the static td order with dynamic logic
h=h.replace(
  "+'<td>'+fmtDate(r.arrival_date)+'</td>'\n+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>'",
  "+(filterOrder==='checkin'?'<td>'+fmtDate(r.arrival_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>':'<td>'+fmtDate(r.booking_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.arrival_date)+'</td>')"
);
console.log('renderTable td dynamic:',h.includes("filterOrder==='checkin'?'<td>'"));

// ─────────────────────────────────────────────
// 6. Add ORDEN click handlers & dynamic header update
// ─────────────────────────────────────────────
const orderJS=`
// ---- ORDEN SWITCHING ----
function updateTableHeaders(){
  var ths=document.querySelectorAll('table thead th');
  if(filterOrder==='checkin'){
    ths[0].textContent='Check-in';
    ths[1].textContent='Fecha de reserva';
  } else {
    ths[0].textContent='Fecha de reserva';
    ths[1].textContent='Check-in';
  }
}
document.querySelectorAll('.order-pill').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('.order-pill').forEach(function(x){x.classList.remove('active');x.style.cssText='';});
    b.classList.add('active');
    b.style.cssText='background:#4f46e5;color:#fff;border-color:#4f46e5';
    filterOrder=b.dataset.order;
    filterMonth='all';
    document.querySelectorAll('.month-pill').forEach(function(x){x.classList.remove('active');x.style.cssText='';});
    document.querySelector('.month-pill[data-month="all"]').classList.add('active');
    document.querySelector('.month-pill[data-month="all"]').style.cssText='background:#4f46e5;color:#fff;border-color:#4f46e5';
    updateTableHeaders();
    loadHotelData();
  });
});
`;

// Insert before loadHotelData(); call
const lastLoad=h.lastIndexOf('loadHotelData();');
h=h.slice(0,lastLoad)+orderJS+h.slice(lastLoad);
console.log('order JS inserted');

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
