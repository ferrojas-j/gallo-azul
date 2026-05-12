const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// 1. Replace CSS for hv-badge: amber warning style
const oldBadgeCSS='.hv-badge{display:inline-block;margin-left:5px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800}';
const newBadgeCSS='.hv-badge{display:inline-block;margin-left:5px;background:#fef2f2;color:#b91c1c;padding:2px 7px;border-radius:4px;font-size:12px;font-weight:800;border:1px solid #fecaca}';
console.log('CSS found:',h.includes(oldBadgeCSS));
if(h.includes(oldBadgeCSS)) h=h.replace(oldBadgeCSS,newBadgeCSS);

// 2. Replace the badge text "TOP" with alert symbol
const oldBadge="' <span class=\"hv-badge\">TOP</span>'";
const newBadge="' <span class=\"hv-badge\" title=\"Revisar — monto alto\">⚠</span>'";
console.log('Badge found:',h.includes(oldBadge));
if(h.includes(oldBadge)) h=h.replace(oldBadge,newBadge);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
