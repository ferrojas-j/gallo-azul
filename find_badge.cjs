const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find hv-badge CSS context
const idx=h.indexOf('.hv-badge');
console.log('hv-badge CSS:',JSON.stringify(h.slice(idx,idx+150)));
