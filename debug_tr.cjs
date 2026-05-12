const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find and show the broken tr class section
const idx=h.indexOf("row-high-value ");
console.log('context:',h.slice(idx-20,idx+200));
