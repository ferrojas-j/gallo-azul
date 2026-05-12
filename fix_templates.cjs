const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find fmtDate function start
const funcStart=h.indexOf('const fmtDate=');
// Find the CLOSING }; of the function by tracking brace depth
let i=h.indexOf('{',funcStart); // opening brace of function body
let depth=1;
i++;
while(i<h.length && depth>0){
  if(h[i]==='{') depth++;
  else if(h[i]==='}') depth--;
  i++;
}
// i is now one past the closing }
// check if next char is ;
if(h[i]===';') i++;
const funcEnd=i;
console.log('Function range:',funcStart,funcEnd);
console.log('Old func:',h.slice(funcStart,funcEnd));

const newFunc="const fmtDate=function(d){if(!d)return'-';var pts=d.split('-');var ms=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return parseInt(pts[2])+' '+ms[parseInt(pts[1])-1]+' '+pts[0];};";
h=h.slice(0,funcStart)+newFunc+h.slice(funcEnd);

// Verify
const si=h.indexOf('<script>'),se=h.lastIndexOf('</script>');
const btCount=(h.slice(si,se).match(/`/g)||[]).length;
console.log('Remaining backticks:',btCount);
if(btCount===0) console.log('ALL CLEAN');

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
