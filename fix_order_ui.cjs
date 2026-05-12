const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// 1. Fix HTML table headers: default is Fecha de reserva first
h=h.replace(
  '<th style="min-width:110px">Check-in</th>\n            <th style="min-width:100px">Fecha de reserva</th>',
  '<th style="min-width:110px">Fecha de reserva</th>\n            <th style="min-width:100px">Check-in</th>'
);
console.log('th swap:',h.includes('<th style="min-width:110px">Fecha de reserva</th>'));

// 2. Call updateTableHeaders() after applyFilters() inside loadHotelData
h=h.replace(
  'buildChannelPills();\n    applyFilters();',
  'buildChannelPills();\n    applyFilters();\n    updateTableHeaders();'
);
console.log('updateTableHeaders call added');

// 3. Fix ORDEN pills container: add flex display to hotel-filter-pills-cell for order pills
// The container div with id="hotel-order-pills" needs display:flex and gap
h=h.replace(
  '<div class="hotel-filter-pills-cell" id="hotel-order-pills">',
  '<div class="hotel-filter-pills-cell" id="hotel-order-pills" style="display:flex;flex-direction:row;gap:6px;flex-wrap:wrap">'
);
console.log('pills flex fix:',h.includes('hotel-order-pills" style="display:flex'));

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
