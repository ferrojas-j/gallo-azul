const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

const marker="fmtDate(r.arrival_date)";
const idx=h.indexOf(marker);
// Print raw (not JSON.stringify)
process.stdout.write('RAW: ');
process.stdout.write(h.slice(idx-5,idx+120));
process.stdout.write('\n');

// Now replace: the actual text in file
const oldTds="'<td>'+fmtDate(r.arrival_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>'";
console.log('\nold found:',h.includes(oldTds));

const newTds="(filterOrder==='checkin'?'<td>'+fmtDate(r.arrival_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'</td>':'<td>'+fmtDate(r.booking_date)+'</td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.arrival_date)+'</td>')";
if(h.includes(oldTds)){
  h=h.replace(oldTds,newTds);
  fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
  fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
  console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
} else {
  // Try with entity-encoded version
  const oldTds2="'<td>'+fmtDate(r.arrival_date)+'<\/td>'+'<td style=\"color:#94a3b8\">'+fmtDate(r.booking_date)+'<\/td>'";
  console.log('entity version found:',h.includes(oldTds2));
}
