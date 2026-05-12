const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// Find the renderTable tbody.innerHTML line - the broken part is the tr class in renderTable
// Let's look for the specific pattern after isTest?'row-test-entry':'')+
const marker="isTest?'row-test-entry':'')+'\">";
const idx=h.indexOf(marker);
if(idx>-1){
  process.stdout.write('AFTER TR CLASS:\n');
  process.stdout.write(h.slice(idx+marker.length, idx+marker.length+80));
  process.stdout.write('\n');
} else {
  console.log('marker not found');
  // Try with entity
  const m2="isTest?'row-test-entry':'')+'\">\u003e";
  console.log('m2:',h.indexOf(m2));
}
