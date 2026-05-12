const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find the hotel-filter-pills-cell CSS
const pIdx=h.indexOf('.hotel-filter-pills-cell');
console.log('pills-cell CSS:',h.slice(pIdx,pIdx+120));

// Add order-pill CSS right after hotel-filter-pills-cell
const insertAfter='.hotel-filter-pills-cell{display:flex;align-items:center;flex-wrap:wrap;gap:6px;flex:1}';
const orderPillCSS='\n.order-pill{padding:5px 14px;border:1.5px solid #cbd5e1;border-radius:20px;background:#fff;color:#475569;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .2s}\n.order-pill.active,.order-pill:hover{background:#4f46e5;color:#fff;border-color:#4f46e5}\n#hotel-order-pills{display:flex!important;flex-direction:row!important;flex-wrap:wrap;gap:8px;align-items:center}\n.hotel-filter-row{display:flex;align-items:center;gap:16px;padding:8px 20px;border-bottom:1px solid #f1f5f9;min-height:44px}';

console.log('pills-cell CSS found:',h.includes(insertAfter));
if(h.includes(insertAfter)){
  h=h.replace(insertAfter, insertAfter+orderPillCSS);
  console.log('CSS added after hotel-filter-pills-cell');
} else {
  // fallback: insert before </style>
  h=h.replace('</style>', orderPillCSS+'\n</style>');
  console.log('CSS added before </style>');
}

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
