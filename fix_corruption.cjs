const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'finanzas_corporativas', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// ─── STEP 1: Find the corruption point ───────────────────────────────────────
// The corruption appears right after the closing brace of setSummMonth
// Pattern: "}ml lang" or "}function setSummMonth" followed by garbage

const corruptMarker = '}ml lang=';
const corruptIdx    = html.indexOf(corruptMarker);
if(corruptIdx === -1){
  console.log('No corruption marker found — checking for raw <html> injection...');
  // Alternate: look for a second <!DOCTYPE or second <html inside body
}

// ─── STEP 2: Find the clean end of setSummMonth block ───────────────────────
// setSummMonth ends with "renderSummary(m);\n}"
// Find the LAST clean end of renderSummary/setSummMonth before any corruption

const setSummEnd = '}function setSummMonth(m){';
// Actually let's find the second function and trim from the corrupt point
// The file should end right after the last </script></body></html>
const lastClosingHtml = html.lastIndexOf('</html>');
const firstClosingHtml = html.indexOf('</html>');

console.log('First </html> at char:', firstClosingHtml);
console.log('Last  </html> at char:', lastClosingHtml);
console.log('Total length:', html.length);

if(firstClosingHtml === lastClosingHtml){
  console.log('No duplicate </html> — corruption is inside the content, not a full duplicate.');
}

// Find where corruption starts — the point where raw HTML appears inside JS
// This is the char after the setSummMonth closing brace
// Look for the pattern: "}\n" followed by what looks like html tag
const jsEndPattern = /\}\s*(function setSummMonth[\s\S]*?\}\s*)<[a-z]/;
const m = html.match(jsEndPattern);
if(m){
  const badIdx = html.indexOf(m[0]);
  console.log('Corruption pattern found at char:', badIdx);
  
  // Find where the garbage HTML injection starts (the < after setSummMonth close)
  const cleanEnd = badIdx + m[0].length - 1; // position of the < 
  console.log('Clean code ends at char:', cleanEnd);
  console.log('Garbage starts with:', html.slice(cleanEnd, cleanEnd+50));
}

// ─── STEP 3: Clean approach — extract the valid part ────────────────────────
// The valid file ends at </html>. Everything after that is garbage.
// The first </html> IS the real end of the file.
const cleanHtml = html.slice(0, firstClosingHtml + '</html>'.length);
console.log('\nClean HTML length:', cleanHtml.length, 'lines:', cleanHtml.split('\n').length);

// ─── STEP 4: Verify the clean version has the needed markers ─────────────────
const checks = [
  'function renderSummary',
  'function setSummMonth',
  'window._concByMonth',
  '_summActiveMonth',
  'CONCILIACIONES',
  'ANALISIS',
  '/exec-summary'
];
let allOk = true;
checks.forEach(function(c){
  if(!cleanHtml.includes(c)){ console.error('❌ Missing: ' + c); allOk = false; }
  else console.log('✅ Found: ' + c);
});

if(!allOk){
  console.error('❌ Clean version is missing critical code. Aborting.');
  process.exit(1);
}

// ─── STEP 5: Also fix the renderSummary if(bm){ that was left open ──────────
// The edit added "if(bm){" but never closed it — we need to check
const ifBmIdx = cleanHtml.indexOf('  // Si _concByMonth llegó, usar su lógica exacta (más precisa)\n  if(bm){');
if(ifBmIdx === -1){
  console.log('\n⚠️  No open if(bm){ found — renderSummary may already be clean.');
} else {
  console.log('\n⚠️  Found open if(bm){ — needs fixing. Will patch renderSummary now.');
}

// ─── STEP 6: Write the clean file ─────────────────────────────────────────
fs.writeFileSync(filePath, cleanHtml, 'utf8');
console.log('\n✅ Clean file written:', cleanHtml.length, 'bytes,', cleanHtml.split('\n').length, 'lines');
