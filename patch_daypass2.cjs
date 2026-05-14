const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const changes = [];

// ── 3. Add handleCreateDayPass after handleCreateDelivery (CRLF-aware) ──
const deliveryEnd = '  };\r\n\r\n  const handleExpenseSubmit';
const dpHandler = `  };\r\n\r\n  const handleCreateDayPass = async () => {\r\n    const adults = Math.max(1, dayPassAdults);\r\n    const children = Math.max(0, dayPassChildren);\r\n    const name = \`\uD83C\uDFD6\uFE0F Day Pass \u00B7 \${adults}Ad \${children}Ni\`;\r\n    const tableId = await createDeliveryOrder(name);\r\n    if (tableId) {\r\n      setSelectedTableId(tableId);\r\n      setCurrentView('mesa');\r\n      setShowDayPassModal(false);\r\n      setDayPassAdults(2);\r\n      setDayPassChildren(0);\r\n    }\r\n  };\r\n\r\n  const handleExpenseSubmit`;

if (!content.includes('handleCreateDayPass') && content.includes(deliveryEnd)) {
  content = content.replace(deliveryEnd, dpHandler);
  changes.push('3. Added handleCreateDayPass');
} else {
  changes.push('3. SKIPPED - found:' + content.includes('handleCreateDayPass') + ' marker:' + content.includes(deliveryEnd));
}

// ── 7. Override finalTotal in renderCheckout (CRLF-aware) ──
const checkoutStart = "const renderCheckout = () => {\r\n    if (!selectedTableId) return null;\r\n    \r\n    const isEfectivo";
const checkoutReplacement = "const renderCheckout = () => {\r\n    if (!selectedTableId) return null;\r\n\r\n    const dpCheckTable = tables.find(t => t.id === selectedTableId);\r\n    const dpCheckInfo = dpCheckTable ? parseDayPassInfo(dpCheckTable.name) : null;\r\n    const dpCheckMin = dpCheckInfo ? dpCheckInfo.adults * 400 + dpCheckInfo.children * 250 : 0;\r\n    const effectiveFinalTotal = dpCheckInfo ? Math.max(dpCheckMin, finalTotal) : finalTotal;\r\n\r\n    const isEfectivo";

if (!content.includes('dpCheckInfo') && content.includes(checkoutStart)) {
  content = content.replace(checkoutStart, checkoutReplacement);
  changes.push('7a. Added Day Pass override in renderCheckout');
} else {
  changes.push('7a. SKIPPED - dpCheckInfo:' + content.includes('dpCheckInfo') + ' start:' + content.includes(checkoutStart));
}

// ── 7b. Update tip calculation ──
const oldTipLine = ': finalTotal * (parseFloat(tipPercent)/100)';
const newTipLine = ': effectiveFinalTotal * (parseFloat(tipPercent)/100)';
if (content.includes('dpCheckInfo') && content.includes(oldTipLine)) {
  content = content.replace(oldTipLine, newTipLine);
  changes.push('7b. Updated tip calc');
}

// ── 7c. Update grandTotal ──
const oldGrandTotal = 'const grandTotal = finalTotal + tipVal;';
const newGrandTotal = 'const grandTotal = effectiveFinalTotal + tipVal;';
if (content.includes('dpCheckInfo') && content.includes(oldGrandTotal)) {
  content = content.replace(oldGrandTotal, newGrandTotal);
  changes.push('7c. Updated grandTotal');
}

// ── 7d. Update Cuenta display ──
const oldCuenta = "            <span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>";
const newCuenta = `            {dpCheckInfo && (\r\n              <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 700, marginBottom: 4 }}>\r\n                \uD83C\uDFD6\uFE0F Day Pass · {dpCheckInfo.adults}Ad {dpCheckInfo.children}Ni · Mín: \${dpCheckMin}\r\n                {finalTotal < dpCheckMin && <span style={{ color: '#f59e0b' }}> (consumido \${finalTotal.toFixed(0)})</span>}\r\n              </div>\r\n            )}\r\n            <span>Cuenta: <b>\${effectiveFinalTotal.toFixed(0)}</b></span>`;
if (content.includes('dpCheckInfo') && content.includes(oldCuenta)) {
  content = content.replace(oldCuenta, newCuenta);
  changes.push('7d. Updated Cuenta display');
}

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Done. Changes: ' + changes.length);
changes.forEach(c => console.log(' -', c));
