import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid, ClipboardCheck, Settings, ChevronLeft, Users, Check, X,
  Plus, Lock, Home as HomeIcon, UserPlus, Trash2, User, ChevronRight,
  LogOut, FileEdit, PlusCircle, TrendingUp, TrendingDown, CalendarDays, Search, StickyNote,
  Pencil, ChevronDown, ChevronUp, AlertTriangle, Zap, Eye, EyeOff, Clock, Printer
} from 'lucide-react';
import './index.css';
import { CATEGORIES } from './data/menu';
import type { MenuItem, MenuVariant } from './data/menu';
import { supabase } from './lib/supabase';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import type { UserRow } from './lib/supabaseService';

// ─── App ─────────────────────────────────────────────────
export default function App() {
  // Supabase sync
  const {
    tables, tableOrders, activeItems, menuItems, users,
    todayIncome, todayCashIncome, todayTransferIncome, todayTransferTips, todayAccountsCount, todayExpenses, todayExpensesList, todayClosedOrders, dailySummaries, isLoading,
    createOrderForTable, addItemToOrder, removeItem, markItemDone, updateItemNotes,
    checkoutTable, confirmPayment, addExpense,
    toggleMenuItem, toggleMenuVariant,
    updateMenuItem, updateMenuVariant, updateCategory,
    addCategory, addMenuItem, addMenuVariant,
    addTable, deleteTable,
    addUser, deleteUser, updateUser, closeSession,
    closeDay, deleteShiftSummary, logPrintedTicket,
  } = useSupabaseSync();

  // UI state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: 'Administrador' | 'Staff' | 'Encargado' } | null>(() => {
    try { const s = localStorage.getItem('mora_session'); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
  const [newUserRole, setNewUserRole] = useState<'Administrador' | 'Staff' | 'Encargado'>('Staff');
  const INITIAL_PASSWORD = 'LaMora.2026';

  // Edit User modal
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'Administrador' | 'Staff' | 'Encargado'>('Staff');

  // Unified Custom Confirm Modal for tables (opening accounts and confirming payments)
  const [tableConfirmModal, setTableConfirmModal] = useState<{
    isOpen: boolean;
    type: 'open' | 'pay' | 'closeEmpty';
    tableId: number | null;
  }>({ isOpen: false, type: 'open', tableId: null });

  const [printCuentaModal, setPrintCuentaModal] = useState<{isOpen: boolean, tableId: number | null}>({isOpen: false, tableId: null});

  const handlePrintCuenta = async () => {
    if (printCuentaModal.tableId) {
      const items = activeItems.filter(i => i.table_id === printCuentaModal.tableId);
      const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
      const summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');
      await logPrintedTicket(printCuentaModal.tableId, currentUser?.name || 'Unknown', total, summary);
    }
    
    window.print();
    setPrintCuentaModal({isOpen: false, tableId: null});
  };

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

  // Add item modal
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'fixed' | 'variants'>('fixed');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(''); 
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemVariants, setNewItemVariants] = useState<{label: string, price: string}[]>([]);

  const handleAddItemModalOpen = () => {
    setIsAddItemModalOpen(true);
    setNewItemName('');
    setNewItemType('fixed');
    setNewItemPrice('');
    setNewItemCategory('');
    setNewCategoryName('');
    setNewItemVariants([{label: 'Pan Blanco', price: ''}, {label: 'Integral', price: ''}]);
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategory) return;
    
    let catId = newItemCategory;
    if (newItemCategory === 'NEW') {
      if (!newCategoryName.trim()) return;
      const { data } = await addCategory(newCategoryName.trim());
      if (data) {
        catId = data.id;
      } else {
        return;
      }
    }

    const { data: itemData } = await addMenuItem({
      name: newItemName.trim(),
      price: newItemType === 'fixed' ? parseFloat(newItemPrice) || 0 : 0,
      category_id: catId,
      has_variants: newItemType === 'variants',
      active: true,
    });

    if (itemData && newItemType === 'variants') {
      let order = 0;
      for (const v of newItemVariants) {
        if (v.label.trim()) {
           await addMenuVariant({
             menu_item_id: itemData.id,
             label: v.label.trim(),
             price: parseFloat(v.price) || 0,
             active: true,
             sort_order: order++,
           });
        }
      }
    }

    setIsAddItemModalOpen(false);
  };

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

  // Checkout extended states
  const [discountType, setDiscountType] = useState<'none' | 'amount' | 'percentage'>('none');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [tipPercent, setTipPercent] = useState<'none' | '10' | '15' | '20' | 'Otro'>('none');
  const [customTip, setCustomTip] = useState<string>('');

  const [expandedPedidos, setExpandedPedidos] = useState<number[]>([]);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // iOS manual setup (no beforeinstallprompt fired here)
  const isIosDevice = () => {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  };
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const [showIosButton, setShowIosButton] = useState(false);

  useEffect(() => {
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    if (isIosDevice() && !isStandalone && !window.matchMedia('(display-mode: standalone)').matches) {
      setShowIosButton(true);
    }
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert("La aplicación no está lista para instalarse. Intente recargar.");
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (err: any) {
      alert("Error al instalar: " + err.message);
    }
  };

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

  const openTable = async (id: number) => {
    const isOccupied = !!tableOrders[id];
    if (!isOccupied) {
      // Free table -> Show custom UI prompt
      setTableConfirmModal({ isOpen: true, type: 'open', tableId: id });
      return;
    }
    // Already occupied -> open directly
    setSelectedTableId(id);
    setCurrentView('mesa');
    setMesaTab('orden');
    setMenuCategory(CATEGORIES[0]);
    setMenuSearch('');
  };

  const handleConfirmOpenTable = async () => {
    if (tableConfirmModal.tableId) {
      await createOrderForTable(tableConfirmModal.tableId);
      setSelectedTableId(tableConfirmModal.tableId);
      setCurrentView('mesa');
      setMesaTab('orden');
      setMenuCategory(CATEGORIES[0]);
      setMenuSearch('');
    }
    setTableConfirmModal({ isOpen: false, type: 'open', tableId: null });
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

    const pendingItems = activeItems.filter(i => i.table_id === selectedTableId && i.status === 'pending');
    if (pendingItems.length > 0) {
      alert('⚠️ Aún hay platillos pendientes de entrega en esta mesa. Debes entregarlos (tacharlos) para proceder al pago.');
      return;
    }

    await checkoutTable(selectedTableId);
    setDiscountType('none');
    setDiscountValue('');
    setDiscountReason('');
    setCashReceived('');
    setTipPercent('none');
    setCustomTip('');
    setCurrentView('checkout');
    setPaymentMethod('efectivo');
  };

  const handleConfirmPayment = async () => {
    if (!selectedTableId) return;
    setTableConfirmModal({ isOpen: true, type: 'pay', tableId: selectedTableId });
  };

  const executePayment = async () => {
    if (!tableConfirmModal.tableId) return;
    
    // Calculate final total again here
    const items = activeItems.filter(i => i.table_id === tableConfirmModal.tableId);
    let finalTotal = items.reduce((s, i) => s + (i.price * i.qty), 0);
    const dVal = parseFloat(discountValue) || 0;
    if (discountType === 'amount') {
      finalTotal = Math.max(0, finalTotal - dVal);
    } else if (discountType === 'percentage') {
      finalTotal = Math.max(0, finalTotal * (1 - dVal / 100));
    }

    let tipAmount = 0;
    if (paymentMethod === 'transferencia') {
      if (tipPercent === 'Otro') {
        tipAmount = parseFloat(customTip) || 0;
      } else if (tipPercent !== 'none') {
        tipAmount = finalTotal * (parseFloat(tipPercent) / 100);
      }
    }

    await confirmPayment(tableConfirmModal.tableId, paymentMethod, finalTotal, tipAmount, discountReason);
    setTableConfirmModal({ isOpen: false, type: 'pay', tableId: null });
    navTo('salon');
  };

  const handleCancelTable = async () => {
    if (!tableConfirmModal.tableId) return;
    await confirmPayment(tableConfirmModal.tableId, 'Sin pedidos', 0);
    setTableConfirmModal({ isOpen: false, type: 'closeEmpty', tableId: null });
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
    // Mark session active in DB so 'connected users' list updates for everyone
    await supabase.from('users').update({ session_active: true }).eq('id', found.id);
    const session = { id: found.id, name: found.name, role: found.role };
    localStorage.setItem('mora_session', JSON.stringify(session));
    setCurrentUser(session);
  };

  // Mark session active when restoring from localStorage (page refresh)
  useEffect(() => {
    const stored = localStorage.getItem('mora_session');
    if (stored) {
      try {
        const s = JSON.parse(stored);
        supabase.from('users').update({ session_active: true }).eq('id', s.id);
      } catch {}
    }
    // Clean up on tab close
    const handleUnload = () => {
      const stored2 = localStorage.getItem('mora_session');
      if (stored2) {
        try {
          const s = JSON.parse(stored2);
          navigator.sendBeacon(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${s.id}`,
            JSON.stringify({ session_active: false })
          );
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);


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
        <form className="login-form" onSubmit={handleLogin} autoComplete="on">
          <div className="form-group">
            <label htmlFor="login-username">Nombre de usuario</label>
            <input
              id="login-username"
              name="username"
              type="text"
              placeholder="Ej. María López"
              value={loginName}
              onChange={e => setLoginName(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {loginError && <div className="login-error">{loginError}</div>}
          <button className="btn-primary" type="submit" disabled={loginLoading}>
            {loginLoading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
        <div className="login-hint">Contraseña inicial: <strong>LaMora.2026</strong></div>
        {deferredPrompt && (
          <button className="btn-primary" type="button" onClick={handleInstallPWA} style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#10b981', border: 'none' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Instalar App
          </button>
        )}
        {!deferredPrompt && showIosButton && (
          <button className="btn-primary" type="button" onClick={() => setIsIosPromptVisible(true)} style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#10b981', border: 'none' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Instalar en iPhone / iPad
          </button>
        )}

        {/* iOS Install Prompt Modal (Login View) */}
        {isIosPromptVisible && (
          <div className="modal-overlay" onClick={() => setIsIosPromptVisible(false)} style={{ zIndex: 9999 }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ width: 64, height: 64, background: '#eff6ff', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>Instalar La Mora</h3>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
                Para instalar la aplicación en tu iPhone o iPad, pulsa el botón de <strong>Compartir</strong> en la barra inferior (el cuadrado con la flecha hacia arriba) y luego selecciona <strong>"Agregar a inicio"</strong>.
              </p>
              <button className="btn-primary" onClick={() => setIsIosPromptVisible(false)}>
                Entendido
              </button>
            </div>
          </div>
        )}
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
                  <span className={`home-staff-role ${u.role === 'Administrador' ? 'admin' : u.role === 'Encargado' ? 'encargado' : 'staff'}`}>
                    {u.role === 'Administrador' ? 'Admin' : u.role === 'Encargado' ? 'Encdo' : 'Staff'}
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
    // Derive status from live data: table is occupied if there's any active order, free otherwise
    const getEffectiveStatus = (tableId: number): 'free' | 'occupied' => {
      return tableOrders[tableId] ? 'occupied' : 'free';
    };
    const occupiedCount = tables.filter(t => getEffectiveStatus(t.id) === 'occupied').length;
    const freeCount = tables.filter(t => getEffectiveStatus(t.id) === 'free').length;

    return (
      <div className="fade-in">
        {/* Summary stats */}
        <div className="salon-summary-bar">
          <div className="salon-stat ocp">
            <div className="salon-stat-count">{occupiedCount}</div>
            <div className="salon-stat-label">Ocupadas</div>
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
                <p style={{ fontSize: 14, marginBottom: 20 }}>Toca <strong>Menú</strong> para agregar deliciosa comida</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280, margin: '0 auto' }}>
                  <button
                    className="btn-primary"
                    style={{ borderRadius: 20, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                    onClick={() => setMesaTab('menu')}
                  >
                    <Plus size={18} />
                    Agregar pedidos
                  </button>
                  <button
                    className="btn-outline"
                    style={{ borderRadius: 20, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                    onClick={() => {
                        setTableConfirmModal({ isOpen: true, type: 'closeEmpty', tableId: selectedTableId })
                    }}
                  >
                    <X size={18} /> Liberar mesa
                  </button>
                </div>
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

                <button
                  onClick={() => setMesaTab('menu')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginTop: '16px',
                    borderRadius: '16px',
                    border: '2px dashed #cbd5e1',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: '15px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Agregar más pedidos
                </button>
              </div>
            )}
            {selectedTableItems.length > 0 && (
              <div className="order-footer">
                <div className="order-total-row">
                  <span className="order-total-label">Subtotal Mesa</span>
                  <span className="order-total-amount">${currentTableTotal}</span>
                </div>
                <button
                  className="btn-outline"
                  style={{ marginBottom: '12px', width: '100%', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, color: '#4f46e5', borderColor: '#cbd5e1' }}
                  onClick={() => setPrintCuentaModal({isOpen: true, tableId: selectedTableId})}
                >
                  <Printer size={20} /> Imprimir cuenta a cliente
                </button>
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
                {Array.from(new Set(menuItems.map(m => m.category))).sort().map(cat => (
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

  const renderCheckout = () => {
    const dVal = parseFloat(discountValue) || 0;
    let finalTotal = currentTableTotal;
    if (discountType === 'amount') {
      finalTotal = Math.max(0, currentTableTotal - dVal);
    } else if (discountType === 'percentage') {
      finalTotal = Math.max(0, currentTableTotal * (1 - dVal / 100));
    }
    
    const received = parseFloat(cashReceived) || 0;
    const change = Math.max(0, received - finalTotal);

    return (
      <div className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Total a pagar</div>
          <div style={{ fontSize: 56, fontWeight: 600, color: '#0e122b', letterSpacing: -1 }}>${finalTotal.toFixed(0)}</div>
          {discountType !== 'none' && (
            <div style={{ fontSize: 14, color: '#10b981', fontWeight: 600 }}>
              (Descuento aplicado: {discountType === 'amount' ? `$${dVal}` : `${dVal}%`})
            </div>
          )}
        </div>

        <div style={{ marginBottom: 32, background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <label className="label" style={{ marginBottom: 12 }}>Descuento (opcional)</label>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { type: 'none', label: 'Ninguno' },
              { type: 'percentage', label: '%' },
              { type: 'amount', label: '$' }
            ].map(d => (
              <button 
                key={d.type}
                onClick={() => { setDiscountType(d.type as any); setDiscountValue(''); }}
                style={{
                  flex: 1, padding: 10, borderRadius: 12, fontSize: 14, fontWeight: 600,
                  border: discountType === d.type ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: discountType === d.type ? '#e0e7ff' : '#fff',
                  color: discountType === d.type ? '#4f46e5' : '#64748b',
                  cursor: 'pointer'
                }}>
                {d.label}
              </button>
            ))}
          </div>
          {discountType !== 'none' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                type="number"
                placeholder={discountType === 'percentage' ? "Porcentaje ej: 10" : "Monto ej: 50"}
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16 }}
              />
              <input 
                type="text"
                placeholder="Motivo (ej. Promoción, Cumpleaños...)"
                value={discountReason}
                onChange={e => setDiscountReason(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16 }}
              />
            </div>
          )}
        </div>

        <label className="label">Método de pago</label>
        <div className="payment-grid" style={{ marginBottom: 24 }}>
          {(['efectivo', 'transferencia'] as const).map(m => (
            <div key={m} className={`payment-card ${paymentMethod === m ? 'selected' : ''}`} onClick={() => setPaymentMethod(m)}>
              {paymentMethod === m && <div className="check-badge"><Check size={12} strokeWidth={3} /></div>}
              <div className="payment-icon-wrapper"><span style={{ fontSize: 20 }}>{m === 'efectivo' ? '💵' : '🏦'}</span></div>
              <div className="payment-text">{m === 'efectivo' ? 'Efectivo' : 'Transferencia'}</div>
            </div>
          ))}
        </div>

        {paymentMethod === 'efectivo' && (
          <div style={{ marginBottom: 32, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <label className="label" style={{ marginBottom: 12 }}>Calculadora de Cambio</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Efectivo recibido:</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8', fontSize: 16 }}>$</span>
                  <input 
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px 16px 12px 28px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', padding: '12px 16px', borderRadius: 12 }}>
              <span style={{ color: '#059669', fontWeight: 600, fontSize: 14 }}>Cambio a entregar:</span>
              <span style={{ color: '#059669', fontWeight: 800, fontSize: 20 }}>${change.toFixed(0)}</span>
            </div>
          </div>
        )}

        {paymentMethod === 'transferencia' && (
          <div style={{ marginBottom: 32, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <label className="label" style={{ marginBottom: 12 }}>Propina</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: tipPercent === 'Otro' ? 16 : 0, overflowX: 'auto', paddingBottom: 4 }}>
              {(['none', '10', '15', '20', 'Otro'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => { setTipPercent(t); if(t !== 'Otro') setCustomTip(''); }}
                  style={{
                    flex: '1 0 auto', padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    border: tipPercent === t ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    background: tipPercent === t ? '#fef2f2' : '#fff',
                    color: tipPercent === t ? '#b91c1c' : '#64748b',
                    cursor: 'pointer',
                    minWidth: 70
                  }}>
                  {t === 'none' ? 'Sin propina' : t === 'Otro' ? 'Otro' : `${t}%`}
                </button>
              ))}
            </div>
            {tipPercent === 'Otro' && (
               <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8', fontSize: 16 }}>$</span>
                  <input 
                    type="number"
                    value={customTip}
                    onChange={e => setCustomTip(e.target.value)}
                    placeholder="Ejem. 50"
                    style={{ width: '100%', padding: '12px 16px 12px 28px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 600 }}
                  />
                </div>
            )}
            {tipPercent !== 'none' && tipPercent !== 'Otro' && (
              <div style={{ marginTop: 12, textAlign: 'right', fontSize: 14, color: '#0f172a', fontWeight: 600 }}>
                 +${((parseFloat(tipPercent) / 100) * finalTotal).toFixed(0)} de propina
              </div>
            )}
          </div>
        )}

        <button className="btn-primary" onClick={handleConfirmPayment}>Registrar como pagado</button>
      </div>
    );
  };

  const renderPedidos = () => {
    // Group activeItems by table
    const itemsByTable = activeItems.reduce((acc, item) => {
      if (!acc[item.table_id]) acc[item.table_id] = [];
      acc[item.table_id].push(item);
      return acc;
    }, {} as Record<number, typeof activeItems>);

    const tableIds = Object.keys(itemsByTable).map(Number).sort((a,b) => a - b);
    
    return (
      <div className="fade-in pedidos-view">
        {tableIds.length === 0 ? (
          <div className="empty-pedidos">
            <div style={{ fontSize: 64, marginBottom: 20 }}>👩‍🍳</div>
            <h2>Tu cocina está al día</h2>
            <p>Los nuevos pedidos aparecerán aquí automáticamente por mesa.</p>
          </div>
        ) : (
          <div className="pedidos-list">
            {tableIds.map(tableId => {
              const tableItems = itemsByTable[tableId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const isCollapsed = expandedPedidos.includes(tableId);
              const toggleCollapse = () => {
                setExpandedPedidos(prev => prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]);
              };

              // Oldest pending item to calculate time
              const pendingTableItems = tableItems.filter(i => i.status === 'pending');
              const oldestPending = pendingTableItems[0];
              
              let elapsedMinutes = 0;
              let isDelayed = false;
              let isWarning = false;
              let timeColor = '#10b981';

              if (oldestPending) {
                elapsedMinutes = Math.floor((currentTime.getTime() - new Date(oldestPending.created_at).getTime()) / 60000);
                isDelayed = elapsedMinutes >= 15;
                isWarning = elapsedMinutes >= 10 && !isDelayed;
                timeColor = isDelayed ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
              } else if (tableItems.length > 0) {
                timeColor = '#64748b'; // All done
              }

              return (
                <div className={`qa-card ${isDelayed ? 'delayed-alert' : ''}`} key={`pedidos-table-${tableId}`} style={{ ...(isDelayed ? { borderColor: '#fecaca', background: '#fef2f2' } : {}), padding: 0, overflow: 'hidden' }}>
                  <div 
                    className="qa-header" 
                    onClick={toggleCollapse} 
                    style={{ padding: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid #f1f5f9', margin: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="qa-table-badge">Mesa {tableId}</div>
                      {oldestPending ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: timeColor }}>
                          <Clock size={14} strokeWidth={3} />
                          {elapsedMinutes} min
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: timeColor }}>
                          <Check size={14} strokeWidth={3} />
                          Completado
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{pendingTableItems.length} pendientes</span>
                      <ChevronRight size={20} style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {tableItems.map(item => {
                        const category = menuItems.find(m => m.name === item.name)?.category ?? '';
                        const isDone = item.status === 'done';

                        return (
                          <div 
                            key={item.id} 
                            style={{ 
                              padding: '12px 16px',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              opacity: isDone ? 0.6 : 1,
                              background: isDone ? '#f8fafc' : 'transparent'
                            }}
                          >
                            <div className="qa-info" style={{ flex: 1, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#94a3b8' : 'inherit' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                {category && (
                                  <div style={{
                                    fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                                    textTransform: 'uppercase', color: '#6366f1',
                                    background: '#eef2ff', borderRadius: 6,
                                    padding: '2px 8px',
                                  }}>
                                    {category}
                                  </div>
                                )}
                                <span style={{ fontWeight: 800, fontSize: 13, color: '#475569' }}>x{item.qty}</span>
                              </div>
                              
                              <div className="qa-name" style={{ fontWeight: 700, fontSize: 16 }}>{item.name}</div>
                              {item.variant_label && <div className="qa-variant" style={{ fontSize: 13, marginTop: 2, color: '#64748b' }}>{item.variant_label}</div>}
                              {item.notes && (
                                <div className="qa-notes-box" style={{ marginTop: 6, background: '#fef3c7', color: '#d97706', border: 'none' }}>
                                  <StickyNote size={13} strokeWidth={2.5} />
                                  <span>{item.notes}</span>
                                </div>
                              )}
                            </div>
                            
                            {!isDone ? (
                              <button
                                className="qa-done-btn"
                                onClick={(e) => { e.stopPropagation(); setDeliveryConfirm(item.id); }}
                                style={{ marginLeft: 16 }}
                              >
                                <Check size={22} strokeWidth={3} />
                              </button>
                            ) : (
                              <div style={{ padding: '8px', color: '#10b981' }}>
                                <Check size={20} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
  };

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

        {(currentUser?.role === 'Administrador' || currentUser?.role === 'Encargado') && (
          <>
            <div className="admin-summary-grid">
              <div className="admin-summary-card income">
                <div className="as-icon"><TrendingUp size={20} /></div>
                <div className="as-content">
                  <div className="as-label">Ingresos</div>
                  <div className="as-value">${todayIncome.toFixed(0)}</div>
                  <div className="as-sub">{todayAccountsCount} cuentas cobradas</div>
                  {todayTransferTips > 0 && (
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                      + ${todayTransferTips.toFixed(0)} en propinas (transf.)
                    </div>
                  )}
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
          </>
        )}

        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Administración</div>
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Gestión de Menú', view: 'menu', icon: <FileEdit size={20} />, bg: '#e0e7ff', color: '#4f46e5' },
            { label: 'Gestión de Mesas', view: 'tables', icon: <LayoutGrid size={20} />, bg: '#fef9c3', color: '#ca8a04' },
            { label: 'Estadísticas', view: 'stats', icon: <TrendingUp size={20} />, bg: '#dcfce7', color: '#16a34a' },
            { label: 'Usuarios Autorizados', view: 'users', icon: <Users size={20} />, bg: '#fce7f3', color: '#db2777' },
          ]
          .filter(item => {
            if (currentUser?.role === 'Encargado') {
              return item.view === 'menu' || item.view === 'tables';
            }
            return true;
          })
          .map(({ label, view, icon, bg, color }) => (
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
    const uniqueCategories = Array.from(new Set(menuItems.map(m => m.category))).sort();
    const byCategory = uniqueCategories.map(cat => ({
      cat,
      items: menuItems.filter(m => m.category === cat),
      catId: menuItems.find(m => m.category === cat)?.categoryId,
    })).filter(g => g.items.length > 0);

    return (
      <div className="fade-in" style={{ paddingBottom: 40 }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleAddItemModalOpen} 
            className="btn-primary" 
            style={{ width: 'auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}
          >
            <Plus size={18} />
            Agregar Producto
          </button>
        </div>
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
                {(report.transfer_tips ?? 0) > 0 && (
                  <div style={{ padding: '0 16px 12px', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                     Propinas en transferencia: ${(report.transfer_tips ?? 0).toFixed(0)}
                  </div>
                )}

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
            const totalTips = filtered.reduce((sum, s) => sum + (s.transfer_tips || 0), 0);

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
                  <div className="as-metric">
                    <div className="as-m-val">${totalTips.toFixed(0)}</div>
                    <div className="as-m-lab">Propinas Tr.</div>
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
                backgroundColor: user.role === 'Administrador' ? '#e0e7ff' : user.role === 'Encargado' ? '#fefce8' : '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={20} color={user.role === 'Administrador' ? '#4f46e5' : user.role === 'Encargado' ? '#ca8a04' : '#16a34a'} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {user.role === 'Administrador' ? '🔑 Administrador' : user.role === 'Encargado' ? '🛡️ Encargado' : '👤 Staff'} — {user.active ? 'Autorizado' : 'Bloqueado'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}
                title="Instalar Aplicación"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Instalar
              </button>
            )}
            {!deferredPrompt && showIosButton && (
              <button
                onClick={() => setIsIosPromptVisible(true)}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}
                title="Instalar en iOS"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Instalar
              </button>
            )}
            <div className="header-user-chip">
              <div className="header-user-avatar">{currentUser.name[0].toUpperCase()}</div>
              <button
                className="header-logout-btn"
                title="Cerrar sesión"
                onClick={async () => {
                  // Mark this user as offline in DB before clearing state
                  if (currentUser?.id) {
                    await supabase.from('users').update({ session_active: false }).eq('id', currentUser.id);
                  }
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
            ...(currentUser?.role === 'Administrador' || currentUser?.role === 'Encargado'
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

      {/* Table Actions Confirm Modal (Open / Pay) */}
      {tableConfirmModal.isOpen && (
        <div className="confirm-overlay" onClick={() => setTableConfirmModal({ ...tableConfirmModal, isOpen: false })}>
          <div className="confirm-sheet" style={{ padding: 32, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              {tableConfirmModal.type === 'open' ? (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#3b82f6' }}>
                  <Plus size={32} />
                </div>
              ) : tableConfirmModal.type === 'closeEmpty' ? (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#ef4444' }}>
                  <X size={32} />
                </div>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#10b981' }}>
                  <Check size={32} />
                </div>
              )}
            </div>
            
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              {tableConfirmModal.type === 'open' ? `Abrir Mesa ${tableConfirmModal.tableId}` : tableConfirmModal.type === 'closeEmpty' ? `Liberar Mesa ${tableConfirmModal.tableId}` : `Cuenta Pagada`}
            </h3>
            
            <p style={{ fontSize: 16, color: '#64748b', marginBottom: 32, lineHeight: 1.5, padding: '0 12px' }}>
              {tableConfirmModal.type === 'open' 
                ? '¿Confirmas que deseas iniciar el registro de una cuenta nueva en esta mesa?' 
                : tableConfirmModal.type === 'closeEmpty'
                ? '¿Confirmas que deseas cerrar esta cuenta vacía y dejar la mesa libre nuevamente?'
                : '¿Confirmas que los productos han sido pagados y se liberará la mesa?'}
            </p>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setTableConfirmModal({ ...tableConfirmModal, isOpen: false })}
                style={{ flex: 1, padding: '16px', borderRadius: 16, border: '1px solid var(--border-color)', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 15 }}
              >
                Cancelar
              </button>
              <button 
                onClick={tableConfirmModal.type === 'open' ? handleConfirmOpenTable : tableConfirmModal.type === 'closeEmpty' ? handleCancelTable : executePayment}
                style={{ flex: 1, padding: '16px', borderRadius: 16, background: tableConfirmModal.type === 'open' ? '#3b82f6' : tableConfirmModal.type === 'closeEmpty' ? '#ef4444' : '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15 }}
              >
                Sí, Confirmar
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
                {todayTransferTips > 0 && (
                  <div className="cb-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="cb-dot" style={{ backgroundColor: '#10b981' }}></span>
                    <span className="cb-label">Propinas (Transf.):</span>
                    <span className="cb-value">${todayTransferTips.toFixed(0)}</span>
                  </div>
                )}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {(['Staff', 'Encargado', 'Administrador'] as const).map(role => (
                    <div
                      key={role}
                      onClick={() => setNewUserRole(role as any)}
                      style={{
                        padding: '14px 12px', borderRadius: 14,
                        border: `2px solid ${newUserRole === role ? (role === 'Administrador' ? '#4f46e5' : role === 'Encargado' ? '#eab308' : '#16a34a') : '#e2e8f0'}`,
                        background: newUserRole === role ? (role === 'Administrador' ? '#e0e7ff' : role === 'Encargado' ? '#fefce8' : '#f0fdf4') : '#f8fafc',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 22, clipPath: 'none', marginBottom: 4 }}>{role === 'Administrador' ? '🔑' : role === 'Encargado' ? '🛡️' : '👤'}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: newUserRole === role ? (role === 'Administrador' ? '#4f46e5' : role === 'Encargado' ? '#ca8a04' : '#16a34a') : '#64748b' }}>
                        {role}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.2 }}>
                        {role === 'Administrador' ? 'Acceso total' : role === 'Encargado' ? 'Gestión limitada' : 'Acceso operativo'}
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
                <div className="role-selector-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {(['Administrador', 'Encargado', 'Staff'] as const).map(role => (
                    <div
                      key={role}
                      className={`role-option ${editUserRole === role ? 'active' : ''}`}
                      onClick={() => setEditUserRole(role as any)}
                      style={{ fontSize: 13, flexDirection: 'column', padding: '12px 8px', textAlign: 'center' }}
                    >
                      <div className="role-check" style={{ marginBottom: 4, marginRight: 0 }}>
                        {editUserRole === role && <Check size={14} strokeWidth={4} />}
                      </div>
                      <div className="role-text" style={{ fontWeight: 700, fontSize: 12 }}>{role}</div>
                      <div className="role-badge" style={{ fontSize: 10 }}>
                        {role === 'Administrador' ? 'Total' : role === 'Encargado' ? 'Limitado' : 'Operativo'}
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

      {/* iOS Install Prompt Modal */}
      {isIosPromptVisible && (
        <div className="modal-overlay" onClick={() => setIsIosPromptVisible(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: 64, height: 64, background: '#eff6ff', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>Instalar La Mora</h3>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Para instalar la aplicación en tu iPhone o iPad, pulsa el botón de <strong>Compartir</strong> en la barra inferior (el cuadrado con la flecha hacia arriba) y luego selecciona <strong>"Agregar a inicio"</strong>.
            </p>
            <button className="btn-primary" onClick={() => setIsIosPromptVisible(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddItemModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddItemModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">Agregar Producto</h3>
              <button className="modal-close" onClick={() => setIsAddItemModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateMenuItem}>
              <div className="form-group">
                <label>Nombre del producto</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Ej. Hamburguesa Especial"
                />
              </div>
              
              <div className="form-group">
                <label>Categoría</label>
                <select
                  required
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                >
                  <option value="">Selecciona una categoría...</option>
                  {[...new Set(menuItems.map(m => JSON.stringify({ id: m.categoryId, name: m.category })))].map(c => {
                    const cat = JSON.parse(c);
                    if (!cat.id) return null;
                    return <option key={cat.id} value={cat.id}>{cat.name}</option>;
                  })}
                  <option value="NEW">+ Crear nueva categoría</option>
                </select>
              </div>
              
              {newItemCategory === 'NEW' && (
                <div className="form-group slide-in">
                  <label>Nombre de nueva categoría</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Ej. Postres"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Tipo de precio</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div
                    onClick={() => setNewItemType('fixed')}
                    style={{
                      padding: '12px', borderRadius: 12,
                      border: `2px solid ${newItemType === 'fixed' ? '#4f46e5' : '#e2e8f0'}`,
                      background: newItemType === 'fixed' ? '#e0e7ff' : '#f8fafc',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                      fontWeight: 600, color: newItemType === 'fixed' ? '#4f46e5' : '#64748b'
                    }}
                  >
                    Precio Fijo
                  </div>
                  <div
                    onClick={() => setNewItemType('variants')}
                    style={{
                      padding: '12px', borderRadius: 12,
                      border: `2px solid ${newItemType === 'variants' ? '#4f46e5' : '#e2e8f0'}`,
                      background: newItemType === 'variants' ? '#e0e7ff' : '#f8fafc',
                      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                      fontWeight: 600, color: newItemType === 'variants' ? '#4f46e5' : '#64748b'
                    }}
                  >
                    Con Variantes
                  </div>
                </div>
              </div>

              {newItemType === 'fixed' ? (
                <div className="form-group slide-in">
                  <label>Precio ($)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value)}
                    placeholder="Ej. 150.00"
                  />
                </div>
              ) : (
                <div className="form-group slide-in">
                  <label>Variantes (Ej: Harina Blanca / Integral)</label>
                  {newItemVariants.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        required
                        placeholder={`Variante ${i+1} (ej. ${i===0?'Pan Blanco':'Integral'})`}
                        value={v.label}
                        onChange={e => {
                          const arr = [...newItemVariants];
                          arr[i].label = e.target.value;
                          setNewItemVariants(arr);
                        }}
                        style={{ flex: 2 }}
                      />
                      <input
                        type="number"
                        required
                        placeholder="$"
                        value={v.price}
                        onChange={e => {
                          const arr = [...newItemVariants];
                          arr[i].price = e.target.value;
                          setNewItemVariants(arr);
                        }}
                        style={{ flex: 1 }}
                      />
                      {newItemVariants.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewItemVariants(newItemVariants.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0 8px' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewItemVariants([...newItemVariants, {label: '', price: ''}])}
                    style={{
                      width: '100%', background: 'transparent', border: '1px dashed #cbd5e1', color: '#64748b',
                      padding: 10, borderRadius: 12, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Agregar otra variante
                  </button>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
                <Plus size={18} /> Crear Producto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Imprimir Cuenta */}
      {printCuentaModal.isOpen && printCuentaModal.tableId && (
        <div className="modal-overlay print-hide" onClick={() => setPrintCuentaModal({isOpen: false, tableId: null})}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 400 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>Cuenta - Mesa {printCuentaModal.tableId}</h3>
            <div className="ticket-print-area">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>La Mora Resto</h2>
                <div style={{ fontSize: 14, color: '#64748b' }}>Atendido por: {currentUser?.name}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Mesa: {printCuentaModal.tableId}</div>
                <div style={{ fontSize: 14, color: '#64748b', textTransform: 'capitalize' }}>
                  Fecha: {new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ borderTop: '2px dashed #cbd5e1', borderBottom: '2px dashed #cbd5e1', padding: '12px 0', margin: '16px 0' }}>
                {activeItems.filter(i => i.table_id === printCuentaModal.tableId).map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                     <div style={{ flex: 1, paddingRight: 8 }}>x{i.qty} {i.name}</div>
                     <div style={{ fontWeight: 600 }}>${(i.price * i.qty).toFixed(0)}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                 <span>Total:</span>
                 <span>${activeItems.filter(i => i.table_id === printCuentaModal.tableId).reduce((s, i) => s + (i.price * i.qty), 0).toFixed(0)}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }} className="print-hide">
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setPrintCuentaModal({isOpen: false, tableId: null})}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'center' }} onClick={handlePrintCuenta}>
                 <Printer size={18} /> Imprimir Ticket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
