const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Swap the two first td cells in renderTable
const old="+'<td>'+fmtDate(r.booking_date)+'</td>'\n+'<td style=\"color:#94a3b8\">'+fmtDate(r.arrival_date)+'</td>'";
const nw="+'<td>'+fmtDate(r.arrival_date)+'</td>'\n+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>'";
console.log('found:',h.includes(old));
if(h.includes(old)) h=h.replace(old,nw);

// Also update the return statement that builds the row using the single-line format
// (the row might be fully minified into one line with no newlines)
const old2="+'<td>'+fmtDate(r.booking_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.arrival_date)+'</td>'";
const nw2="+'<td>'+fmtDate(r.arrival_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>'";
console.log('found single-line:',h.includes(old2));
if(h.includes(old2)) h=h.replace(old2,nw2);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);

// Verify order
const idx=h.indexOf("fmtDate(r.booking_date)");
const idx2=h.indexOf("fmtDate(r.arrival_date)");
console.log('arrival_date pos:',idx2,'booking_date pos:',idx,'arrival first:',idx2<idx);
