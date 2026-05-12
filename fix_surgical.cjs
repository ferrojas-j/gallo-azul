const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Try finding the marker without entity encoding
const marker="isTest?'row-test-entry':'')+'\">";
const idx=h.indexOf(marker);
console.log('marker idx:',idx);
if(idx>-1){
  const start=idx+marker.length;
  const after=h.slice(start, start+15);
  // Print hex to see exact bytes
  const buf=Buffer.from(after);
  console.log('hex:', buf.toString('hex'));
  console.log('chars:', JSON.stringify(after));
  
  // Now apply the fix: remove the ' that starts right after the marker
  if(h[start]==="'"){
    h=h.slice(0,start)+h.slice(start+1);
    fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
    fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
    console.log('Fixed! Removed extra quote at position',start,'Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
    
    // Verify the fix
    const vidx=h.indexOf("row-test-entry");
    process.stdout.write('\nVERIFY:\n');
    process.stdout.write(h.slice(vidx+15,vidx+100));
    process.stdout.write('\n');
  } else {
    console.log('char at position is not a quote, it is:',h[start]);
  }
}
