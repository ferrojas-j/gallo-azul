import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Building, Utensils, Save, X, Wallet, Calendar } from 'lucide-react';
import { dbOperationalExpenses } from '../lib/supabaseService';
import type { OperationalExpense } from '../lib/supabaseService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(amount);
};

const CATEGORIES = ['Servicios', 'Impuestos', 'Compras'] as const;
const UNITS = ['Hotel', 'Restaurante', 'General'] as const;

// Genera lista de meses disponibles (últimos 18 meses)
const getMonthOptions = () => {
  const options: { value: string; label: string }[] = [{ value: 'all', label: 'Todos los meses' }];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
};

export const ExpenseManager: React.FC = () => {
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<OperationalExpense>>({
    date: new Date().toISOString().split('T')[0],
    category: 'Servicios',
    unit: 'Restaurante',
    concept: '',
    amount: 0
  });

  const monthOptions = getMonthOptions();

  // Bloquea scroll del fondo - ambos html y body
  useEffect(() => {
    if (isEditing) {
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
  }, [isEditing]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbOperationalExpenses.getAll();
      if (error) {
        console.error('Error loading expenses:', error);
      }
      if (data) {
        setExpenses(data as OperationalExpense[]);
      }
    } catch (err) {
      console.error('Exception loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSave = async () => {
    if (!currentExpense.concept || !currentExpense.amount || !currentExpense.date) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    if (currentExpense.id) {
      await dbOperationalExpenses.update(currentExpense.id, {
        date: currentExpense.date,
        category: currentExpense.category as any,
        unit: currentExpense.unit as any,
        concept: currentExpense.concept,
        amount: currentExpense.amount
      });
    } else {
      await dbOperationalExpenses.insert({
        date: currentExpense.date!,
        category: currentExpense.category as any,
        unit: currentExpense.unit as any,
        concept: currentExpense.concept!,
        amount: currentExpense.amount!
      });
    }

    setIsEditing(false);
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
      await dbOperationalExpenses.delete(id);
      loadExpenses();
    }
  };

  const openNew = () => {
    setCurrentExpense({
      date: new Date().toISOString().split('T')[0],
      category: 'Servicios',
      unit: 'Restaurante',
      concept: '',
      amount: 0
    });
    setIsEditing(true);
  };

  const openEdit = (expense: OperationalExpense) => {
    setCurrentExpense(expense);
    setIsEditing(true);
  };

  const filteredExpenses = expenses.filter(e => {
    if (filterMonth !== 'all') {
      const expMonth = e.date.substring(0, 7); // "YYYY-MM"
      if (expMonth !== filterMonth) return false;
    }
    if (searchTerm && !e.concept.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const catColors: Record<string, { bg: string; color: string }> = {
    'Servicios': { bg: '#eff6ff', color: '#1e40af' },
    'Impuestos': { bg: '#fef3c7', color: '#92400e' },
    'Compras': { bg: '#ecfdf5', color: '#047857' }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#1e293b' }}>Registro de Gastos</h2>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', border: 'none', padding: '14px 24px',
            borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '16px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', width: '100%'
          }}
        >
          <Plus size={20} strokeWidth={2.5} />
          Nuevo Gasto
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Búsqueda por concepto */}
        <div style={{ flex: '1 1 200px', position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por concepto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px',
              border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '15px',
              boxSizing: 'border-box', background: 'white'
            }}
          />
        </div>

        {/* Filtro por mes */}
        <div style={{ flex: '1 1 180px', position: 'relative' }}>
          <Calendar size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{
              width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px',
              border: '1.5px solid #e2e8f0', outline: 'none', background: 'white',
              fontSize: '15px', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
              color: filterMonth === 'all' ? '#94a3b8' : '#1e293b'
            }}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen total */}
      {filteredExpenses.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '12px', padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px'
        }}>
          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
            {filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? 's' : ''}
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>TOTAL</div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>
              {formatCurrency(totalFiltered)}
            </div>
          </div>
        </div>
      )}

      {/* Lista de gastos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando gastos...</div>
      ) : filteredExpenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          No se encontraron gastos que coincidan con los filtros.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredExpenses.map(expense => {
            const cColor = catColors[expense.category] || catColors['Servicios'];
            const unitColor = expense.unit === 'Restaurante' ? '#f59e0b' : expense.unit === 'General' ? '#3b82f6' : '#8b5cf6';
            return (
              <div key={expense.id} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '16px',
                borderLeft: `4px solid ${unitColor}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 'bold', wordBreak: 'break-word' }}>{expense.concept}</h4>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(expense)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(expense.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      {expense.unit === 'Restaurante' ? <Utensils size={13} /> : expense.unit === 'Hotel' ? <Building size={13} /> : <Wallet size={13} />}
                      {expense.unit}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{expense.date}</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ background: cColor.bg, color: cColor.color, padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '11px' }}>
                      {expense.category}
                    </span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 16px', borderRadius: '8px', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Monto</div>
                  <div style={{ fontSize: '18px', color: '#0f172a', fontWeight: 900, fontFamily: 'monospace' }}>
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── BOTTOM SHEET FORMULARIO ─── */}
      {isEditing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          {/* Backdrop — bloquea TODOS los toques del fondo */}
          <div
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={() => setIsEditing(false)}
            onTouchMove={e => e.preventDefault()}
          />

          {/* Bottom Sheet */}
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

            {/* Header — siempre visible */}
            <div style={{ padding: '14px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                {currentExpense.id ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body — scroll interno */}
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '32px' }}>
              {/* Fecha */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Fecha</label>
                <input
                  type="date"
                  value={currentExpense.date}
                  onChange={e => setCurrentExpense({...currentExpense, date: e.target.value})}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#334155' }}
                />
              </div>

              {/* Categoría + Unidad */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Categoría</label>
                  <select
                    value={currentExpense.category}
                    onChange={e => setCurrentExpense({...currentExpense, category: e.target.value as any})}
                    style={{ width: '100%', padding: '14px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '15px', backgroundColor: '#f8fafc', color: '#334155', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Unidad</label>
                  <select
                    value={currentExpense.unit}
                    onChange={e => setCurrentExpense({...currentExpense, unit: e.target.value as any})}
                    style={{ width: '100%', padding: '14px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '15px', backgroundColor: '#f8fafc', color: '#334155', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Concepto</label>
                <input
                  type="text"
                  value={currentExpense.concept}
                  onChange={e => setCurrentExpense({...currentExpense, concept: e.target.value})}
                  placeholder="Ej. CFE Bimestre Ene-Feb"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#334155' }}
                />
              </div>

              {/* Monto */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Monto (MXN)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '16px', fontWeight: 'bold' }}>$</span>
                  <input
                    type="number"
                    value={currentExpense.amount || ''}
                    onChange={e => setCurrentExpense({...currentExpense, amount: Number(e.target.value)})}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '14px 16px 14px 34px', borderRadius: '12px', border: '1.5px solid #d1d5db', outline: 'none', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#f8fafc', color: '#334155' }}
                  />
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '15px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Save size={18} />
                  Guardar Gasto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
