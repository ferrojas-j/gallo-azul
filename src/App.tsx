import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid, ClipboardCheck, Settings, ChevronLeft, Users, Check, X,
  Plus, Lock, Home as HomeIcon, UserPlus, Trash2, User, ChevronRight,
  LogOut, FileEdit, PlusCircle, TrendingUp, TrendingDown, CalendarDays, Calendar, Search, StickyNote,
  Pencil, ChevronDown, ChevronUp, AlertTriangle, Zap, Eye, EyeOff, Clock, Printer, Wallet, Building, Globe, ShoppingBag, CreditCard, PenTool, ClipboardList,
  UserMinus, ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react';
import './index.css';
import { CATEGORIES, CATEGORY_MAPPING } from './data/menu';
import type { MenuItem, MenuVariant } from './data/menu';
import { supabase } from './lib/supabase';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import type { UserRow } from './lib/supabaseService';
import { getUpcomingCheckins, updateReservationStatus } from './lib/hostawayService';
import type { Reservation } from './lib/hostawayService';

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
    createOrderForTable, addItemToOrder, removeItem, markItemDone, updateItemNotes,
    checkoutTable, confirmPayment, cancelTable, addExpense,
    toggleMenuItem, toggleMenuVariant,
    updateMenuItem, updateMenuVariant, updateCategory,
    addCategory, addMenuItem, addMenuVariant,
    addTable, deleteTable,
    addUser, deleteUser, updateUser, closeSession,
    closeDay, deleteShiftSummary, logPrintedTicket,
    addHotelSale, deleteHotelSale, exchangeRate,
    pendingTickets, markTicketPrinted, deleteTicket, fetchTodayTotals,
    createDeliveryOrder, registrations, fetchRegistrations
  } = useSupabaseSync();


  // UI state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: 'Administrador' | 'Staff' | 'Encargado' } | null>({
    id: 'default-admin', name: 'Administrador', role: 'Administrador'
  });

  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [currentView, setCurrentView] = useState<'home' | 'salon' | 'pedidos' | 'impresora' | 'admin' | 'mesa' | 'checkout' | 'checkin' | 'registros'>('home');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [adminSubView, setAdminSubView] = useState<'main' | 'menu' | 'users' | 'tables' | 'stats'>('main');

  const [upcomingCheckins, setUpcomingCheckins] = useState<Reservation[]>([]);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [checkinsError, setCheckinsError] = useState('');
  const [isProximosExpanded, setIsProximosExpanded] = useState(false);
  const [isEnCasaExpanded, setIsEnCasaExpanded] = useState(true);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Estados para Nueva Reserva
  const [showNewResModal, setShowNewResModal] = useState(false);
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
        numberOfGuests: 1,
        adults: 1
      };

      const { data, error } = await supabase.functions.invoke('hostaway-proxy', {
        body: { 
          action: 'createReservation',
          params
        }
      });

      if (error) throw error;
      
      alert("Reserva creada con éxito en Hostaway");
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
  const [menuCategory, setMenuCategory] = useState(CATEGORIES[0]);
  const [menuSearch, setMenuSearch] = useState('');
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
    }).format(val);
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

  // Unified Custom Confirm Modal for tables (opening accounts and confirming payments)
  const [tableConfirmModal, setTableConfirmModal] = useState<{
    isOpen: boolean;
    type: 'open' | 'pay' | 'closeEmpty';
    tableId: number | null;
  }>({ isOpen: false, type: 'open', tableId: null });

  const [printCuentaModal, setPrintCuentaModal] = useState<{isOpen: boolean, tableId: number | null}>({isOpen: false, tableId: null});
  const [ticketToPrint, setTicketToPrint] = useState<any>(null);

  const handleSendToPrinter = async () => {
    if (printCuentaModal.tableId) {
      const items = activeItems.filter(i => i.table_id === printCuentaModal.tableId);
      const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
      const summary = items.map(i => `${i.qty}x ${i.name}`).join(', ');
      await logPrintedTicket(printCuentaModal.tableId, currentUser?.name || 'Unknown', total, summary);
      
      setMesasConCuentaActivada(prev => {
        const next = new Set(prev);
        next.add(printCuentaModal.tableId!);
        return next;
      });

      alert('Ticket enviado a la caja para imprimir.');
    }
    setPrintCuentaModal({isOpen: false, tableId: null});
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
  const [showExtras, setShowExtras] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deliveryConfirm, setDeliveryConfirm] = useState<string | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);

  const [expandedSubCats, setExpandedSubCats] = useState<Set<string>>(new Set());
  const toggleSubCat = (subCat: string) => {
    setExpandedSubCats(prev => {
      const next = new Set(prev);
      if (next.has(subCat)) next.delete(subCat);
      else next.add(subCat);
      return next;
    });
  };

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
  const activeOrder = selectedTableId ? tableOrders[selectedTableId] : null;
  const orderItems = selectedTableId ? activeItems.filter(i => i.table_id === selectedTableId) : [];
  const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const selectedTableItems = useMemo(
    () => (activeItems || []).filter(i => i.table_id === selectedTableId),
    [activeItems, selectedTableId]
  );

  const currentTableTotal = useMemo(
    () => (selectedTableItems || []).reduce((acc, i) => acc + i.price * i.qty, 0),
    [selectedTableItems]
  );

  const pendingItems = useMemo(
    () => (activeItems || []).filter(i => i.status === 'pending'),
    [activeItems]
  );

  const filteredMenuItems = useMemo(() => {
    const isVisible = (m: MenuItem) => {
      if (!m.active) return false;
      // Exclude items that are meant to be extras only
      const extraCategories = CATEGORY_MAPPING['INGREDIENTES EXTRA'] || [];
      if (extraCategories.includes(m.category)) return false;
      
      if (m.hasVariants) return (m.variants?.some(v => v.active)) ?? false;
      return true;
    };
    
    const subCategories = CATEGORY_MAPPING[menuCategory];
    const base = menuItems.filter(m => {
      if (!isVisible(m)) return false;
      if (subCategories) return subCategories.includes(m.category);
      return m.category === menuCategory;
    });

    if (!menuSearch.trim()) return base;
    return menuItems.filter(m => isVisible(m) && m.name.toLowerCase().includes(menuSearch.toLowerCase()));
  }, [menuItems, menuCategory, menuSearch]);

  // ── Handlers ─────────────────────────────────────────

  const navTo = (view: 'home' | 'salon' | 'pedidos' | 'impresora' | 'admin') => {
    setCurrentView(view);
    setSelectedTableId(null);
    if (view === 'admin') setAdminSubView('main');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
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

  const handleCreateDelivery = async () => {
    if (!deliveryCustomerName.trim()) return;
    const tableId = await createDeliveryOrder(deliveryCustomerName.trim());
    if (tableId) {
      setSelectedTableId(tableId);
      setCurrentView('mesa');
      setMesaTab('orden');
      setMenuCategory(CATEGORIES[0]);
      setMenuSearch('');
    }
    setIsDeliveryModalOpen(false);
    setDeliveryCustomerName('');
  };

  const handleAddItem = (item: MenuItem, variant?: MenuVariant) => {
    if (!selectedTableId) return;
    setConfirmNotes('');
    setConfirmPending({ item, variant });
    setSelectedExtras(new Set());
    setShowExtras(false);
  };

  const confirmAddItem = async () => {
    if (!confirmPending || !selectedTableId) return;
    
    // 1. Calculate consolidated price and build extra description
    let totalPrice = confirmPending.variant ? confirmPending.variant.price : confirmPending.item.price;
    const extraNames: string[] = [];
    
    for (const extraId of selectedExtras) {
      const extraItem = menuItems.find(m => m.id === extraId);
      if (extraItem) {
        totalPrice += extraItem.price;
        extraNames.push(extraItem.name);
      }
    }
    
    const combinedNotes = [
      confirmNotes.trim(),
      extraNames.length > 0 ? `EXTRAS: ${extraNames.join(', ')}` : ''
    ].filter(Boolean).join(' | ');

    // 2. Add as single item with bundled price and notes
    await addItemToOrder(
      selectedTableId, 
      confirmPending.item, 
      confirmPending.variant, 
      combinedNotes,
      totalPrice
    );
    
    setConfirmPending(null);
    setConfirmNotes('');
    setSelectedExtras(new Set());
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
    if (tipPercent === 'Otro') {
      tipAmount = parseFloat(customTip) || 0;
    } else if (tipPercent !== 'none') {
      tipAmount = finalTotal * (parseFloat(tipPercent) / 100);
    }

    await confirmPayment(tableConfirmModal.tableId, paymentMethod, finalTotal, tipAmount, discountReason);
    setTableConfirmModal({ isOpen: false, type: 'pay', tableId: null });
    navTo('salon');
  };

  const handleCancelTable = async () => {
    if (!tableConfirmModal.tableId) return;
    await cancelTable(tableConfirmModal.tableId);
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
              <ShoppingBag size={24} />
            </div>
            <span className="home-action-label">Punto de venta</span>
          </div>
          <div className="home-action-btn checkin" onClick={() => navTo('checkin')}>
            <div className="home-action-icon-wrap">
              <Globe size={24} />
            </div>
            <span className="home-action-label">Check-in online</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="home-stats-grid">
          <div className="home-stat-card tables">
            <div className="home-stat-icon">🪑</div>
            <div className="home-stat-value">{freeTables}</div>
            <div className="home-stat-label">Mesas disponibles</div>
          </div>
          <div className="hero-time-card">
            <Clock size={16} />
            <span>{formatTime(currentTime)}</span>
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
                                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #dcfce7' }}>
                                  EN CASA
                                </span>
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
                                    onClick={() => handleNoShow(res)}
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
                                    onClick={() => handleCancelRes(res)}
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
                                    Eliminar
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
    return (
      <div className="fade-in" style={{ padding: '24px 16px', paddingBottom: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setCurrentView('checkin')} style={{ background: '#f1f5f9', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: '#64748b' }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={28} color="#3b82f6" />
              Registros de Check-in
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Historial de huéspedes que han completado su registro online.</p>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>No hay registros aún</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Los registros aparecerán aquí cuando los huéspedes completen su check-in.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {registrations.map(reg => (
              <div key={reg.id} style={{ background: 'white', padding: 20, borderRadius: 24, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{reg.name}</h3>
                    <div style={{ fontSize: 13, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>{reg.room_name}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>
                    <div>{new Date(reg.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{new Date(reg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
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
            ))}
          </div>
        )}
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
              <input 
                type="text" 
                value={newResForm.guestPhone} 
                onChange={e => setNewResForm({...newResForm, guestPhone: e.target.value})}
                placeholder="+52 123..."
              />
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
    const occupiedCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) !== 'free').length;
    const freeCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'free').length;

    return (
      <div className="salon-view fade-in">
        <div className="salon-summary-bar">
          <div className="salon-stat ocp">
            <span className="salon-stat-count">{occupied}</span>
            <span className="salon-stat-label">Ocupadas</span>
          </div>
          <div className="salon-stat pay">
            <span className="salon-stat-count">{paying}</span>
            <span className="salon-stat-label">Pagando</span>
          </div>
          <div className="salon-stat free">
            <span className="salon-stat-count">{free}</span>
            <span className="salon-stat-label">Libres</span>
          </div>
        </div>

        <div className="salon-legend">
           <div className="salon-legend-item free"><div className="salon-legend-pip"></div> LIBRE</div>
           <div className="salon-legend-item occupied"><div className="salon-legend-pip"></div> OCUPADA</div>
           <div className="salon-legend-item paying"><div className="salon-legend-pip"></div> CUENTA</div>
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
            <span>Salón</span>
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
                      {item.notes && (
                        <div className={`order-item-notes ${item.notes.includes('EXTRAS:') ? 'has-extras' : ''}`}>
                          {item.notes.includes('EXTRAS:') && <span style={{ fontWeight: 800, color: '#b45309', marginRight: 4 }}>🚨</span>}
                          {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="order-actions-grid">
                       <button className="order-btn-sec" onClick={() => setPrintCuentaModal({isOpen: true, tableId: selectedTableId})}>
                         <Printer size={18} />
                         Imprimir
                       </button>
                       <button className="order-btn-pri" onClick={() => setCurrentView('checkout')}>
                         Cobrar Mesa
                       </button>
                    </div>
                  </div>
                </>
              )}
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
                  const isExpanded = expandedSubCats.has(subCat);
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
                          {displayName}
                          {isExpanded ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                        </h4>
                        <div style={{ height: 1, flex: 1, background: '#f1f5f9' }} />
                      </button>
                      {isExpanded && itemsInSub.map(renderItem)}
                    </div>
                  );
                });
              })()}
            </div>
          )}
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
    // Group activeItems by table
    const itemsByTable = (activeItems || []).reduce((acc, item) => {
      if (!acc[item.table_id]) acc[item.table_id] = [];
      acc[item.table_id].push(item);
      return acc;
    }, {} as Record<number, typeof activeItems>);

    const tableIds = Object.keys(itemsByTable)
      .map(Number)
      .filter(id => itemsByTable[id].some(i => i.status === 'pending'))
      .sort((a,b) => a - b);
    
    return (
      <div className="fade-in pedidos-view">
        {tableIds.length === 0 ? (
          <div className="empty-pedidos">
            <div style={{ fontSize: 64, marginBottom: 20 }}>👩‍🍳</div>
            <h2>Tu cocina está al día</h2>
            <p>Las nuevas comandas aparecerán aquí automáticamente por mesa.</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{pendingTableItems.length} pendientes</span>
                      <ChevronRight size={20} style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
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
                                <div 
                                  className="qa-notes-box" 
                                  style={{ 
                                    marginTop: 6, 
                                    background: item.notes.includes('EXTRAS:') ? '#fffbeb' : '#fef3c7', 
                                    color: '#d97706', 
                                    border: item.notes.includes('EXTRAS:') ? '1.5px dashed #fbbf24' : 'none',
                                    padding: '8px 12px',
                                    borderRadius: 10
                                  }}
                                >
                                  <StickyNote size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                                    {item.notes.split(' | ').map((part, idx, arr) => (
                                      <span key={idx}>
                                        {part.startsWith('EXTRAS:') ? (
                                          <span style={{ color: '#b45309', fontWeight: 800 }}>
                                            🚨 {part}
                                          </span>
                                        ) : part}
                                        {idx < arr.length - 1 ? ' | ' : ''}
                                      </span>
                                    ))}
                                  </span>
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
              )}
            </div>

  const renderAdminMain = () => {
    const mexicoDate = currentTime.toLocaleDateString('es-MX', {
      timeZone: 'America/Mazatlan', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const mexicoTime = currentTime.toLocaleTimeString('es-MX', {
      timeZone: 'America/Mazatlan', hour: '2-digit', minute: '2-digit',
    });
    return (
      <div className="fade-in">
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={14} /> {mexicoDate}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
              {mexicoTime} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>BCS</span>
            </div>
            <div style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>USD/MXN</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>{(exchangeRate || 20).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {(currentUser?.role === 'Administrador' || currentUser?.role === 'Encargado') && (
          <>
            <div className="admin-summary-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="admin-summary-card income">
                <div className="as-icon"><TrendingUp size={20} /></div>
                <div className="as-content">
                  <div className="as-label">Ventas Restaurante</div>
                  <div className="as-value" style={{ fontSize: 18 }}>{formatCurrency(todayIncome + todayTotalTips)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>💳 Tarjeta:</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(todayCardIncome + todayCardTips)}</strong>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>💵 Efectivo:</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(todayCashIncome + todayCashTips)}</strong>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>🏦 Transf:</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(todayTransferIncome + todayTransferTips)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-summary-card expenses">
                <div className="as-icon"><TrendingDown size={20} /></div>
                <div className="as-content">
                  <div className="as-label">Gastos</div>
                  <div className="as-value" style={{ fontSize: 18 }}>{formatCurrency(todayExpenses)}</div>
                  <div className="as-sub">{todayExpensesList.length} regs. activos</div>
                </div>
              </div>

              <div className="admin-summary-card petty-cash">
                <div className="as-icon"><Wallet size={20} /></div>
                <div className="as-content">
                  <div className="as-label">Caja Chica</div>
                  <div className="as-value" style={{ fontSize: 18 }}>{formatCurrency(pettyCashInitial - todayExpenses)}</div>
                  <div className="as-sub">Fondo: {formatCurrency(pettyCashInitial)}</div>
                </div>
              </div>

              <div className="admin-summary-card loft-sales">
                <div className="as-icon"><Building size={20} /></div>
                <div className="as-content">
                  <div className="as-label">Ventas Hotel</div>
                  <div className="as-value" style={{ fontSize: 18 }}>{formatCurrency(hotelCardSales + hotelCashSales)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>💳 T:</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(hotelCardSales)}</strong>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>💵 E:</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(hotelCashSales)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32 }}>
              <button className="btn-primary" onClick={() => setIsExpenseModalOpen(true)} style={{ padding: '14px 8px', fontSize: 13, borderRadius: 16, background: '#fee2e2', color: '#dc2626', border: 'none', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Plus size={20} /> Gasto
              </button>
              <button className="btn-primary" onClick={() => setIsHotelModalOpen(true)} style={{ padding: '14px 8px', fontSize: 13, borderRadius: 16, background: '#e0e7ff', color: '#4f46e5', border: 'none', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Building size={20} /> Habitación
              </button>
              <button className="btn-outline" onClick={() => {
                fetchTodayTotals();
                setIsCierreModalOpen(true);
              }} style={{ padding: '14px 8px', fontSize: 13, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <Lock size={20} /> Cierre
              </button>


            </div>
         </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>Administración</div>
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          <div className="admin-stat-card" style={{ padding: '16px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div className="admin-stat-label" style={{ fontSize: 12, color: '#64748b' }}>Tipo de Cambio</div>
            <div className="admin-stat-value" style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>${(exchangeRate || 17.5).toFixed(2)}</div>
            <div className="admin-stat-sub" style={{ fontSize: 10, color: '#94a3b8' }}>BBVA Real-time</div>
          </div>
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
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Mesa {tables.find(t => t.id === order.table_id)?.name || order.table_id}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                   <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>${((order.total || 0) + (order.tip_amount || 0)).toFixed(0)}</div>
                   {order.tip_amount > 0 && (
                     <div style={{ fontSize: 10, color: '#64748b' }}>Cuenta: ${order.total?.toFixed(0)} + Propina: ${order.tip_amount?.toFixed(0)}</div>
                   )}
                </div>
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

         <div className="checkout-actions">
            <button 
              className="confirm-pay-btn" 
              disabled={(discountType !== 'none' && !discountReason.trim())}
              onClick={() => {
                confirmPayment(selectedTableId, paymentMethod, afterDiscount, tip, discountReason);
                setCurrentView('salon');
                setSelectedTableId(null);
                // Reset checkout states
                setDiscountType('none'); setDiscountValue(''); setDiscountReason('');
                setTipPercent('none'); setCustomTip(''); setCashReceived('');
              }}
            >
              Confirmar y Cerrar Mesa
            </button>
         </div>
      </div>
    );
  };

  const renderImpresora = () => {
    return (
      <div className="fade-in">
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Cuentas del día</div>
        <div className="orders-grid">
          {pendingTickets.length === 0 ? (
             <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', gridColumn: '1 / -1' }}>No hay tickets pendientes</div>
          ) : pendingTickets.map((ticket: any) => (
             <div key={ticket.id} style={{ background: 'white', borderRadius: 16, padding: '16px', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <div style={{ fontWeight: 800 }}>Mesa {tables.find(t => t.id === ticket.table_id)?.name || ticket.table_id}</div>
                   <div style={{ color: '#059669', fontWeight: 800, fontSize: 18 }}>${ticket.total}</div>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', flex: 1, marginBottom: 12 }}>{ticket.items_summary}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
                   <span>{new Date(ticket.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                   <span>Pedido por: {ticket.printed_by}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setPreviewTicket(ticket)}
                    style={{ flex: 1, padding: '8px 4px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '9999px', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', fontWeight: 500 }}
                  >
                     <Eye size={16} /> Ver cuenta
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => dispatchPrintOnly(ticket)}
                    style={{ flex: 1, padding: '8px 4px', fontSize: 13, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '9999px', fontWeight: 500, border: 'none' }}
                  >
                     <Printer size={16} /> Imprimir
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      if(window.confirm('¿Eliminar este registro de cuenta?')) {
                        deleteTicket(ticket.id);
                      }
                    }}
                    style={{ flex: 1, padding: '8px 4px', fontSize: 13, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderRadius: '9999px', fontWeight: 500, border: 'none' }}
                  >
                     <Trash2 size={16} /> Eliminar
                  </button>
                </div>
             </div>
          ))}
        </div>

        {/* Modal de Vista Previa Visual */}
        {previewTicket && (
          <div className="modal-overlay" onClick={() => setPreviewTicket(null)} style={{zIndex: 9999}}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '300px', background: '#fff', borderRadius: 8}}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>GALLO AZUL</h2>
                <div style={{ fontSize: 12 }}>Restaurante</div>
              </div>
              <div style={{ margin: '16px 0', borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '8px 0', fontSize: 13, lineHeight: 1.4 }}>
                <div><strong>Mesa:</strong> {tables.find(t => t.id === previewTicket.table_id)?.name || previewTicket.table_id}</div>
                <div><strong>Atendió:</strong> {previewTicket.printed_by}</div>
                <div><strong>Fecha:</strong> {new Date(previewTicket.created_at).toLocaleString('es-MX')}</div>
              </div>
              <div style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Detalle:</div>
                <div style={{ whiteSpace: 'pre-line' }}>{previewTicket.items_summary.split(', ').join('\n')}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 16, borderTop: '2px solid #000', paddingTop: 8, fontWeight: 'bold' }}>
                TOTAL: ${previewTicket.total}
              </div>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
                ¡Gracias por su visita!
              </div>
              <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{flex: 1}} onClick={() => setPreviewTicket(null)}>Cerrar</button>
                <button className="btn-primary" style={{flex: 1, gap: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => { dispatchPrintOnly(previewTicket); setPreviewTicket(null); }}>
                  <Printer size={16}/> Imprimir
                </button>
              </div>
            </div>
          </div>
        )}
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
              <HistoryReportCard 
                key={report.id} 
                report={report} 
                formatCurrency={formatCurrency} 
                onDelete={(id: string) => setDeleteReportId(id)} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCheckin = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const enCasa = upcomingCheckins.filter(res => {
      const arr = new Date(res.arrivalDate + 'T12:00:00');
      const dep = new Date(res.departureDate + 'T12:00:00');
      return today >= arr && today <= dep && res.status !== 'cancelled' && res.status !== 'declined';
    });

    const proximas = upcomingCheckins.filter(res => {
      const arr = new Date(res.arrivalDate + 'T12:00:00');
      return arr > today && res.status !== 'cancelled' && res.status !== 'declined';
    });

    return (
      <div className="checkin-view fade-in">
        <div className="view-header">
          <h2 className="view-title-premium">Hotel / Check-in</h2>
          <p className="view-subtitle-premium">Gestión de huéspedes y registros online</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <button className="action-btn-premium" onClick={() => setCurrentView('registros')}>
            <ClipboardList size={20} />
            Ver registros
          </button>
          <button className="action-btn-premium highlight" onClick={() => setShowNewResModal(true)}>
            <PlusCircle size={20} />
            Crear nueva reserva
          </button>
        </div>

        {checkinsError && (
          <div className="error-notice">
            <AlertCircle size={20} />
            <span>{checkinsError}</span>
          </div>
        )}

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
                  <h4><Zap size={16} /> Ranking de Comandas (Top 10)</h4>
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
                      </div>
                      <div className="res-room">
                        <span className="room-label">HABITACIÓN</span>
                        <span className="room-val">{res.roomName}</span>
                      </div>
                    </div>
                    <div className="res-dates">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>Llegada</div>
                        <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                          {new Date(res.arrivalDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>Salida</div>
                        <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                          {new Date(res.departureDate + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>

                    {res.arrivalDate === todayStr && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button 
                            onClick={() => handleNoShow(res)}
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
                            onClick={() => handleCancelRes(res)}
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
                            Eliminar
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
                ))
              )}
            </div>
          )}
        </div>

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
                <div style={{ fontWeight: 600 }}>Mesa {table.name || table.id}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{table.status === 'free' ? 'Libre' : table.status === 'occupied' ? 'Ocupada' : 'Pagando'}</div>
              </div>
            </div>
            <Trash2 size={18} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handleAdminDeleteTable(table.id)} />
          </div>
          
          {isProximosExpanded && (
            <div className="res-list-p">
              {proximas.length === 0 ? (
                <p className="empty-msg">No hay reservas próximas registradas.</p>
              ) : (
                proximas.map(res => (
                  <div key={res.id} className="res-card-p secondary">
                    <div className="res-main">
                      <div className="res-guest">
                        <div className="res-avatar">{res.guestName?.[0]}</div>
                        <div className="res-name-wrap">
                          <span className="res-name">{res.guestName}</span>
                          <span className="res-phone">{res.guestPhone || 'Sin teléfono'}</span>
                        </div>
                      </div>
                      <div className="res-room">
                        <span className="room-label">HABITACIÓN</span>
                        <span className="room-val">{res.roomName}</span>
                      </div>
                    </div>
                    <div className="res-dates">
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
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRegistros = () => {
    return (
      <div className="registros-view fade-in">
        <div className="view-header" style={{ marginBottom: 24 }}>
          <button className="back-btn-pill" onClick={() => setCurrentView('checkin')} style={{ marginBottom: 12 }}>
            <ChevronLeft size={20} />
            <span>Volver</span>
          </button>
          <h2 className="view-title-premium">Historial de Registros</h2>
          <p className="view-subtitle-premium">Base de datos de huéspedes que han completado el check-in online</p>
        </div>

        {registrations.length === 0 ? (
          <div className="empty-state-p">
            <ClipboardList size={48} color="#94a3b8" />
            <h3>No hay registros</h3>
            <p>Los datos de huéspedes registrados aparecerán aquí</p>
          </div>
        ) : (
          <div className="registros-list-p">
            {registrations.map(reg => (
              <div key={reg.id} className="reg-card-p">
                <div className="reg-header-p">
                   <div className="reg-guest-p">
                     <div className="reg-avatar-p">{reg.name?.[0]}</div>
                     <div className="reg-info-p">
                       <span className="reg-name-p">{reg.name}</span>
                       <span className="reg-meta-p">{reg.email} • {reg.phone}</span>
                     </div>
                   </div>
                   <div className="reg-date-badge-p">
                     {new Date(reg.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                   </div>
                </div>
                <div className="reg-body-p">
                   <div className="reg-detail-grid-p">
                      <div className="reg-d-item">
                        <span className="reg-d-label">NACIONALIDAD</span>
                        <span className="reg-d-val">{reg.nationality}</span>
                      </div>
                      <div className="reg-d-item">
                        <span className="reg-d-label">HABITACIÓN</span>
                        <span className="reg-d-val">{reg.room_name}</span>
                      </div>
                      <div className="reg-d-item">
                        <span className="reg-d-label">CIUDAD</span>
                        <span className="reg-d-val">{reg.city}</span>
                      </div>
                      <div className="reg-d-item">
                        <span className="reg-d-label">ESTANCIA</span>
                        <span className="reg-d-val">{new Date(reg.arrival_date + 'T12:00:00').toLocaleDateString('es-MX', {day:'numeric'})} - {new Date(reg.departure_date + 'T12:00:00').toLocaleDateString('es-MX', {day:'numeric', month:'short'})}</span>
                      </div>
                   </div>
                </div>
                {reg.signature && (
                  <div className="reg-sig-p">
                    <span className="reg-d-label">FIRMA</span>
                    <img src={reg.signature} alt="Firma del huésped" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAdmin = () => {
    return (
      <div className="admin-view fade-in">
        <div className="view-header">
           <h2 className="view-title-premium">Panel de Control</h2>
           <p className="view-subtitle-premium">Configuración de sistema y analíticas</p>
        </div>

        <div className="admin-nav-grid">
           <button className={`admin-nav-btn ${adminSubView === 'stats' ? 'active' : ''}`} onClick={() => setAdminSubView('stats')}>
             <TrendingUp size={24} />
             <span>Finanzas</span>
           </button>
           <button className={`admin-nav-btn ${adminSubView === 'menu' ? 'active' : ''}`} onClick={() => setAdminSubView('menu')}>
             <Pencil size={24} />
             <span>Menú</span>
           </button>
           <button className={`admin-nav-btn ${adminSubView === 'users' ? 'active' : ''}`} onClick={() => setAdminSubView('users')}>
             <Users size={24} />
             <span>Personal</span>
           </button>
           <button className={`admin-nav-btn ${adminSubView === 'tables' ? 'active' : ''}`} onClick={() => setAdminSubView('tables')}>
             <LayoutGrid size={24} />
             <span>Mesas</span>
           </button>
        </div>

        <div className="admin-content-box">
          {adminSubView === 'menu' && (
            <div className="admin-menu-section fade-in">
              <div className="section-title-row">
                <h3>Gestión de Menú</h3>
                <button className="btn-small" onClick={handleAddItemModalOpen}>
                  <Plus size={14} /> Nuevo Producto
                </button>
              </div>

              <div className="admin-menu-list">
                {CATEGORIES.map(cat => {
                  const items = menuItems.filter(m => m.category === cat);
                  const isExpanded = expandedItems.has(cat);
                  
                  return (
                    <div key={cat} className="admin-cat-block">
                      <div className="admin-cat-header" onClick={() => toggleExpanded(cat)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <span className="cat-name">{cat}</span>
                          <span className="cat-count">{items.length} items</span>
                        </div>
                        <button className="cat-edit-btn" onClick={(e) => { e.stopPropagation(); openEditCategory(items[0]?.categoryId || '', cat); }}>
                           <Pencil size={14} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="admin-items-grid fade-in">
                          {items.map(item => (
                            <div key={item.id} className={`admin-item-row ${!item.active ? 'inactive' : ''}`}>
                              <div className="ai-info">
                                <span className="ai-name">{item.name}</span>
                                <span className="ai-price">{formatCurrency(item.price)}</span>
                              </div>
                              <div className="ai-actions">
                                <button className="ai-btn edit" onClick={() => openEditItem(item)}><Pencil size={14} /></button>
                                <button className={`ai-btn toggle ${item.active ? 'on' : 'off'}`} onClick={() => toggleMenuItem(item.id, !item.active)}>
                                  {item.active ? 'Visible' : 'Oculto'}
                                </button>
                              </div>
                              {item.hasVariants && item.variants && (
                                <div className="ai-variants-list">
                                  {item.variants.map(v => (
                                    <div key={v.id} className="ai-variant-row">
                                      <span className="av-label">{v.label}</span>
                                      <span className="av-price">{formatCurrency(v.price)}</span>
                                      <div className="av-actions">
                                        <button className="av-btn edit" onClick={() => openEditVariant(v)}><Pencil size={12} /></button>
                                        <button className={`av-btn toggle ${v.active ? 'on' : 'off'}`} onClick={() => toggleMenuVariant(v.id, !v.active)}>
                                          {v.active ? <Check size={12} /> : <X size={12} />}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {adminSubView === 'stats' && (
            <div className="admin-stats-section fade-in">
              <div className="stats-nav-p">
                <button className={`stats-nav-btn-p ${statsSubView === 'history' ? 'active' : ''}`} onClick={() => setStatsSubView('history')}>Historial</button>
                <button className={`stats-nav-btn-p ${statsSubView === 'analytics' ? 'active' : ''}`} onClick={() => setStatsSubView('analytics')}>Analíticas</button>
              </div>

              {statsSubView === 'history' ? (
                <div className="history-list-p">
                  {dailySummaries.length === 0 ? (
                    <div className="empty-state-p">No hay cierres registrados aún</div>
                  ) : (
                    dailySummaries.map(s => (
                      <HistoryReportCard 
                        key={s.id} 
                        report={s} 
                        formatCurrency={formatCurrency} 
                        onDelete={(id: string) => setDeleteReportId(id)}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="analytics-content-p">
                   <div className="analytics-filter-p">
                      {['day', 'month', 'total'].map(f => (
                        <button key={f} className={`filter-btn-p ${analyticsFilter === f ? 'active' : ''}`} onClick={() => setAnalyticsFilter(f as any)}>
                          {f === 'day' ? 'Hoy' : (f === 'month' ? 'Mes' : 'Histórico')}
                        </button>
                      ))}
                   </div>

                   <div className="ranking-card-p">
                     <h4>Top 10 Productos</h4>
                     <div className="ranking-list-p">
                        {ranking.map((item, i) => (
                          <div key={item.name} className="ranking-row-p">
                            <span className="rank-num">#{i+1}</span>
                            <span className="rank-name">{item.name}</span>
                            <span className="rank-qty">{item.count} vendidos</span>
                          </div>
                        ))}
                     </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {adminSubView === 'users' && (
            <div className="admin-users-section fade-in">
              <div className="section-title-row">
                <h3>Personal</h3>
                <button className="btn-small" onClick={() => setIsAddUserModalOpen(true)}>
                  <Plus size={14} /> Nuevo Usuario
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
                      <button className="user-edit-btn-p" onClick={() => {
                        setEditingUserId(user.id);
                        setEditUserName(user.name);
                        setEditUserRole(user.role);
                        setIsEditUserModalOpen(true);
                      }}>
                        <Pencil size={14} />
                      </button>
                      <button className="user-del-btn-p" onClick={() => deleteUser(user.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminSubView === 'tables' && (
            <div className="admin-tables-section fade-in">
              <div className="section-title-row">
                <h3>Mesas</h3>
              </div>
              <div className="tables-admin-grid">
                {tables.filter(t => t.category !== 'Pedidos para llevar').map(table => (
                   <div key={table.id} className="table-admin-card">
                     <span className="tac-number">{table.id}</span>
                     <span className="tac-cat">{table.category}</span>
                     <button className="tac-del-btn" onClick={() => deleteTable(table.id)}>Eliminar</button>
                   </div>
                ))}
                <button className="table-admin-add" onClick={() => {
                  const id = prompt('Número de la nueva mesa:');
                  if (id && !isNaN(parseInt(id))) addTable(parseInt(id));
                }}>
                  <Plus size={24} />
                  <span>Añadir Mesa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHeader = () => {
    if (!currentUser) return null;
    
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
              {currentView === 'pedidos' && 'Comandas'}
              {currentView === 'impresora' && 'Cuentas'}
              {currentView === 'admin' && 'Admin'}
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
            <div className="header-user-chip">
              <div className="header-user-avatar">{currentUser.name[0].toUpperCase()}</div>
              <button
                className="header-logout-btn"
                title="Cerrar sesión"
                onClick={async () => {
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

  const handleNoShow = async (res: Reservation) => {
    if (!window.confirm(`¿Marcar la reserva de ${res.guestName} como No-show?`)) return;
    
    try {
      setIsLoadingCheckins(true);
      await updateReservationStatus(res.id, undefined, true);
      alert('Reserva marcada como No-show correctamente');
      const updated = await getUpcomingCheckins();
      setUpcomingCheckins(updated);
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
      const updated = await getUpcomingCheckins();
      setUpcomingCheckins(updated);
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
            { view: 'salon', icon: <LayoutGrid className="nav-icon" />, label: 'Salón' },
            { view: 'pedidos', icon: <ClipboardCheck className="nav-icon" />, label: 'Comandas' },
            { view: 'impresora', icon: <Printer className="nav-icon" />, label: 'Cuentas' },
            ...(currentUser?.role === 'Administrador' || currentUser?.role === 'Encargado'
              ? [{ view: 'admin', icon: <Settings className="nav-icon" />, label: 'Admin' }]
              : []),
          ].map(({ view, icon, label }) => (
            <div key={view} className={`nav-item ${currentView === view ? 'active' : ''}`} onClick={() => navTo(view as any)}>
              {icon}{label}
            </div>
            
            {activeItems.filter(i => i.status === 'pending').length === 0 ? (
              <div className="empty-pedidos">
                <h2>¡Cocina al día!</h2>
                <p>No hay pedidos pendientes en este momento.</p>
              </div>
            ) : (
              <div className="pedidos-list">
                {activeItems
                  .filter(i => i.status === 'pending')
                  .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map(item => (
                    <div key={item.id} className="qa-card">
                      <div className="qa-header">
                        <span className="qa-table-badge">MESA {item.table_id}</span>
                        <span className="qa-qty-label">{item.qty} UNIDADES</span>
                      </div>
                      <div className="qa-body">
                         <div className="qa-info">
                            <div className="qa-name">{item.name}</div>
                            {item.variant_label && <div className="qa-variant">{item.variant_label}</div>}
                            {item.notes && (
                              <div className="qa-notes-box">
                                <StickyNote size={14} />
                                <span>{item.notes}</span>
                              </div>
                            )}
                         </div>
                         <button className="qa-done-btn" onClick={() => markItemDone(item.id)}>
                            <Check size={28} />
                         </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            <div className="confirm-price">
              {confirmPending.variant ? confirmPending.variant.price : confirmPending.item.price}
            </div>
            {/* Extras Section */}
            {['ENSALADAS', 'PASTAS', 'PIZZAS'].includes(confirmPending.item.category) && (
              <div className="confirm-extras-wrap">
                <button 
                  className={`extras-toggle-btn ${showExtras ? 'active' : ''}`}
                  onClick={() => setShowExtras(!showExtras)}
                >
                  <Plus size={18} />
                  <span>AGREGAR INGREDIENTES EXTRA</span>
                  <ChevronDown size={18} style={{ transform: showExtras ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', marginLeft: 'auto' }} />
                </button>

                {showExtras && (
                  <div className="confirm-extras-container fade-in">
                    {CATEGORY_MAPPING['INGREDIENTES EXTRA'].map(subCat => {
                      const items = menuItems.filter(m => m.category === subCat && m.active);
                      if (items.length === 0) return null;
                      return (
                        <div key={subCat} className="confirm-extra-group">
                          <div className="confirm-extra-group-title">{subCat.replace('EXTRAS: ', '')}</div>
                          <div className="confirm-extra-chips">
                            {items.map(extra => (
                              <button
                                key={extra.id}
                                className={`extra-chip ${selectedExtras.has(extra.id) ? 'active' : ''}`}
                                onClick={() => {
                                  const next = new Set(selectedExtras);
                                  if (next.has(extra.id)) next.delete(extra.id);
                                  else next.add(extra.id);
                                  setSelectedExtras(next);
                                }}
                              >
                                {extra.name} (+${extra.price})
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
                          <span>{formatCurrency(pettyCashInitial)}</span>
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
        <div className="modal-overlay print-hide" onClick={() => setPrintCuentaModal({isOpen: false, tableId: null})}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24, maxWidth: 400 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>Cuenta - Mesa {printCuentaModal.tableId}</h3>
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
             <h2 style={{ margin: 0, fontSize: 20 }}>Gallo Azul Resto</h2>
             <div style={{ fontSize: 14, color: '#64748b' }}>Atendido por: {ticketToPrint.printed_by}</div>
             <div style={{ fontSize: 14, color: '#64748b' }}>Mesa: {ticketToPrint.table_id}</div>
             <div style={{ fontSize: 14, color: '#64748b', textTransform: 'capitalize' }}>
                Fecha: {new Date(ticketToPrint.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
             </div>
             <form onSubmit={handleLogin}>
               <div className="login-field">
                 <User size={18} />
                 <input 
                   type="text" 
                   placeholder="Nombre de usuario" 
                   value={loginName} 
                   onChange={(e) => setLoginName(e.target.value)} 
                   required
                 />
               </div>
               <div className="login-field">
                 <Lock size={18} />
                 <input 
                   type={showPassword ? "text" : "password"} 
                   placeholder="Contraseña" 
                   value={loginPassword} 
                   onChange={(e) => setLoginPassword(e.target.value)} 
                   required
                 />
                 <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                 </button>
               </div>
               {loginError && <div className="login-error-msg">{loginError}</div>}
               <button type="submit" className="login-btn-premium" disabled={loginLoading}>
                 {loginLoading ? 'Iniciando...' : 'Entrar al Sistema'}
               </button>
             </form>
          </div>
        </div>
      )}
      {renderCheckinModal()}
      {renderNewResModal()}
      </div>
    </>
  );
}
