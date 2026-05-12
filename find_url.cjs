const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find the fetch URL line and show context
const idx=h.indexOf('financial_reservations?select=');
console.log('URL context:',JSON.stringify(h.slice(idx-10,idx+300)));
