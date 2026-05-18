import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Building, Utensils, Users, Save, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { dbCollaborators, dbPayroll } from '../lib/supabaseService';
import type { CollaboratorRow, PayrollRecord } from '../lib/supabaseService';
import { PayrollManager } from './PayrollManager';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(amount);
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

export const StaffManager: React.FC = () => {
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPayrolls, setExpandedPayrolls] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'staff' | 'payroll'>('staff');

  const loadCollaborators = async () => {
    setLoading(true);
    try {
      const [dataCollab, dataPayroll] = await Promise.all([
        dbCollaborators.getAll(),
        dbPayroll.getAll()
      ]);
      
      if (dataCollab.error) console.error('Error loading collaborators:', dataCollab.error);
      else if (dataCollab.data) {
        setCollaborators(dataCollab.data as CollaboratorRow[]);
      }
      
      if (dataPayroll.error) console.error('Error loading payrolls:', dataPayroll.error);
      else if (dataPayroll.data) {
        // Sort payrolls descending by year, then month, then week
        const sortedPayrolls = (dataPayroll.data as PayrollRecord[]).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          if (a.month !== b.month) return b.month - a.month;
          return b.week - a.week;
        });
        setPayrolls(sortedPayrolls);
      }
    } catch (err) {
      console.error('Exception loading staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaborators();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este colaborador?')) {
      await dbCollaborators.delete(id);
      loadCollaborators();
    }
  };

  const handleDeletePayroll = async (id: string, week: number, year: number) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el registro de nómina de la Semana ${week} del ${year}? Esto también lo eliminará del portal de finanzas corporativas.`)) {
      await dbPayroll.delete(id);
      loadCollaborators();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedPayrolls(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (viewMode === 'payroll') {
    return <PayrollManager onBack={() => setViewMode('staff')} />;
  }

  return (
    <div className="staff-manager" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        .action-buttons-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .staff-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 16px;
          width: 100%;
          -webkit-appearance: none;
          text-align: center;
        }
        @media (min-width: 768px) {
          .action-buttons-container {
            flex-direction: row;
            width: auto;
          }
          .staff-action-btn {
            width: auto;
          }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#1e293b' }}>Remuneraciones de staff</h2>
        <div className="action-buttons-container">
          <button 
            className="staff-action-btn"
            onClick={() => setViewMode('payroll')}
            style={{
              background: 'white', color: '#10b981', border: '1.5px solid #10b981'
            }}
          >
            Registrar pago de salario
          </button>
        </div>
      </div>



      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando registros de nómina...</div>
      ) : payrolls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', color: '#64748b', border: '1px dashed #cbd5e1' }}>
          No hay nóminas registradas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {payrolls.map(p => {
            const isExpanded = expandedPayrolls[p.id!];
            const activeCollaborators = collaborators.filter(c => c.active);
            const paidCollaborators = activeCollaborators.filter(c => calcEmpVal(c, p.week, p.year) > 0);
            const totalPayrollAmount = paidCollaborators.reduce((sum, c) => sum + calcEmpVal(c, p.week, p.year), 0);

            return (
              <div key={p.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <div 
                  onClick={() => toggleExpand(p.id!)}
                  style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: '200px' }}>
                    <div style={{ background: '#eff6ff', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="m9 16 2 2 4-4"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#0f172a', whiteSpace: 'nowrap' }}>Semana {p.week}</span>
                        {isLastWeekOfMonth(p.week, p.year) && (
                          <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            Corte mensual
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '14px' }}>Año {p.year}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '0 0 auto', marginLeft: 'auto' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Total Pagado</div>
                      <div style={{ fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(totalPayrollAmount)}</div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePayroll(p.id!, p.week, p.year); }} 
                      style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Eliminar Nómina"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div style={{ color: '#94a3b8' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '12px' }}>Detalle de pagos ({paidCollaborators.length} colaboradores):</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {paidCollaborators.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ color: '#1e293b', fontWeight: '500' }}>{c.name}</div>
                          <div style={{ color: '#0f172a', fontWeight: 'bold' }}>{formatCurrency(calcEmpVal(c, p.week, p.year))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
