const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');
const changes = [];

// ── 1. Add parseDayPassInfo helper before App component ──
const helperFn = `// ─── Day Pass helper ──────────────────────────────────────
const parseDayPassInfo = (name) => {
  if (!name) return null;
  const match = name.match(/(\\d+)Ad (\\d+)Ni/);
  if (!match) return null;
  return { adults: parseInt(match[1], 10), children: parseInt(match[2], 10) };
};

`;
const appMarker = '// ─── App ─';
if (!content.includes('parseDayPassInfo') && content.includes(appMarker)) {
  content = content.replace(appMarker, helperFn + appMarker);
  changes.push('1. Added parseDayPassInfo helper');
} else {
  changes.push('1. SKIPPED - already exists or marker not found: ' + content.includes(appMarker));
}

// ── 2. Add Day Pass state after delivery state ──
const dpState = `
  const [showDayPassModal, setShowDayPassModal] = useState(false);
  const [dayPassAdults, setDayPassAdults] = useState(2);
  const [dayPassChildren, setDayPassChildren] = useState(0);`;
const deliveryStateLine = "  const [deliveryCustomerName, setDeliveryCustomerName] = useState('');";
if (!content.includes('showDayPassModal') && content.includes(deliveryStateLine)) {
  content = content.replace(deliveryStateLine, deliveryStateLine + dpState);
  changes.push('2. Added Day Pass state');
} else {
  changes.push('2. SKIPPED');
}

// ── 3. Add handleCreateDayPass after handleCreateDelivery ──
const dpHandler = `
  const handleCreateDayPass = async () => {
    const adults = Math.max(1, dayPassAdults);
    const children = Math.max(0, dayPassChildren);
    const name = \`\uD83C\uDFD6\uFE0F Day Pass \u00B7 \${adults}Ad \${children}Ni\`;
    const tableId = await createDeliveryOrder(name);
    if (tableId) {
      setSelectedTableId(tableId);
      setCurrentView('mesa');
      setShowDayPassModal(false);
      setDayPassAdults(2);
      setDayPassChildren(0);
    }
  };
`;
const deliveryEnd = '  };\n\n  const handleExpenseSubmit';
if (!content.includes('handleCreateDayPass') && content.includes(deliveryEnd)) {
  content = content.replace(deliveryEnd, dpHandler + '\n  const handleExpenseSubmit');
  changes.push('3. Added handleCreateDayPass');
} else {
  changes.push('3. SKIPPED');
}

// ── 4. Add Day Pass minimum in handleConfirmPayment ──
const dpMinLogic = `
    // Day Pass minimum charge logic
    const dpTableRef = tables.find(t => t.id === selectedTableId);
    const dpInfoRef = dpTableRef ? parseDayPassInfo(dpTableRef.name) : null;
    if (dpInfoRef) {
      const dpMin = dpInfoRef.adults * 400 + dpInfoRef.children * 250;
      totalToPay = Math.max(dpMin, totalToPay);
    }

`;
const confirmCall = '    await confirmPayment(';
if (!content.includes('dpMin =') && content.includes(confirmCall)) {
  content = content.replace(confirmCall, dpMinLogic + confirmCall);
  changes.push('4. Added Day Pass minimum in handleConfirmPayment');
} else {
  changes.push('4. SKIPPED');
}

// ── 5. Add Day Pass button next to Compra ──
const oldDiv = "        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>";
const newDiv = "        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginBottom: 24 }}>";
if (!content.includes('Day Pass') && content.includes(oldDiv)) {
  content = content.replace(oldDiv, newDiv);
  changes.push('5a. Updated div gap');
} else {
  changes.push('5a. SKIPPED');
}

const dpButton = `
          <button
            onClick={() => setShowDayPassModal(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, background: '#0ea5e9', color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: '8px', fontWeight: 700,
              fontSize: '14px', boxShadow: '0 2px 8px rgba(14,165,233,0.3)',
              cursor: 'pointer', letterSpacing: '0.3px', transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}
            onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}
          >
            \uD83C\uDFD6\uFE0F Day Pass
          </button>`;
const compraEnd = `          </button>\n        </div>\n\n        <div className="salon-legend">`;
if (!content.includes('\uD83C\uDFD6\uFE0F Day Pass') && content.includes(compraEnd)) {
  content = content.replace(compraEnd, `          </button>${dpButton}\n        </div>\n\n        <div className="salon-legend">`);
  changes.push('5b. Added Day Pass button');
} else {
  changes.push('5b. SKIPPED - daypass: ' + content.includes('\uD83C\uDFD6\uFE0F Day Pass') + ' end: ' + content.includes(compraEnd));
}

// ── 6. Add Day Pass banner in renderMesa ──
const dpBanner = `
        {/* Day Pass Banner */}
        {(() => {
          const dpT = tables.find(t => t.id === selectedTableId);
          const dpI = dpT ? parseDayPassInfo(dpT.name) : null;
          if (!dpI) return null;
          const dpMin = dpI.adults * 400 + dpI.children * 250;
          const consumed = activeItems.filter(i => i.table_id === selectedTableId).reduce((s, i) => s + i.price * i.qty, 0);
          const reached = consumed >= dpMin;
          return (
            <div style={{
              background: reached ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              borderRadius: 12, padding: '10px 16px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff'
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  \uD83C\uDFD6\uFE0F Day Pass
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {dpI.adults} adulto{dpI.adults !== 1 ? 's' : ''} · {dpI.children} niño{dpI.children !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mínimo consumible</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>\${dpMin}</div>
                {!reached && <div style={{ fontSize: 10, opacity: 0.75 }}>Faltan \${dpMin - consumed} para el mínimo</div>}
                {reached && <div style={{ fontSize: 10, opacity: 0.9 }}>✓ Mínimo superado</div>}
              </div>
            </div>
          );
        })()}
`;
const tabControl = '        <div className="tab-control-premium">';
if (!content.includes('Day Pass Banner') && content.includes(tabControl)) {
  content = content.replace(tabControl, dpBanner + tabControl);
  changes.push('6. Added Day Pass banner in renderMesa');
} else {
  changes.push('6. SKIPPED');
}

// ── 7. Override finalTotal in renderCheckout ──
const checkoutStart = "  const renderCheckout = () => {\n    if (!selectedTableId) return null;\n    \n    const isEfectivo";
const checkoutReplacement = `  const renderCheckout = () => {
    if (!selectedTableId) return null;

    const dpCheckTable = tables.find(t => t.id === selectedTableId);
    const dpCheckInfo = dpCheckTable ? parseDayPassInfo(dpCheckTable.name) : null;
    const dpCheckMin = dpCheckInfo ? dpCheckInfo.adults * 400 + dpCheckInfo.children * 250 : 0;
    const effectiveFinalTotal = dpCheckInfo ? Math.max(dpCheckMin, finalTotal) : finalTotal;

    const isEfectivo`;
if (!content.includes('dpCheckInfo') && content.includes(checkoutStart)) {
  content = content.replace(checkoutStart, checkoutReplacement);
  changes.push('7a. Added dpCheckInfo in renderCheckout');
} else {
  changes.push('7a. SKIPPED - dpCheckInfo: ' + content.includes('dpCheckInfo') + ' start: ' + content.includes(checkoutStart));
}

// Update tip calc to use effectiveFinalTotal
const oldTipLine = ': finalTotal * (parseFloat(tipPercent)/100)';
const newTipLine = ': effectiveFinalTotal * (parseFloat(tipPercent)/100)';
if (content.includes('dpCheckInfo') && content.includes(oldTipLine)) {
  content = content.replace(oldTipLine, newTipLine);
  changes.push('7b. Updated tip calc');
}

// Update grandTotal
const oldGrandTotal = 'const grandTotal = finalTotal + tipVal;';
const newGrandTotal = 'const grandTotal = effectiveFinalTotal + tipVal;';
if (content.includes('dpCheckInfo') && content.includes(oldGrandTotal)) {
  content = content.replace(oldGrandTotal, newGrandTotal);
  changes.push('7c. Updated grandTotal');
}

// Update Cuenta display
const oldCuenta = "            <span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>";
const newCuenta = `            {dpCheckInfo && (
              <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 700, marginBottom: 4 }}>
                \uD83C\uDFD6\uFE0F Day Pass · {dpCheckInfo.adults}Ad {dpCheckInfo.children}Ni · Mín: \${dpCheckMin}
                {finalTotal < dpCheckMin && <span style={{ color: '#f59e0b' }}> (consumido \${finalTotal.toFixed(0)})</span>}
              </div>
            )}
            <span>Cuenta: <b>\${effectiveFinalTotal.toFixed(0)}</b></span>`;
if (content.includes('dpCheckInfo') && content.includes(oldCuenta)) {
  content = content.replace(oldCuenta, newCuenta);
  changes.push('7d. Updated Cuenta display');
}

// ── 8. Add Day Pass modal ──
const dpModal = `
      {/* Modal Day Pass */}
      {showDayPassModal && (
        <div className="modal-overlay" onClick={() => setShowDayPassModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>\uD83C\uDFD6\uFE0F</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Nuevo Day Pass</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
                $400/adulto · $250/niño · Mínimo consumible
              </p>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Adultos</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setDayPassAdults(a => Math.max(1, a - 1))}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 800, minWidth: 40, textAlign: 'center' }}>{dayPassAdults}</span>
                  <button onClick={() => setDayPassAdults(a => a + 1)}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #0ea5e9', background: '#e0f2fe', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0284c7' }}>+</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Niños</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => setDayPassChildren(c => Math.max(0, c - 1))}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                  <span style={{ fontSize: 28, fontWeight: 800, minWidth: 40, textAlign: 'center' }}>{dayPassChildren}</span>
                  <button onClick={() => setDayPassChildren(c => c + 1)}
                    style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #0ea5e9', background: '#e0f2fe', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0284c7' }}>+</button>
                </div>
              </div>
            </div>

            <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'center', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: 12, color: '#0369a1', fontWeight: 600, marginBottom: 4 }}>MÍNIMO A COBRAR</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#0284c7' }}>
                \${dayPassAdults * 400 + dayPassChildren * 250}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {dayPassAdults} × $400 + {dayPassChildren} × $250
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowDayPassModal(false)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, background: '#0ea5e9' }} onClick={handleCreateDayPass}>
                Abrir cuenta
              </button>
            </div>
          </div>
        </div>
      )}

`;
const ticketMarker = '      {/* Ticket Listo para Disparar Windows.Print() desde Caja */}';
if (!content.includes('Modal Day Pass') && content.includes(ticketMarker)) {
  content = content.replace(ticketMarker, dpModal + ticketMarker);
  changes.push('8. Added Day Pass modal JSX');
} else {
  changes.push('8. SKIPPED');
}

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Done. Changes applied: ' + changes.length);
changes.forEach(c => console.log(' -', c));
