const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Fix: insert missing closing quote for '"> string before the filterOrder ternary
// Current broken: '">+(filterOrder==='checkin'?'<td>'
// Correct:        '">'+  (filterOrder==='checkin'?'<td>'
const broken="'\">+(filterOrder==='checkin'?'<td>'";
const fixed="'\">'+  (filterOrder==='checkin'?'<td>'";
console.log('found:',h.includes(broken));
h=h.replace(broken,fixed);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
