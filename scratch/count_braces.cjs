
const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
let braceCount = 0;
let parenCount = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') braceCount--;
  if (content[i] === '(') parenCount++;
  if (content[i] === ')') parenCount--;
}
console.log('Braces:', braceCount);
console.log('Parens:', parenCount);
