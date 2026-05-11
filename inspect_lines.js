import { readFileSync, writeFileSync } from 'fs';
const content = readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
// Show lines 2112-2115 (0-indexed: 2111-2114)
for (let i = 2111; i <= 2115; i++) {
  console.log(`Line ${i+1}: |${JSON.stringify(lines[i])}|`);
}
