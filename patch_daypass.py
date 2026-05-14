import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# ── 1. Add parseDayPassInfo helper before App component ──
helper_fn = """// ─── Day Pass helper ──────────────────────────────────────
const parseDayPassInfo = (name: string): { adults: number; children: number } | null => {
  if (!name) return null;
  const match = name.match(/(\\d+)Ad (\\d+)Ni/);
  if (!match) return null;
  return { adults: parseInt(match[1], 10), children: parseInt(match[2], 10) };
};

"""
marker = '// ─── App ─'
if 'parseDayPassInfo' not in content and marker in content:
    content = content.replace(marker, helper_fn + marker, 1)
    changes.append('1. Added parseDayPassInfo helper')

# ── 2. Add Day Pass state after delivery state ──
dp_state = """
  const [showDayPassModal, setShowDayPassModal] = useState(false);
  const [dayPassAdults, setDayPassAdults] = useState(2);
  const [dayPassChildren, setDayPassChildren] = useState(0);
"""
delivery_state_line = "  const [deliveryCustomerName, setDeliveryCustomerName] = useState('');"
if 'showDayPassModal' not in content and delivery_state_line in content:
    content = content.replace(delivery_state_line, delivery_state_line + dp_state, 1)
    changes.append('2. Added Day Pass state')

# ── 3. Add handleCreateDayPass handler after handleCreateDelivery ──
dp_handler = """
  const handleCreateDayPass = async () => {
    const adults = Math.max(1, dayPassAdults);
    const children = Math.max(0, dayPassChildren);
    const name = `\u{1F3D6}\uFE0F Day Pass \u00B7 ${adults}Ad ${children}Ni`;
    const tableId = await createDeliveryOrder(name);
    if (tableId) {
      setSelectedTableId(tableId);
      setCurrentView('mesa');
      setShowDayPassModal(false);
      setDayPassAdults(2);
      setDayPassChildren(0);
    }
  };
"""
delivery_handler_end = "  };\n\n  const handleExpenseSubmit"
if 'handleCreateDayPass' not in content and delivery_handler_end in content:
    content = content.replace(delivery_handler_end, dp_handler + "\n  const handleExpenseSubmit", 1)
    changes.append('3. Added handleCreateDayPass handler')

# ── 4. Add Day Pass minimum logic in handleConfirmPayment ──
dp_minimum_logic = """
    // Day Pass minimum charge logic
    const dpTable = tables.find(t => t.id === selectedTableId);
    const dpInfo = dpTable ? parseDayPassInfo(dpTable.name) : null;
    if (dpInfo) {
      const dpMin = dpInfo.adults * 400 + dpInfo.children * 250;
      totalToPay = Math.max(dpMin, totalToPay);
    }

"""
confirm_call = "    await confirmPayment("
if 'dpMin' not in content and confirm_call in content:
    content = content.replace(confirm_call, dp_minimum_logic + confirm_call, 1)
    changes.append('4. Added Day Pass minimum in handleConfirmPayment')

# ── 5. Add Day Pass button next to Compra button ──
# Change the outer div to have gap: 12 and add the button
old_div = "        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>"
new_div = "        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginBottom: 24 }}>"
if 'Day Pass' not in content and old_div in content:
    content = content.replace(old_div, new_div, 1)
    changes.append('5a. Changed flex div gap')

dp_button = """
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
            \u{1F3D6}\uFE0F Day Pass
          </button>"""
compra_end = "          </button>\n        </div>\n\n        <div className=\"salon-legend\">"
if '🏖️ Day Pass' not in content and compra_end in content:
    content = content.replace(compra_end, "          </button>" + dp_button + "\n        </div>\n\n        <div className=\"salon-legend\">", 1)
    changes.append('5b. Added Day Pass button')

# ── 6. Add Day Pass banner in renderMesa ──
dp_banner = """
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
                  \u{1F3D6}\uFE0F Day Pass
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {dpI.adults} adulto{dpI.adults !== 1 ? 's' : ''} · {dpI.children} niño{dpI.children !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mínimo consumible</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>${dpMin}</div>
                {!reached && <div style={{ fontSize: 10, opacity: 0.75 }}>Faltan ${dpMin - consumed} para el mínimo</div>}
                {reached && <div style={{ fontSize: 10, opacity: 0.9 }}>✓ Mínimo superado</div>}
              </div>
            </div>
          );
        })()}
"""
tab_control = "        <div className=\"tab-control-premium\">"
if 'Day Pass Banner' not in content and tab_control in content:
    content = content.replace(tab_control, dp_banner + tab_control, 1)
    changes.append('6. Added Day Pass banner in renderMesa')

# ── 7. Override finalTotal in renderCheckout for Day Pass ──
checkout_fn_start = "  const renderCheckout = () => {\n    if (!selectedTableId) return null;\n    \n    const isEfectivo"
checkout_replacement = """  const renderCheckout = () => {
    if (!selectedTableId) return null;

    const dpCheckTable = tables.find(t => t.id === selectedTableId);
    const dpCheckInfo = dpCheckTable ? parseDayPassInfo(dpCheckTable.name) : null;
    const dpCheckMin = dpCheckInfo ? dpCheckInfo.adults * 400 + dpCheckInfo.children * 250 : 0;
    const effectiveFinalTotal = dpCheckInfo ? Math.max(dpCheckMin, finalTotal) : finalTotal;

    const isEfectivo"""
if 'dpCheckInfo' not in content and checkout_fn_start in content:
    content = content.replace(checkout_fn_start, checkout_replacement, 1)
    changes.append('7. Added Day Pass override at top of renderCheckout')

# Replace finalTotal usages in renderCheckout tip and grandTotal calculations
old_tip_calc = "    const tipVal = isEfectivo ? 0 : (tipPercent === 'Otro' \n      ? parseFloat(customTip) || 0 \n      : (tipPercent === 'none' \n          ? 0 \n          : finalTotal * (parseFloat(tipPercent)/100)\n        ));\n    const grandTotal = finalTotal + tipVal;"
new_tip_calc = "    const tipVal = isEfectivo ? 0 : (tipPercent === 'Otro' \n      ? parseFloat(customTip) || 0 \n      : (tipPercent === 'none' \n          ? 0 \n          : effectiveFinalTotal * (parseFloat(tipPercent)/100)\n        ));\n    const grandTotal = effectiveFinalTotal + tipVal;"
if 'effectiveFinalTotal * (parseFloat' not in content and old_tip_calc in content:
    content = content.replace(old_tip_calc, new_tip_calc, 1)
    changes.append('7b. Updated tip/grandTotal to use effectiveFinalTotal')

# Replace Cuenta display in checkout
old_cuenta = "            <span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>"
new_cuenta = """            {dpCheckInfo && (
              <div style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 700, marginBottom: 4 }}>
                \u{1F3D6}\uFE0F Day Pass · {dpCheckInfo.adults}Ad {dpCheckInfo.children}Ni · Mínimo: ${dpCheckMin}
                {finalTotal < dpCheckMin && <span style={{ color: '#f59e0b' }}> (consumido ${finalTotal.toFixed(0)})</span>}
              </div>
            )}
            <span>Cuenta: <b>${effectiveFinalTotal.toFixed(0)}</b></span>"""
if 'dpCheckInfo.adults}Ad' not in content and old_cuenta in content:
    content = content.replace(old_cuenta, new_cuenta, 1)
    changes.append('7c. Updated Cuenta display in checkout')

# ── 8. Add Day Pass modal JSX ──
dp_modal = """
      {/* Modal Day Pass */}
      {showDayPassModal && (
        <div className="modal-overlay" onClick={() => setShowDayPassModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>\u{1F3D6}\uFE0F</div>
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
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0284c7' }}>
                ${dayPassAdults * 400 + dayPassChildren * 250}
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

"""
delivery_modal_end = "      {/* Ticket Listo para Disparar Windows.Print() desde Caja */}"
if 'Modal Day Pass' not in content and delivery_modal_end in content:
    content = content.replace(delivery_modal_end, dp_modal + delivery_modal_end, 1)
    changes.append('8. Added Day Pass modal JSX')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Done. Changes applied: {len(changes)}')
for c in changes:
    print(' -', c)
