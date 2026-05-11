const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dist/assets');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const idx = content.indexOf('Cortes');
  const idx2 = content.indexOf('regalo');
  const idx3 = content.indexOf('Cortesa');
  console.log(`File: ${file}`);
  console.log(`  "Cortes" found: ${idx > -1 ? 'YES at ' + idx : 'NO'}`);
  console.log(`  "regalo" found: ${idx2 > -1 ? 'YES at ' + idx2 : 'NO'}`);
  if (idx > -1) {
    console.log(`  Context: ...${content.substring(Math.max(0, idx-30), idx+60)}...`);
  }
});

// Also check sw.js version
const sw = fs.readFileSync(path.join(__dirname, 'dist/sw.js'), 'utf8');
const vMatch = sw.match(/gallo-azul-v(\d+)/);
console.log('\ndist/sw.js cache version:', vMatch ? vMatch[0] : 'NOT FOUND');
