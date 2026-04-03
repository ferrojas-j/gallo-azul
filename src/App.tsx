import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid, ClipboardCheck, Settings, ChevronLeft, Users, Check, X,
  Plus, Lock, Home as HomeIcon, UserPlus, Trash2, User, ChevronRight,
  LogOut, FileEdit, PlusCircle, TrendingUp, TrendingDown, CalendarDays, Search, StickyNote,
  Pencil, ChevronDown, ChevronUp, AlertTriangle, Zap,
} from 'lucide-react';
import './index.css';
import { CATEGORIES } from './data/menu';
import type { MenuItem, MenuVariant } from './data/menu';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import type { UserRow } from './lib/supabaseService';

// ─── App ─────────────────────────────────────────────────
export default function App() {
  // Supabase sync
  const {
    tables, tableOrders, activeItems, menuItems, users,
    todayIncome, todayCashIncome, todayTransferIncome, todayAccountsCount, todayExpenses, todayExpensesList, todayClosedOrders, dailySummaries, isLoading,
    addItemToOrder, removeItem, markItemDone, updateItemNotes,
    checkoutTable, confirmPayment, addExpense,
    toggleMenuItem, toggleMenuVariant,
    updateMenuItem, updateMenuVariant, updateCategory,
    addTable, deleteTable,
    addUser, deleteUser, updateUser, closeSession,
    closeDay, deleteShiftSummary,
  } = useSupabaseSync();


  // UI state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: 'Administrador' | 'Staff' } | null>(() => {
    try { const s = localStorage.getItem('mora_session'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'salon' | 'pedidos' | 'admin' | 'mesa' | 'checkout'>('home');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [adminSubView, setAdminSubView] = useState<'main' | 'menu' | 'users' | 'tables' | 'stats'>('main');
  const [mesaTab, setMesaTab] = useState<'orden' | 'menu'>('orden');
  const [menuCategory, setMenuCategory] = useState(CATEGORIES[0]);
  const [menuSearch, setMenuSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseConcept, setExpenseConcept] = useState('Pago a proveedores');
  const [expenseDetail, setExpenseDetail] = useState('');

  // Add User modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Administrador' | 'Staff'>('Staff');
  const INITIAL_PASSWORD = 'LaMora.2026';

  // Edit User modal
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'Administrador' | 'Staff'>('Staff');

  // Edit menu modal
  type EditTarget = { type: 'item'; id: string; name: string; price: number } | { type: 'variant'; id: string; label: string; price: number } | { type: 'category'; id: string; name: string };
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const openEditItem = (item: MenuItem) => { setEditTarget({ type: 'item', id: item.id, name: item.name, price: item.price }); setEditName(item.name); setEditPrice(String(item.price)); };
  const openEditVariant = (v: MenuVariant) => { setEditTarget({ type: 'variant', id: v.id, label: v.label, price: v.price }); setEditName(v.label); setEditPrice(String(v.price)); };
  const openEditCategory = (id: string, name: string) => { setEditTarget({ type: 'category', id, name }); setEditName(name); setEditPrice(''); };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (editTarget.type === 'item') await updateMenuItem(editTarget.id, editName.trim(), parseFloat(editPrice));
    else if (editTarget.type === 'variant') await updateMenuVariant(editTarget.id, editName.trim(), parseFloat(editPrice));
    else if (editTarget.type === 'category') await updateCategory(editTarget.id, editName.trim());
    setEditTarget(null);
  };

  const toggleExpanded = (id: string) => setExpandedItems(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Notes modal
  const [notesModal, setNotesModal] = useState<{ itemId: string; current: string } | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  // Quick-confirm modal
  type ConfirmPending = { item: MenuItem; variant?: MenuVariant };
  const [confirmPending, setConfirmPending] = useState<ConfirmPending | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deliveryConfirm, setDeliveryConfirm] = useState<string | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  useEffect(() => {

    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Stats / Analytics hooks — must be at top level (Rules of Hooks)
  const [statsSubView, setStatsSubView] = useState<'history' | 'analytics'>('history');
  const [analyticsFilter, setAnalyticsFilter] = useState<'day' | 'month' | 'total'>('total');
  const [ranking, setRanking] = useState<{name: string, count: number}[]>([]);

  useEffect(() => {
    if (statsSubView === 'analytics') {
      const now = new Date();
      const allItems: string[] = [];

      dailySummaries.forEach(s => {
        const d = new Date(s.created_at);
        let match = false;
        if (analyticsFilter === 'day') match = d.toDateString() === now.toDateString();
        else if (analyticsFilter === 'month') match = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        else match = true;
        if (match && s.items_summary) {
          s.items_summary.split(', ').forEach((p: string) => {
            const m = p.match(/(\d+)x (.+)/);
            if (m) { const qty = parseInt(m[1]); for(let i=0;i<qty;i++) allItems.push(m[2]); }
          });
        }
      });

      todayClosedOrders.forEach(o => {
        const d = new Date(o.closed_at || '');
        let match = false;
        if (analyticsFilter === 'day') match = d.toDateString() === now.toDateString();
        else if (analyticsFilter === 'month') match = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        else match = true;
        if (match && o.items_summary) {
          o.items_summary.split(', ').forEach((p: string) => {
            const m = p.match(/(\d+)x (.+)/);
            if (m) { const qty = parseInt(m[1]); for(let i=0;i<qty;i++) allItems.push(m[2]); }
          });
        }
      });

      const counts = allItems.reduce((acc, name) => { acc[name] = (acc[name] || 0) + 1; return acc; }, {} as Record<string, number>);
      setRanking(Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 10));
    }
  }, [statsSubView, analyticsFilter, dailySummaries, todayClosedOrders]);

  // ── Computed ─────────────────────────────────────────

  const selectedTableItems = useMemo(
    () => activeItems.filter(i => i.table_id === selectedTableId),
    [activeItems, selectedTableId]
  );

  const currentTableTotal = useMemo(
    () => selectedTableItems.reduce((acc, i) => acc + i.price * i.qty, 0),
    [selectedTableItems]
  );

  const pendingItems = useMemo(
    () => activeItems.filter(i => i.status === 'pending'),
    [activeItems]
  );

  const filteredMenuItems = useMemo(() => {
    const isVisible = (m: MenuItem) => {
      if (!m.active) return false;
      if (m.hasVariants) return (m.variants?.some(v => v.active)) ?? false;
      return true;
    };
    const base = menuItems.filter(m => isVisible(m) && m.category === menuCategory);
    if (!menuSearch.trim()) return base;
    return menuItems.filter(m => isVisible(m) && m.name.toLowerCase().includes(menuSearch.toLowerCase()));
  }, [menuItems, menuCategory, menuSearch]);

  // ── Handlers ─────────────────────────────────────────

  const navTo = (view: 'home' | 'salon' | 'pedidos' | 'admin') => {
    setCurrentView(view);
    setSelectedTableId(null);
    if (view === 'admin') setAdminSubView('main');
  };

  const openTable = (id: number) => {
    setSelectedTableId(id);
    setCurrentView('mesa');
    setMesaTab('orden');
    setMenuCategory(CATEGORIES[0]);
    setMenuSearch('');
  };

  const handleAddItem = (item: MenuItem, variant?: MenuVariant) => {
    if (!selectedTableId) return;
    setConfirmNotes('');
    setConfirmPending({ item, variant });
  };

  const confirmAddItem = async () => {
    if (!confirmPending || !selectedTableId) return;
    await addItemToOrder(selectedTableId, confirmPending.item, confirmPending.variant, confirmNotes.trim() || undefined);
    setConfirmPending(null);
    setConfirmNotes('');
    setMesaTab('orden');
  };

  const handleProceedToCheckout = async () => {
    if (!selectedTableId) return;
    await checkoutTable(selectedTableId);
    setCurrentView('checkout');
    setPaymentMethod('efectivo');
  };

  const handleConfirmPayment = async () => {
    if (!selectedTableId) return;
    await confirmPayment(selectedTableId, paymentMethod);
    navTo('salon');
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseAmount);
    if (!isNaN(amount) && amount > 0) {
      await addExpense(amount, expenseConcept, expenseDetail);
      setIsExpenseModalOpen(false);
      setExpenseAmount(''); setExpenseDetail(''); setExpenseConcept('Pago a proveedores');
    }
  };

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    await updateItemNotes(notesModal.itemId, notesDraft);
    setNotesModal(null);
  };

  const handleAdminAddTable = async () => {
    const n = prompt('Número de la nueva mesa:');
    if (!n) return;
    const id = parseInt(n, 10);
    if (isNaN(id)) return alert('Número inválido');
    if (tables.find(t => t.id === id)) return alert('Esa mesa ya existe');
    await addTable(id);
  };

  const handleAdminDeleteTable = async (id: number) => {
    if (confirm(`¿Eliminar Mesa ${id}?`)) await deleteTable(id);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const { error } = await addUser(newUserName.trim(), newUserRole, INITIAL_PASSWORD);
    if (error) {
      alert(`Error al crear usuario: ${error.message}`);
      return;
    }
    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserRole('Staff');
  };

  const openEditUser = (user: UserRow) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserRole(user.role);
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId || !editUserName.trim()) return;
    await updateUser(editingUserId, editUserName.trim(), editUserRole);
    setIsEditUserModalOpen(false);
  };

  // ── Loading screen ───────────────────────────────────

  // ── Login screen ─────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    await new Promise(r => setTimeout(r, 400)); // small UX delay
    const found = users.find(
      u => u.name.toLowerCase() === loginName.trim().toLowerCase() && u.password === loginPassword && u.active
    );
    setLoginLoading(false);
    if (!found) {
      setLoginError('Usuario o contraseña incorrectos');
      return;
    }
    const session = { id: found.id, name: found.name, role: found.role };
    localStorage.setItem('mora_session', JSON.stringify(session));
    setCurrentUser(session);
  };


  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#64748b' }}>
        <div className="loading-spinner" />
        <div style={{ fontSize: 15, fontWeight: 600 }}>Conectando con el servidor…</div>
        <div style={{ fontSize: 13 }}>Sincronizando datos en tiempo real</div>
      </div>
    );
  }

  // ── Login screen ─────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="app-container login-screen">
        <div className="login-logo">🍴</div>
        <h1 className="login-title">La Mora</h1>
        <p className="login-subtitle">Sistema de punto de venta</p>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>Nombre de usuario</label>
            <input
              type="text"
              placeholder="Ej. María López"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••••"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {loginError && <div className="login-error">{loginError}</div>}
          <button className="btn-primary" type="submit" disabled={loginLoading}>
            {loginLoading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
        <div className="login-hint">Contraseña inicial: <strong>LaMora.2026</strong></div>
      </div>
    );
  }

  // ── Renders ──────────────────────────────────────────

  const renderHome = () => {
    const freeTables = tables.filter(t => !tableOrders[t.id]).length;
    const activePedidos = pendingItems.length;
    const connectedStaff = users.filter(u => u.session_active);

    // Mexico City time
    const formatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeFormatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
    });

    const timeStr = timeFormatter.format(currentTime);
    const dateStr = formatter.format(currentTime);
    const dayStr = dayFormatter.format(currentTime);

    return (
      <div className="fade-in">
        {/* Clock hero card */}
        <div className="home-clock-card">
          <div className="home-clock-badge">México · CDT</div>
          <div className="home-clock-day">{dayStr}</div>
          <div className="home-clock-date">{dateStr.replace(dayStr, '').trim().replace(/^,\s*/, '')}</div>
          <div className="home-clock-time">{timeStr}</div>
        </div>

        {/* Stat cards */}
        <div className="home-stats-grid">
          <div className="home-stat-card tables">
            <div className="home-stat-icon">🪑</div>
            <div className="home-stat-value">{freeTables}</div>
            <div className="home-stat-label">Mesas disponibles</div>
          </div>
          <div className="home-stat-card orders">
            <div className="home-stat-icon">🛎️</div>
            <div className="home-stat-value">{activePedidos}</div>
            <div className="home-stat-label">Pedidos activos</div>
          </div>
        </div>

        {/* Connected staff */}
        <div className="home-staff-card">
          <div className="home-staff-header">
            <span className="home-staff-title">Staff activo</span>
            {connectedStaff.length > 0 && (
              <span className="home-staff-count">{connectedStaff.length} en línea</span>
            )}
          </div>
          {connectedStaff.length === 0 ? (
            <div className="home-staff-empty">Ningún usuario conectado aún</div>
          ) : (
            <div className="home-staff-list">
              {connectedStaff.map(u => (
                <div key={u.id} className="home-staff-item">
                  <div className="home-staff-avatar">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="home-staff-name">{u.name}</div>
                  <span className={`home-staff-role ${u.role === 'Administrador' ? 'admin' : 'staff'}`}>
                    {u.role === 'Administrador' ? 'Admin' : 'Staff'}
                  </span>
                  <div className="home-online-dot" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSalon = () => {
    // Derive status from live data: if there's an active order → occupied; if paying → paying; else free
    const getEffectiveStatus = (tableId: number): 'free' | 'occupied' | 'paying' => {
      const order = tableOrders[tableId];
      if (!order) return 'free';
      if (order.status === 'paying') return 'paying';
      return 'occupied';
    };
    const occupiedCount = tables.filter(t => getEffectiveStatus(t.id) === 'occupied').length;
    const payingCount = tables.filter(t => getEffectiveStatus(t.id) === 'paying').length;
    const freeCount = tables.filter(t => getEffectiveStatus(t.id) === 'free').length;

    return (
      <div className="fade-in">
        {/* Summary stats */}
        <div className="salon-summary-bar">
          <div className="salon-stat ocp">
            <div className="salon-stat-count">{occupiedCount}</div>
            <div className="salon-stat-label">Ocupadas</div>
          </div>
          <div className="salon-stat pay">
            <div className="salon-stat-count">{payingCount}</div>
            <div className="salon-stat-label">Pagando</div>
          </div>
          <div className="salon-stat free">
            <div className="salon-stat-count">{freeCount}</div>
            <div className="salon-stat-label">Libres</div>
          </div>
        </div>

        {/* Legend */}
        <div className="salon-legend">
          <div className="salon-legend-item free">
            <div className="salon-legend-pip" /> Libre
          </div>
          <div className="salon-legend-item occupied">
            <div className="salon-legend-pip" /> Ocupada
          </div>
          <div className="salon-legend-item paying">
            <div className="salon-legend-pip" /> Pagando
          </div>
        </div>

        {/* Table grid */}
        <div className="card-grid">
          {tables.map(table => {
            const effectiveStatus = getEffectiveStatus(table.id);
            const tableItems = activeItems.filter(i => i.table_id === table.id);
            const total = tableItems.reduce((s, i) => s + i.price * i.qty, 0);
            const itemCount = tableItems.length;

            return (
              <div
                key={table.id}
                className={`table-card ${effectiveStatus}`}
                onClick={() => openTable(table.id)}
              >
                {/* Header */}
                <div className="tc-header">
                  <span className="tc-label">Mesa</span>
                  <div className="tc-dot" />
                </div>

                {/* Big number */}
                <div className="tc-number">{table.id.toString().padStart(2, '0')}</div>

                {/* Footer info by status */}
                <div className="tc-footer">
                  {effectiveStatus === 'free' && (
                    <span className="tc-status-free">Libre</span>
                  )}
                  {effectiveStatus === 'occupied' && (
                    <>
                      <span className="tc-items">{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
                      <span className="tc-total">${total.toFixed(0)}</span>
                    </>
                  )}
                  {effectiveStatus === 'paying' && (
                    <span className="tc-paying-badge">⏳ Cobrando</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMesa = () => {
    const count = selectedTableItems.length;
    return (
      <div className="fade-in mesa-layout">
        <div className="mesa-tabs">
          <button className={`mesa-tab ${mesaTab === 'orden' ? 'active' : ''}`} onClick={() => setMesaTab('orden')}>
            📋 Orden {count > 0 && <span className="mesa-tab-badge">{count}</span>}
          </button>
          <button className={`mesa-tab ${mesaTab === 'menu' ? 'active' : ''}`} onClick={() => setMesaTab('menu')}>
            🍰 Ver Menú
          </button>
        </div>

        {/* ORDEN tab */}
        {mesaTab === 'orden' && (
          <div className="mesa-orden-panel">
            {selectedTableItems.length === 0 ? (
              <div className="empty-order">
                <div style={{ fontSize: 56, marginBottom: 16 }}>🥐</div>
                <h3 style={{ fontSize: 18, color: '#0f172a', marginBottom: 4 }}>Cuenta vacía</h3>
                <p style={{ fontSize: 14 }}>Toca <strong>Menú</strong> para agregar deliciosa comida</p>
              </div>
            ) : (
              <div className="order-items-list">
                {selectedTableItems.map(item => (
                  <div className="order-item-row" key={item.id}>
                    <button className="order-item-remove" onClick={async () => await removeItem(item.id)}>
                      <X size={14} />
                    </button>
                    <div className="order-item-info">
                      <div className={`order-item-name ${item.status === 'done' ? 'item-done' : ''}`}>{item.name}</div>
                      {item.variant_label && (
                        <span className={`variant-chip ${item.variant_label.toLowerCase().includes('integral') ? 'integral' : 'blanco'}`}>
                          {item.variant_label}
                        </span>
                      )}
                      {item.notes && <div className="order-item-notes">“{item.notes}”</div>}
                    </div>
                    <div className="order-item-right">
                      <div className="order-item-price">${item.price}</div>
                      <button className="notes-btn" onClick={() => {
                        setNotesDraft(item.notes ?? '');
                        setNotesModal({ itemId: item.id, current: item.notes ?? '' });
                      }}>
                        <StickyNote size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedTableItems.length > 0 && (
              <div className="order-footer">
                <div className="order-total-row">
                  <span className="order-total-label">Subtotal Mesa</span>
                  <span className="order-total-amount">${currentTableTotal}</span>
                </div>
                <button className="btn-dark" onClick={handleProceedToCheckout}>
                  <Check size={20} /> Proceder al Pago
                </button>
              </div>
            )}
          </div>
        )}

        {/* MENÚ tab */}
        {mesaTab === 'menu' && (
          <div className="mesa-menu-panel">
            <div className="menu-search-wrap">
              <Search size={16} className="menu-search-icon" />
              <input
                className="menu-search-input"
                placeholder="Buscar platillo..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
              />
              {menuSearch && <button className="menu-search-clear" onClick={() => setMenuSearch('')}><X size={14} /></button>}
            </div>
            {!menuSearch && (
              <div className="category-chips-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`category-chip ${menuCategory === cat ? 'active' : ''}`}
                    onClick={() => setMenuCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            <div className="menu-items-list">
              {filteredMenuItems.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  No se encontraron resultados
                </div>
              )}
              {filteredMenuItems.map(item => (
                <div key={item.id} className="menu-order-item">
                  <div className="menu-order-item-header">
                    <div className="menu-order-item-name">{item.name}</div>
                    {!item.hasVariants && (
                      <button className="single-add-btn" onClick={() => handleAddItem(item)}>
                        <span>${item.price}</span>
                        <Plus size={15} />
                      </button>
                    )}
                  </div>
                  {item.hasVariants && (
                    <div className="variant-btns">
                      {item.variants?.filter(v => v.active).map(v => (
                        <button
                          key={v.id}
                          className={`variant-add-btn ${v.label.toLowerCase().includes('integral') ? 'integral' : 'blanco'}`}
                          onClick={() => handleAddItem(item, v)}
                        >
                          <span className="variant-label">{v.label}</span>
                          <span className="variant-price">${v.price}</span>
                          <span className="variant-tap">Agregar</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCheckout = () => (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Total a pagar</div>
        <div style={{ fontSize: 56, fontWeight: 600, color: '#0e122b', letterSpacing: -1 }}>${currentTableTotal}.00</div>
      </div>
      <label className="label">Método de pago</label>
      <div className="payment-grid" style={{ marginBottom: 40 }}>
        {(['efectivo', 'transferencia'] as const).map(m => (
          <div key={m} className={`payment-card ${paymentMethod === m ? 'selected' : ''}`} onClick={() => setPaymentMethod(m)}>
            {paymentMethod === m && <div className="check-badge"><Check size={12} strokeWidth={3} /></div>}
            <div className="payment-icon-wrapper"><span style={{ fontSize: 20 }}>{m === 'efectivo' ? '💵' : '🏦'}</span></div>
            <div className="payment-text">{m === 'efectivo' ? 'Efectivo' : 'Transferencia'}</div>
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={handleConfirmPayment}>Registrar como pagado</button>
    </div>
  );

  const renderPedidos = () => (
    <div className="fade-in pedidos-view">
      {pendingItems.length === 0 ? (
        <div className="empty-pedidos">
          <div style={{ fontSize: 64, marginBottom: 20 }}>👩‍🍳</div>
          <h2>Tu cocina está al día</h2>
          <p>Los nuevos pedidos aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="pedidos-list">
          {pendingItems.map(item => {
            const category = menuItems.find(m => m.name === item.name)?.category ?? '';
            return (
            <div className="qa-card" key={item.id}>
              <div className="qa-header">
                <div className="qa-table-badge">Mesa {item.table_id}</div>
                <div className="qa-qty-label">x{item.qty}</div>
              </div>
              <div className="qa-body">
                <div className="qa-info">
                  {category && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                      textTransform: 'uppercase', color: '#6366f1',
                      background: '#eef2ff', borderRadius: 6,
                      padding: '2px 8px', marginBottom: 4,
                    }}>
                      {category}
                    </div>
                  )}
                  <div className="qa-name">{item.name}</div>
                  {item.variant_label && <div className="qa-variant">{item.variant_label}</div>}
                  {item.notes && (
                    <div className="qa-notes-box">
                      <StickyNote size={13} strokeWidth={2.5} />
                      <span>{item.notes}</span>
                    </div>
                  )}
                </div>
                <button
                  className="qa-done-btn"
                  onClick={() => setDeliveryConfirm(item.id)}
                >
                  <Check size={22} strokeWidth={3} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      {deliveryConfirm && (
        <div className="confirm-overlay" onClick={() => setDeliveryConfirm(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-sheet-pill" />
            <div className="confirm-sheet-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Check size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
              ¿Confirmas que este pedido fue entregado?
            </h3>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setDeliveryConfirm(null)}>No, aún no</button>
              <button className="confirm-ok" onClick={async () => {
                await markItemDone(deliveryConfirm);
                setDeliveryConfirm(null);
              }}>
                Sí, entregado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAdminMain = () => {
    const mexicoDate = currentTime.toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const mexicoTime = currentTime.toLocaleTimeString('es-MX', {
      timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit',
    });
    return (
      <div className="fade-in">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={14} /> {mexicoDate}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
            {mexicoTime} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>CDMX</span>
          </div>
        </div>

        <div className="admin-summary-grid">
          <div className="admin-summary-card income">
            <div className="as-icon"><TrendingUp size={20} /></div>
            <div className="as-content">
              <div className="as-label">Ingresos</div>
              <div className="as-value">${todayIncome.toFixed(0)}</div>
              <div className="as-sub">{todayAccountsCount} cuentas cobradas</div>
            </div>
          </div>
          <div className="admin-summary-card expenses">
            <div className="as-icon"><TrendingDown size={20} /></div>
            <div className="as-content">
              <div className="as-label">Gastos</div>
              <div className="as-value">${todayExpenses.toFixed(0)}</div>
              <div className="as-sub">{todayExpensesList.length} registros hoy</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <button className="btn-primary" onClick={() => setIsExpenseModalOpen(true)} style={{ flex: 1, padding: '14px', fontSize: 15, borderRadius: 16, background: '#fecaca', color: '#991b1b', border: 'none' }}>
            <Plus size={18} /> Gasto
          </button>
          <button className="btn-outline" onClick={() => setIsCierreModalOpen(true)} style={{ flex: 1, padding: '14px', fontSize: 15, borderRadius: 16 }}>
            <Lock size={18} /> Cierre
          </button>
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Administración</div>
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Gestión de Menú', view: 'menu', icon: <FileEdit size={20} />, bg: '#e0e7ff', color: '#4f46e5' },
            { label: 'Gestión de Mesas', view: 'tables', icon: <LayoutGrid size={20} />, bg: '#fef9c3', color: '#ca8a04' },
            { label: 'Estadísticas', view: 'stats', icon: <TrendingUp size={20} />, bg: '#dcfce7', color: '#16a34a' },
            { label: 'Usuarios Autorizados', view: 'users', icon: <Users size={20} />, bg: '#fce7f3', color: '#db2777' },
          ].map(({ label, view, icon, bg, color }) => (
            <div key={view} className="admin-menu-item" onClick={() => setAdminSubView(view as any)}>
              <div className="admin-menu-icon" style={{ backgroundColor: bg, color }}>{icon}</div>
              <div className="admin-menu-text">{label}</div>
              <ChevronRight size={20} color="#94a3b8" />
            </div>
          ))}
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardCheck size={20} color="#6366f1" />
          Cuentas del Turno
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {todayClosedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', background: '#fff', borderRadius: 16, border: '1px solid var(--border-strong)' }}>
              Aún no hay cuentas pagadas en este turno.
            </div>
          ) : todayClosedOrders.map(order => (
            <div key={order.id} style={{ backgroundColor: '#fff', padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Mesa {order.table_id.toString().padStart(2, '0')}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>${order.total?.toFixed(0)}</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                {order.items_summary || 'Sin detalle'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CalendarDays size={12} />
                  {new Date(order.closed_at || '').toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ 
                  fontSize: 10, padding: '2px 8px', borderRadius: 8, 
                  background: order.payment_method === 'efectivo' ? '#ecfdf5' : '#eff6ff', 
                  color: order.payment_method === 'efectivo' ? '#059669' : '#2563eb', 
                  fontWeight: 700, textTransform: 'capitalize' 
                }}>
                  {order.payment_method || 'Sin método'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Usuarios Conectados</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 40 }}>
          {users.filter(u => u.session_active).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Ningún usuario conectado.</div>
          ) : users.filter(u => u.session_active).map(user => (
            <div key={user.id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="var(--primary-dark)" />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, backgroundColor: '#22c55e', borderRadius: '50%', border: '2px solid #fff' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{user.role}</div>
                </div>
              </div>
              <button onClick={() => closeSession(user.id)} style={{ backgroundColor: 'transparent', border: '1px solid var(--danger-light)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <LogOut size={14} /> Cerrar
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAdminMenu = () => {
    const byCategory = CATEGORIES.map(cat => ({
      cat,
      items: menuItems.filter(m => m.category === cat),
      catId: menuItems.find(m => m.category === cat)?.categoryId,
    })).filter(g => g.items.length > 0);

    return (
      <div className="fade-in" style={{ paddingBottom: 40 }}>
        {byCategory.map(({ cat, items, catId }) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            {/* Category header with edit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{cat}</h3>
              {catId && (
                <button onClick={() => openEditCategory(catId, cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  <Pencil size={13} />
                </button>
              )}
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid var(--border-strong)', overflow: 'hidden' }}>
              {items.map((item, idx) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div key={item.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    {/* Item row */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: item.active ? '#0f172a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.name}
                          {!item.active && <span style={{ fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>INACTIVO</span>}
                        </div>
                        {!item.hasVariants && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>${item.price}</div>
                        )}
                        {item.hasVariants && (
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {item.variants?.map(v => `${v.label}: $${v.price}`).join(' / ')}
                          </div>
                        )}
                      </div>

                      {/* Edit item (non-variant only) */}
                      {!item.hasVariants && (
                        <button onClick={() => openEditItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', flexShrink: 0 }}>
                          <Pencil size={15} />
                        </button>
                      )}

                      {/* Expand for variant items */}
                      {item.hasVariants && (
                        <button onClick={() => toggleExpanded(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', flexShrink: 0 }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}

                      {/* Toggle for non-variant items */}
                      {!item.hasVariants && (
                        <label className="toggle-switch" style={{ transform: 'scale(0.8)', flexShrink: 0 }}>
                          <input type="checkbox" checked={item.active} onChange={() => toggleMenuItem(item.id, !item.active)} />
                          <span className="toggle-slider" />
                        </label>
                      )}

                      {/* Toggle all for variant items */}
                      {item.hasVariants && (
                        <label className="toggle-switch" style={{ transform: 'scale(0.8)', flexShrink: 0 }}>
                          <input type="checkbox" checked={item.active} onChange={() => toggleMenuItem(item.id, !item.active)} />
                          <span className="toggle-slider" />
                        </label>
                      )}
                    </div>

                    {/* Variant rows (expanded) */}
                    {item.hasVariants && isExpanded && (
                      <div style={{ background: '#fafafa', borderTop: '1px solid #f1f5f9', padding: '8px 16px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Variantes</div>
                        {item.variants?.map(v => (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: v.active ? '#0f172a' : '#94a3b8' }}>{v.label}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>${v.price}</div>
                            </div>
                            <button onClick={() => openEditVariant(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', flexShrink: 0 }}>
                              <Pencil size={14} />
                            </button>
                            <label className="toggle-switch" style={{ transform: 'scale(0.75)', flexShrink: 0 }}>
                              <input type="checkbox" checked={v.active} onChange={() => toggleMenuVariant(v.id, !v.active)} />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };


  const renderAdminStats = () => (
    <div className="fade-in admin-stats-view">
      <div className="stats-header-tabs">
        <button className={`stats-tab ${statsSubView === 'history' ? 'active' : ''}`} onClick={() => setStatsSubView('history')}>Historial</button>
        <button className={`stats-tab ${statsSubView === 'analytics' ? 'active' : ''}`} onClick={() => setStatsSubView('analytics')}>Análisis</button>
      </div>

      {statsSubView === 'history' ? (
        <>
          <div className="stats-header">
            <h3>Historial de Cierres</h3>
            <span className="stats-count">{dailySummaries.length} reportes registrados</span>
          </div>
          
          <div className="reports-list">
            {dailySummaries.map(report => (
              <div key={report.id} className="report-card">
                <div className="report-card-header">
                  <div className="rc-date">
                    <CalendarDays size={14} />
                    {new Date(report.created_at).toLocaleDateString('es-MX', { 
                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="rc-user">Admin: {report.closed_by}</div>
                </div>
                
                <div className="report-card-stats">
                  <div className="rc-stat">
                    <span className="rc-label">Ingresos</span>
                    <span className="rc-value income">${report.income.toFixed(0)}</span>
                  </div>
                  <div className="rc-stat">
                    <span className="rc-label">Gastos</span>
                    <span className="rc-value expense">${report.expenses.toFixed(0)}</span>
                  </div>
                  <div className="rc-stat">
                    <span className="rc-label">Cuentas</span>
                    <span className="rc-value grey">{report.accounts_count}</span>
                  </div>
                </div>

                {report.expenses_list?.length > 0 && (
                  <div className="rc-expenses-detail">
                    <div className="rc-exp-title">Gastos del día</div>
                    {report.expenses_list.map((exp: any, i: number) => (
                      <div key={i} className="rc-exp-row">
                        <span>{exp.concept}</span>
                        <strong>${exp.amount}</strong>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="report-card-footer">
                  <span>Balance Neto:</span>
                  <strong>${(report.income - report.expenses).toFixed(0)}</strong>
                  <button
                    onClick={() => setDeleteReportId(report.id)}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      cursor: 'pointer', color: '#ef4444', padding: '4px 8px',
                      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 500,
                    }}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="analytics-view">
          <div className="analytics-filters">
            <button className={`filter-btn ${analyticsFilter === 'day' ? 'active' : ''}`} onClick={() => setAnalyticsFilter('day')}>Hoy</button>
            <button className={`filter-btn ${analyticsFilter === 'month' ? 'active' : ''}`} onClick={() => setAnalyticsFilter('month')}>Este Mes</button>
            <button className={`filter-btn ${analyticsFilter === 'total' ? 'active' : ''}`} onClick={() => setAnalyticsFilter('total')}>Acumulado</button>
          </div>

          {(() => {
            const now = new Date();
            const filtered = dailySummaries.filter(s => {
              const d = new Date(s.created_at);
              if (analyticsFilter === 'day') return d.toDateString() === now.toDateString();
              if (analyticsFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              return true;
            });

            const totalInc = filtered.reduce((sum, s) => sum + s.income, 0);
            const totalExp = filtered.reduce((sum, s) => sum + s.expenses, 0);
            const totalAcc = filtered.reduce((sum, s) => sum + s.accounts_count, 0);

            return (
              <div className="analytics-content">
                <div className="analytics-summary">
                  <div className="as-metric">
                    <div className="as-m-val">${totalInc.toFixed(0)}</div>
                    <div className="as-m-lab">Ingresos</div>
                  </div>
                  <div className="as-metric">
                    <div className="as-m-val">${totalExp.toFixed(0)}</div>
                    <div className="as-m-lab">Gastos</div>
                  </div>
                  <div className="as-metric">
                    <div className="as-m-val">{totalAcc}</div>
                    <div className="as-m-lab">Cuentas</div>
                  </div>
                </div>

                <div className="analytics-ranking-box">
                  <h4><Zap size={16} /> Ranking de Pedidos (Top 10)</h4>
                  <div className="ranking-list">
                    {ranking.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                        No hay datos suficientes para generar el ranking.
                      </p>
                    ) : (
                      ranking.map((item, idx) => (
                        <div key={idx} className="ranking-item">
                          <div className="ri-idx">#{idx + 1}</div>
                          <div className="ri-content">
                            <div className="ri-top">
                              <span className="ri-name">{item.name}</span>
                              <span className="ri-count">{item.count} vendidos</span>
                            </div>
                            <div className="ri-progress-bg">
                              <div className="ri-progress-fill" style={{ width: `${(item.count / ranking[0].count) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  const renderAdminTables = () => (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      <button className="btn-primary" onClick={handleAdminAddTable} style={{ marginBottom: 24 }}>
        <PlusCircle size={18} /> Agregar Mesa
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tables.map(table => (
          <div key={table.id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18 }}>🪑</span>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Mesa {table.id.toString().padStart(2, '0')}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{table.status === 'free' ? 'Libre' : table.status === 'occupied' ? 'Ocupada' : 'Pagando'}</div>
              </div>
            </div>
            <Trash2 size={18} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handleAdminDeleteTable(table.id)} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminUsers = () => (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      <button className="btn-primary" onClick={() => setIsAddUserModalOpen(true)} style={{ marginBottom: 24 }}>
        <UserPlus size={18} /> Agregar Usuario
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {users.map(user => (
          <div key={user.id} style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                backgroundColor: user.role === 'Administrador' ? '#e0e7ff' : '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={20} color={user.role === 'Administrador' ? '#4f46e5' : '#16a34a'} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {user.role === 'Administrador' ? '🔑 Administrador' : '👤 Staff'} — {user.active ? 'Autorizado' : 'Bloqueado'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Pencil size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => openEditUser(user)} />
              <Trash2 size={18} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => {
                if (confirm(`¿Eliminar al usuario ${user.name}?`)) deleteUser(user.id);
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHeader = () => {
    const isSubView = ['mesa', 'checkout'].includes(currentView) || (currentView === 'admin' && adminSubView !== 'main');
    const subTitles: Record<string, string> = {
      menu: 'Menú', users: 'Autorizados', tables: 'Mesas', stats: 'Estadísticas',
    };
    return (
      <div className="header">
        {isSubView ? (
          <button className="icon-button" onClick={() => {
            if (currentView === 'admin' && adminSubView !== 'main') setAdminSubView('main');
            else if (currentView === 'checkout') setCurrentView('mesa');
            else setCurrentView('salon');
          }}>
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="header-title-container">
            <span className="header-title">
              {currentView === 'home' && 'Inicio'}
              {currentView === 'salon' && 'Salón'}
              {currentView === 'pedidos' && 'Pedidos'}
              {currentView === 'admin' && 'Admin'}
            </span>
          </div>
        )}
        {currentView === 'mesa' && (
          <div className="header-title-container" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 }}>Atendiendo</span>
            <span className="header-title" style={{ fontSize: 26, fontWeight: 800 }}>
              Mesa {selectedTableId?.toString().padStart(2, '0')}
            </span>
          </div>
        )}
        {currentView === 'checkout' && (
          <div className="header-title-container" style={{ alignItems: 'center' }}>
            <span className="header-title" style={{ fontSize: 22, fontWeight: 600 }}>Cobrar</span>
          </div>
        )}
        {currentView === 'admin' && adminSubView !== 'main' && (
          <div className="header-title-container" style={{ alignItems: 'center' }}>
            <span className="header-title" style={{ fontSize: 20, fontWeight: 600 }}>{subTitles[adminSubView] || ''}</span>
          </div>
        )}
        {currentView === 'mesa' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px', fontSize: 13, fontWeight: 800 }}>
            <Users size={15} color="#64748b" /> {tables.find(t => t.id === selectedTableId)?.capacity ?? 4}
          </div>
        ) : isSubView ? (
          <div style={{ width: 44 }} />
        ) : (
          <div className="header-user-chip">
            <div className="header-user-avatar">{currentUser.name[0].toUpperCase()}</div>
            <button
              className="header-logout-btn"
              title="Cerrar sesión"
              onClick={() => {
                localStorage.removeItem('mora_session');
                setCurrentUser(null);
                setLoginName('');
                setLoginPassword('');
                setCurrentView('home');
              }}

            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────

  return (
    <div className="app-container">
      {renderHeader()}
      <div className="content-area">
        {currentView === 'home' && renderHome()}
        {currentView === 'salon' && renderSalon()}
        {currentView === 'mesa' && renderMesa()}
        {currentView === 'checkout' && renderCheckout()}
        {currentView === 'pedidos' && renderPedidos()}
        {currentView === 'admin' && adminSubView === 'main' && renderAdminMain()}
        {currentView === 'admin' && adminSubView === 'menu' && renderAdminMenu()}
        {currentView === 'admin' && adminSubView === 'users' && renderAdminUsers()}
        {currentView === 'admin' && adminSubView === 'tables' && renderAdminTables()}
        {currentView === 'admin' && adminSubView === 'stats' && renderAdminStats()}
      </div>

      {['home', 'salon', 'pedidos', 'admin'].includes(currentView) && adminSubView === 'main' && (
        <div className="bottom-nav">
          {[
            { view: 'home', icon: <HomeIcon className="nav-icon" />, label: 'Inicio' },
            { view: 'salon', icon: <LayoutGrid className="nav-icon" />, label: 'Salón' },
            { view: 'pedidos', icon: <ClipboardCheck className="nav-icon" />, label: 'Pedidos' },
            ...(currentUser?.role === 'Administrador'
              ? [{ view: 'admin', icon: <Settings className="nav-icon" />, label: 'Admin' }]
              : []),
          ].map(({ view, icon, label }) => (
            <div key={view} className={`nav-item ${currentView === view ? 'active' : ''}`} onClick={() => navTo(view as any)}>
              {icon}{label}
            </div>
          ))}
        </div>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <div className="modal-overlay" onClick={() => setNotesModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Notas del item</h3>
              <button className="modal-close" onClick={() => setNotesModal(null)}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label>Indicaciones especiales</label>
              <textarea rows={3} value={notesDraft} onChange={e => setNotesDraft(e.target.value)} placeholder="Sin cebolla, extra picante..." />
            </div>
            <button className="btn-primary" onClick={handleSaveNotes}>Guardar nota</button>
          </div>
        </div>
      )}

      {/* Quick Confirm Modal */}
      {confirmPending && (
        <div className="confirm-overlay" onClick={() => setConfirmPending(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-sheet-pill" />
            <div className="confirm-sheet-label">Confirmar pedido</div>
            <div className="confirm-item-name">{confirmPending.item.name}</div>
            {confirmPending.variant && (
              <div className={`confirm-variant-badge ${confirmPending.variant.label.toLowerCase().includes('integral') ? 'integral' : 'blanco'}`}>
                {confirmPending.variant.label}
              </div>
            )}
            <div className="confirm-price">
              {confirmPending.variant ? confirmPending.variant.price : confirmPending.item.price}
            </div>
            {/* Notes input */}
            <div className="confirm-notes-wrap">
              <label className="confirm-notes-label">
                📝 Notas especiales <span>(opcional)</span>
              </label>
              <textarea
                className="confirm-notes-input"
                placeholder="Ej: sin cebolla, extra picante, leche vegana..."
                value={confirmNotes}
                onChange={e => setConfirmNotes(e.target.value)}
                rows={2}
                maxLength={150}
              />
            </div>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirmPending(null)}>Cancelar</button>
              <button className="confirm-ok" onClick={confirmAddItem}>
                <Plus size={16} /> Agregar a la orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cierre Modal */}
      {isCierreModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCierreModalOpen(false)}>
          <div className="modal-content cierre-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirmar Cierre Diario</h3>
              <button className="modal-close" onClick={() => setIsCierreModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="cierre-body">
              <div className="cierre-summary-box">
                <div className="csb-stat">
                  <div className="csb-val income">${todayIncome.toFixed(0)}</div>
                  <div className="csb-lab">Ingresos ({todayAccountsCount} cuentas)</div>
                </div>
                <div className="csb-stat">
                  <div className="csb-val expense">${todayExpenses.toFixed(0)}</div>
                  <div className="csb-lab">Gastos ({todayExpensesList.length} registros)</div>
                </div>
              </div>

              <div className="cierre-breakdown">
                <div className="cb-item">
                  <span className="cb-dot cash"></span>
                  <span className="cb-label">Efectivo:</span>
                  <span className="cb-value">${todayCashIncome.toFixed(0)}</span>
                </div>
                <div className="cb-item">
                  <span className="cb-dot transfer"></span>
                  <span className="cb-label">Transferencia:</span>
                  <span className="cb-value">${todayTransferIncome.toFixed(0)}</span>
                </div>
              </div>

              {todayExpensesList.length > 0 && (
                <div className="cierre-list-wrap">
                  <h4>Lista de Gastos</h4>
                  <div className="cierre-list">
                    {todayExpensesList.map((exp, idx) => (
                      <div key={idx} className="cierre-list-item">
                        <div className="cli-info">
                          <div className="cli-concept">{exp.concept}</div>
                          {exp.detail && <div className="cli-detail">{exp.detail}</div>}
                        </div>
                        <div className="cli-price">${exp.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="cierre-total-box">
                <span>Resultado del Balance:</span>
                <strong>${(todayIncome - todayExpenses).toFixed(0)}</strong>
              </div>

              <div className="cierre-warning-box">
                <AlertTriangle size={20} />
                <p>Al confirmar, se generará un reporte permanente en estadísticas y se reiniciarán los valores para el próximo turno.</p>
              </div>

              <button 
                className="btn-primary cierre-submit"
                onClick={async () => {
                  if (currentUser) {
                    await closeDay(currentUser.name);
                    setIsCierreModalOpen(false);
                    setAdminSubView('stats');
                  }
                }}
              >
                Ejecutar Cierre General
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar Gasto</h3>
              <button className="modal-close" onClick={() => setIsExpenseModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-group">
                <label>Monto Pagado ($)</label>
                <input type="number" step="0.01" required value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Concepto</label>
                <select value={expenseConcept} onChange={e => setExpenseConcept(e.target.value)}>
                  <option>Pago a proveedores</option>
                  <option>Compra de insumos</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Detalle / Notas</label>
                <textarea rows={3} value={expenseDetail} onChange={e => setExpenseDetail(e.target.value)} placeholder="Descripción del gasto..." />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>Guardar Gasto</button>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddUserModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Agregar Usuario</h3>
              <button className="modal-close" onClick={() => setIsAddUserModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUserSubmit}>
              <div className="form-group">
                <label>Nombre de usuario</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Ej. María López"
                />
              </div>
              <div className="form-group">
                <label>Contraseña inicial</label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 12, padding: '11px 14px',
                }}>
                  <Lock size={16} color="#94a3b8" />
                  <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'monospace', color: '#475569', letterSpacing: 1 }}>
                    {INITIAL_PASSWORD}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>predeterminada</span>
                </div>
              </div>
              <div className="form-group">
                <label>Perfil de acceso</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['Staff', 'Administrador'] as const).map(role => (
                    <div
                      key={role}
                      onClick={() => setNewUserRole(role)}
                      style={{
                        padding: '14px 12px', borderRadius: 14,
                        border: `2px solid ${newUserRole === role ? (role === 'Administrador' ? '#4f46e5' : '#16a34a') : '#e2e8f0'}`,
                        background: newUserRole === role ? (role === 'Administrador' ? '#e0e7ff' : '#f0fdf4') : '#f8fafc',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{role === 'Administrador' ? '🔑' : '👤'}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: newUserRole === role ? (role === 'Administrador' ? '#4f46e5' : '#16a34a') : '#64748b' }}>
                        {role}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {role === 'Administrador' ? 'Acceso total' : 'Acceso básico'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                <UserPlus size={18} /> Crear Usuario
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditUserModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Usuario</h3>
              <button className="modal-close" onClick={() => setIsEditUserModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditUserSubmit}>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editUserName}
                  onChange={e => setEditUserName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Perfil</label>
                <div className="role-selector-grid">
                  {(['Administrador', 'Staff'] as const).map(role => (
                    <div
                      key={role}
                      className={`role-option ${editUserRole === role ? 'active' : ''}`}
                      onClick={() => setEditUserRole(role)}
                    >
                      <div className="role-check">
                        {editUserRole === role && <Check size={14} strokeWidth={4} />}
                      </div>
                      <div className="role-text">{role}</div>
                      <div className="role-badge">
                        {role === 'Administrador' ? 'Acceso total' : 'Acceso básico'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                <Check size={18} /> Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Menu Modal (items, variants, categories) */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editTarget.type === 'category' ? 'Editar Categoría' : editTarget.type === 'variant' ? 'Editar Variante' : 'Editar Producto'}
              </h3>
              <button className="modal-close" onClick={() => setEditTarget(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="form-group">
                <label>{editTarget.type === 'variant' ? 'Nombre de la variante' : 'Nombre'}</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              {editTarget.type !== 'category' && (
                <div className="form-group">
                  <label>Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                  />
                </div>
              )}
              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                <Check size={18} /> Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Report Confirmation Modal */}
      {deleteReportId && (
        <div className="modal-overlay" onClick={() => setDeleteReportId(null)}>
          <div className="modal-content" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>Eliminar Reporte</h3>
              <button className="modal-close" onClick={() => setDeleteReportId(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: '16px 0 8px', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
              ¿Confirmas que deseas eliminar este reporte de cierre? Esta acción <strong>no se puede deshacer</strong>.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setDeleteReportId(null)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await deleteShiftSummary(deleteReportId);
                  setDeleteReportId(null);
                }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
