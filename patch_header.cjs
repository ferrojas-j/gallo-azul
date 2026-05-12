const fs = require('fs');
const path = 'public/finanzas_corporativas/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Add CSS for high-value rows (before the closing </style>)
const cssInsert = `    /* High-value row highlight (> $2000 USD) */
    .row-high-value {
      background: linear-gradient(90deg, #fffbeb 0%, #ffffff 60%);
    }
    .row-high-value > td:first-child {
      border-left: 4px solid #f59e0b;
      padding-left: 12px;
    }
    .row-high-value .hv-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 800; color: #92400e;
      background: #fef3c7; border-radius: 4px; padding: 1px 6px; margin-left: 6px;
      vertical-align: middle;
    }
  </style>`;

html = html.replace('  </style>', cssInsert);

// 2. Add class to <tr> in row template
const oldTr = 'return `<tr>';
const newTr = 'return `<tr class="${amount > 2000 ? \'row-high-value\' : \'\'}">';
const match1 = html.includes(oldTr);
console.log('<tr> match:', match1);
if (match1) html = html.replace(oldTr, newTr);

// 3. Append HV badge next to the USD amount cell
const oldUsdCell = '<td style="text-align:right;font-weight:700"><span style="font-size:10px;font-weight:400;color:var(--slate-400)">USD</span> ${formatMoney(amount)}</td>';
const newUsdCell = '<td style="text-align:right;font-weight:700"><span style="font-size:10px;font-weight:400;color:var(--slate-400)">USD</span> ${formatMoney(amount)}${amount > 2000 ? \'<span class="hv-badge">★ TOP</span>\' : \'\'}</td>';
const match2 = html.includes(oldUsdCell);
console.log('USD cell match:', match2);
if (match2) html = html.replace(oldUsdCell, newUsdCell);

fs.writeFileSync(path, html, 'utf8');
console.log('Done. Size:', fs.statSync(path).size);
