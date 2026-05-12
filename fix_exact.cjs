const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// The broken sequence: +'">'' then +(filterOrder
// i.e. the closing of tr class string, then an extra ' that opens a new string literal
// Fix: remove the extra ' before +(filterOrder in renderTable context

const broken="+'\">\u003e''+(filterOrder==='checkin'?";
const fixed="+'\">\u003e'+(filterOrder==='checkin'?";
console.log('broken found:',h.includes(broken));

if(h.includes(broken)){
  h=h.replace(broken,fixed);
  fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
  fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
  console.log('Fixed! Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
  
  // Verify: show context
  const idx=h.indexOf("row-test-entry");
  process.stdout.write('\nVERIFY:\n');
  process.stdout.write(h.slice(idx+15,idx+120));
  process.stdout.write('\n');
} else {
  // Try: after the marker, there's ' immediately
  const marker="isTest?'row-test-entry':'')+'\">\u003e";
  const idx=h.indexOf(marker);
  console.log('marker idx:',idx);
  if(idx>-1){
    const after=h.slice(idx+marker.length, idx+marker.length+10);
    process.stdout.write('chars after marker: ');
    process.stdout.write(after);
    process.stdout.write('\n');
    console.log('hex:', Buffer.from(after).toString('hex'));
  }
}
