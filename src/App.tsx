import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid, ClipboardCheck, Settings, ChevronLeft, Users, Check, X,
  Plus, Lock, Home as HomeIcon, UserPlus, Trash2, User, ChevronRight,
  FileEdit, PlusCircle, TrendingUp, TrendingDown, CalendarDays, Calendar, Search, StickyNote,

  Pencil, ChevronDown, ChevronUp, AlertTriangle, Zap, Eye, Clock, Printer, Wallet, Building, Globe, ShoppingBag, CreditCard, PenTool, ClipboardList,
  FileText, Package, Utensils,

  UserMinus, ExternalLink, CheckCircle2, AlertCircle

} from 'lucide-react';
import './index.css';
import { CATEGORIES, CATEGORY_MAPPING } from './data/menu';
import type { MenuItem, MenuVariant } from './data/menu';
import { supabase } from './lib/supabase';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import type { UserRow } from './lib/supabaseService';
import { getUpcomingCheckins, updateReservationStatus, createReservation, addTransaction } from './lib/hostawayService';
import type { Reservation } from './lib/hostawayService';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(amount);
};

const COUNTRIES_BY_CONTINENT = {
  "América": [
    "México", "Estados Unidos", "Canadá", "Argentina", "Belice", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "Cuba", 
    "Ecuador", "El Salvador", "Guatemala", "Haití", "Honduras", "Jamaica", "Nicaragua", "Panamá", "Paraguay", "Perú", 
    "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela"
  ].sort(),
  "Europa": [
    "Alemania", "Andorra", "Austria", "Bélgica", "Bulgaria", "Chipre", "Croacia", "Dinamarca", "Eslovaquia", "Eslovenia", 
    "España", "Estonia", "Finlandia", "Francia", "Grecia", "Hungría", "Irlanda", "Islandia", "Italia", "Letonia", 
    "Liechtenstein", "Lituania", "Luxemburgo", "Malta", "Moldavia", "Mónaco", "Montenegro", "Noruega", "Países Bajos", 
    "Polonia", "Portugal", "Reino Unido", "República Checa", "Rumanía", "Rusia", "Serbia", "Suecia", "Suiza", "Ucrania"
  ].sort(),
  "Asia": [
    "Arabia Saudita", "Baréin", "Catar", "China", "Corea del Sur", "Emiratos Árabes Unidos", "Filipinas", "India", "Indonesia", 
    "Irak", "Irán", "Israel", "Japón", "Jordania", "Kuwait", "Líbano", "Malasia", "Pakistán", "Singapur", "Tailandia", "Taiwán", 
    "Turquía", "Vietnam"
  ].sort(),
  "Oceanía": [
    "Australia", "Fiyi", "Nueva Zelanda", "Samoa"
  ].sort(),
  "África": [
    "Egipto", "Marruecos", "Nigeria", "Sudáfrica", "Túnez"
  ].sort()
};

const COUNTRY_CODES = [
  { code: '+52', iso: 'MX', label: '+52 MX', name: 'México' },
  { code: '+1', iso: 'US', label: '+1 US', name: 'Estados Unidos' },
  { code: '+34', iso: 'ES', label: '+34 ES', name: 'España' },
  { code: '+54', iso: 'AR', label: '+54 AR', name: 'Argentina' },
  { code: '+57', iso: 'CO', label: '+57 CO', name: 'Colombia' },
  { code: '+56', iso: 'CL', label: '+56 CL', name: 'Chile' },
  { code: '+51', iso: 'PE', label: '+51 PE', name: 'Perú' },
  { code: '+55', iso: 'BR', label: '+55 BR', name: 'Brasil' },
  { code: '+44', iso: 'GB', label: '+44 GB', name: 'Reino Unido' },
  { code: '+33', iso: 'FR', label: '+33 FR', name: 'Francia' },
  { code: '+49', iso: 'DE', label: '+49 DE', name: 'Alemania' },
  { code: '+39', iso: 'IT', label: '+39 IT', name: 'Italia' },
  { code: '+506', iso: 'CR', label: '+506 CR', name: 'Costa Rica' },
  { code: '+507', iso: 'PA', label: '+507 PA', name: 'Panamá' },
  { code: '+593', iso: 'EC', label: '+593 EC', name: 'Ecuador' },
  { code: '+502', iso: 'GT', label: '+502 GT', name: 'Guatemala' },
  { code: '+504', iso: 'HN', label: '+504 HN', name: 'Honduras' },
  { code: '+503', iso: 'SV', label: '+503 SV', name: 'El Salvador' },
  { code: '+505', iso: 'NI', label: '+505 NI', name: 'Nicaragua' },
  { code: '+598', iso: 'UY', label: '+598 UY', name: 'Uruguay' },
  { code: '+595', iso: 'PY', label: '+595 PY', name: 'Paraguay' },
].sort((a, b) => a.label.localeCompare(b.label));

const getFlagEmoji = (phone: string) => {
  if (!phone) return '🏳️';
  const cleanPhone = phone.toLowerCase();
  const match = COUNTRY_CODES.find(c => 
    cleanPhone.startsWith(c.code) || 
    cleanPhone.startsWith(c.iso.toLowerCase()) ||
    cleanPhone.includes(c.code)
  );
  return match ? match.label.split(' ')[0] : '🏳️';
};

const ISO_TO_NAME: Record<string, string> = {
  "US": "Estados Unidos", "MX": "México", "CA": "Canadá", "ES": "España", "CO": "Colombia", "AR": "Argentina",
  "CL": "Chile", "PE": "Perú", "GB": "Reino Unido", "FR": "Francia", "DE": "Alemania", "IT": "Italia",
  "BR": "Brasil", "UY": "Uruguay", "CR": "Costa Rica", "PA": "Panamá", "EC": "Ecuador", "GT": "Guatemala",
  "HN": "Honduras", "SV": "El Salvador", "NI": "Nicaragua", "PY": "Paraguay"
};

const normalizeText = (text: string) => 
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const findCountryWithFlag = (name: string) => {
  if (!name) return "";
  const cleanName = name.trim().toUpperCase();
  const nameFromISO = ISO_TO_NAME[cleanName] || name;
  const searchName = normalizeText(nameFromISO);

  for (const countries of Object.values(COUNTRIES_BY_CONTINENT)) {
    const match = countries.find(c => {
      const countryName = normalizeText(c);
      return countryName.includes(searchName) || searchName.includes(countryName);
    });
    if (match) return match;
  }
  return name;
};

// ─── Sub-components ──────────────────────────────────────
function HistoryReportCard({ report, formatCurrency, onDelete }: { report: any, formatCurrency: any, onDelete: any }) {
  const [expanded, setExpanded] = useState(false);

  // Fix JSON string in closed_by if it happens to be one
  let adminName = 'Sistema';
  if (report.closed_by) {
    if (report.closed_by.startsWith('{')) {
      try {
        const parsed = JSON.parse(report.closed_by);
        adminName = parsed.created_by || parsed.name || 'Admin';
      } catch {
        adminName = report.closed_by;
      }
    } else {
      adminName = report.closed_by;
    }
  }

  const totalIncome = Number(report.income || 0);
  const totalTips = (
    Number(report.cash_tips || 0) + 
    Number(report.card_tips || 0) + 
    Number(report.transfer_tips || 0) + 
    Number(report.debit_tips || 0) + 
    Number(report.credit_tips || 0)
  );
  const hotelIncome = Number(report.hotel_income || 0);
  const totalExpenses = Number(report.expenses || 0);
  const netBalance = totalIncome + hotelIncome + totalTips - totalExpenses;
  const grandTotalSales = totalIncome + hotelIncome + totalTips;

  // New handover fields (fallbacks for old reports)
  const hCash = report.handover_cash ?? (Number(report.cash_income || 0) + Number(report.cash_tips || 0) - totalExpenses);
  const hDollars = report.handover_dollars ?? 0;
  const hCard = report.handover_card ?? (Number(report.card_income || 0) + Number(report.card_tips || 0) + Number(report.debit_tips || 0) + Number(report.credit_tips || 0));
  const hTotal = report.handover_total ?? (hCash + hDollars + hCard);

  return (
    <div className={`report-card-premium ${expanded ? 'expanded' : ''}`}>
      <div className="rpc-main" onClick={() => setExpanded(!expanded)}>
        <div className="rpc-info">
          <div className="rpc-date-wrap">
            <Calendar size={20} style={{ color: '#94a3b8' }} />
            <span>{new Date(report.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="rpc-time">{new Date(report.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="rpc-user-tag">
            <User size={12} />
            ADMIN: {adminName}
          </div>
        </div>
        
        <div className="rpc-metrics-summary">
          <div className="rpc-m-item">
            <span className="rpc-m-label">Ventas Totales</span>
            <span className="rpc-m-val">{formatCurrency(grandTotalSales)}</span>
          </div>
          <div className="rpc-m-item">
            <span className="rpc-m-label">Balance Neto</span>
            <span className="rpc-m-val net">{formatCurrency(netBalance)}</span>
          </div>
          <ChevronDown className={`rpc-chevron ${expanded ? 'rotated' : ''}`} size={24} />
        </div>
      </div>

      {expanded && (
        <div className="rpc-details fade-in">
          <div className="rpc-section">
            <h5><LayoutGrid size={14} /> UNIDADES DE NEGOCIO</h5>
            <div className="rpc-grid-premium">
              <div className="rpc-metric-card">
                <span className="rpc-metric-label">Restaurante</span>
                <span className="rpc-metric-value">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="rpc-metric-card">
                <span className="rpc-metric-label">Hotel</span>
                <span className="rpc-metric-value">{formatCurrency(hotelIncome)}</span>
              </div>
              <div className="rpc-metric-card highlight">
                <span className="rpc-metric-label">Total Ingresos</span>
                <span className="rpc-metric-value">{formatCurrency(totalIncome + hotelIncome)}</span>
              </div>
              <div className="rpc-metric-card">
                <span className="rpc-metric-label">Total Propinas</span>
                <span className="rpc-metric-value" style={{ color: '#10b981' }}>{formatCurrency(totalTips)}</span>
              </div>
            </div>
          </div>

          <div className="rpc-section">
            <h5><Wallet size={14} /> MÉTODOS DE PAGO</h5>
            <div className="rpc-methods-grid">
               <div className="rpc-method-row">
                 <div className="rpc-method-info">
                   <div style={{ background: '#fef3c7', padding: 8, borderRadius: 10, display: 'flex', color: '#d97706' }}><Wallet size={16} /></div>
                   <span>Efectivo</span>
                 </div>
                 <div className="rpc-method-amounts">
                   <span className="base">{formatCurrency(report.cash_income || 0)}</span>
                   <span className="tip">+{formatCurrency(report.cash_tips || 0)}</span>
                 </div>
               </div>
               <div className="rpc-method-row">
                  <div className="rpc-method-info">
                    <div style={{ background: '#e0e7ff', padding: 8, borderRadius: 10, display: 'flex', color: '#4f46e5' }}><Printer size={16} /></div>
                    <span>Tarjetas / TC</span>
                  </div>
                  <div className="rpc-method-amounts">
                    <span className="base" style={{ color: '#0f172a' }}>{formatCurrency((report.card_income || 0) + (report.card_tips || 0) + (report.debit_tips || 0) + (report.credit_tips || 0))}</span>
                  </div>
                </div>
                <div className="rpc-method-row">
                  <div className="rpc-method-info">
                    <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 10, display: 'flex', color: '#64748b' }}><Building size={16} /></div>
                    <span>Transferencia</span>
                  </div>
                  <div className="rpc-method-amounts">
                    <span className="base" style={{ color: '#0f172a' }}>{formatCurrency((report.transfer_income || 0) + (report.transfer_tips || 0))}</span>
                  </div>
                </div>
            </div>
          </div>

          <div className="rpc-section">
            <h5><Check size={14} /> RESUMEN DE ENTREGA FINAL</h5>
            <div className="rpc-handover-panel">
              <div className="rpc-h-item">
                <span className="rpc-h-label">Efectivo a Entregar</span>
                <span className="rpc-h-val">{formatCurrency(hCash)}</span>
              </div>
              <div className="rpc-h-item">
                <span className="rpc-h-label">Dólares (Convertidos)</span>
                <span className="rpc-h-val">{formatCurrency(hDollars)}</span>
              </div>
              <div className="rpc-h-item">
                <span className="rpc-h-label">Tarjetas (TC)</span>
                <span className="rpc-h-val">{formatCurrency(hCard)}</span>
              </div>
              <div className="rpc-h-item" style={{ textAlign: 'right' }}>
                <span className="rpc-h-label">ENTREGA TOTAL</span>
                <span className="rpc-h-val total">{formatCurrency(hTotal)}</span>
              </div>
            </div>
          </div>

          {report.expenses_list?.length > 0 && (
            <div className="rpc-section">
              <h5><TrendingDown size={14} /> GASTOS REGISTRADOS</h5>
              <div className="rpc-expenses-list">
                {report.expenses_list.map((exp: any, i: number) => (
                  <div key={i} className="rpc-expense-row">
                    <span>{exp.concept} {exp.detail ? `(${exp.detail})` : ''}</span>
                    <span className="exp-amt">-{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
                <div className="rpc-expense-total">
                  <span>Total Deducciones</span>
                  <span>-{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="rpc-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
            <button className="rpc-delete-btn" onClick={() => onDelete(report.id)}>
              <Trash2 size={14} /> Eliminar Reporte de Historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────
export default function App() {
  // Supabase sync
  const {
    tables, tableOrders, activeItems, menuItems, users,
    todayIncome, todayCashIncome, todayCashTips, todayTransferIncome, todayTransferTips,
    todayDebitIncome, todayDebitTips, todayCreditIncome, todayCreditTips,
    todayCardIncome, todayCardTips, todayTotalTips, todayAccountsCount, todayExpenses, todayExpensesList, todayClosedOrders, pettyCashInitial, hotelCardSales, hotelCashSales, hotelSalesList, dailySummaries, isLoading,
    createOrderForTable, addItemToOrder, removeItem, markItemDone, updateItemNotes, markItemsPrinted,
    checkoutTable, confirmPayment, cancelTable, addExpense,
    toggleMenuItem, toggleMenuVariant,
    updateMenuItem, updateMenuVariant, updateCategory,
    addCategory, addMenuItem, addMenuVariant,
    addTable, deleteTable,
    addUser, deleteUser, updateUser, closeSession,
    closeDay, deleteShiftSummary, logPrintedTicket,
    addHotelSale, deleteHotelSale, exchangeRate,
    pendingTickets, markTicketPrinted, deleteTicket, deleteClosedOrder, fetchTodayTotals,
    createDeliveryOrder, registrations, fetchRegistrations, deleteRegistration
  } = useSupabaseSync();

  // UI state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: 'Administrador' | 'Staff' | 'Encargado' } | null>({
    id: 'default-admin', name: 'Administrador', role: 'Administrador'
  });

  const [currentView, setCurrentView] = useState<'home' | 'salon' | 'pedidos' | 'impresora' | 'admin' | 'mesa' | 'checkout' | 'checkin' | 'registros'>('home');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [adminSubView, setAdminSubView] = useState<'main' | 'menu' | 'users' | 'tables' | 'stats'>('main');
  const [statsSubView, setStatsSubView] = useState<'history' | 'analytics'>('history');
  const [analyticsFilter, setAnalyticsFilter] = useState<'day' | 'month' | 'total'>('day');
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleteRegistrationId, setDeleteRegistrationId] = useState<string | null>(null);
  const [showPosExpenseModal, setShowPosExpenseModal] = useState(false);
  const [posExpenseDesc, setPosExpenseDesc] = useState('');
  const [posExpenseAmount, setPosExpenseAmount] = useState('');
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const showIosButton = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as any).standalone;

  // Checkout & Discount State
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [tipPercent, setTipPercent] = useState('none');
  const [customTip, setCustomTip] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [expandedPedidos, setExpandedPedidos] = useState<number[]>([]);

  const [upcomingCheckins, setUpcomingCheckins] = useState<Reservation[]>([]);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [checkinsError, setCheckinsError] = useState('');
  const [isProximosExpanded, setIsProximosExpanded] = useState(false);
  const [isEnCasaExpanded, setIsEnCasaExpanded] = useState(true);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [registroSourceFilter, setRegistroSourceFilter] = useState('Todos');
  const [registroDateFilter, setRegistroDateFilter] = useState('Todos');

  // Estados para Nueva Reserva
  const [showNewResModal, setShowNewResModal] = useState(false);
  const [showHotelPaymentModal, setShowHotelPaymentModal] = useState(false);
  const [hotelPaymentForm, setHotelPaymentForm] = useState({
    reservationId: 0,
    guestName: '',
    roomName: '',
    amount: 0,
    currency: 'USD',
    method: 'efectivo',
    hostaway_reservation_id: null as number | null
  });
  const [newResForm, setNewResForm] = useState({
    guestFirstName: '',
    guestLastName: '',
    guestPhone: '',
    guestEmail: '',
    guestNationality: '',
    guestCity: '',
    arrivalDate: '',
    departureDate: '',
    listingId: '',
    customPrice: '',
    priceCurrency: 'USD',
    useCustomPrice: false,
    isPaid: false,
    transactionMethod: 'cash',
    transactionDescription: '',
    adults: 1,
    children: 0
  });
  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isCreatingRes, setIsCreatingRes] = useState(false);

  const [checkinForm, setCheckinForm] = useState({
    name: '', nationality: '', homeAddress: '', phone: '', city: '', country: '', email: '',
    roomName: '', arrivalDate: '', departureDate: '', nights: 0, pax: 1, price: 0, currency: 'USD', paymentStatus: 'Por Pagar', source: '', signature: ''
  });

  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategory, setMenuCategory] = useState(CATEGORIES[0]);

  const [itemToConfirm, setItemToConfirm] = useState<MenuItem | null>(null);
  const [itemVariantToConfirm, setItemVariantToConfirm] = useState<MenuVariant | undefined>(undefined);
  const [itemNotesToConfirm, setItemNotesToConfirm] = useState('');
  const [itemExtrasSelected, setItemExtrasSelected] = useState<MenuItem[]>([]);

  // Derived state
  const orderItems = useMemo(() => {
    return activeItems.filter(i => i.table_id === selectedTableId);
  }, [activeItems, selectedTableId]);

  const selectedTableItems = orderItems;

  const filteredMenuItems = useMemo(() => {
    let list = menuItems.filter(m => m.active);
    if (menuSearch.trim()) {
      const s = menuSearch.toLowerCase().trim();
      list = list.filter(m => 
        m.name.toLowerCase().includes(s) || 
        m.category.toLowerCase().includes(s)
      );
    } else {
      list = list.filter(m => {
        if (m.category === menuCategory) return true;
        const subCats = CATEGORY_MAPPING[menuCategory];
        if (subCats && (subCats.includes(m.category) || m.category.startsWith(`${menuCategory}:`) || m.category.startsWith(`${menuCategory} `))) return true;
        return false;
      });
    }
    return list;
  }, [menuItems, menuCategory, menuSearch]);

  const adminMenuItems = useMemo(() => {
    let list = menuItems;
    if (menuSearch.trim()) {
      const s = menuSearch.toLowerCase().trim();
      list = list.filter(m => 
        m.name.toLowerCase().includes(s) || 
        m.category.toLowerCase().includes(s)
      );
    }
    return list;
  }, [menuItems, menuSearch]);

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach(m => {
      if (m.active && m.category && m.category.toUpperCase() !== 'INGREDIENTES EXTRA') {
        let isSub = false;
        for (const [parent, subs] of Object.entries(CATEGORY_MAPPING)) {
          if (subs.includes(m.category) || m.category.startsWith(`${parent}:`) || m.category.startsWith(`${parent} `)) {
            if (parent !== 'INGREDIENTES EXTRA') {
              set.add(parent);
            }
            isSub = true;
            break;
          }
        }
        if (!isSub) {
          set.add(m.category);
        }
      }
    });
    const list = Array.from(set);
    list.sort((a, b) => {
      const idxA = CATEGORIES.indexOf(a) === -1 ? 999 : CATEGORIES.indexOf(a);
      const idxB = CATEGORIES.indexOf(b) === -1 ? 999 : CATEGORIES.indexOf(b);
      if (idxA !== idxB) return idxA - idxB;
      return a.localeCompare(b);
    });
    return list.length > 0 ? list : CATEGORIES;
  }, [menuItems]);

  const ranking = useMemo(() => {
    const counts: Record<string, number> = {};
    const ordersToProcess = analyticsFilter === 'day' ? todayClosedOrders : []; // For now day only
    ordersToProcess.forEach(order => {
      const items = order.items_summary?.split(', ') || [];
      items.forEach(i => {
        const match = i.match(/^(\d+)x\s+(.+)$/);
        if (match) {
          const qty = parseInt(match[1]);
          const name = match[2];
          counts[name] = (counts[name] || 0) + qty;
        }
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [todayClosedOrders, analyticsFilter]);

  const dVal = parseFloat(discountValue) || 0;
  
  const finalTotal = useMemo(() => {
    if (!selectedTableId) return 0;
    const subtotal = activeItems
      .filter(i => i.table_id === selectedTableId)
      .reduce((s, i) => s + (i.price * i.qty), 0);
    
    if (discountType === 'percentage') return subtotal * (1 - dVal / 100);
    if (discountType === 'amount') return Math.max(0, subtotal - dVal);
    return subtotal;
  }, [activeItems, selectedTableId, discountType, dVal]);


  // UI state


  // Efecto para sincronizar País/Nacionalidad con el código de área del teléfono
  useEffect(() => {
    if (checkinForm.phone && showCheckinModal) {
      const normalizedPhone = checkinForm.phone.toLowerCase().replace(/\s/g, '');
      const currentPrefix = COUNTRY_CODES.find(c => 
        normalizedPhone.startsWith(c.code.toLowerCase()) || 
        normalizedPhone.startsWith(c.iso.toLowerCase())
      );
      
      if (currentPrefix) {
        const countryWithFlag = findCountryWithFlag(currentPrefix.name);
        if (countryWithFlag && (!checkinForm.country || checkinForm.country === "" || checkinForm.country === "Seleccionar país...")) {
          setCheckinForm(prev => ({ ...prev, country: countryWithFlag, nationality: countryWithFlag }));
        }
      }
    }
  }, [checkinForm.phone, showCheckinModal]);

  const navTo = (view: typeof currentView) => {
    setCurrentView(view);
    if (view !== 'mesa' && view !== 'checkout') {
      setSelectedTableId(null);
    }
  };



  // === Routing History API Sync ===


  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setCurrentView('home');
        setSelectedTableId(null);
        return;
      }
      const parts = hash.split('-');
      const validViews = ['home', 'salon', 'pedidos', 'impresora', 'admin', 'mesa', 'checkout', 'checkin'];
      if (validViews.includes(parts[0])) {
         setCurrentView(parts[0] as any);
         if (parts[1] && !isNaN(parseInt(parts[1], 10)) && parseInt(parts[1], 10) !== 0) {
           setSelectedTableId(parseInt(parts[1], 10));
         } else {
           setSelectedTableId(null);
         }
         
         if (parts[2]) {
           const validAdminViews = ['main', 'menu', 'users', 'tables', 'stats'];
           if (validAdminViews.includes(parts[2])) {
              setAdminSubView(parts[2] as any);
           }
         }
      } else {
         setCurrentView('home');
      }
    };
    
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentView === 'checkin') {
      setIsLoadingCheckins(true);
      setCheckinsError('');
      getUpcomingCheckins()
        .then(data => {
          // Client-side deduplication for extra safety
          const uniqueReservations = Array.from(
            new Map(data.map((res: any) => [res.id, res])).values()
          );
          setUpcomingCheckins(uniqueReservations as Reservation[]);
        })
        .catch(err => {
          console.error(err);
          setCheckinsError(err.message || 'Error al cargar reservas');
        })
        .finally(() => {
          setIsLoadingCheckins(false);
        });
    }
  }, [currentView]);

  // Lógica para Nueva Reserva
  const fetchAvailableListings = async (arrival: string, departure: string) => {
    if (!arrival || !departure) return;
    setIsLoadingAvailability(true);
    try {
      const { data, error } = await supabase.functions.invoke('hostaway-proxy', {
        body: { 
          action: 'getAvailableListings',
          params: { arrivalDate: arrival, departureDate: departure }
        }
      });
      if (error) throw error;
      setAvailableListings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (newResForm.arrivalDate && newResForm.departureDate) {
      fetchAvailableListings(newResForm.arrivalDate, newResForm.departureDate);
    }
  }, [newResForm.arrivalDate, newResForm.departureDate]);

  const handleHotelPaymentSubmit = async () => {
    try {
      if (hotelPaymentForm.hostaway_reservation_id) {
        await updateReservationStatus(
          hotelPaymentForm.hostaway_reservation_id,
          undefined,
          undefined,
          'host',
          true
        );

        let hwMethod = 'cash';
        if (hotelPaymentForm.method === 'tarjeta') hwMethod = 'creditCard';
        if (hotelPaymentForm.method === 'transferencia') hwMethod = 'bankTransfer';

        try {
          await addTransaction(hotelPaymentForm.hostaway_reservation_id, {
            title: 'Pago en Recepción',
            description: `Pago procesado localmente`,
            amount: hotelPaymentForm.amount,
            paymentMethod: hwMethod
          });
        } catch (txErr) {
          console.error("No se pudo agregar la transacción formal a Hostaway:", txErr);
        }
      }
      await addHotelSale(hotelPaymentForm.amount, hotelPaymentForm.currency, hotelPaymentForm.method);
      alert("Pago registrado correctamente.");
      setShowHotelPaymentModal(false);
      fetchRegistrations(); // refresh local db list
      getUpcomingCheckins().then(setUpcomingCheckins); // refresh hostaway status
    } catch (error: any) {
      console.error(error);
      alert("Error inesperado al registrar pago: " + error.message);
    }
  };

  const handleCreateReservation = async () => {
    if (!newResForm.listingId) return;
    setIsCreatingRes(true);
    try {
      const selectedListing = availableListings.find(l => String(l.id) === String(newResForm.listingId));
      if (!selectedListing) throw new Error("Debes seleccionar una habitación.");

      const totalAmount = newResForm.useCustomPrice 
        ? parseFloat(newResForm.customPrice) 
        : selectedListing.basePrice;

      const params = {
        channelId: 2000,
        listingMapId: parseInt(newResForm.listingId),
        arrivalDate: newResForm.arrivalDate,
        departureDate: newResForm.departureDate,
        guestName: `${newResForm.guestFirstName} ${newResForm.guestLastName}`.trim(),
        guestFirstName: newResForm.guestFirstName,
        guestLastName: newResForm.guestLastName,
        guestEmail: newResForm.guestEmail,
        guestCity: newResForm.guestCity,
        guestCountry: newResForm.guestNationality,
        phone: newResForm.guestPhone,
        totalPrice: totalAmount,
        currency: newResForm.useCustomPrice ? newResForm.priceCurrency : selectedListing.currency,
        isPaid: newResForm.isPaid ? 1 : 0,
        paymentStatus: newResForm.isPaid ? 'paid' : 'unpaid',
        paidAmount: newResForm.isPaid ? totalAmount : 0,
        hostNote: newResForm.isPaid ? 'PAID' : '',
        numberOfGuests: 1,
        adults: 1
      };

      const res = await createReservation(params);
      
      // Si está marcado como pagado, lo registramos en el sistema local y en Hostaway
      if (newResForm.isPaid) {
        const currency = newResForm.useCustomPrice ? newResForm.priceCurrency : selectedListing.currency;
        await addHotelSale(totalAmount, currency, newResForm.transactionMethod === 'cash' ? 'efectivo' : 'tarjeta');
        
        // Add transaction to Hostaway
        if (res && res.result && res.result.id) {
          try {
            await addTransaction(res.result.id, {
              title: 'Pago Inicial',
              description: newResForm.transactionDescription,
              amount: totalAmount,
              paymentMethod: newResForm.transactionMethod
            });
          } catch (txErr) {
            console.error("Error al registrar el cargo offline en Hostaway", txErr);
          }
        }
      }

      alert("Reserva creada con éxito en Hostaway" + (newResForm.isPaid ? " y registrada como Pagada." : ""));
      setShowNewResModal(false);
      // Recargar checkins
      getUpcomingCheckins().then(setUpcomingCheckins);
    } catch (err: any) {
      alert("Error al crear reserva: " + err.message);
    } finally {
      setIsCreatingRes(false);
    }
  };

  useEffect(() => {
    let hash = `#${currentView}`;
    if (selectedTableId && (currentView === 'mesa' || currentView === 'checkout')) {
      hash += `-${selectedTableId}`;
    } else if (currentView === 'admin') {
      hash += `-0-${adminSubView}`;
    }
    
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', window.location.pathname + window.location.search + hash);
    }
  }, [currentView, selectedTableId, adminSubView]);
  const [mesaTab, setMesaTab] = useState<'orden' | 'menu'>('orden');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('tarjeta');
  const [mesasConCuentaActivada, setMesasConCuentaActivada] = useState<Set<number>>(new Set());

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelAmount, setHotelAmount] = useState('');
  const [hotelCurrency, setHotelCurrency] = useState('MXN');
  const [hotelPaymentMethod, setHotelPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('tarjeta');

  // Currency Formatter
  const formatCurrency = (val: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: 2
    }).format(val).replace('MX', '').replace('US', '').trim();
  };
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

  const openTable = (id: number) => {
    setSelectedTableId(id);
    setCurrentView('mesa');
  };

  const openEditUser = (user: UserRow) => {
    setEditingUserId(user.id);
    setEditUserName(user.name);
    setEditUserRole(user.role);
    setIsEditUserModalOpen(true);
  };

  const handleAddItem = (item: MenuItem, variant?: MenuVariant) => {
    if (!selectedTableId) return;
    if (['PIZZAS', 'PASTAS', 'ENSALADAS'].includes(item.category)) {
      setItemToConfirm(item);
      setItemVariantToConfirm(variant);
      setItemNotesToConfirm('');
      setItemExtrasSelected([]);
      return;
    }
    addItemToOrder(selectedTableId, item, variant);
  };

  const handleConfirmOpenTable = async () => {
    if (tableConfirmModal.tableId) {
      await createOrderForTable(tableConfirmModal.tableId);
    }
    setTableConfirmModal({ ...tableConfirmModal, isOpen: false });
    setCurrentView('mesa');
  };

  const handleCancelTable = async () => {
    if (tableConfirmModal.tableId) {
      await cancelTable(tableConfirmModal.tableId);
    }
    setTableConfirmModal({ ...tableConfirmModal, isOpen: false });
    setCurrentView('salon');
  };

  const executePayment = async () => {
    await handleConfirmPayment();
    setTableConfirmModal({ ...tableConfirmModal, isOpen: false });
  };

  const handleConfirmPayment = async () => {
    if (!selectedTableId) return;
    
    const items = activeItems.filter(i => i.table_id === selectedTableId);
    const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0);
    
    // Calculate final total with discount
    let totalToPay = subtotal;
    const dVal = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') totalToPay = subtotal * (1 - dVal / 100);
    else if (discountType === 'amount') totalToPay = Math.max(0, subtotal - dVal);

    // Tip calculation
    let tipVal = 0;
    if (tipPercent === 'Otro') {
      tipVal = parseFloat(customTip) || 0;
    } else if (tipPercent !== 'none') {
      const p = parseFloat(tipPercent);
      // For cash, fixed values are used (20, 50, 100) instead of percentages sometimes?
      // Wait, let's check the UI logic for tips.
      // Line 2666: {t === 'none' ? 'Sin propina' : t === 'Otro' ? 'Otro' : `${t}%`}
      // It says % for non-cash.
      // For cash (line 2630): {t === 'none' ? 'Sin propina' : t === 'Otro' ? 'Otro' : `$${t}`}
      // Ah! Cash uses fixed amounts, Card uses percentages.
      
      if (paymentMethod === 'efectivo') {
        tipVal = p; // It's a dollar/peso amount
      } else {
        tipVal = (p / 100) * subtotal;
      }
    }

    await confirmPayment(
      selectedTableId, 
      paymentMethod, 
      totalToPay, 
      tipVal, 
      discountReason
    );
    
    // Reset payment states
    setPaymentMethod('tarjeta');
    setTipPercent('none');
    setCustomTip('');
    setDiscountType('none');
    setDiscountValue('');
    setDiscountReason('');
    setCashReceived('');
    setCurrentView('salon');
  };




  // Unified Custom Confirm Modal for tables (opening accounts and confirming payments)
  const [tableConfirmModal, setTableConfirmModal] = useState<{
    isOpen: boolean;
    type: 'open' | 'pay' | 'closeEmpty';
    tableId: number | null;
  }>({ isOpen: false, type: 'open', tableId: null });

  const [printCuentaModal, setPrintCuentaModal] = useState<{isOpen: boolean, tableId: number | null, isFinalBill?: boolean}>({isOpen: false, tableId: null, isFinalBill: false});
  const [ticketToPrint, setTicketToPrint] = useState<any>(null);

  const handleSendToPrinter = async () => {
    if (printCuentaModal.tableId) {
      const isFinal = printCuentaModal.isFinalBill;
      // If final bill, get all items. If kitchen order, get only unprinted items.
      const items = activeItems.filter(i => i.table_id === printCuentaModal.tableId && (isFinal || !i.is_printed));
      
      if (items.length === 0) {
        alert('No hay items para imprimir.');
        setPrintCuentaModal({isOpen: false, tableId: null, isFinalBill: false});
        return;
      }
      
      const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
      let summary = '';
      if (isFinal) {
         // Formato para ticket de cuenta (con precios)
         summary = items.map(i => `${i.qty}x ${i.name} - $${i.price * i.qty}`).join('\n');
      } else {
         // Formato para ticket de cocina (con variantes y notas, sin precios)
         summary = items.map(i => `${i.qty}x ${i.name}${i.variant_label ? ` (${i.variant_label})` : ''}${i.notes ? ` [${i.notes}]` : ''}`).join('\n');
      }
      
      if (!isFinal) {
        // Marcar los items como impresos solo si es comanda de cocina
        const itemIds = items.map(i => i.id);
        await markItemsPrinted(itemIds);

        // Actualizar estado local optimista para evitar re-impresiones
        activeItems.forEach(i => {
          if (itemIds.includes(i.id)) i.is_printed = true;
        });
      }
      
      // No registramos la cuenta en pendingTickets, solo se envía a imprimir
      
      // Generar ticket para imprimir
      const ticket = {
        table_id: printCuentaModal.tableId,
        printed_by: currentUser?.name || 'Unknown',
        created_at: new Date().toISOString(),
        items_summary: summary,
        total: total,
        is_pedido: !isFinal // Bandera para formato de cocina
      };

      setPrintCuentaModal({isOpen: false, tableId: null, isFinalBill: false});
      dispatchPrintOnly(ticket);
    } else {
      setPrintCuentaModal({isOpen: false, tableId: null, isFinalBill: false});
    }
  };

  const dispatchPrintOnly = (ticket: any) => {
    setTicketToPrint(ticket);
    setTimeout(() => {
      window.print();
      setTicketToPrint(null);
    }, 500);
  };

  // Edit menu modal
  type EditTarget = { type: 'item'; id: string; name: string; price: number } | { type: 'variant'; id: string; label: string; price: number } | { type: 'category'; id: string; name: string };
  const [isClosingTurn, setIsClosingTurn] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [previewTicket, setPreviewTicket] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const openEditItem = (item: MenuItem) => { setEditTarget({ type: 'item', id: item.id, name: item.name, price: item.price }); setEditName(item.name); setEditPrice(String(item.price)); };
  const openEditVariant = (v: MenuVariant) => { setEditTarget({ type: 'variant', id: v.id, label: v.label, price: v.price }); setEditName(v.label); setEditPrice(String(v.price)); };
  const openEditCategory = (id: string, name: string) => { setEditTarget({ type: 'category', id, name }); setEditName(name); setEditPrice(''); };

  const handleAdminAddTable = async () => {
    const nextId = tables.length > 0 ? Math.max(...tables.map(t => t.id)) + 1 : 1;
    await addTable(nextId);
  };

  const handleAdminDeleteTable = async (id: number) => {
    if (window.confirm(`¿Estás seguro de eliminar la Mesa ${id}?`)) {
      await deleteTable(id);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteUser(id);
    }
  };
  
  const handleEditUser = (user: UserRow) => {
    openEditUser(user);
  };

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
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryCustomerName, setDeliveryCustomerName] = useState('');

  const handleCreateDelivery = async () => {
    if (!deliveryCustomerName.trim()) return;
    const tableId = await createDeliveryOrder(deliveryCustomerName.trim());
    if (tableId) {
      setSelectedTableId(tableId);
      setDeliveryCustomerName('');
      setIsDeliveryModalOpen(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseConcept) return;
    await addExpense(Number(expenseAmount), expenseConcept, expenseDetail);
    setIsExpenseModalOpen(false);
    setExpenseAmount('');
    setExpenseConcept('Pago a proveedores');
    setExpenseDetail('');
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserRole) return;
    await addUser(newUserName, newUserRole, INITIAL_PASSWORD);
    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserRole('Staff');
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserName.trim() || !editUserRole || !editingUserId) return;
    await updateUser(editingUserId, editUserName, editUserRole);
    setIsEditUserModalOpen(false);
    setEditUserName('');
    setEditUserRole('Staff');
  };

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



  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deliveryConfirm, setDeliveryConfirm] = useState<string | null>(null);

  const [expandedSubCats, setExpandedSubCats] = useState<Set<string>>(new Set());
  const toggleSubCat = (subCat: string) => {
    setExpandedSubCats(prev => {
      const next = new Set(prev);
      if (next.has(subCat)) next.delete(subCat);
      else next.add(subCat);
      return next;
    });
  };

  const subTitles: Record<string, string> = {
    main: 'Dashboard',
    menu: 'Menú',

    tables: 'Mesas',
    stats: 'Historial de Cierres'
  };

  const isSubView = ['mesa', 'checkout', 'registros'].includes(currentView) || (currentView === 'admin' && adminSubView !== 'main');

  const renderAdminMain = () => {
    const mexicoDate = currentTime.toLocaleDateString('es-MX', {
      timeZone: 'America/Mazatlan', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const mexicoTime = currentTime.toLocaleTimeString('es-MX', {
      timeZone: 'America/Mazatlan', hour: '2-digit', minute: '2-digit',
    });

    return (
      <div className="fade-in admin-main">
        <div className="admin-header-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div className="admin-welcome" style={{ margin: 0 }}>
              <h1>Panel de Administración</h1>
              <p style={{ margin: 0 }}>{mexicoDate} • {mexicoTime}</p>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.06)', 
              padding: '6px 14px', 
              borderRadius: '24px', 
              fontSize: '13px', 
              fontWeight: 700, 
              color: '#e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              border: '1px solid rgba(255,255,255,0.1)',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0
            }}>
              <Globe size={14} style={{ color: '#94a3b8' }} />
              <span>1 USD <span style={{ color: '#64748b', margin: '0 4px', fontWeight: 500 }}>=</span> <span style={{ color: '#10b981' }}>{exchangeRate.toFixed(2)}</span> MXN</span>
            </div>
          </div>
          <div className="admin-stats-summary">
            <div className="admin-stat-pill">
              <span className="label">Ventas restaurante</span>
              <span className="value">{formatCurrency(todayIncome)}</span>
            </div>
            <div className="admin-stat-pill">
              <span className="label">Ventas hotel</span>
              <span className="value">{formatCurrency(hotelCardSales + hotelCashSales)}</span>
            </div>
            <div className="admin-stat-pill">
              <span className="label">Fondo (caja chica)</span>
              <span className="value">{formatCurrency(pettyCashInitial - todayExpenses)}</span>
            </div>
            <div className="admin-stat-pill">
              <span className="label">Gastos</span>
              <span className="value">{formatCurrency(todayExpenses)}</span>
            </div>
          </div>
        </div>

        <div className="admin-footer-actions" style={{ marginTop: 0, marginBottom: 24 }}>
          <button className="btn-cierre-premium" onClick={() => setIsCierreModalOpen(true)}>
            <Lock size={20} /> Realizar Cierre de Turno
          </button>
        </div>

        <div className="admin-grid">
          <button className="admin-nav-card" onClick={() => setAdminSubView('menu')}>
            <div className="card-icon"><Package size={24} /></div>
            <div className="card-info">
              <h3>Gestión de Menú</h3>
              <p>Actualizar platos, precios y disponibilidad</p>
            </div>
            <ChevronRight size={20} />
          </button>
          

          <button className="admin-nav-card" onClick={() => setAdminSubView('tables')}>
            <div className="card-icon"><LayoutGrid size={24} /></div>
            <div className="card-info">
              <h3>Mesas</h3>
              <p>Configurar el diseño y número de mesas</p>
            </div>
            <ChevronRight size={20} />
          </button>
          
          <button className="admin-nav-card" onClick={() => setAdminSubView('stats')}>
            <div className="card-icon"><FileText size={24} /></div>
            <div className="card-info">
              <h3>Reportes</h3>
              <p>Ver historial de cierres y analíticas</p>
            </div>
            <ChevronRight size={20} />
          </button>
        </div>

      </div>
    );
  };

  const renderImpresora = () => {
    return (
      <div className="fade-in printer-view">
        <div className="tickets-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {todayClosedOrders.length === 0 ? (
            <div className="empty-state">
              <Printer size={48} />
              <p>No hay cuentas cerradas registradas aún</p>
            </div>
          ) : (
            todayClosedOrders.slice().reverse().map((order: any) => {
              const tableName = tables.find(t => t.id === order.table_id)?.name || order.table_id;
              
              // Extraer descuento del items_summary si existe
              let summaryText = order.items_summary || '';
              let descText = 'Ninguno';
              if (summaryText.includes('| Desc:')) {
                const parts = summaryText.split('| Desc:');
                summaryText = parts[0].trim();
                descText = parts[1].trim();
              }

              const consumo = order.total || 0;
              const propina = order.tip || 0;
              const totalPagado = consumo + propina;

              return (
                <div key={order.id} className="ticket-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '8px', fontSize: '13px', fontWeight: 800 }}>Mesa {tableName}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontWeight: 500 }}>
                        {new Date(order.closed_at || order.created_at || Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pagado</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', lineHeight: '1.2' }}>{formatCurrency(totalPagado)}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>Consumo</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{formatCurrency(consumo)}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>Propina</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{propina > 0 ? formatCurrency(propina) : 'Ninguna'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>Método</span>
                      <span style={{ fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>{order.payment_method || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>Descuento</span>
                      <span style={{ fontWeight: 700, color: '#334155' }}>{descText}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <button 
                      onClick={() => {
                        setPreviewTicket({
                           id: order.id,
                           table_id: order.table_id,
                           total: order.total,
                           items_summary: order.items_summary,
                           created_at: order.closed_at || order.created_at,
                           printed_by: 'Cajero'
                        });
                      }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                    >
                      <Eye size={16} strokeWidth={2.5} /> Detalles
                    </button>
                    <button 
                      onClick={() => {
                        dispatchPrintOnly({
                           id: order.id,
                           table_id: order.table_id,
                           total: order.total,
                           items_summary: order.items_summary,
                           created_at: order.closed_at || order.created_at,
                           printed_by: 'Cajero'
                        });
                      }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.color = '#2563eb'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; }}
                    >
                      <Printer size={16} strokeWidth={2.5} /> Imprimir
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderAdminMenu = () => {
    return (
      <div className="fade-in admin-menu-view">
        <div className="admin-menu-header" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, display: 'flex', height: '48px', alignItems: 'center', background: 'white', borderRadius: '14px', padding: '0 16px', gap: '12px', border: '1px solid var(--border-strong)' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar en el menú..." 
              value={menuSearch} 
              onChange={e => setMenuSearch(e.target.value)} 
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', background: 'transparent', width: '100%', minWidth: 0 }}
            />
          </div>
          <button className="btn-primary" style={{ width: 'auto', padding: '0 20px', height: '48px', whiteSpace: 'nowrap', borderRadius: '14px' }} onClick={handleAddItemModalOpen}>
            <Plus size={18} /> Nuevo Item
          </button>
        </div>
        
        <div className="menu-items-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
          {adminMenuItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ background: 'white', display: 'inline-flex', padding: '16px', borderRadius: '50%', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Search size={32} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>No se encontraron platillos</h3>
              <p style={{ marginTop: '8px', fontSize: '15px' }}>Intenta con otro término de búsqueda o agrega un nuevo item.</p>
            </div>
          ) : (
            Object.entries(
              adminMenuItems.reduce((acc, item) => {
                const cat = item.category || 'Sin Categoría';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {} as Record<string, MenuItem[]>)
            ).sort((a, b) => a[0].localeCompare(b[0])).map(([category, items]) => (
              <div key={category} style={{ marginBottom: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>{category}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.map(item => {
                    const isExpanded = expandedItems.has(item.id);
                    return (
                      <div key={item.id} style={{ 
                        background: 'white', 
                        border: '1px solid var(--border-strong)', 
                        borderRadius: '16px', 
                        overflow: 'hidden',
                        opacity: item.active ? 1 : 0.6,
                        filter: item.active ? 'none' : 'grayscale(100%)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                      }}>
                        <div className="item-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                          <div className="item-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <h4 className="item-name" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.3px' }}>{item.name}</h4>
                            {!item.hasVariants && <span className="item-price" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success-dot)' }}>{formatCurrency(item.price)}</span>}
                          </div>
                          <div className="item-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button className="btn-icon" style={{ background: '#f8fafc', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEditItem(item)}><Pencil size={18} color="var(--text-dark)" /></button>
                            {item.hasVariants && (
                              <button className="btn-icon" style={{ background: '#f8fafc', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => toggleExpanded(item.id)}>
                                {isExpanded ? <ChevronUp size={20} color="var(--text-dark)" /> : <ChevronDown size={20} color="var(--text-dark)" />}
                              </button>
                            )}
                            <label className="toggle-switch">
                              <input type="checkbox" checked={item.active} onChange={() => toggleMenuItem(item.id, !item.active)} />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                        </div>
                        {item.hasVariants && isExpanded && (
                          <div className="variants-list" style={{ background: '#f8fafc', borderTop: '1px solid var(--border-strong)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {item.variants?.map(v => (
                              <div key={v.id} className="variant-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="variant-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span className="variant-label" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>{v.label}</span>
                                  <span className="variant-price" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)' }}>{formatCurrency(v.price)}</span>
                                </div>
                                <div className="variant-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                  <button className="btn-icon" style={{ background: 'white', border: '1px solid var(--border-strong)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEditVariant(v)}><Pencil size={14} color="var(--text-dark)" /></button>
                                  <label className="toggle-switch small">
                                    <input type="checkbox" checked={v.active} onChange={() => toggleMenuVariant(v.id, !v.active)} />
                                    <span className="toggle-slider" />
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAdminUsers = () => {
    return (
      <div className="fade-in admin-users-view">
        <div className="section-title-row">
          <h3>Personal Autorizado</h3>
          <button className="btn-primary" onClick={() => setIsAddUserModalOpen(true)}>
            <Plus size={18} /> Nuevo Usuario
          </button>
        </div>
        <div className="users-list-p">
          {users.map(user => (
            <div key={user.id} className="user-card-p">
              <div className="user-avatar-p">{user.name[0].toUpperCase()}</div>
              <div className="user-info-p">
                <span className="user-name-p">{user.name}</span>
                <span className="user-role-p">{user.role}</span>
              </div>
              <div className="user-actions-p">
                <div className={`user-session-p ${user.session_active ? 'active' : ''}`}>
                   {user.session_active ? 'Online' : 'Offline'}
                </div>
                <button className="user-edit-btn-p" onClick={() => openEditUser(user)}>
                  <Pencil size={14} />
                </button>
                <button className="user-del-btn-p" onClick={() => { if(window.confirm('¿Eliminar usuario?')) deleteUser(user.id); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAdminTables = () => (
    <div className="fade-in admin-tables-view">
      <div className="section-title-row">
        <h3>Configuración de Mesas</h3>
        <button className="btn-primary" onClick={handleAdminAddTable}>
          <Plus size={18} /> Agregar Mesa
        </button>
      </div>
      <div className="tables-admin-grid">
        {tables.map(table => (
          <div key={table.id} className="table-admin-card">
            <div className="table-admin-info">
              <div className="table-icon">🪑</div>
              <div className="table-name">Mesa {table.name || table.id}</div>
            </div>
            <button className="btn-icon danger" onClick={() => handleAdminDeleteTable(table.id)}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminStats = () => (
    <div className="fade-in admin-stats-view">
      <div className="stats-header-tabs">
        <button className={`stats-tab ${statsSubView === 'history' ? 'active' : ''}`} onClick={() => setStatsSubView('history')}>Historial</button>
        <button className={`stats-tab ${statsSubView === 'analytics' ? 'active' : ''}`} onClick={() => setStatsSubView('analytics')}>Análisis</button>
      </div>

      {statsSubView === 'history' ? (
        <div className="history-section">
          <div className="stats-header">
            <h3>Historial de Cierres</h3>
            <span className="stats-count">{dailySummaries.length} reportes</span>
          </div>
          <div className="reports-list">
            {dailySummaries.map(report => (
              <HistoryReportCard 
                key={report.id} 
                report={report} 
                formatCurrency={formatCurrency} 
                onDelete={(id: string) => setDeleteReportId(id)} 
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="analytics-section">
          <div className="analytics-controls">
             <button className={analyticsFilter === 'day' ? 'active' : ''} onClick={() => setAnalyticsFilter('day')}>Hoy</button>
             <button className={analyticsFilter === 'month' ? 'active' : ''} onClick={() => setAnalyticsFilter('month')}>Este Mes</button>
             <button className={analyticsFilter === 'total' ? 'active' : ''} onClick={() => setAnalyticsFilter('total')}>Todo</button>
          </div>
          <div className="ranking-card">
            <h3>Top 10 Productos Más Vendidos</h3>
            <div className="ranking-list">
              {ranking.map((item, i) => (
                <div key={i} className="ranking-item">
                  <span className="rank">#{i+1}</span>
                  <span className="name">{item.name}</span>
                  <span className="count">{item.count} vendidos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHeader = () => {
    if (!currentUser) return null;
    
    return (
      <div className="header">
        {isSubView ? (
          <button className="icon-button" onClick={() => {
            if (currentView === 'admin' && adminSubView !== 'main') setAdminSubView('main');
            else if (currentView === 'checkout') setCurrentView('mesa');
            else if (currentView === 'registros') setCurrentView('checkin');
            else setCurrentView('salon');
          }}>
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="header-title-container">
            <span className="header-title">
              {currentView === 'home' && 'Gallo Azul Ops'}
              {currentView === 'salon' && 'POS Restaurante'}
              {currentView === 'pedidos' && 'Comandas'}
              {currentView === 'impresora' && 'Cuentas cerradas'}
              {currentView === 'admin' && 'Admin'}
              {currentView === 'checkin' && 'Hotel'}
              {currentView === 'registros' && 'Registros Hotel'}
            </span>
          </div>
        )}
        {currentView === 'mesa' && (
          <div className="header-title-container" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -4 }}>Atendiendo</span>
            <span className="header-title" style={{ fontSize: 26, fontWeight: 800 }}>
              Mesa {tables.find(t => t.id === selectedTableId)?.name || selectedTableId}
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
            {showIosButton && (
              <button 
                className="btn-premium" 
                style={{ width: 'auto', padding: '10px 16px', background: '#3b82f6', color: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, border: 'none' }}
                onClick={() => setIsIosPromptVisible(true)}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Instalar
              </button>
            )}
              <div className="header-user-avatar">{currentUser.name[0].toUpperCase()}</div>

          </div>
        )}
      </div>
    );
  };

  // ── Loading screen ───────────────────────────────────

  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#64748b' }}>
        <div className="loading-spinner" />
        <div style={{ fontSize: 15, fontWeight: 600 }}>Conectando con el servidor…</div>
        <div style={{ fontSize: 13 }}>Sincronizando datos en tiempo real</div>
      </div>
    );
  }

  // ── Renders ──────────────────────────────────────────

  const renderHome = () => {
    const freeTables = tables.filter(t => t.category !== 'Pedidos para llevar' && !tableOrders[t.id]).length;
    const pendingItems = activeItems.filter(i => i.status === 'pending');
    const activePedidos = pendingItems.length;

    const connectedStaff = users.filter(u => u.session_active);

    // BCS time
    const formatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mazatlan',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeFormatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mazatlan',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dayFormatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mazatlan',
      weekday: 'long',
    });

    const timeStr = timeFormatter.format(currentTime);
    const dateStr = formatter.format(currentTime);
    const dayStr = dayFormatter.format(currentTime);

    return (
      <div className="fade-in">
        {/* Clock hero card */}
        <div className="home-clock-card">
          <div className="home-clock-badge">México · BCS</div>
          <div className="home-clock-day">{dayStr}</div>
          <div className="home-clock-date">{dateStr.replace(dayStr, '').trim().replace(/^,\s*/, '')}</div>
          <div className="home-clock-time">{timeStr}</div>
        </div>

        {/* Action Buttons */}
        <div className="home-actions-grid">
          <div className="home-action-btn pos" onClick={() => navTo('salon')}>
            <div className="home-action-icon-wrap">
              <Utensils size={24} />
            </div>
            <span className="home-action-label">Restaurante</span>
          </div>
          <div className="home-action-btn checkin" onClick={() => navTo('checkin')}>
            <div className="home-action-icon-wrap">
              <Building size={24} />
            </div>
            <span className="home-action-label">Hotel</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCheckin = () => {
    return (
      <div className="fade-in" style={{ padding: '24px 16px', paddingBottom: 100 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
              <Globe size={30} color="#3b82f6" />
              Check-in online
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0, fontWeight: 500 }}>
              Huéspedes con llegada programada para hoy y mañana.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button 
              onClick={() => setCurrentView('registros')}
              style={{ 
                background: 'white',
                color: '#334155',
                border: '1.5px solid #e2e8f0',
                padding: '14px',
                borderRadius: 16,
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <ClipboardList size={20} color="#64748b" />
              Ver registros
            </button>
            <button 
              onClick={() => setShowNewResModal(true)}
              style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: 16,
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={20} />
              Crear reserva
            </button>
          </div>
        </div>

        {isLoadingCheckins ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: '#3b82f6' }} />
            <p>Sincronizando con Hostaway...</p>
          </div>
        ) : checkinsError ? (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: 12, padding: 16, color: '#b91c1c' }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Error de conexión</p>
            <p style={{ fontSize: 13 }}>{checkinsError}</p>
            <button 
              onClick={() => setCurrentView('home')} 
              style={{ marginTop: 12, background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Volver al inicio
            </button>
          </div>
        ) : (
          <div>
            {(() => {
              const now = new Date();
              const todayStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(now);
              
              const checkinHoy = upcomingCheckins.filter(res => {
                const isAlreadyRegistered = registrations.some(reg => String(reg.hostaway_reservation_id) === String(res.id));
                return res.arrivalDate === todayStr && !isAlreadyRegistered;
              });
              const enCasa = registrations.filter(reg => {
                // Guests that have checked in and their departure is today or in the future
                return reg.arrival_date <= todayStr && reg.departure_date >= todayStr;
              });
              const proximos = upcomingCheckins.filter(res => res.arrivalDate > todayStr);

              if (upcomingCheckins.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
                    <p style={{ fontSize: 16, color: '#64748b', fontWeight: 500 }}>No hay huéspedes registrados para estos días.</p>
                  </div>
                );
              }

              const renderGroup = (title: string, data: any[], color: string, isDetailed = false, isCollapsible = false, expanded = true, setExpanded?: (v: boolean) => void) => {
                if (data.length === 0) return null;
                const isExpanded = isCollapsible ? expanded : true;
                
                return (
                  <div style={{ marginBottom: 32 }}>
                    <div 
                      onClick={() => isCollapsible && setExpanded && setExpanded(!expanded)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: isCollapsible ? 'pointer' : 'default',
                        marginBottom: 12,
                        padding: isCollapsible ? '8px 0' : '0'
                      }}
                    >
                      <h3 style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        {title} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({data.length})</span>
                      </h3>
                      {isCollapsible && (
                        <div style={{ color: '#94a3b8' }}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      )}
                    </div>
                    
                    {isExpanded && (
                      <div className="fade-in" style={{ display: 'grid', gap: 12 }}>
                      {data.map(item => {
                        if (isDetailed) {
                          // Detailed card (like in registrations history) for "En Casa"
                          const reg = item;
                          return (
                            <div key={reg.id} style={{ background: 'white', padding: 20, borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{reg.name}</h3>
                                  <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                                    Hospedado en {reg.room_name}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {(() => {
                                    const res = upcomingCheckins.find(r => r.id === reg.hostaway_reservation_id);
                                    const isPaid = res?.isPaid || res?.paymentStatus === 'Pagado';
                                    return isPaid ? (
                                      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Check size={12} strokeWidth={3} /> Pagado
                                      </span>
                                    ) : (
                                      title === 'En casa / Hospedados' ? (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHotelPaymentForm({
                                              reservationId: reg.id,
                                              guestName: `${reg.first_name} ${reg.last_name}`,
                                              roomName: reg.room_name,
                                              amount: res?.totalAmount || 0,
                                              currency: res?.currency || 'USD',
                                              method: 'efectivo',
                                              hostaway_reservation_id: reg.hostaway_reservation_id
                                            });
                                            setShowHotelPaymentModal(true);
                                          }}
                                          style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                        >
                                          <AlertCircle size={12} strokeWidth={3} /> Registrar pago
                                        </button>
                                      ) : (
                                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <AlertCircle size={12} strokeWidth={3} /> Pendiente de pago
                                        </span>
                                      )
                                    );
                                  })()}
                                  <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #dcfce7' }}>
                                    EN CASA
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                                <div>
                                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Contacto</div>
                                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{reg.email || 'N/A'}</div>
                                  <div style={{ fontSize: 13, color: '#64748b' }}>{reg.phone || 'N/A'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Origen</div>
                                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{reg.city || 'N/A'}, {reg.country || 'N/A'}</div>
                                  <div style={{ fontSize: 13, color: '#64748b' }}>{reg.nationality || 'N/A'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Estancia</div>
                                  <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                    {reg.arrival_date} ➔ {reg.departure_date}
                                  </div>
                                  <div style={{ fontSize: 13, color: '#64748b' }}>{reg.nights} noches | {reg.pax} pax</div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Simple card for upcoming checkins
                        const res = item;
                        return (
                          <div key={res.id} style={{ 
                            background: 'white', 
                            borderRadius: 16, 
                            border: '1px solid #e2e8f0', 
                            padding: 16,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                  {res.guestName}
                                </h3>
                                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🛏️</div>
                                  {res.roomName}
                                </div>
                              </div>
                              {res.arrivalDate === todayStr && (
                                <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                                  Check-in Hoy
                                </span>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: 16, marginTop: 4, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>Llegada</div>
                                <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                  {new Date(res.arrivalDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>Salida</div>
                                <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                                  {new Date(res.departureDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                              </div>
                            </div>

                            {res.arrivalDate === todayStr && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleNoShow(res); }}
                                    style={{ 
                                      background: '#fff1f2',
                                      color: '#e11d48',
                                      border: '1.5px solid #fecdd3',
                                      padding: '10px',
                                      borderRadius: 12,
                                      fontWeight: 700,
                                      fontSize: 13,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <UserMinus size={16} />
                                    No-show
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleCancelRes(res); }}
                                    style={{ 
                                      background: 'white',
                                      color: '#64748b',
                                      border: '1.5px solid #e2e8f0',
                                      padding: '10px',
                                      borderRadius: 12,
                                      fontWeight: 700,
                                      fontSize: 13,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={16} />
                                    Eliminar reserva
                                  </button>
                                </div>
                                <button 
                                  onClick={() => {
                                    setSelectedReservation(res);
                                    const cleanResPhone = (res.guestPhone || "").replace(/\D/g, "");
                                    const phonePrefix = COUNTRY_CODES.find(c => {
                                      const cleanCode = c.code.replace(/\D/g, "");
                                      return cleanResPhone.length > 0 && cleanResPhone.startsWith(cleanCode);
                                    });
                                    const initialCountry = findCountryWithFlag(res.guestCountry || phonePrefix?.name || "");
                                    
                                    setCheckinForm({
                                      name: res.guestName || '',
                                      nationality: initialCountry,
                                      homeAddress: res.guestAddress || '',
                                      phone: res.guestPhone || (phonePrefix ? `${phonePrefix.code} ` : ''),
                                      city: res.guestCity || '',
                                      country: initialCountry,
                                      email: res.guestEmail || '',
                                      roomName: res.roomName || '',
                                      arrivalDate: res.arrivalDate || '',
                                      departureDate: res.departureDate || '',
                                      nights: res.nights || 0,
                                      pax: (res.adults || 0) + (res.children || 0) || 1,
                                      price: res.totalAmount || 0,
                                      currency: res.currency || 'USD',
                                      paymentStatus: res.paymentStatus || 'Por Pagar',
                                      source: res.sourceName || '',
                                      signature: ''
                                    });
                                    setShowCheckinModal(true);
                                  }}
                                  className="btn-premium"
                                  style={{ 
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: 12, 
                                    padding: '12px', 
                                    fontWeight: 700, 
                                    fontSize: 14, 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    width: '100%',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                                  }}
                                >
                                  <UserPlus size={18} />
                                  Registrar ingreso
                                </button>
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

              return (
                <>
                  {renderGroup('Llegadas de hoy', checkinHoy, '#3b82f6')}
                  {renderGroup('En casa / Hospedados', enCasa, '#22c55e', true, true, isEnCasaExpanded, setIsEnCasaExpanded)}
                  {renderGroup('Próximos ingresos (Mañana y Pasado)', proximos, '#f59e0b', false, true, isProximosExpanded, setIsProximosExpanded)}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderRegistros = () => {
    const filteredRegistrations = registrations.filter(reg => {
      // Filter by Source
      if (registroSourceFilter !== 'Todos') {
        const sourceLower = (reg.source || 'Directa').toLowerCase();
        const filterLower = registroSourceFilter.toLowerCase();
        if (filterLower === 'directa') {
           if (sourceLower.includes('airbnb') || sourceLower.includes('expedia') || sourceLower.includes('booking')) return false;
        } else {
           if (!sourceLower.includes(filterLower)) return false;
        }
      }

      // Filter by Date
      if (registroDateFilter !== 'Todos') {
        const today = new Date();
        const regDate = new Date(reg.created_at);
        today.setHours(0,0,0,0);
        regDate.setHours(0,0,0,0);
        
        if (registroDateFilter === 'Hoy') {
          if (regDate.getTime() !== today.getTime()) return false;
        } else if (registroDateFilter === 'Esta semana') {
          const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
          if (regDate < firstDay) return false;
        } else if (registroDateFilter === 'Este mes') {
          if (regDate.getMonth() !== new Date().getMonth() || regDate.getFullYear() !== new Date().getFullYear()) return false;
        } else if (registroDateFilter === 'Este año') {
          if (regDate.getFullYear() !== new Date().getFullYear()) return false;
        }
      }
      return true;
    });

    const uniqueSources = ['Todos', 'Airbnb', 'Expedia', 'Booking', 'Directa'];

    return (
      <div className="fade-in" style={{ padding: '24px 16px', paddingBottom: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setCurrentView('checkin')} style={{ background: '#f1f5f9', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: '#64748b' }}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={28} color="#3b82f6" />
              Registros de Check-in
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Historial de huéspedes que han completado su registro online.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, background: 'white', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Origen / Plataforma</label>
            <select 
              value={registroSourceFilter}
              onChange={(e) => setRegistroSourceFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', backgroundColor: '#f8fafc' }}
            >
              {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 200px' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rango de Fechas</label>
            <select 
              value={registroDateFilter}
              onChange={(e) => setRegistroDateFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', backgroundColor: '#f8fafc' }}
            >
              {['Todos', 'Hoy', 'Esta semana', 'Este mes', 'Este año'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {filteredRegistrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>No hay registros que coincidan</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Intenta ajustar los filtros de búsqueda.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filteredRegistrations.map(reg => (
              <div key={reg.id} style={{ background: 'white', padding: 20, borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: '1 1 min-content' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>{reg.name}</h3>
                    <div style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>{reg.room_name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>
                      <div>{new Date(reg.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{new Date(reg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <button 
                      onClick={() => {
                        setDeleteRegistrationId(reg.id);
                      }}
                      className="btn-icon danger" 
                      style={{ padding: 8, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Contacto</div>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, wordBreak: 'break-all' }}>{reg.email || 'N/A'}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{reg.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Ubicación</div>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{reg.city || 'N/A'}, {reg.country || 'N/A'}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{reg.nationality || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Plataforma</div>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{reg.source || 'Directa'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Estancia</div>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                      {reg.arrival_date} ➔ {reg.departure_date}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{reg.nights} noches | {reg.pax} pax</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHotelPaymentModal = () => {
    if (!showHotelPaymentModal) return null;

    return (
      <div className="modal-overlay" style={{ zIndex: 3000, padding: 16 }}>
        <div className="modal-content fade-in" style={{ maxWidth: 450, width: '100%', borderRadius: 28, padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Registrar Pago</h2>
            <button onClick={() => setShowHotelPaymentModal(false)} style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', padding: 10, borderRadius: '14px', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: '#475569', fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
              Ingresa los detalles de pago para la estadía de <strong>{hotelPaymentForm.guestName}</strong> en <strong>{hotelPaymentForm.roomName}</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Monto</label>
                <input
                  type="number"
                  value={hotelPaymentForm.amount}
                  onChange={(e) => setHotelPaymentForm({ ...hotelPaymentForm, amount: Number(e.target.value) })}
                  style={{ padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 16, fontWeight: 600 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Divisa</label>
                  <select
                    value={hotelPaymentForm.currency}
                    onChange={(e) => setHotelPaymentForm({ ...hotelPaymentForm, currency: e.target.value })}
                    style={{ padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 16, fontWeight: 600, WebkitAppearance: 'none', background: 'url("data:image/svg+xml;utf8,<svg fill=\'%2364748b\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 12px center', backgroundColor: '#f8fafc' }}
                  >
                    <option value="USD">Dólar (USD)</option>
                    <option value="MXN">Peso (MXN)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Método</label>
                  <select
                    value={hotelPaymentForm.method}
                    onChange={(e) => setHotelPaymentForm({ ...hotelPaymentForm, method: e.target.value })}
                    style={{ padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', fontSize: 16, fontWeight: 600, WebkitAppearance: 'none', background: 'url("data:image/svg+xml;utf8,<svg fill=\'%2364748b\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 12px center', backgroundColor: '#f8fafc' }}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 16, borderTop: '2px solid #f1f5f9' }}>
            <button onClick={() => setShowHotelPaymentModal(false)} style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleHotelPaymentSubmit} style={{ padding: '14px', borderRadius: 14, border: 'none', background: '#1e293b', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Confirmar Pago</button>
          </div>
        </div>
      </div>
    );
  };

  const renderNewResModal = () => {
    if (!showNewResModal) return null;

    return (
      <div className="modal-overlay" style={{ zIndex: 3000, padding: 16 }}>
        <div className="modal-content fade-in" style={{ maxWidth: 650, width: '100%', maxHeight: '95vh', overflowY: 'auto', borderRadius: 28, padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>Crear Nueva Reserva</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>Registrar una nueva estancia en Hostaway</p>
            </div>
            <button onClick={() => setShowNewResModal(false)} style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', padding: 10, borderRadius: '14px', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
            <div className="form-group-premium">
              <label>Nombre</label>
              <input 
                type="text" 
                value={newResForm.guestFirstName} 
                onChange={e => setNewResForm({...newResForm, guestFirstName: e.target.value})}
                placeholder="Nombre"
              />
            </div>
            <div className="form-group-premium">
              <label>Apellido</label>
              <input 
                type="text" 
                value={newResForm.guestLastName} 
                onChange={e => setNewResForm({...newResForm, guestLastName: e.target.value})}
                placeholder="Apellido"
              />
            </div>
            <div className="form-group-premium">
              <label>E-mail</label>
              <input 
                type="email" 
                value={newResForm.guestEmail} 
                onChange={e => setNewResForm({...newResForm, guestEmail: e.target.value})}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="form-group-premium">
              <label>Teléfono</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={(() => {
                    const prefixMatch = COUNTRY_CODES.find(c => newResForm.guestPhone.startsWith(c.code));
                    return prefixMatch?.code || '+52';
                  })()}
                  onChange={e => {
                    const newPrefix = e.target.value;
                    const currentPhone = newResForm.guestPhone;
                    const prefixMatch = COUNTRY_CODES.find(c => currentPhone.startsWith(c.code));
                    const numberOnly = prefixMatch ? currentPhone.substring(prefixMatch.code.length).trim() : currentPhone.trim();
                    setNewResForm({...newResForm, guestPhone: `${newPrefix} ${numberOnly}`.trim()});
                  }}
                  style={{ width: '110px', height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  value={(() => {
                    const prefixMatch = COUNTRY_CODES.find(c => newResForm.guestPhone.startsWith(c.code));
                    return prefixMatch ? newResForm.guestPhone.substring(prefixMatch.code.length).trim() : newResForm.guestPhone;
                  })()}
                  onChange={e => {
                    const prefixMatch = COUNTRY_CODES.find(c => newResForm.guestPhone.startsWith(c.code));
                    const prefix = prefixMatch?.code || '+52';
                    const val = e.target.value.replace(/^\s+/, '');
                    setNewResForm({...newResForm, guestPhone: `${prefix} ${val}`});
                  }}
                  placeholder="123456789"
                />
              </div>
            </div>
            <div className="form-group-premium">
              <label>Nacionalidad</label>
               <select 
                value={newResForm.guestNationality} 
                onChange={e => setNewResForm({...newResForm, guestNationality: e.target.value})}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 600, color: '#0f172a', background: 'white' }}
              >
                <option value="">Seleccionar...</option>
                {Object.values(COUNTRIES_BY_CONTINENT).flat().sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group-premium">
              <label>Ciudad</label>
              <input 
                type="text" 
                value={newResForm.guestCity} 
                onChange={e => setNewResForm({...newResForm, guestCity: e.target.value})}
                placeholder="Ciudad"
              />
            </div>

            <div style={{ gridColumn: 'span 2', height: '1px', background: '#f1f5f9', margin: '8px 0' }} />

            <div className="form-group-premium">
              <label>Fecha de Check-in</label>
              <input 
                type="date" 
                value={newResForm.arrivalDate} 
                onChange={e => setNewResForm({...newResForm, arrivalDate: e.target.value})}
              />
            </div>
            <div className="form-group-premium">
              <label>Fecha de Check-out</label>
              <input 
                type="date" 
                value={newResForm.departureDate} 
                onChange={e => setNewResForm({...newResForm, departureDate: e.target.value})}
              />
            </div>

            <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
              <label>Habitación Asignada (Disponibles)</label>
              <select 
                value={newResForm.listingId} 
                onChange={e => {
                  const lid = e.target.value;
                  const listing = availableListings.find(l => String(l.id) === lid);
                  setNewResForm({...newResForm, listingId: lid, customPrice: listing?.basePrice || ''});
                }}
                disabled={isLoadingAvailability || !newResForm.arrivalDate || !newResForm.departureDate}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 600, color: '#0f172a', background: 'white' }}
              >
                {!newResForm.arrivalDate || !newResForm.departureDate ? (
                  <option>Selecciona fechas para ver disponibilidad...</option>
                ) : isLoadingAvailability ? (
                  <option>Cargando disponibilidad...</option>
                ) : availableListings.length === 0 ? (
                  <option>No hay habitaciones disponibles para estas fechas</option>
                ) : (
                  <>
                    <option value="">Seleccionar habitación...</option>
                    {availableListings.map(l => (
                      <option key={l.id} value={l.id}>{l.name} (${l.basePrice} {l.currency})</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {newResForm.listingId && (
              <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 16, fontSize: 15 }}>Configuración de Precio</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="priceMode"
                      checked={!newResForm.useCustomPrice} 
                      onChange={() => setNewResForm({...newResForm, useCustomPrice: false})}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Precio Hostaway (Base)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="priceMode"
                      checked={newResForm.useCustomPrice} 
                      onChange={() => setNewResForm({...newResForm, useCustomPrice: true})}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Personalizar Precio</span>
                  </label>

                  {newResForm.useCustomPrice && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }} className="fade-in">
                      <select 
                        value={newResForm.priceCurrency}
                        onChange={e => setNewResForm({...newResForm, priceCurrency: e.target.value})}
                        style={{ width: 80, height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 700 }}
                      >
                        <option value="USD">USD</option>
                        <option value="MXN">MXN</option>
                      </select>
                      <input 
                        type="number"
                        value={newResForm.customPrice}
                        onChange={e => setNewResForm({...newResForm, customPrice: e.target.value})}
                        placeholder="Monto"
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: newResForm.isPaid ? '#ecfdf5' : 'white', padding: '12px 16px', borderRadius: 12, border: `1px solid ${newResForm.isPaid ? '#10b981' : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                  <input 
                    type="checkbox" 
                    checked={newResForm.isPaid}
                    onChange={e => setNewResForm({...newResForm, isPaid: e.target.checked})}
                    style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: newResForm.isPaid ? '#065f46' : '#334155', display: 'block' }}>Marcar como Pagado</span>
                    <span style={{ fontSize: 12, color: newResForm.isPaid ? '#059669' : '#64748b' }}>Registrará un cargo por el total en Hostaway</span>
                  </div>
                </label>

                {newResForm.isPaid && (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#334155' }}>Detalles de la Transacción</h5>
                    <div className="form-group-premium">
                      <label>Método de Pago</label>
                      <select
                        value={newResForm.transactionMethod}
                        onChange={e => setNewResForm({...newResForm, transactionMethod: e.target.value})}
                      >
                        <option value="cash">Efectivo (Cash)</option>
                        <option value="creditCard">Tarjeta (Credit Card)</option>
                        <option value="bankTransfer">Transferencia (Bank Transfer)</option>
                        <option value="paypal">PayPal</option>
                        <option value="otaPayment">Pago por OTA</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div className="form-group-premium">
                      <label>Descripción (Opcional)</label>
                      <input 
                        type="text" 
                        value={newResForm.transactionDescription} 
                        onChange={e => setNewResForm({...newResForm, transactionDescription: e.target.value})}
                        placeholder="Ej. Pago en recepción, Depósito..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleCreateReservation}
              disabled={isCreatingRes || !newResForm.listingId}
              className="btn-premium"
              style={{ 
                gridColumn: 'span 2',
                marginTop: 12,
                height: 56,
                fontSize: 16,
                background: isCreatingRes || !newResForm.listingId ? '#cbd5e1' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 16,
                fontWeight: 800,
                cursor: isCreatingRes || !newResForm.listingId ? 'not-allowed' : 'pointer'
              }}
            >
              {isCreatingRes ? 'Creando Reserva...' : 'Confirmar y Guardar Reserva'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCheckinModal = () => {
    if (!showCheckinModal) return null;

    const handleSave = async () => {
      try {
        const { error } = await supabase.from('guest_registrations').insert({
          hostaway_reservation_id: selectedReservation?.id,
          name: checkinForm.name,
          nationality: checkinForm.nationality,
          home_address: checkinForm.homeAddress,
          phone: checkinForm.phone,
          city: checkinForm.city,
          country: checkinForm.country,
          email: checkinForm.email,
          room_name: checkinForm.roomName,
          arrival_date: checkinForm.arrivalDate,
          departure_date: checkinForm.departureDate,
          nights: checkinForm.nights,
          pax: checkinForm.pax,
          price: checkinForm.price,
          source: checkinForm.source,
          signature_data: checkinForm.signature
        });

        if (error) throw error;
        setShowCheckinModal(false);
        alert('Registro completado con éxito');
      } catch (err: any) {
        alert('Error al guardar: ' + err.message);
      }
    };

    return (
      <div className="modal-overlay" style={{ zIndex: 3000, padding: 16 }}>
        <div className="modal-content fade-in" style={{ maxWidth: 650, width: '100%', maxHeight: '95vh', overflowY: 'auto', borderRadius: 28, padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>Registro de Huésped</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>Complete la información para finalizar el check-in</p>
            </div>
            <button onClick={() => setShowCheckinModal(false)} style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', padding: 10, borderRadius: '14px', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <div className="checkin-section-title">
            <User size={16} /> Información del Huésped
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
            <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
              <label>Nombre Completo</label>
              <input 
                type="text" 
                value={checkinForm.name} 
                onChange={e => setCheckinForm({...checkinForm, name: e.target.value})}
                placeholder="Nombre como aparece en ID"
              />
            </div>
            
            <div className="form-group-premium">
              <label>Nacionalidad</label>
              <select 
                value={checkinForm.nationality} 
                onChange={e => setCheckinForm({...checkinForm, nationality: e.target.value, country: e.target.value})}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 600, color: '#0f172a', background: 'white' }}
              >
                <option value="">Seleccionar país...</option>
                {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => (
                  <optgroup key={continent} label={continent}>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group-premium">
              <label>E-mail</label>
              <input 
                type="email" 
                value={checkinForm.email} 
                onChange={e => setCheckinForm({...checkinForm, email: e.target.value})}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="form-group-premium">
              <label>Celular / Teléfono</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={(() => {
                    const prefixMatch = COUNTRY_CODES.find(c => checkinForm.phone.startsWith(c.code));
                    return prefixMatch?.code || '+52';
                  })()}
                  onChange={e => {
                    const newPrefix = e.target.value;
                    const currentPhone = checkinForm.phone;
                    const prefixMatch = COUNTRY_CODES.find(c => currentPhone.startsWith(c.code));
                    const numberOnly = prefixMatch ? currentPhone.substring(prefixMatch.code.length).trim() : currentPhone.trim();
                    setCheckinForm({...checkinForm, phone: `${newPrefix} ${numberOnly}`.trim()});
                  }}
                  style={{ width: '110px', height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  value={(() => {
                    const prefixMatch = COUNTRY_CODES.find(c => checkinForm.phone.startsWith(c.code));
                    return prefixMatch ? checkinForm.phone.substring(prefixMatch.code.length).trim() : checkinForm.phone;
                  })()}
                  onChange={e => {
                    const prefixMatch = COUNTRY_CODES.find(c => checkinForm.phone.startsWith(c.code));
                    const prefix = prefixMatch?.code || '+52';
                    const val = e.target.value.replace(/^\s+/, '');
                    setCheckinForm({...checkinForm, phone: `${prefix} ${val}`});
                  }}
                  placeholder="Número sin código"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group-premium">
              <label>Ciudad</label>
              <input 
                type="text" 
                value={checkinForm.city} 
                onChange={e => setCheckinForm({...checkinForm, city: e.target.value})}
                placeholder="Ciudad de origen"
              />
            </div>

            <div className="form-group-premium">
              <label>País</label>
              <select 
                value={checkinForm.country} 
                onChange={e => setCheckinForm({...checkinForm, country: e.target.value, nationality: e.target.value})}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15, fontWeight: 600, color: '#0f172a', background: 'white' }}
              >
                <option value="">Seleccionar país...</option>
                {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => (
                  <optgroup key={continent} label={continent}>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
              <label>Dirección</label>
              <input 
                type="text" 
                value={checkinForm.homeAddress} 
                onChange={e => setCheckinForm({...checkinForm, homeAddress: e.target.value})}
                placeholder="Calle, número, colonia..."
              />
            </div>
          </div>

          <div className="checkin-section-title">
            <Building size={16} /> Detalles de la Estancia
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
            <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
              <label>Habitación Asignada</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" value={checkinForm.roomName} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>Origen de Reserva</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" value={checkinForm.source} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>PAX (Cantidad de personas)</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="number" 
                  value={checkinForm.pax} 
                  onChange={e => setCheckinForm({...checkinForm, pax: parseInt(e.target.value)})}
                  style={{ paddingLeft: 44 }}
                />
              </div>
            </div>

            <div className="form-group-premium">
              <label>Fecha de Llegada</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="date" value={checkinForm.arrivalDate} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>Fecha de Salida</label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="date" value={checkinForm.departureDate} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 16 }}>
              <div className="form-group-premium">
                <label>Noches</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="number" value={checkinForm.nights} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
                </div>
              </div>

              <div className="form-group-premium">
                <label>Precio de Estancia</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <CreditCard size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="number" 
                      value={checkinForm.price} 
                      onChange={e => setCheckinForm({...checkinForm, price: parseFloat(e.target.value)})}
                      style={{ paddingLeft: 44, paddingRight: 60 }}
                    />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: 13 }}>
                      {checkinForm.currency}
                    </span>
                  </div>
                  <div style={{ 
                    padding: '0 16px', 
                    borderRadius: 12, 
                    fontSize: 11, 
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: checkinForm.paymentStatus === 'Pagado' ? '#dcfce7' : '#fee2e2',
                    color: checkinForm.paymentStatus === 'Pagado' ? '#166534' : '#991b1b',
                    border: `1px solid ${checkinForm.paymentStatus === 'Pagado' ? '#bbf7d0' : '#fecaca'}`,
                    minWidth: 110,
                    textAlign: 'center',
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    {checkinForm.paymentStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="checkin-section-title">
            <PenTool size={16} /> Firma Digital del Huésped
          </div>

          <div className="form-group-premium">
            <div className="signature-pad-container" style={{ height: 180 }}>
              <canvas 
                id="signature-canvas"
                style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
                onMouseDown={(e) => {
                  const canvas = e.currentTarget as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.beginPath();
                  ctx.lineWidth = 2.5;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.strokeStyle = '#1e293b';
                  const rect = canvas.getBoundingClientRect();
                  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                  ctx.moveTo(x, y);
                  (canvas as any).isDrawing = true;
                }}
                onMouseMove={(e) => {
                  const canvas = e.currentTarget as HTMLCanvasElement;
                  if (!(canvas as any).isDrawing) return;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                  ctx.lineTo(x, y);
                  ctx.stroke();
                }}
                onMouseUp={(e) => {
                  const canvas = e.currentTarget as HTMLCanvasElement;
                  (canvas as any).isDrawing = false;
                  setCheckinForm(prev => ({...prev, signature: canvas.toDataURL()}));
                }}
                onTouchStart={(e) => {
                  const canvas = e.currentTarget as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.beginPath();
                  ctx.lineWidth = 2.5;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.strokeStyle = '#1e293b';
                  const rect = canvas.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                  const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                  ctx.moveTo(x, y);
                  (canvas as any).isDrawing = true;
                  e.preventDefault();
                }}
                onTouchMove={(e) => {
                  const canvas = e.currentTarget as HTMLCanvasElement;
                  if (!(canvas as any).isDrawing) return;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  const rect = canvas.getBoundingClientRect();
                  const touch = e.touches[0];
                  const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                  const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                  ctx.lineTo(x, y);
                  ctx.stroke();
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  const canvas = e.currentTarget as HTMLCanvasElement;
                  (canvas as any).isDrawing = false;
                  setCheckinForm(prev => ({...prev, signature: canvas.toDataURL()}));
                }}
                width={800}
                height={180}
              />
              <button 
                onClick={() => {
                  const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d');
                  ctx?.clearRect(0, 0, canvas.width, canvas.height);
                  setCheckinForm(prev => ({...prev, signature: ''}));
                }}
                style={{ position: 'absolute', bottom: 12, right: 12, background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
              >
                Limpiar Firma
              </button>
            </div>
          </div>

          <div className="checkin-modal-footer">
            <button className="btn-finalize" onClick={handleSave}>
              <Check size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Finalizar Registro
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSalon = () => {
    // Derive status from live data
    const getEffectiveStatus = (tableId: number): 'free' | 'occupied-pending' | 'occupied-done' => {
      const isOccupied = !!tableOrders[tableId];
      if (!isOccupied) return 'free';
      const items = (activeItems || []).filter(i => i.table_id === tableId);
      const hasPending = items.some(i => i.status === 'pending');
      return hasPending ? 'occupied-pending' : 'occupied-done';
    };
    const safeTables = tables || [];
    const safeActiveItems = activeItems || [];
    const filteredTablesForCounts = safeTables.filter(t => ['Salón', 'Terraza', 'Jardín'].includes(t.category || ''));
    const occupiedCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'occupied-pending').length;
    const payingCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'occupied-done').length;
    const freeCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'free').length;

    return (
      <div className="salon-view fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
          <button className="btn-primary" onClick={() => setShowPosExpenseModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Registrar una compra
          </button>
        </div>

        <div className="salon-legend">
           <div className="salon-legend-item free"><div className="salon-legend-pip"></div> LIBRES</div>
           <div className="salon-legend-item occupied-pending"><div className="salon-legend-pip"></div> CON PENDIENTES</div>
           <div className="salon-legend-item occupied-done"><div className="salon-legend-pip"></div> SIN PENDIENTES</div>
        </div>

        {/* Table grid grouped by category */}
        {['Salón', 'Terraza', 'Jardín', 'Pedidos para llevar'].filter(c => c === 'Pedidos para llevar' || safeTables.some(t => t.category === c)).map(category => (
          <div key={category} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ 
                fontSize: 14, 
                fontWeight: 800, 
                color: '#64748b', 
                textTransform: 'uppercase', 
                letterSpacing: 1, 
                paddingLeft: 4,
                borderLeft: '4px solid #3b82f6',
                margin: 0
              }}>
                {category}
              </h3>
              {category === 'Pedidos para llevar' && (
                <button 
                  onClick={() => setIsDeliveryModalOpen(true)}
                  style={{ 
                    background: '#6366f1', color: 'white', border: 'none', 
                    padding: '6px 12px', borderRadius: 12, fontSize: 11, 
                    fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 
                  }}
                >
                  <Plus size={14} /> NUEVO PEDIDO
                </button>
              )}
            </div>
            <div className={category === 'Pedidos para llevar' ? "delivery-list" : "card-grid"}>
              {safeTables.filter(t => t.category === category).map(table => {
                const effectiveStatus = getEffectiveStatus(table.id);
                const tableItems = safeActiveItems.filter(i => i.table_id === table.id);
                const activeTotal = tableItems.reduce((s, i) => s + i.price * i.qty, 0);
                const itemCount = tableItems.length;

                // For delivery, if it's free, it means it was paid today (or is empty)
                let displayTotal = activeTotal;
                let isPaid = false;

                if (category === 'Pedidos para llevar' && effectiveStatus === 'free') {
                  const closedOrder = (todayClosedOrders || []).slice().reverse().find(o => o.table_id === table.id);
                  if (closedOrder) {
                    displayTotal = closedOrder.total || 0;
                    isPaid = true;
                  }
                }

                if (category === 'Pedidos para llevar') {
                  if (effectiveStatus === 'free' && !isPaid) return null; // Don't show empty/old ones

                  return (
                    <div
                      key={table.id}
                      className={`delivery-item ${effectiveStatus} ${isPaid ? 'is-paid' : ''}`}
                      onClick={() => openTable(table.id)}
                      style={{ opacity: isPaid ? 0.6 : 1 }}
                    >
                      <div className="delivery-item-left">
                        <div className="delivery-item-icon">
                          {isPaid ? '🏁' : (effectiveStatus === 'occupied-pending' ? '⏳' : '✅')}
                        </div>
                        <div className="delivery-item-details">
                          <span className="delivery-item-name" style={{ textDecoration: isPaid ? 'line-through' : 'none' }}>
                            {table.name}
                          </span>
                          <span className="delivery-item-count">
                            {isPaid ? 'Pagado' : `${itemCount} ítem${itemCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>
                      <div className="delivery-item-right">
                        <div className="delivery-item-total" style={{ textDecoration: isPaid ? 'line-through' : 'none' }}>
                          ${displayTotal.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  );
                }

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

                    {/* Big label */}
                    <div className="tc-number">{table.name}</div>

                    {/* Footer info by status */}
                    <div className="tc-footer">
                      {effectiveStatus === 'free' && (
                        <span className="tc-status-free">Libre</span>
                      )}
                      {effectiveStatus !== 'free' && (
                        <>
                          <span className="tc-items" style={{ color: effectiveStatus === 'occupied-done' ? '#9333ea' : '#ef4444' }}>{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
                          <span className="tc-total" style={{ color: effectiveStatus === 'occupied-done' ? '#9333ea' : '#ef4444' }}>${(activeTotal || 0).toFixed(0)}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMesa = () => {
    if (!selectedTableId) return null;
    const table = tables.find(t => t.id === selectedTableId);
    
    return (
      <div className="mesa-view fade-in">
        <div className="mesa-header-premium">
          <button className="back-btn-pill" onClick={() => setCurrentView('salon')}>
            <ChevronLeft size={20} />
            <span>Restaurante</span>
          </button>
          <div className="mesa-title-wrap">
             <h2>{table?.name}</h2>
             <span className={`mesa-status-tag ${table?.status}`}>{table?.status === 'paying' ? 'Impreso' : 'Ocupada'}</span>
          </div>
          <button className="action-btn-circle danger" onClick={() => setTableConfirmModal({isOpen: true, type: 'closeEmpty', tableId: selectedTableId})}>
             <Trash2 size={20} />
          </button>
        </div>

        <div className="tab-control-premium">
          <button className={`tab-btn-p ${mesaTab === 'orden' ? 'active' : ''}`} onClick={() => setMesaTab('orden')}>
            <ClipboardList size={18} />
            Orden ({orderItems.length})
          </button>
          <button className={`tab-btn-p ${mesaTab === 'menu' ? 'active' : ''}`} onClick={() => setMesaTab('menu')}>
            <Plus size={18} />
            Añadir
          </button>
        </div>

        <div className="tab-content-premium">
          {mesaTab === 'orden' ? (
            <div className="order-details-p fade-in">
              {orderItems.length === 0 ? (
                <div className="empty-order-state">
                  <div className="empty-order-icon"><Zap size={32} /></div>
                  <h3>Sin productos aún</h3>
                  <p>Añade platillos desde el menú</p>
                  <button className="btn-premium" onClick={() => setMesaTab('menu')} style={{ width: 'auto', padding: '12px 24px', marginTop: 12 }}>
                    Ver Menú
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="order-items-list" style={{ flex: 1, overflowY: 'auto' }}>
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
                          {item.notes && (
                            <div className={`order-item-notes ${item.notes.includes('EXTRAS:') ? 'has-extras' : ''}`}>
                              {item.notes.includes('EXTRAS:') && <span style={{ fontWeight: 800, color: '#b45309', marginRight: 4 }}>🚨</span>}
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <div className="order-item-price">
                           ${item.price * item.qty}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="order-actions-grid" style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                       <button className="order-btn-sec" onClick={() => setPrintCuentaModal({isOpen: true, tableId: selectedTableId, isFinalBill: false})} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 8px' }}>
                         <Printer size={20} />
                         <span style={{ fontSize: 12, fontWeight: 600 }}>Imprimir comanda</span>
                       </button>
                       <button className="order-btn-sec" onClick={() => setPrintCuentaModal({isOpen: true, tableId: selectedTableId, isFinalBill: true})} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 8px' }}>
                         <Printer size={20} />
                         <span style={{ fontSize: 12, fontWeight: 600 }}>Imprimir cuenta</span>
                       </button>
                    </div>
                     <button className="order-btn-pri" onClick={() => setCurrentView('checkout')}>
                       Cobrar Mesa
                     </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="menu-selection-p fade-in">
              <div className="menu-search-wrap">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar platillo..." 
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                />
              </div>
              {!menuSearch && (
                <div className="category-chips-wrap">
                  {dynamicCategories.map(cat => (
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
                {(() => {
                  const subCats = CATEGORY_MAPPING[menuCategory];
                  const renderItem = (item: MenuItem) => (
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
                  );

                  if (!subCats || menuSearch.trim()) {
                    return filteredMenuItems.map(renderItem);
                  }

                  return subCats.map(subCat => {
                    const itemsInSub = filteredMenuItems.filter(m => m.category === subCat);
                    if (itemsInSub.length === 0) return null;
                    const isExpanded = !expandedSubCats.has(subCat);
                    const displayName = subCat.split(': ').pop();

                    return (
                      <div key={subCat} style={{ width: '100%', marginBottom: 12 }}>
                        <button 
                          onClick={() => toggleSubCat(subCat)}
                          style={{ 
                            width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 10px 4px'
                          }}
                        >
                          <h4 style={{ 
                            fontSize: 11, fontWeight: 800, color: isExpanded ? '#4f46e5' : '#94a3b8', 
                            textTransform: 'uppercase', letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 6,
                            whiteSpace: 'nowrap'
                          }}>
                            {displayName} {isExpanded ? <ChevronDown size={14} color="#4f46e5" /> : <ChevronRight size={14} />}
                          </h4>
                          <div style={{ height: 1, flex: 1, background: '#f1f5f9' }} />
                        </button>
                        {isExpanded && itemsInSub.map(renderItem)}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
        {renderItemConfirmModal()}
      </div>
    );
  };

  const renderItemConfirmModal = () => {
    if (!itemToConfirm) return null;
    
    const allExtras = menuItems.filter(i => i.category.startsWith('EXTRAS:'));

    return (
      <div className="variants-modal-p" onClick={(e) => {
        if (e.target === e.currentTarget) {
          setItemToConfirm(null);
          setItemVariantToConfirm(undefined);
          setItemNotesToConfirm('');
          setItemExtrasSelected([]);
        }
      }}>
        <div className="variants-modal-content">
          <div className="vm-header">
            <h3 className="vm-title">Añadir al pedido</h3>
            <button className="vm-close" onClick={() => {
              setItemToConfirm(null);
              setItemVariantToConfirm(undefined);
              setItemNotesToConfirm('');
              setItemExtrasSelected([]);
            }}>
              <X size={20} />
            </button>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{itemToConfirm.name}</h4>
            {itemVariantToConfirm && <div style={{ color: '#64748b', fontWeight: 600 }}>Variante: {itemVariantToConfirm.label}</div>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Notas especiales</label>
            <textarea
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', fontFamily: 'Outfit', fontSize: 15 }}
              placeholder="Ej. Sin cebolla, término medio..."
              rows={2}
              value={itemNotesToConfirm}
              onChange={e => setItemNotesToConfirm(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 24, maxHeight: '35vh', overflowY: 'auto' }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>Ingredientes Extra</label>
            
            {['EXTRAS: CARNES', 'EXTRAS: VEGETALES', 'EXTRAS: QUESOS'].map(category => {
              const categoryExtras = allExtras.filter(e => e.category === category);
              if (categoryExtras.length === 0) return null;
              
              return (
                <div key={category} style={{ marginBottom: 16 }}>
                  <h5 style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px 4px' }}>
                    {category.replace('EXTRAS: ', '')}
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {categoryExtras.map(extra => {
                      const isSelected = itemExtrasSelected.some(e => e.id === extra.id);
                      return (
                        <label key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 12, background: isSelected ? '#eff6ff' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setItemExtrasSelected([...itemExtrasSelected, extra]);
                              else setItemExtrasSelected(itemExtrasSelected.filter(ex => ex.id !== extra.id));
                            }}
                            style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
                          />
                          <div style={{ flex: 1, fontWeight: 700, color: isSelected ? '#1e3a8a' : '#0f172a' }}>{extra.name}</div>
                          <div style={{ fontWeight: 800, color: '#3b82f6' }}>+${extra.price}</div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn-premium" style={{ width: '100%', padding: 16 }} onClick={() => {
            let finalPrice = itemVariantToConfirm ? itemVariantToConfirm.price : itemToConfirm.price;
            let finalNotes = itemNotesToConfirm.trim();
            
            if (itemExtrasSelected.length > 0) {
              const extrasText = itemExtrasSelected.map(e => e.name).join(', ');
              finalNotes = finalNotes ? `${finalNotes} | EXTRAS: ${extrasText}` : `EXTRAS: ${extrasText}`;
              finalPrice += itemExtrasSelected.reduce((sum, e) => sum + e.price, 0);
            }

            addItemToOrder(selectedTableId!, itemToConfirm, itemVariantToConfirm, finalNotes || undefined, finalPrice);
            
            setItemToConfirm(null);
            setItemVariantToConfirm(undefined);
            setItemNotesToConfirm('');
            setItemExtrasSelected([]);
          }}>
            Agregar a la orden
          </button>
        </div>
      </div>
    );
  };

  const renderCheckout = () => {
    if (!selectedTableId) return null;
    
    const isEfectivo = paymentMethod === 'efectivo';
    const tipVal = tipPercent === 'Otro' 
      ? parseFloat(customTip) || 0 
      : (tipPercent === 'none' 
          ? 0 
          : (isEfectivo ? parseFloat(tipPercent) : finalTotal * (parseFloat(tipPercent)/100))
        );
    const grandTotal = finalTotal + tipVal;

    return (
      <div className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Total a cobrar (Cuenta + Propina)</div>
          <div style={{ fontSize: 56, fontWeight: 600, color: '#0e122b', letterSpacing: -1 }}>${grandTotal.toFixed(0)}</div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, fontSize: 13, color: '#64748b' }}>
            <span>Cuenta: <b>${finalTotal.toFixed(0)}</b></span>
            {tipVal > 0 && <span>Propina: <b style={{ color: '#ef4444' }}>+${tipVal.toFixed(0)}</b></span>}
          </div>

          {discountType !== 'none' && (
            <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600, marginTop: 8 }}>
              (Descuento aplicado: {discountType === 'amount' ? `$${dVal}` : `${dVal}%`})
            </div>
          )}
        </div>

        <label className="label">Método de pago</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[
            { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
            { id: 'efectivo', label: 'Efectivo', icon: '💵' },
            { id: 'transferencia', label: 'Transferencia', icon: '🏦' }
          ].map(m => (
            <div 
              key={m.id} 
              className={`payment-card ${paymentMethod === m.id ? 'selected' : ''}`} 
              onClick={() => setPaymentMethod(m.id as any)}
              style={{ 
                flexDirection: 'row', 
                padding: '16px 24px', 
                justifyContent: 'flex-start',
                gap: 16
              }}
            >
              {paymentMethod === m.id && <div className="check-badge"><Check size={12} strokeWidth={3} /></div>}
              <div className="payment-icon-wrapper" style={{ width: 42, height: 42 }}><span style={{ fontSize: 20 }}>{m.icon}</span></div>
              <div className="payment-text" style={{ fontSize: 16 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24, background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
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

        {/* Conditional Sections based on Payment Method */}
        {isEfectivo ? (
          <>
            {/* 1. Change Calculator Section First for Cash */}
            <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <label className="label" style={{ marginBottom: 12 }}>Calculadora de Cambio</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Efectivo recibido (incluyendo propina):</div>
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
                <span style={{ color: '#059669', fontWeight: 800, fontSize: 20 }}>${Math.max(0, (parseFloat(cashReceived) || 0) - grandTotal).toFixed(0)}</span>
              </div>
            </div>

            {/* 2. Tip Section Second for Cash */}
            <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <label className="label" style={{ marginBottom: 12 }}>Propina</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: tipPercent === 'Otro' ? 16 : 0, overflowX: 'auto', paddingBottom: 4 }}>
                {(['none', '20', '50', '100', 'Otro'] as const).map(t => (
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
                    {t === 'none' ? 'Sin propina' : t === 'Otro' ? 'Otro' : `$${t}`}
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
            </div>
          </>
        ) : (
          <>
            {/* Standard Order for Card/Transfer */}
            <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
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
          </>
        )}

        <button className="btn-primary" onClick={handleConfirmPayment}>Registrar como pagado</button>
      </div>
    );
  };

  const renderPedidos = () => {
    const itemsByTable = (activeItems || [])
      .filter(i => i.status === 'pending' || i.status === 'done')
      .reduce((acc, item) => {
        if (!acc[item.table_id]) acc[item.table_id] = [];
        acc[item.table_id].push(item);
        return acc;
      }, {} as Record<number, any[]>);

    const tableIds = Object.keys(itemsByTable).map(Number).sort((a, b) => a - b);

    return (
      <div className="fade-in pedidos-view">
        {tableIds.length === 0 && todayClosedOrders.length === 0 ? (
          <div className="empty-pedidos">
            <div style={{ fontSize: 64, marginBottom: 20 }}>👩‍🍳</div>
            <h2>Tu cocina está al día</h2>
            <p>Las nuevas comandas aparecerán aquí automáticamente por mesa.</p>
          </div>
        ) : (
          <div className="pedidos-list">
            {tableIds.map(tableId => {
              const tableItems = itemsByTable[tableId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              const isCollapsed = !expandedPedidos.includes(tableId);
              const toggleCollapse = () => {
                setExpandedPedidos(prev => prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]);
              };

              const pendingTableItems = tableItems.filter(i => i.status === 'pending');
              const oldestPending = pendingTableItems[0];
              
              let elapsedMinutes = 0;
              let timeColor = '#10b981';

              if (oldestPending) {
                elapsedMinutes = Math.floor((currentTime.getTime() - new Date(oldestPending.created_at).getTime()) / 60000);
                const isDelayed = elapsedMinutes >= 15;
                const isWarning = elapsedMinutes >= 10 && !isDelayed;
                timeColor = isDelayed ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
              } else if (tableItems.length > 0) {
                timeColor = '#64748b';
              }

              return (
                <div className="qa-card" key={`pedidos-table-${tableId}`} style={{ padding: 0, overflow: 'hidden' }}>
                  <div 
                    className="qa-header" 
                    onClick={toggleCollapse} 
                    style={{ padding: '16px', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid #f1f5f9', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="qa-table-badge">Mesa {(tables || []).find(t => t.id === tableId)?.name || tableId}</div>
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
                    <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      {isCollapsed ? <ChevronDown size={20} strokeWidth={2.5} /> : <ChevronUp size={20} strokeWidth={2.5} />}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {tableItems.map(item => {
                        const category = (menuItems || []).find(m => m.name === item.name)?.category ?? '';
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
                                <div className="qa-notes-box" style={{ marginTop: 6, background: '#fef3c7', color: '#d97706', padding: '8px 12px', borderRadius: 10 }}>
                                  <StickyNote size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.notes}</span>
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
            
            {/* Mostrar mesas que ya fueron cobradas y cerradas en el día actual */}
            {todayClosedOrders.map((order: any) => {
              const tableName = (tables || []).find(t => t.id === order.table_id)?.name || order.table_id;
              return (
                <div className="qa-card" key={`closed-order-${order.id}`} style={{ padding: 0, overflow: 'hidden', opacity: 0.7 }}>
                  <div 
                    className="qa-header" 
                    style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="qa-table-badge" style={{ opacity: 0.7 }}>Mesa {tableName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                        <Check size={14} strokeWidth={3} />
                        Completado
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Confirmación de Entrega */}
        {deliveryConfirm && (
          <div className="variants-modal-p" onClick={() => setDeliveryConfirm(null)} style={{ zIndex: 9999 }}>
            <div className="variants-modal-content scale-in" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', maxWidth: '400px' }}>
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '18px' }}>Confirmar entrega</h3>
                <button 
                  onClick={() => setDeliveryConfirm(null)}
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#94a3b8', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ margin: '0 auto 16px', width: '64px', height: '64px', background: '#eff6ff', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={32} strokeWidth={3} />
                </div>
                <p style={{ color: '#475569', marginBottom: '24px', fontWeight: 600, fontSize: '16px' }}>¿Marcar esta comanda como entregada / completada?</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setDeliveryConfirm(null)}
                    style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      await markItemDone(deliveryConfirm);
                      setDeliveryConfirm(null);
                    }}
                    style={{ flex: 1, background: '#2563eb', border: 'none', color: 'white', fontWeight: 700, padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };



  const handleNoShow = async (res: Reservation) => {
    if (!window.confirm(`¿Marcar la reserva de ${res.guestName} como No-show?`)) return;
    
    try {
      setIsLoadingCheckins(true);
      await updateReservationStatus(res.id, undefined, true);
      alert('Reserva marcada como No-show correctamente');
      setUpcomingCheckins(prev => prev.filter(r => r.id !== res.id));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoadingCheckins(false);
    }
  };

  const handleCancelRes = async (res: Reservation) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar/cancelar la reserva de ${res.guestName}?`)) return;
    
    try {
      setIsLoadingCheckins(true);
      await updateReservationStatus(res.id, 'cancelled');
      alert('Reserva eliminada/cancelada correctamente');
      setUpcomingCheckins(prev => prev.filter(r => r.id !== res.id));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoadingCheckins(false);
    }
  };

  // ── Render ───────────────────────────────────────────



  return (
    <>

      <div className="app-container">
      {renderHeader()}
      <div className="content-area">
        {currentView === 'home' && renderHome()}
        {currentView === 'checkin' && renderCheckin()}
        {currentView === 'registros' && renderRegistros()}
        {currentView === 'salon' && renderSalon()}
        {currentView === 'mesa' && renderMesa()}
        {currentView === 'checkout' && renderCheckout()}
        {currentView === 'pedidos' && renderPedidos()}
        {currentView === 'impresora' && renderImpresora()}
        {currentView === 'admin' && adminSubView === 'main' && renderAdminMain()}
        {currentView === 'admin' && adminSubView === 'menu' && renderAdminMenu()}
        {currentView === 'admin' && adminSubView === 'users' && renderAdminUsers()}
        {currentView === 'admin' && adminSubView === 'tables' && renderAdminTables()}
        {currentView === 'admin' && adminSubView === 'stats' && renderAdminStats()}
      </div>

      {['home', 'salon', 'pedidos', 'impresora', 'admin', 'checkin', 'registros'].includes(currentView) && adminSubView === 'main' && (
        <div className="bottom-nav">
          {[
            { view: 'home', icon: <HomeIcon className="nav-icon" />, label: 'Inicio' },
            { view: 'checkin', icon: <Globe className="nav-icon" />, label: 'Hotel' },
            { view: 'salon', icon: <LayoutGrid className="nav-icon" />, label: 'Restaurante' },
            { view: 'pedidos', icon: <ClipboardCheck className="nav-icon" />, label: 'Comandas' },
            { view: 'impresora', icon: <Printer className="nav-icon" />, label: 'Cuentas' },
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
              {tableConfirmModal.type === 'open' ? `Abrir Mesa ${tables.find(t => t.id === tableConfirmModal.tableId)?.name || tableConfirmModal.tableId}` : tableConfirmModal.type === 'closeEmpty' ? `Liberar Mesa ${tables.find(t => t.id === tableConfirmModal.tableId)?.name || tableConfirmModal.tableId}` : `Cuenta Pagada`}
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
              {(() => {
                const ventasRestauranteBase = todayIncome;
                const propinasTotales = todayTotalTips;
                const ventasHotel = hotelCardSales + hotelCashSales;
                const ventasTotales = ventasRestauranteBase + propinasTotales + ventasHotel;
                
                const efectivoMXNHotel = hotelSalesList.filter(s => s.currency === 'MXN' && s.payment_method === 'efectivo').reduce((acc, s) => acc + Number(s.amount), 0);
                const dolaresEfectivoOriginal = hotelSalesList.filter(s => s.currency === 'USD' && s.payment_method === 'efectivo').reduce((acc, s) => acc + Number(s.amount), 0);
                const dolaresEfectivoConvertido = hotelSalesList.filter(s => s.currency === 'USD' && s.payment_method === 'efectivo').reduce((acc, s) => acc + (Number(s.amount) * (s.exchange_rate || exchangeRate)), 0);
                
                const totalEfectivoPesos = todayCashIncome + efectivoMXNHotel;
                const totalTransferencia = todayTransferIncome;
                const totalTarjeta = todayCardIncome + hotelCardSales;
                const propinasTarjeta = todayCardTips;
                const propinasTransferencia = todayTransferTips;
                const propinasTC = propinasTarjeta + propinasTransferencia;

                const fechaCorte = new Date().toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'long', timeStyle: 'short' });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Reporte diario */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reporte Diario</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Fecha y hora del corte:</span>
                          <span style={{ color: '#0f172a', fontWeight: 500 }}>{fechaCorte}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Ventas restaurante (Base):</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(ventasRestauranteBase)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Propinas restaurante:</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(propinasTotales)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Ventas hotel:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(ventasHotel)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                          <span>Ingresos totales:</span>
                          <span style={{ color: '#4f46e5' }}>{formatCurrency(ventasTotales)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Corte */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Corte</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Pesos (Fondo - gastos + efectivo del día - propinas en efectivo):</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(pettyCashInitial - todayExpenses + totalEfectivoPesos - todayCashTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Dólares convertidos ({formatCurrency(dolaresEfectivoOriginal, 'USD')}):</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(dolaresEfectivoConvertido)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Tarjetas (incluye propina):</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(totalTarjeta + todayCardTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Transferencia (incluye propina):</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(totalTransferencia + todayTransferTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Compras:</span>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatCurrency(todayExpenses)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                          <span>Venta total:</span>
                          <span>{formatCurrency(ventasTotales)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px' }}>
                          <span>Fondo (Caja chica final):</span>
                          <span>{formatCurrency(pettyCashInitial - todayExpenses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Propinas */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Propinas</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Propinas en efectivo:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(todayCashTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Propinas en tarjetas:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(propinasTC)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                          <span>Total propinas:</span>
                          <span style={{ color: '#16a34a' }}>{formatCurrency(todayTotalTips)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Entrega */}
                    <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrega</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af' }}>
                          <span>Ventas totales:</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(ventasTotales)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af' }}>
                          <span>Total propinas:</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(todayTotalTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af' }}>
                          <span>Gastos:</span>
                          <span style={{ fontWeight: 600, color: '#dc2626' }}>-{formatCurrency(todayExpenses)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #93c5fd', fontWeight: 800, color: '#1e3a8a', fontSize: '16px' }}>
                          <span>Entrega final del día:</span>
                          <span>{formatCurrency(ventasTotales - todayExpenses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Desglose de entrega */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desglose de entrega</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Efectivo:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency((pettyCashInitial + totalEfectivoPesos - todayExpenses) - 5000 + todayCashTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Dólares:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(dolaresEfectivoConvertido)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Tarjetas (incl. propina):</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(totalTarjeta + todayCardTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 800, color: '#1e3a8a', fontSize: '16px' }}>
                          <span>Entrega:</span>
                          <span>{formatCurrency(((pettyCashInitial + totalEfectivoPesos - todayExpenses) - 5000 + todayCashTips) + dolaresEfectivoConvertido + (totalTarjeta + todayCardTips))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>


            <button 
              className={`btn-primary cierre-submit ${isClosingTurn ? 'loading' : ''}`}
              disabled={isClosingTurn}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isClosingTurn) return;
                
                try {
                  setIsClosingTurn(true);
                  console.log('Iniciando cierre general...');
                  
                  const summary = {
                    total_income: todayIncome + todayTotalTips,
                    restaurant_income: todayIncome,
                    tips: todayTotalTips,
                    expenses: todayExpenses,
                    hotel_income: hotelCardSales + hotelCashSales,
                    petty_cash_final: pettyCashInitial - todayExpenses,
                    created_by: currentUser?.name || 'Sistema'
                  };
                  
                  await closeDay(currentUser?.name || 'Administrador');
                  setIsCierreModalOpen(false);
                  alert('✅ Cierre general completado con éxito. Los datos se han archivado y los resúmenes se han reseteado.');
                } catch (err) {
                  console.error('Error durante el cierre:', err);
                  alert('❌ Error al ejecutar el cierre: ' + (err instanceof Error ? err.message : String(err)));
                } finally {
                  setIsClosingTurn(false);
                }
              }}
              style={{ 
                marginTop: 12, 
                height: 56, 
                fontSize: 16, 
                fontWeight: 800,
                opacity: isClosingTurn ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}
            >
              {isClosingTurn ? (
                <>
                  <div className="spinner-small" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Ejecutar Cierre General
                </>
              )}
            </button>
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
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#0f172a' }}>Instalar Gallo Azul</h3>
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
        <div className="modal-overlay print-hide" onClick={() => setPrintCuentaModal({isOpen: false, tableId: null, isFinalBill: false})}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 400 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>{printCuentaModal.isFinalBill ? 'Cuenta' : 'Pedido'} - Mesa {printCuentaModal.tableId}</h3>
            <div className="ticket-print-area">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Gallo Azul Resto</h2>
                <div style={{ fontSize: 14, color: '#64748b' }}>Atendido por: {currentUser?.name}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Mesa: {printCuentaModal.tableId}</div>
                <div style={{ fontSize: 14, color: '#64748b', textTransform: 'capitalize' }}>
                  Fecha: {new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ borderTop: '2px dashed #cbd5e1', borderBottom: '2px dashed #cbd5e1', padding: '12px 0', margin: '16px 0' }}>
                {activeItems.filter(i => i.table_id === printCuentaModal.tableId && (printCuentaModal.isFinalBill || !i.is_printed)).map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14 }}>
                     <div style={{ flex: 1, paddingRight: 8 }}>
                       x{i.qty} {i.name} {i.variant_label ? `(${i.variant_label})` : ''}
                       {i.notes && <div style={{ fontSize: 12, color: '#d97706', fontStyle: 'italic' }}>Nota: {i.notes}</div>}
                     </div>
                     {printCuentaModal.isFinalBill && <div style={{ fontWeight: 600 }}>${i.price * i.qty}</div>}
                  </div>
                ))}
              </div>
              {printCuentaModal.isFinalBill && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Total a pagar:</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>
                    ${activeItems.filter(i => i.table_id === printCuentaModal.tableId).reduce((s, i) => s + (i.price * i.qty), 0)}
                  </span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }} className="print-hide">
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => setPrintCuentaModal({isOpen: false, tableId: null, isFinalBill: false})}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'center' }} onClick={handleSendToPrinter}>
                 <Printer size={18} /> Enviar a Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venta Hotel Modal */}
      {isHotelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 360, padding: '24px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, background: '#e0e7ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                  <Building size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Venta Habitación</h2>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Registro de hotel</div>
                </div>
              </div>
              <button onClick={() => setIsHotelModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {/* 1. Moneda Primero */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Moneda</label>
                  <div style={{ padding: '4px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: 11, fontWeight: 700, color: '#166534' }}>
                    1 USD = {exchangeRate.toFixed(2)} MXN
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: 4, background: '#f8fafc', borderRadius: 12 }}>
                  {['MXN', 'USD'].map(m => (
                    <button 
                      key={m}
                      onClick={() => setHotelCurrency(m)}
                      style={{ 
                        flex: 1, padding: '10px', borderRadius: 10, border: 'none', 
                        background: hotelCurrency === m ? 'white' : 'transparent', 
                        fontWeight: 700, fontSize: 13,
                        color: hotelCurrency === m ? '#4f46e5' : '#64748b',
                        boxShadow: hotelCurrency === m ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >{m}</button>
                  ))}
                </div>
              </div>

              {/* 2. Monto Después */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Monto de la Venta</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#4f46e5', fontSize: 14 }}>
                    {hotelCurrency === 'MXN' ? 'MX$' : 'US$'}
                  </span>
                  <input 
                    type="text" 
                    value={hotelAmount} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      setHotelAmount(parts.join('.'));
                    }}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '14px 14px 14px 45px', borderRadius: 14, border: '2px solid #f1f5f9', fontSize: 18, fontWeight: 800, outline: 'none', transition: 'all 0.2s' }}
                    className="focus-indigo"
                    autoFocus
                  />
                </div>
                {hotelCurrency === 'USD' && hotelAmount && (
                  <div style={{ marginTop: 10, padding: '12px', background: '#eff6ff', borderRadius: 12, border: '1px dashed #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>Equivalente en Pesos:</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a' }}>
                      {formatCurrency(Number(hotelAmount.replace(/,/g, '')) * exchangeRate)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button 
                    onClick={() => setHotelPaymentMethod('tarjeta')}
                    style={{ 
                      padding: '12px', borderRadius: 12, border: '2px solid', 
                      borderColor: hotelPaymentMethod === 'tarjeta' ? '#4f46e5' : '#f1f5f9', 
                      background: hotelPaymentMethod === 'tarjeta' ? '#eff6ff' : 'white', 
                      fontWeight: 700, color: hotelPaymentMethod === 'tarjeta' ? '#1e40af' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13
                    }}
                  >
                    <span>💳</span> Tarjeta
                  </button>
                  <button 
                    onClick={() => setHotelPaymentMethod('efectivo')}
                    style={{ 
                      padding: '12px', borderRadius: 12, border: '2px solid', 
                      borderColor: hotelPaymentMethod === 'efectivo' ? '#4f46e5' : '#f1f5f9', 
                      background: hotelPaymentMethod === 'efectivo' ? '#eff6ff' : 'white', 
                      fontWeight: 700, color: hotelPaymentMethod === 'efectivo' ? '#1e40af' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13
                    }}
                  >
                    <span>💵</span> Efectivo
                  </button>
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!hotelAmount) return;
                  const numericalValue = Number(hotelAmount.replace(/,/g, ''));
                  await addHotelSale(numericalValue, hotelCurrency, hotelPaymentMethod);
                  setIsHotelModalOpen(false);
                  setHotelAmount('');
                }}
                className="btn-primary" 
                style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 800, fontSize: 15, marginTop: 10, background: '#4f46e5', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}
              >
                Registrar Venta de Habitación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar Registro */}
      {deleteRegistrationId && (
        <div className="modal-overlay" onClick={() => setDeleteRegistrationId(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 32, borderRadius: 28, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ef4444' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>¿Eliminar Registro?</h3>
            <p style={{ fontSize: 15, color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Esta acción eliminará permanentemente el registro de la base de datos interna. <strong>Esto no afecta la reserva en Hostaway.</strong>
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setDeleteRegistrationId(null)}
                className="btn-secondary" 
                style={{ flex: 1, padding: '14px', borderRadius: 14, fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  deleteRegistration(deleteRegistrationId);
                  setDeleteRegistrationId(null);
                }}
                className="btn-primary" 
                style={{ flex: 1, padding: '14px', borderRadius: 14, fontWeight: 600, background: '#ef4444', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registro Pedidos para llevar */}
      {isDeliveryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeliveryModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛵</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Registrar Pedido para llevar</h3>
                <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Ingresa el nombre del cliente para iniciar el pedido</p>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Nombre del Cliente</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ej. Juan Pérez"
                  value={deliveryCustomerName}
                  onChange={e => setDeliveryCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: 14, border: '2px solid #f1f5f9', fontSize: 16, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setIsDeliveryModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: '#6366f1' }}
                  onClick={handleCreateDelivery}
                  disabled={!deliveryCustomerName.trim()}
                >
                  Crear Pedido
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Ticket Listo para Disparar Windows.Print() desde Caja */}
      {ticketToPrint && (
        <div className="ticket-print-area">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
             <h2 style={{ margin: 0, fontSize: 20 }}>{ticketToPrint.is_pedido ? 'TICKET DE PEDIDO' : 'Gallo Azul Resto'}</h2>
             {ticketToPrint.is_pedido && <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>COCINA / BAR</div>}
             {!ticketToPrint.is_pedido && <div style={{ fontSize: 14, color: '#64748b' }}>Atendido por: {ticketToPrint.printed_by}</div>}
             <div style={{ fontSize: 16, fontWeight: 700, margin: '8px 0' }}>Mesa: {ticketToPrint.table_id}</div>
             <div style={{ fontSize: 14, color: '#64748b', textTransform: 'capitalize' }}>
                Fecha: {new Date(ticketToPrint.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
             </div>
          </div>

          <div style={{ borderTop: '2px dashed #cbd5e1', borderBottom: '2px dashed #cbd5e1', padding: '12px 0', margin: '16px 0' }}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 16, fontWeight: 600, lineHeight: 1.6 }}>{ticketToPrint.items_summary}</div>
          </div>
          {!ticketToPrint.is_pedido && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
               <span>Total:</span>
               <span>${Number(ticketToPrint.total).toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Modal Ver Detalles de Cuenta */}
      {previewTicket && (
        <div className="modal-overlay" onClick={() => setPreviewTicket(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Detalle de cuenta</h2>
              <button className="btn-icon" style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, margin: 0, border: 'none', cursor: 'pointer' }} onClick={() => setPreviewTicket(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Mesa: {previewTicket.table_id}</div>
                <div style={{ fontSize: 14, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{previewTicket.items_summary}</div>
              </div>

              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  <span>Total:</span>
                  <span style={{ color: '#10b981' }}>{formatCurrency(previewTicket.total)}</span>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                {new Date(previewTicket.created_at).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Compra (POS) */}
      {showPosExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowPosExpenseModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Registrar una compra</h2>
              <button className="btn-icon" style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, margin: 0, border: 'none', cursor: 'pointer' }} onClick={() => setShowPosExpenseModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block' }}>Descripción de la compra</label>
                <input 
                  type="text" 
                  value={posExpenseDesc} 
                  onChange={e => setPosExpenseDesc(e.target.value)}
                  placeholder="Ej. Limones, Servilletas, Hielo..."
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 15 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'block' }}>Monto (MXN)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 16, fontWeight: 600 }}>$</span>
                  <input 
                    type="number" 
                    value={posExpenseAmount} 
                    onChange={e => setPosExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '14px 14px 14px 36px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 600 }}
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!posExpenseAmount || !posExpenseDesc) return;
                  await addExpense(Number(posExpenseAmount), "Compra de insumos", posExpenseDesc);
                  setShowPosExpenseModal(false);
                  setPosExpenseDesc('');
                  setPosExpenseAmount('');
                }}
                className="btn-primary" 
                style={{ width: '100%', padding: '16px', borderRadius: 14, fontWeight: 800, fontSize: 15, marginTop: 10, background: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
              >
                Registrar Gasto
              </button>
            </div>
          </div>
        </div>
      )}

      {renderCheckinModal()}
      {renderHotelPaymentModal()}
      {renderNewResModal()}
      </div>
    </>
  );
}
