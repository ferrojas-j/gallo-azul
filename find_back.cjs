const fs = require('fs');
const c = fs.readFileSync('src/App.tsx', 'utf-8');
const needle = "setCurrentView('salon')";
let i = 0;
while ((i = c.indexOf(needle, i)) !== -1) {
  const ln = c.slice(0, i).split('\n').length;
  const ctx = c.slice(Math.max(0, i - 120), i + 50);
  console.log('LINE', ln, JSON.stringify(ctx));
  i++;
}
