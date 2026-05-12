const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// 1. Add CSS for test-badge
const testCSS=`
.test-badge{display:inline-flex;align-items:center;gap:3px;margin-left:6px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:800;vertical-align:middle;letter-spacing:0.5px}
tr.row-test-entry{background:#fffbeb!important}
tr.row-test-entry:hover{background:#fef9c3!important}
`;
h=h.replace('</style>',testCSS+'</style>');
console.log('CSS added');

// 2. Add isTest variable after "var isHV=..."
const insertAfter="var hasCI=r.arrival_date&&r.arrival_date<=TODAY;var ciTag=r.arrival_date?(hasCI?'<span class=\"ci-done\">✓ Ingresó</span>':'<span class=\"ci-upcoming\">⏳ Próximo</span>'):'';";
const testVar="var isTest=r.guest_name&&/test|prueba/i.test(r.guest_name);";
console.log('ciTag found:',h.includes(insertAfter));
h=h.replace(insertAfter, insertAfter+testVar);
console.log('isTest var added');

// 3. Add row class: replace 'row-high-value' only with dynamic combo
h=h.replace(
  "'<tr class=\"'+(isHV?'row-high-value':'')+'\">'+",
  "'<tr class=\"'+(isHV?'row-high-value ':'')+(isTest?'row-test-entry':'')+'\">'+'"
);
console.log('row class updated:',h.includes("row-test-entry"));

// 4. Add TEST badge next to guest name in the td
//    Current: +(r.guest_name||'-')+
const guestCell="+(r.guest_name||'-')+'</td>'";
const guestCellNew="+(r.guest_name||'-')+(isTest?' <span class=\"test-badge\">⚠ TEST</span>':'')+'</td>'";
console.log('guest cell found:',h.includes(guestCell));
h=h.replace(guestCell,guestCellNew);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
