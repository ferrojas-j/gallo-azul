const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// The broken sequence is: +'(filterOrder==='checkin'?
// Need to change to:      +(filterOrder==='checkin'?
// The ' before ( is the bug

const broken=">'+'(filterOrder==='checkin'?";
const fixed=">'+(filterOrder==='checkin'?";
console.log('broken found:',h.includes(broken));
h=h.replace(broken,fixed);

// But we also may need to fix the closing ')' at end of ternary
// which may be dangling. Let's check what comes after the ternary:
const idx=h.indexOf("+(filterOrder==='checkin'?");
if(idx>-1){
  // Show 400 chars from there to check the end
  process.stdout.write(h.slice(idx,idx+450));
  process.stdout.write('\n');
}

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('\nDone. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
