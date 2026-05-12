const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find the exact broken section using a unique anchor
const idx=h.indexOf("row-test-entry':'')+");
if(idx>-1){
  const chunk=h.slice(idx,idx+80);
  process.stdout.write('RAW CHUNK: ');
  process.stdout.write(chunk);
  process.stdout.write('\n');
  console.log('HEX:', Buffer.from(chunk).toString('hex').slice(0,100));
}
