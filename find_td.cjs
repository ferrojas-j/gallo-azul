const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find the td cells section
const marker="fmtDate(r.arrival_date)";
const idx=h.indexOf(marker);
console.log('context:',JSON.stringify(h.slice(idx-5,idx+120)));
