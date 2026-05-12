const fs = require('fs');
const path = 'public/finanzas_corporativas/index.html';
let html = fs.readFileSync(path, 'utf8');

// Add MXN column header
const oldHeader = '<th style="text-align:right">Monto</th>';
const newHeader = '<th style="text-align:right;min-width:105px">Monto USD</th>\n                     <th style="text-align:right;min-width:135px">Equiv. MXN</th>';
const before = html.includes(oldHeader);
html = html.replace(oldHeader, newHeader);
console.log('Header replaced:', before);
fs.writeFileSync(path, html, 'utf8');
console.log('Done');
