const fs = require('fs');

let src = fs.readFileSync('src/App.tsx', 'utf8');
const log = [];

// Helper: replace first occurrence of exact string
function replaceOnce(str, find, replace, label) {
  const idx = str.indexOf(find);
  if (idx === -1) { log.push('❌ ' + label + ' — not found'); return str; }
  log.push('✅ ' + label);
  return str.slice(0, idx) + replace + str.slice(idx + find.length);
}

// ═══════════════════════════════════════════════════════════════
// 1. parseDayPassInfo helper — insert before "function App() {"
// ═══════════════════════════════════════════════════════════════
if (!src.includes('parseDayPassInfo')) {
  const helper = [
    '// ─── Day Pass helper ──────────────────────────────────────────────────────',
    'const parseDayPassInfo = (name: string): { adults: number; children: number } | null => {',
    '  const m = name.match(/\\u{1F3D6}\\uFE0F Day Pass \\xB7 (\\d+)Ad (\\d+)Ni/u);',
    '  if (!m) return null;',
    '  return { adults: parseInt(m[1], 10), children: parseInt(m[2], 10) };',
    '};',
    '',
  ].join('\r\n');
  src = replaceOnce(src, 'function App() {', helper + 'function App() {', '1. parseDayPassInfo');
} else {
  log.push('⏭  1. parseDayPassInfo exists');
}

// ═══════════════════════════════════════════════════════════════
// 2. State variables
// ═══════════════════════════════════════════════════════════════
const stateAnchor = "const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);";
const newState = stateAnchor + '\r\n' +
  '  const [showDayPassModal, setShowDayPassModal] = useState(false);\r\n' +
  '  const [dayPassAdults, setDayPassAdults] = useState(2);\r\n' +
  '  const [dayPassChildren, setDayPassChildren] = useState(0);';
if (!src.includes('showDayPassModal')) {
  src = replaceOnce(src, stateAnchor, newState, '2. Day Pass state');
} else {
  log.push('⏭  2. State exists');
}

// ═══════════════════════════════════════════════════════════════
// 3. handleCreateDayPass function
// ═══════════════════════════════════════════════════════════════
const expenseAnchor = '  const handleExpenseSubmit';
const dpFn = [
  '',
  '  const handleCreateDayPass = async () => {',
  '    const name = `\\u{1F3D6}\\uFE0F Day Pass \\xB7 ${dayPassAdults}Ad ${dayPassChildren}Ni`;',
  '    const { data, error } = await supabase',
  "      .from('tables')",
  "      .insert([{ name, category: 'Day Pass', status: 'occupied', capacity: dayPassAdults + dayPassChildren }])",
  '      .select().single();',
  "    if (error) { alert('Error creando Day Pass: ' + error.message); return; }",
  '    await fetchTables();',
  '    setSelectedTableId(data.id);',
  "    setCurrentView('mesa');",
  '    setShowDayPassModal(false);',
  '    setDayPassAdults(2);',
  '    setDayPassChildren(0);',
  '  };',
  '',
  '',
].join('\r\n');
if (!src.includes('handleCreateDayPass')) {
  src = replaceOnce(src, expenseAnchor, dpFn + expenseAnchor, '3. handleCreateDayPass');
} else {
  log.push('⏭  3. handleCreateDayPass exists');
}

// ═══════════════════════════════════════════════════════════════
// 4. Header — exclude mesa & checkout from icon-button
// ═══════════════════════════════════════════════════════════════
const headerOld = "        {isSubView ? (\r\n          <button className=\"icon-button\" onClick={() => {\r\n            if (currentView === 'admin' && adminSubView !== 'main') setAdminSubView('main');\r\n            else if (currentView === 'checkout') setCurrentView('mesa');\r\n            else if (currentView === 'registros') setCurrentView('checkin');\r\n            else setCurrentView('salon');\r\n          }}>\r\n            <ChevronLeft size={24} />\r\n          </button>";
const headerNew = "        {isSubView && currentView !== 'mesa' && currentView !== 'checkout' ? (\r\n          <button className=\"icon-button\" onClick={() => {\r\n            if (currentView === 'admin' && adminSubView !== 'main') setAdminSubView('main');\r\n            else if (currentView === 'registros') setCurrentView('checkin');\r\n            else setCurrentView('salon');\r\n          }}>\r\n            <ChevronLeft size={24} />\r\n          </button>";
if (!src.includes("currentView !== 'mesa' && currentView !== 'checkout'")) {
  src = replaceOnce(src, headerOld, headerNew, '4. Header icon-button condition');
} else {
  log.push('⏭  4. Header condition exists');
}

// ═══════════════════════════════════════════════════════════════
// 5. Rename "Restaurante" → "Volver" in mesa header
// ═══════════════════════════════════════════════════════════════
const mesaBackOld = "          <button className=\"back-btn-pill\" onClick={() => setCurrentView('salon')}>\r\n            <ChevronLeft size={20} />\r\n            <span>Restaurante</span>\r\n          </button>";
const mesaBackNew = [
  '          <button',
  "            onClick={() => setCurrentView('salon')}",
  '            style={{',
  "              display: 'flex', alignItems: 'center', gap: 8,",
  "              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',",
  "              color: '#fff', border: 'none', borderRadius: 14,",
  "              padding: '10px 20px', fontSize: 15, fontWeight: 800,",
  "              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',",
  "              letterSpacing: '0.2px',",
  '            }}',
  '          >',
  '            <ChevronLeft size={22} strokeWidth={2.5} />',
  '            <span>Volver</span>',
  '          </button>',
].join('\r\n');
if (!src.includes('Volver</span>')) {
  src = replaceOnce(src, mesaBackOld, mesaBackNew, '5. Rename Restaurante → Volver');
} else {
  log.push('⏭  5. Volver button exists in mesa');
}

// ═══════════════════════════════════════════════════════════════
// 6. Day Pass button in salon (after the Compra button)
// ═══════════════════════════════════════════════════════════════
const compraEnd = "            <Plus size={16} strokeWidth={3} /> Compra\r\n          </button>\r\n        </div>";
const compraWithDP = [
  '            <Plus size={16} strokeWidth={3} /> Compra',
  '          </button>',
  '          <button',
  '            style={{',
  "              display: 'flex', alignItems: 'center', gap: 8,",
  "              background: '#0ea5e9', color: 'white', border: 'none',",
  "              padding: '10px 20px', borderRadius: '8px', fontWeight: 700,",
  "              fontSize: '14px', boxShadow: '0 2px 8px rgba(14,165,233,0.3)',",
  "              cursor: 'pointer', letterSpacing: '0.3px', transition: 'background 0.2s ease'",
  '            }}',
  "            onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}",
  "            onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}",
  '            onClick={() => setShowDayPassModal(true)}',
  '          >',
  '            \u{1F3D6}\uFE0F Day Pass',
  '          </button>',
  '        </div>',
].join('\r\n');
if (!src.includes('setShowDayPassModal(true)')) {
  src = replaceOnce(src, compraEnd, compraWithDP, '6. Day Pass button in salon');
} else {
  log.push('⏭  6. Day Pass salon button exists');
}

// ═══════════════════════════════════════════════════════════════
// 7. Day Pass banner in renderMesa (before tab-control-premium)
// ═══════════════════════════════════════════════════════════════
const tabControl = '        <div className="tab-control-premium">';
const dpBanner = [
  '        {/* Day Pass Banner */}',
  '        {(() => {',
  '          const dpT = tables.find(t => t.id === selectedTableId);',
  '          const dpI = dpT ? parseDayPassInfo(dpT.name) : null;',
  '          if (!dpI) return null;',
  '          const dpMin = dpI.adults * 400 + dpI.children * 250;',
  '          const consumed = activeItems.filter(i => i.table_id === selectedTableId).reduce((s, i) => s + i.price * i.qty, 0);',
  '          const reached = consumed >= dpMin;',
  '          return (',
  '            <div style={{',
  "              background: reached ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#0ea5e9,#0284c7)',",
  "              borderRadius: 12, padding: '10px 16px', marginBottom: 8,",
  "              display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff'",
  '            }}>',
  '              <div>',
  '                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: \'uppercase\', letterSpacing: \'0.5px\' }}>',
  '                  \u{1F3D6}\uFE0F Day Pass',
  '                </div>',
  '                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>',
  "                  {dpI.adults} adulto{dpI.adults !== 1 ? 's' : ''} \xB7 {dpI.children} ni\xF1o{dpI.children !== 1 ? 's' : ''}",
  '                </div>',
  '              </div>',
  "              <div style={{ textAlign: 'right' }}>",
  "                <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>M\xEDnimo consumible</div>",
  '                <div style={{ fontSize: 18, fontWeight: 800 }}>${dpMin}</div>',
  "                {!reached && <div style={{ fontSize: 10, opacity: 0.75 }}>Faltan ${dpMin - consumed} para el m\xEDnimo</div>}",
  "                {reached && <div style={{ fontSize: 10, opacity: 0.9 }}>\u2713 M\xEDnimo superado</div>}",
  '              </div>',
  '            </div>',
  '          );',
  '        })()}',
  '        ',
  '        <div className="tab-control-premium">',
].join('\r\n');
if (!src.includes('Day Pass Banner')) {
  src = replaceOnce(src, tabControl, dpBanner, '7. Day Pass banner in mesa');
} else {
  log.push('⏭  7. Day Pass banner exists');
}

// ═══════════════════════════════════════════════════════════════
// 8. renderCheckout — add Volver btn + Day Pass effective total
// ═══════════════════════════════════════════════════════════════
// We'll find the unique anchor "Total a cobrar (Cuenta + Propina)"
// and replace the function start up to that point.
// We do a targeted replacement using unique surrounding context.
const checkoutAnchorOld = "    const grandTotal = finalTotal + tipVal;\r\n\r\n    return (\r\n      <div className=\"fade-in\">\r\n        <div style={{ textAlign: 'center', marginBottom: 24 }}>";
const checkoutAnchorNew = [
  '',
  '    const dpCheckTable = tables.find(t => t.id === selectedTableId);',
  '    const dpCheckInfo = dpCheckTable ? parseDayPassInfo(dpCheckTable.name) : null;',
  '    const dpCheckMin = dpCheckInfo ? dpCheckInfo.adults * 400 + dpCheckInfo.children * 250 : 0;',
  '    const effectiveFinalTotal = dpCheckInfo ? Math.max(dpCheckMin, finalTotal) : finalTotal;',
  '',
  '    const grandTotal = effectiveFinalTotal + tipVal;',
  '',
  '    return (',
  '      <div className="fade-in">',
  '        <button',
  "          onClick={() => setCurrentView('mesa')}",
  '          style={{',
  "            display: 'flex', alignItems: 'center', gap: 8,",
  "            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',",
  "            color: '#fff', border: 'none', borderRadius: 14,",
  "            padding: '10px 20px', fontSize: 15, fontWeight: 800,",
  "            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',",
  "            marginBottom: 20, letterSpacing: '0.2px',",
  '          }}',
  '        >',
  '          <ChevronLeft size={22} strokeWidth={2.5} />',
  '          <span>Volver</span>',
  '        </button>',
  "        <div style={{ textAlign: 'center', marginBottom: 24 }}>",
].join('\r\n');

// Also need to update the totalAmount display in checkout to use effectiveFinalTotal
// We need to patch a bit more of renderCheckout to handle tip calc too

// First patch: insert dpCheckInfo derivation before grandTotal
const tipCalcOld = "    const isEfectivo = paymentMethod === 'efectivo';\r\n    const tipVal = isEfectivo ? 0 : (tipPercent === 'Otro' \r\n      ? parseFloat(customTip) || 0 \r\n      : (tipPercent === 'none' \r\n          ? 0 \r\n          : finalTotal * (parseFloat(tipPercent)/100)\r\n        ));\r\n    const grandTotal = finalTotal + tipVal;";
const tipCalcNew = [
  "    const dpCheckTable = tables.find(t => t.id === selectedTableId);",
  "    const dpCheckInfo = dpCheckTable ? parseDayPassInfo(dpCheckTable.name) : null;",
  "    const dpCheckMin = dpCheckInfo ? dpCheckInfo.adults * 400 + dpCheckInfo.children * 250 : 0;",
  "    const effectiveFinalTotal = dpCheckInfo ? Math.max(dpCheckMin, finalTotal) : finalTotal;",
  "",
  "    const isEfectivo = paymentMethod === 'efectivo';",
  "    const tipVal = isEfectivo ? 0 : (tipPercent === 'Otro' ",
  "      ? parseFloat(customTip) || 0 ",
  "      : (tipPercent === 'none' ",
  "          ? 0 ",
  "          : effectiveFinalTotal * (parseFloat(tipPercent)/100)",
  "        ));",
  "    const grandTotal = effectiveFinalTotal + tipVal;",
].join('\r\n');

if (!src.includes('dpCheckInfo')) {
  src = replaceOnce(src, tipCalcOld, tipCalcNew, '8a. Day Pass tip/total calc in checkout');
} else {
  log.push('⏭  8a. dpCheckInfo exists');
}

// Add Volver btn in checkout return
const checkoutReturnOld = "    return (\r\n      <div className=\"fade-in\">\r\n        <div style={{ textAlign: 'center', marginBottom: 24 }}\r\n>";
// Try alternative form
const checkoutReturnOld2 = "    return (\r\n      <div className=\"fade-in\">\r\n        <div style={{ textAlign: 'center', marginBottom: 24 }}>";
const checkoutReturnNew = [
  "    return (",
  '      <div className="fade-in">',
  '        <button',
  "          onClick={() => setCurrentView('mesa')}",
  '          style={{',
  "            display: 'flex', alignItems: 'center', gap: 8,",
  "            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',",
  "            color: '#fff', border: 'none', borderRadius: 14,",
  "            padding: '10px 20px', fontSize: 15, fontWeight: 800,",
  "            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.18)',",
  "            marginBottom: 20, letterSpacing: '0.2px',",
  '          }}',
  '        >',
  '          <ChevronLeft size={22} strokeWidth={2.5} />',
  '          <span>Volver</span>',
  '        </button>',
  "        <div style={{ textAlign: 'center', marginBottom: 24 }}>",
].join('\r\n');

if (!src.includes("onClick={() => setCurrentView('mesa')}")) {
  // Find renderCheckout specifically — look for its unique context
  const renderCoIdx = src.indexOf("  const renderCheckout = () => {");
  if (renderCoIdx !== -1) {
    // Find the return statement within renderCheckout (not in other functions)
    const afterRenderCo = src.slice(renderCoIdx);
    const returnInCo = afterRenderCo.indexOf("    return (");
    if (returnInCo !== -1) {
      const absoluteReturnIdx = renderCoIdx + returnInCo;
      // Replace from that return statement forward (only the opening few lines)
      const returnSection = src.slice(absoluteReturnIdx, absoluteReturnIdx + 200);
      log.push('🔍 8b. Return section: ' + JSON.stringify(returnSection.slice(0, 100)));
      
      const returnEnd = returnSection.indexOf('<div style={{ textAlign: \'center\', marginBottom: 24 }}>');
      if (returnEnd !== -1) {
        const endPos = absoluteReturnIdx + returnEnd + '<div style={{ textAlign: \'center\', marginBottom: 24 }}>'.length;
        const toReplace = src.slice(absoluteReturnIdx, endPos);
        src = src.slice(0, absoluteReturnIdx) + checkoutReturnNew + src.slice(endPos);
        log.push('✅ 8b. Volver button in checkout return');
      } else {
        log.push('❌ 8b. Could not find textAlign:center within renderCheckout return');
      }
    } else {
      log.push('❌ 8b. Could not find return in renderCheckout');
    }
  } else {
    log.push('❌ 8b. Could not find renderCheckout');
  }
} else {
  log.push('⏭  8b. Volver in checkout exists');
}

// Update finalTotal display to effectiveFinalTotal in checkout
// The line: <span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>
// Only do this inside renderCheckout (it appears in the checkout's total display)
if (src.includes('effectiveFinalTotal') && src.includes('<span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>')) {
  // Find the renderCheckout occurrence specifically
  const renderCoIdx = src.indexOf('  const renderCheckout = () => {');
  const nextFnIdx = src.indexOf('\n  const ', renderCoIdx + 10);
  const checkoutSection = src.slice(renderCoIdx, nextFnIdx);
  
  const updatedSection = checkoutSection
    .replace('<span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>', '<span>Cuenta: <b>${effectiveFinalTotal.toFixed(0)}</b></span>');
  
  if (updatedSection !== checkoutSection) {
    src = src.slice(0, renderCoIdx) + updatedSection + src.slice(nextFnIdx);
    log.push('✅ 8c. Updated Cuenta display to effectiveFinalTotal');
  } else {
    log.push('⏭  8c. Cuenta display already updated');
  }
}

// ═══════════════════════════════════════════════════════════════
// 9. Day Pass Modal — before {tableConfirmModal.isOpen
// ═══════════════════════════════════════════════════════════════
const modalAnchor = '      {tableConfirmModal.isOpen && (';
const dpModal = [
  '      {/* ══ Day Pass Modal ══════════════════════════════════ */}',
  '      {showDayPassModal && (',
  "        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>",
  "          <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>",
  "            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>\u{1F3D6}\uFE0F Day Pass</h2>",
  "            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>M\xEDnimo: $400/adulto \xB7 $250/ni\xF1o</p>",
  '',
  "            <div style={{ marginBottom: 20 }}>",
  "              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Adultos</label>",
  "              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>",
  "                <button onClick={() => setDayPassAdults(Math.max(0, dayPassAdults - 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>\u2212</button>",
  "                <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', minWidth: 40, textAlign: 'center' }}>{dayPassAdults}</span>",
  "                <button onClick={() => setDayPassAdults(dayPassAdults + 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#0f172a', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>",
  '              </div>',
  '            </div>',
  '',
  "            <div style={{ marginBottom: 24 }}>",
  "              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Ni\xF1os</label>",
  "              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>",
  "                <button onClick={() => setDayPassChildren(Math.max(0, dayPassChildren - 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>\u2212</button>",
  "                <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', minWidth: 40, textAlign: 'center' }}>{dayPassChildren}</span>",
  "                <button onClick={() => setDayPassChildren(dayPassChildren + 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#0f172a', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>",
  '              </div>',
  '            </div>',
  '',
  "            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>",
  "              <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 600, marginBottom: 4 }}>M\xEDnimo consumible</div>",
  "              <div style={{ fontSize: 28, fontWeight: 900, color: '#0369a1' }}>${dayPassAdults * 400 + dayPassChildren * 250}</div>",
  '            </div>',
  '',
  "            <div style={{ display: 'flex', gap: 12 }}>",
  "              <button onClick={() => setShowDayPassModal(false)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: 15, cursor: 'pointer', color: '#64748b' }}>Cancelar</button>",
  "              <button onClick={handleCreateDayPass} style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Abrir cuenta</button>",
  '            </div>',
  '          </div>',
  '        </div>',
  '      )}',
  '',
  '      {tableConfirmModal.isOpen && (',
].join('\r\n');

if (!src.includes('showDayPassModal && (')) {
  src = replaceOnce(src, modalAnchor, dpModal, '9. Day Pass modal');
} else {
  log.push('⏭  9. Day Pass modal exists');
}

// ═══════════════════════════════════════════════════════════════
// Write and report
// ═══════════════════════════════════════════════════════════════
fs.writeFileSync('src/App.tsx', src, 'utf8');

console.log('\n📋 Changes applied:');
log.forEach(l => console.log(l));
console.log('\n✨ Done! Run npm run build to verify.');
