const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');
const lines=h.split('\n');
// Find line with the garbage (contains both the new and old fmtDate)
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('const fmtDate=function') && lines[i].includes('parseInt(dd)')){
    console.log('Found bad line',i+1,':',lines[i].slice(0,80)+'...');
    // Keep only up to the first }; after the correct function
    const goodEnd=lines[i].indexOf('};')+2;
    lines[i]=lines[i].slice(0,goodEnd);
    console.log('Fixed to:',lines[i]);
    break;
  }
}
h=lines.join('\n');

// Verify
const si=h.indexOf('<script>'),se=h.lastIndexOf('</script>');
const btCount=(h.slice(si,se).match(/`/g)||[]).length;
console.log('Remaining backticks:',btCount);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
