import React, { useState, useEffect } from 'react';
import { dbPayroll, dbCollaborators } from '../lib/supabaseService';
import type { PayrollRecord, CollaboratorRow } from '../lib/supabaseService';
import { CheckCircle2, DollarSign, Plus, Save, X, Edit2 } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(amount);
};

const getWeekNumber = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const isLastWeekOfMonth = (weekNum: number, year: number) => {
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const weekStart = new Date(d.getTime() + (weekNum - 1) * 604800000);
  const saturday = new Date(weekStart.getTime() + 2 * 86400000);
  const nextSaturday = new Date(saturday.getTime() + 7 * 86400000);
  return saturday.getMonth() !== nextSaturday.getMonth();
};

const calcEmpVal = (collab: CollaboratorRow, weekNum: number, year: number) => {
  if (collab.payment_frequency === 'Mensual') {
    return isLastWeekOfMonth(weekNum, year) ? (collab.remuneration || 0) : 0;
  }
  return collab.remuneration || 0;
};

const getNextMonthlyPaymentWeek = (startWeek: number, startYear: number) => {
  let w = startWeek;
  let y = startYear;
  for(let i=0; i<8; i++) {
    if (isLastWeekOfMonth(w, y)) return w;
    w++;
    if (w > 53) {
      w = 1;
      y++;
    }
  }
  return startWeek;
};

interface PayrollManagerProps {
  onBack: () => void;
}

export const PayrollManager: React.FC<PayrollManagerProps> = ({ onBack }) => {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [currentCollab, setCurrentCollab] = useState<Partial<CollaboratorRow>>({
    name: '',
    unit: 'Restaurante',
    role: '',
    remuneration: 0,
    payment_frequency: 'Semanal',
    active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollRes, collabRes] = await Promise.all([
        dbPayroll.getAll(),
        dbCollaborators.getAll()
      ]);
      
      if (payrollRes.error) {
        console.error('Error loading payrolls:', payrollRes.error);
      } else if (payrollRes.data) {
        setPayrolls(payrollRes.data as PayrollRecord[]);
      }
      
      if (collabRes.error) {
        console.error('Error loading collaborators:', collabRes.error);
      } else if (collabRes.data) {
        setCollaborators(collabRes.data as CollaboratorRow[]);
      }
    } catch (err) {
      console.error('Exception loading payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bloquea scroll del fondo — html + body + touchAction
  useEffect(() => {
    if (isEditingForm) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isEditingForm]);

  const handleSaveCollaborator = async () => {
    if (!currentCollab.name) return;
    
    if (currentCollab.id) {
      await dbCollaborators.update(currentCollab.id, {
        name: currentCollab.name,
        unit: currentCollab.unit as any,
        role: currentCollab.role || '',
        remuneration: currentCollab.remuneration || 0,
        payment_frequency: currentCollab.payment_frequency || 'Semanal',
        active: currentCollab.active
      });
    } else {
      await dbCollaborators.insert({
        name: currentCollab.name,
        unit: currentCollab.unit || 'Restaurante',
        role: currentCollab.role || '',
        remuneration: currentCollab.remuneration || 0,
        payment_frequency: currentCollab.payment_frequency || 'Semanal'
      });
    }
    
    setIsEditingForm(false);
    loadData();
  };

  const currentWeek = getWeekNumber(new Date());
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const activeCollaborators = collaborators.filter(c => c.active);
  // Show all active collaborators in the list, even if 0, so they can edit.
  // But total only counts what is actually paid.
  const paidCollaborators = activeCollaborators.filter(c => calcEmpVal(c, currentWeek, currentYear) > 0);
  const totalPayrollAmount = paidCollaborators.reduce((sum, c) => sum + calcEmpVal(c, currentWeek, currentYear), 0);
  
  const handleSaveRemuneration = async (id: string) => {
    const { error } = await dbCollaborators.update(id, { remuneration: editValue });
    if (!error) {
      // Actualiza el sueldo base predeterminado — se usará como default en cada nueva semana
      setCollaborators(collaborators.map(c => c.id === id ? { ...c, remuneration: editValue } : c));
    } else {
      alert('Error al actualizar el sueldo base predeterminado');
    }
    setEditingId(null);
  };
  
  const isCurrentWeekRegistered = payrolls.some(p => p.week === currentWeek && p.year === currentYear);

  const handleRegisterCurrentWeek = async () => {
    if (confirm(`¿Estás seguro de registrar la nómina de la Semana ${currentWeek} del ${currentYear} por ${formatCurrency(totalPayrollAmount)}?`)) {
      const { data, error } = await dbPayroll.insert({
        year: currentYear,
        month: currentMonth,
        week: currentWeek
      });
      if (data) {
        loadData();
      } else {
        alert('Hubo un error al registrar la nómina.');
        console.error(error);
      }
    }
  };

  return (
    <div className="payroll-manager" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Registro de Nóminas</h2>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginBottom: '32px' }}>
        <div style={{ display: 'inline-block', background: '#1e293b', color: 'white', padding: '8px 16px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Semana en Curso: Semana {currentWeek} del {currentYear}</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '2px solid #94a3b8', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Total Nómina Proyectada</div>
            <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: '800' }}>{formatCurrency(totalPayrollAmount)}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{paidCollaborators.length} colaboradores a pagar</div>
          </div>
        </div>

        <div style={{ marginTop: '32px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>Sueldos Base (Predeterminados)</h4>
            <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              ✏️ Edita para cambiar el predeterminado permanente
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeCollaborators.map(c => {
              const val = calcEmpVal(c, currentWeek, currentYear);
              return (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontWeight: '500', color: '#334155' }}>
                    {c.name}
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      <span>{c.unit}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: c.payment_frequency === 'Mensual' ? '#e0e7ff' : '#dcfce7',
                        color: c.payment_frequency === 'Mensual' ? '#4338ca' : '#166534'
                      }}>
                        {c.payment_frequency || 'Semanal'}
                      </span>
                      {c.payment_frequency === 'Mensual' && val === 0 && (
                        <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                          (Próximo pago: Sem {getNextMonthlyPaymentWeek(currentWeek, currentYear)})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    {editingId === c.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px' }}>
                          <span style={{ color: '#64748b', fontWeight: 'bold', marginRight: '4px' }}>$</span>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            style={{ width: '80px', padding: '4px', border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}
                            autoFocus
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleSaveRemuneration(c.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#10b981', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Guardar"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', color: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{formatCurrency(c.remuneration || 0)}</div>
                          {c.payment_frequency === 'Mensual' && val === 0 && (
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>base mensual</div>
                          )}
                          {c.payment_frequency !== 'Mensual' && (
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>por semana</div>
                          )}
                        </div>
                        <button
                          onClick={() => { setEditingId(c.id); setEditValue(c.remuneration || 0); }}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                          onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulario de Nuevo Colaborador */}
          <button 
            onClick={() => {
              setCurrentCollab({ name: '', unit: 'Restaurante', role: '', remuneration: 0, payment_frequency: 'Semanal', active: true });
              setIsEditingForm(true);
            }}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '16px',
              background: 'white',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              color: '#64748b',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#0ea5e9';
              e.currentTarget.style.color = '#0ea5e9';
              e.currentTarget.style.background = '#f0f9ff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.background = 'white';
            }}
          >
            <Plus size={22} strokeWidth={2.5} />
            Agregar nuevo colaborador
          </button>

        </div>

        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1 }}>
            {isCurrentWeekRegistered ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#dcfce7', color: '#166534', padding: '16px', borderRadius: '12px', fontWeight: '600' }}>
                <CheckCircle2 size={24} color="#166534" />
                La nómina de esta semana ya está registrada y sincronizada.
              </div>
            ) : (
              <button 
                onClick={handleRegisterCurrentWeek}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white', border: 'none', padding: '16px', borderRadius: '12px', cursor: 'pointer',
                  fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                <DollarSign size={20} />
                Confirmar Registro de Nómina
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sheet — Formulario Colaborador */}
      {isEditingForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={() => setIsEditingForm(false)}
            onTouchMove={e => e.preventDefault()}
          />

          {/* Sheet */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            background: 'white',
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d1d5db' }} />
            </div>

            {/* Header */}
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                {currentCollab.id ? 'Editar Colaborador' : 'Nuevo Colaborador'}
              </h3>
              <button
                onClick={() => setIsEditingForm(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body scroll interno */}
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Nombre completo</label>
                <input
                  type="text"
                  value={currentCollab.name || ''}
                  onChange={e => setCurrentCollab({...currentCollab, name: e.target.value})}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '16px', boxSizing: 'border-box' }}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Unidad de Negocio</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Restaurante', 'Hotel', 'Servicios profesionales'].map(unit => {
                    const active = currentCollab.unit === unit;
                    const colors: Record<string, [string, string, string]> = {
                      'Restaurante': ['#fef3c7', '#f59e0b', '#92400e'],
                      'Hotel': ['#ede9fe', '#8b5cf6', '#4c1d95'],
                      'Servicios profesionales': ['#dcfce7', '#22c55e', '#14532d'],
                    };
                    const [bg, border, text] = active ? colors[unit] : ['white', '#d1d5db', '#6b7280'];
                    return (
                      <button key={unit} onClick={() => setCurrentCollab({...currentCollab, unit: unit as any})}
                        style={{ flex: '1 1 auto', padding: '12px 8px', borderRadius: '10px', border: `1.5px solid ${border}`, fontSize: '14px', background: bg, color: text, fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
                        {unit}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Frecuencia de pago</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Semanal', 'Mensual'].map(freq => {
                    const active = currentCollab.payment_frequency === freq;
                    return (
                      <button key={freq} onClick={() => setCurrentCollab({...currentCollab, payment_frequency: freq as any})}
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1.5px solid ${active ? '#0284c7' : '#d1d5db'}`, fontSize: '14px', background: active ? '#e0f2fe' : 'white', color: active ? '#0369a1' : '#6b7280', fontWeight: active ? 700 : 400, cursor: 'pointer' }}>
                        {freq}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Remuneración Base (MXN)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '16px' }}>$</span>
                  <input
                    type="number"
                    value={currentCollab.remuneration || ''}
                    onChange={e => setCurrentCollab({...currentCollab, remuneration: parseFloat(e.target.value) || 0})}
                    style={{ width: '100%', padding: '14px 16px 14px 34px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '16px', boxSizing: 'border-box' }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveCollaborator}
                disabled={!currentCollab.name}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                  background: currentCollab.name ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : '#e2e8f0',
                  color: currentCollab.name ? 'white' : '#94a3b8',
                  fontWeight: 700, fontSize: '16px',
                  cursor: currentCollab.name ? 'pointer' : 'not-allowed',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                }}
              >
                <Save size={18} />
                Guardar Colaborador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
