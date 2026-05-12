const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// The broken part: +'">'\n+'(filterOrder  →  must be: +'">'\n+(filterOrder
// In the file (HTML entities), '>' is stored as >
// Let's find and fix the exact broken string

const broken="+'\">\u003e'+'(filterOrder";
const fixed="+'\">\u003e'+(filterOrder";
console.log('broken found:',h.includes(broken));
if(h.includes(broken)){
  h=h.replace(broken,fixed);
  console.log('FIXED');
} else {
  // Try without entity
  const broken2="+'\">\">'+\"'(filterOrder";
  console.log('Try2:',h.includes(broken2));
  
  // Use indexOf to see context
  const idx=h.indexOf("row-test-entry");
  process.stdout.write('CONTEXT:\n');
  process.stdout.write(h.slice(idx,idx+80));
  process.stdout.write('\n');
}

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
