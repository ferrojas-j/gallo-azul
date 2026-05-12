const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// ─────────────────────────────────────────────
// 1. Add CSS for ci-done and ci-upcoming badges
// ─────────────────────────────────────────────
const newCSS=`
.ci-done{display:inline-flex;align-items:center;gap:3px;margin-left:6px;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;vertical-align:middle;white-space:nowrap}
.ci-upcoming{display:inline-flex;align-items:center;gap:3px;margin-left:6px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;vertical-align:middle;white-space:nowrap}
`;
h=h.replace('</style>',newCSS+'</style>');
console.log('CSS added');

// ─────────────────────────────────────────────
// 2. Add hasCI + ciTag variables in renderTable
//    Insert right after: var isHV=amt>2000;
// ─────────────────────────────────────────────
const insertAfterVar="var isHV=amt>2000;";
const ciVars="var hasCI=r.arrival_date&&r.arrival_date<=TODAY;var ciTag=r.arrival_date?(hasCI?'<span class=\"ci-done\">✓ Ingresó</span>':'<span class=\"ci-upcoming\">⏳ Próximo</span>'):'';";
console.log('isHV found:',h.includes(insertAfterVar));
h=h.replace(insertAfterVar, insertAfterVar+ciVars);
console.log('ciTag vars added');

// ─────────────────────────────────────────────
// 3. Inject ciTag into the arrival_date cells
//    Case A (checkin mode): '<td>'+fmtDate(r.arrival_date)+'</td>'
//    Case B (booking mode): '<td style="color:#94a3b8">'+fmtDate(r.arrival_date)+'</td>'
// ─────────────────────────────────────────────

// Case A – arrival_date first column (checkin order)
// Look for the exact string in the dynamic ternary
const caseA="'<td>'+fmtDate(r.arrival_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>'";
const caseAnew="'<td>'+fmtDate(r.arrival_date)+ciTag+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>'";
console.log('Case A found:',h.includes(caseA));
if(h.includes(caseA)) h=h.replace(caseA,caseAnew);

// Case B – arrival_date second column (booking order)
const caseB="'<td>'+fmtDate(r.booking_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.arrival_date)+'</td>'";
const caseBnew="'<td>'+fmtDate(r.booking_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.arrival_date)+ciTag+'</td>'";
console.log('Case B found:',h.includes(caseB));
if(h.includes(caseB)) h=h.replace(caseB,caseBnew);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
