const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Replace hv-badge CSS - amber→red alert style
const idx=h.indexOf('.hv-badge{');
const end=h.indexOf('}',idx)+1;
const oldCSS=h.slice(idx,end);
console.log('Old CSS:',oldCSS);
const newCSS='.hv-badge{display:inline-flex;align-items:center;font-size:13px;font-weight:800;color:#b91c1c;background:#fef2f2;border-radius:4px;padding:1px 5px;border:1px solid #fecaca;margin-left:4px;cursor:help}';
h=h.slice(0,idx)+newCSS+h.slice(end);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done.');
