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

  const filteredMenuItems = menuItems.filter(item => 
    item.active && 
    (item.category === menuCategory || 
     (CATEGORY_MAPPING[menuCategory] && CATEGORY_MAPPING[menuCategory].includes(item.category))) &&
    item.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  // Group filtered items by their sub-category if needed
  const subCategories = Array.from(new Set(filteredMenuItems.map(m => m.category)));

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const normalizedInput = loginName.trim().toLowerCase();
      const user = users.find(u => u.name.toLowerCase() === normalizedInput);
      
      if (!user) {
        setLoginError('Usuario no encontrado');
        return;
      }

      if (user.password !== loginPassword) {
        setLoginError('Contraseña incorrecta');
        return;
      }

      // Mark session as active in Supabase
      await supabase.from('users').update({ session_active: true }).eq('id', user.id);
      
      const sessionUser = { id: user.id, name: user.name, role: user.role };
      localStorage.setItem('mora_session', JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
    } catch (err) {
      setLoginError('Error de conexión');
    } finally {
      setLoginLoading(false);
    }
  };

  // Auto-login from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mora_session');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        // Verify if user still exists and is active
        const exists = users.find(u => u.id === user.id);
        if (exists) setCurrentUser(user);
        else localStorage.removeItem('mora_session');
      } catch {
        localStorage.removeItem('mora_session');
      }
    }
  }, [users]);

  // ── Views ────────────────────────────────────────────

  const renderHome = () => {
    const todayStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(new Date());
    const isShiftClosed = dailySummaries.some(s => {
      const d = new Date(s.created_at);
      const sStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(d);
      return sStr === todayStr;
    });

    return (
      <div className="home-view fade-in">
        <div className="home-hero">
          <div className="hero-content">
            <h1 className="hero-title">¡Hola, {currentUser?.name.split(' ')[0]}!</h1>
            <p className="hero-subtitle">{formatDate(currentTime)}</p>
          </div>
          <div className="hero-time-card">
            <Clock size={16} />
            <span>{formatTime(currentTime)}</span>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card premium">
            <div className="kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <TrendingUp size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Ingresos Hoy</span>
              <span className="kpi-value">{formatCurrency(todayIncome + hotelCardSales + hotelCashSales)}</span>
            </div>
          </div>

          <div className="kpi-card premium">
            <div className="kpi-icon-wrap" style={{ background: '#fef2f2', color: '#ef4444' }}>
              <TrendingDown size={24} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Gastos</span>
              <span className="kpi-value">{formatCurrency(todayExpenses)}</span>
            </div>
          </div>
        </div>

        <div className="action-grid-premium">
          <button className="action-card-premium" onClick={() => setCurrentView('salon')}>
            <div className="ac-icon-bg" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
              <LayoutGrid size={28} color="white" />
            </div>
            <div className="ac-text">
              <span className="ac-title">Salón</span>
              <span className="ac-desc">{tables.filter(t => t.status !== 'free').length} mesas activas</span>
            </div>
          </button>

          <button className="action-card-premium" onClick={() => setCurrentView('pedidos')}>
            <div className="ac-icon-bg" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
              <ClipboardCheck size={28} color="white" />
            </div>
            <div className="ac-text">
              <span className="ac-title">Comandera</span>
              <span className="ac-desc">{activeItems.filter(i => i.status === 'pending').length} pendientes</span>
            </div>
          </button>

          <button className="action-card-premium" onClick={() => setCurrentView('checkin')}>
            <div className="ac-icon-bg" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <Building size={28} color="white" />
            </div>
            <div className="ac-text">
              <span className="ac-title">Hotel</span>
              <span className="ac-desc">Check-in Online</span>
            </div>
          </button>

          <button className="action-card-premium" onClick={() => setCurrentView('impresora')}>
            <div className="ac-icon-bg" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <Printer size={28} color="white" />
            </div>
            <div className="ac-text">
              <span className="ac-title">Caja</span>
              <span className="ac-desc">{pendingTickets.length} tickets</span>
            </div>
          </button>
        </div>

        <div className="bottom-actions-row">
           <button className="quick-action-btn" onClick={() => setIsHotelModalOpen(true)}>
             <Building size={18} />
             Venta Hotel
           </button>
           <button className="quick-action-btn danger" onClick={() => setIsExpenseModalOpen(true)}>
             <TrendingDown size={18} />
             Gasto
           </button>
        </div>

        <div style={{ padding: '0 24px', marginTop: 12 }}>
          {isShiftClosed ? (
            <div className="shift-closed-notice">
              <CheckCircle2 size={20} />
              <span>Turno Cerrado Correctamente</span>
            </div>
          ) : (
            <button 
              className="btn-premium-action" 
              onClick={() => setIsCierreModalOpen(true)}
              disabled={isClosingTurn}
            >
              {isClosingTurn ? 'Procesando...' : 'Cerrar Turno'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSalon = () => {
    // Categorize tables
    const tableCats = Array.from(new Set(tables.map(t => t.category)));
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const paying = tables.filter(t => t.status === 'paying').length;
    const free = tables.filter(t => t.status === 'free').length;

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

        <div className="salon-sections">
          {tableCats.map(cat => {
            const catTables = tables.filter(t => t.category === cat);
            const isDelivery = cat === 'Pedidos para llevar';
            
            return (
              <div key={cat} className="salon-cat-section" style={{ marginBottom: 32 }}>
                <h3 className="section-title-premium">{cat}</h3>
                
                {isDelivery ? (
                   <div className="delivery-list">
                     <button className="add-delivery-btn" onClick={() => setIsDeliveryModalOpen(true)}>
                       <Plus size={20} /> Nuevo pedido para llevar
                     </button>
                     {catTables.map(table => {
                        const order = tableOrders[table.id];
                        const items = activeItems.filter(i => i.table_id === table.id);
                        const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
                        const hasPending = items.some(i => i.status === 'pending');
                        const statusClass = table.status === 'paying' ? 'paying' : (hasPending ? 'occupied-pending' : 'occupied-done');

                        return (
                          <div 
                            key={table.id} 
                            className={`delivery-item ${statusClass}`}
                            onClick={() => {
                              setSelectedTableId(table.id);
                              setCurrentView('mesa');
                            }}
                          >
                            <div className="delivery-item-left">
                              <div className="delivery-item-icon">
                                {table.status === 'paying' ? <Printer size={20} /> : <ShoppingBag size={20} />}
                              </div>
                              <div className="delivery-item-details">
                                <span className="delivery-item-name">{table.name}</span>
                                <span className="delivery-item-count">{items.length} productos</span>
                              </div>
                            </div>
                            <div className="delivery-item-right">
                               <div className="delivery-item-total">{formatCurrency(total)}</div>
                               {table.status === 'paying' && <span className="tc-paying-badge">Ticket</span>}
                            </div>
                          </div>
                        );
                     })}
                   </div>
                ) : (
                  <div className="card-grid">
                    {catTables.map(table => {
                      const order = tableOrders[table.id];
                      const items = activeItems.filter(i => i.table_id === table.id);
                      const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
                      const hasPending = items.some(i => i.status === 'pending');
                      const statusClass = table.status === 'paying' ? 'paying' : (table.status === 'free' ? 'free' : (hasPending ? 'occupied-pending' : 'occupied-done'));

                      return (
                        <div 
                          key={table.id} 
                          className={`table-card ${statusClass}`}
                          onClick={() => {
                            if (table.status === 'free') {
                               setTableConfirmModal({ isOpen: true, type: 'open', tableId: table.id });
                            } else {
                              setSelectedTableId(table.id);
                              setCurrentView('mesa');
                            }
                          }}
                        >
                          <div className="tc-header">
                            <span className="tc-label">{table.status === 'paying' ? 'PAGANDO' : (table.status === 'free' ? 'LIBRE' : 'MESA')}</span>
                            <div className="tc-dot"></div>
                          </div>
                          
                          <div className="tc-number">{table.id}</div>
                          
                          <div className="tc-footer">
                            {table.status === 'free' ? (
                              <span className="tc-status-free">Abrir</span>
                            ) : (
                              <>
                                <span className="tc-total">{formatCurrency(total)}</span>
                                {table.status === 'paying' && <span className="tc-paying-badge"><Printer size={10} /> Ticket</span>}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
              ) : (
                <>
                  <div className="order-items-list-p">
                    {orderItems.map(item => (
                      <div key={item.id} className={`order-item-card-p ${item.status}`}>
                        <div className="oi-qty">{item.qty}x</div>
                        <div className="oi-main">
                          <div className="oi-name-row">
                            <span className="oi-name">{item.name}</span>
                            <span className="oi-price">{formatCurrency(item.price * item.qty)}</span>
                          </div>
                          {item.variant_label && <span className="oi-variant">{item.variant_label}</span>}
                          {item.notes && (
                            <div className="oi-notes" onClick={() => { setNotesDraft(item.notes || ''); setNotesModal({ itemId: item.id, current: item.notes || '' }); }}>
                              <StickyNote size={12} />
                              <span>{item.notes}</span>
                            </div>
                          )}
                        </div>
                        <div className="oi-actions">
                           {item.status === 'pending' ? (
                             <button className="oi-done-btn" onClick={() => markItemDone(item.id)}>Listo</button>
                           ) : (
                             <div className="oi-done-badge"><Check size={14} /></div>
                           )}
                           <button className="oi-del-btn" onClick={() => removeItem(item.id)}><X size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-footer-p">
                    <div className="order-total-row">
                      <span>Total de la Orden</span>
                      <span className="total-val">{formatCurrency(orderTotal)}</span>
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
          ) : (
            <div className="menu-selection-p fade-in">
              <div className="menu-search-wrap">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar producto..." 
                  value={menuSearch} 
                  onChange={(e) => setMenuSearch(e.target.value)} 
                />
              </div>

              <div className="menu-cats-scroll">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    className={`cat-pill ${menuCategory === cat ? 'active' : ''}`}
                    onClick={() => setMenuCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="menu-items-grid">
                {subCategories.map(subCat => {
                  const items = filteredMenuItems.filter(m => m.category === subCat);
                  const isExpanded = expandedSubCats.has(subCat);

                  return (
                    <div key={subCat} className="menu-subcat-section">
                       <div className="menu-subcat-header" onClick={() => toggleSubCat(subCat)}>
                         <h4>{subCat}</h4>
                         {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                       </div>
                       
                       {isExpanded && (
                         <div className="menu-items-list fade-in">
                           {items.map(item => (
                             <button 
                               key={item.id} 
                               className="menu-item-card-compact"
                               onClick={() => setConfirmPending({ item })}
                             >
                               <div className="mic-info">
                                 <span className="mic-name">{item.name}</span>
                                 <span className="mic-price">{formatCurrency(item.price)}</span>
                               </div>
                               <div className="mic-add"><Plus size={16} /></div>
                             </button>
                           ))}
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCheckout = () => {
    if (!selectedTableId) return null;
    
    // Calculate values
    const subtotal = orderTotal;
    let discount = 0;
    if (discountType === 'amount') discount = parseFloat(discountValue) || 0;
    else if (discountType === 'percentage') discount = subtotal * ((parseFloat(discountValue) || 0) / 100);
    
    const afterDiscount = Math.max(0, subtotal - discount);
    
    let tip = 0;
    if (tipPercent === '10') tip = afterDiscount * 0.1;
    else if (tipPercent === '15') tip = afterDiscount * 0.15;
    else if (tipPercent === '20') tip = afterDiscount * 0.2;
    else if (tipPercent === 'Otro') tip = parseFloat(customTip) || 0;
    
    const grandTotal = afterDiscount + tip;
    const received = parseFloat(cashReceived) || 0;
    const change = Math.max(0, received - grandTotal);

    return (
      <div className="checkout-view fade-in">
         <div className="checkout-header">
           <button className="back-btn-pill" onClick={() => setCurrentView('mesa')}>
             <ChevronLeft size={20} />
             <span>Mesa {selectedTableId}</span>
           </button>
           <h2>Resumen de Pago</h2>
         </div>

         <div className="checkout-card">
            <div className="check-summary-line">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="checkout-config-section">
              <label>Descuento Especial</label>
              <div className="config-row">
                 <button className={`config-opt ${discountType === 'none' ? 'active' : ''}`} onClick={() => setDiscountType('none')}>Ninguno</button>
                 <button className={`config-opt ${discountType === 'amount' ? 'active' : ''}`} onClick={() => setDiscountType('amount')}>$ Fijo</button>
                 <button className={`config-opt ${discountType === 'percentage' ? 'active' : ''}`} onClick={() => setDiscountType('percentage')}>% Porc</button>
              </div>
              {discountType !== 'none' && (
                <div className="config-inputs fade-in">
                  <input type="number" placeholder="Valor" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                  <input type="text" placeholder="Motivo (obligatorio)" value={discountReason} onChange={e => setDiscountReason(e.target.value)} />
                </div>
              )}
            </div>

            <div className="checkout-config-section">
              <label>Sugerir Propina</label>
              <div className="config-row">
                 {['none', '10', '15', '20', 'Otro'].map(opt => (
                   <button key={opt} className={`config-opt ${tipPercent === opt ? 'active' : ''}`} onClick={() => setTipPercent(opt as any)}>
                     {opt === 'none' ? '0%' : (opt === 'Otro' ? '...' : opt + '%')}
                   </button>
                 ))}
              </div>
              {tipPercent === 'Otro' && (
                <div className="config-inputs fade-in">
                   <input type="number" placeholder="Monto de propina $" value={customTip} onChange={e => setCustomTip(e.target.value)} />
                </div>
              )}
            </div>

            <div className="total-breakdown">
               {discount > 0 && (
                 <div className="break-line discount">
                   <span>Descuento</span>
                   <span>-{formatCurrency(discount)}</span>
                 </div>
               )}
               {tip > 0 && (
                 <div className="break-line tip">
                   <span>Propina Sugerida</span>
                   <span>{formatCurrency(tip)}</span>
                 </div>
               )}
               <div className="break-line grand">
                 <span>TOTAL A PAGAR</span>
                 <span>{formatCurrency(grandTotal)}</span>
               </div>
            </div>
         </div>

         <div className="checkout-methods-section">
           <label>Método de Pago</label>
           <div className="methods-grid-p">
             <button className={`method-btn-p ${paymentMethod === 'efectivo' ? 'active' : ''}`} onClick={() => setPaymentMethod('efectivo')}>
               <Wallet size={24} />
               <span>Efectivo</span>
             </button>
             <button className={`method-btn-p ${paymentMethod === 'tarjeta' ? 'active' : ''}`} onClick={() => setPaymentMethod('tarjeta')}>
               <CreditCard size={24} />
               <span>Tarjeta</span>
             </button>
             <button className={`method-btn-p ${paymentMethod === 'transferencia' ? 'active' : ''}`} onClick={() => setPaymentMethod('transferencia')}>
               <Building size={24} />
               <span>Transf.</span>
             </button>
           </div>
         </div>

         {paymentMethod === 'efectivo' && (
           <div className="cash-input-card fade-in">
             <label>Recibido del Cliente</label>
             <input type="number" placeholder="$ 0.00" value={cashReceived} onChange={e => setCashReceived(e.target.value)} />
             {received > 0 && (
               <div className="change-display">
                 <span>Cambio:</span>
                 <span className="change-val">{formatCurrency(change)}</span>
               </div>
             )}
           </div>
         )}

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
      <div className="impresora-view fade-in">
        <div className="view-header">
           <h2 className="view-title-premium">Caja / Impresora</h2>
           <p className="view-subtitle-premium">Tickets pendientes de impresión física</p>
        </div>

        {pendingTickets.length === 0 ? (
          <div className="empty-state-p">
            <Printer size={48} color="#94a3b8" />
            <h3>No hay tickets en cola</h3>
            <p>Los tickets enviados desde las mesas aparecerán aquí</p>
          </div>
        ) : (
          <div className="tickets-grid-p">
            {pendingTickets.map(ticket => (
              <div key={ticket.id} className={`ticket-card-p ${ticket.status}`}>
                <div className="ticket-header-p">
                  <span className="ticket-id-p">MESA {ticket.table_id}</span>
                  <span className="ticket-time-p">{new Date(ticket.created_at).toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="ticket-body-p">
                   <div className="ticket-summary-p">{ticket.items_summary}</div>
                   <div className="ticket-total-p">{formatCurrency(ticket.total)}</div>
                </div>
                <div className="ticket-footer-p">
                  <button className="ticket-print-btn" onClick={() => dispatchPrintOnly(ticket)}>
                    <Printer size={16} /> Imprimir
                  </button>
                  <button className="ticket-del-btn" onClick={() => deleteTicket(ticket.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
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

        <div className="checkin-section">
          <div className="section-header-p" onClick={() => setIsEnCasaExpanded(!isEnCasaExpanded)}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <HomeIcon size={20} />
               <h3>En casa ({enCasa.length})</h3>
             </div>
             {isEnCasaExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          
          {isEnCasaExpanded && (
            <div className="res-list-p">
              {isLoadingCheckins ? (
                <div className="loading-spinner-p">Cargando huéspedes...</div>
              ) : enCasa.length === 0 ? (
                <p className="empty-msg">No hay huéspedes actualmente en el hotel.</p>
              ) : (
                enCasa.map(res => (
                  <div key={res.id} className="res-card-p">
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

        <div className="checkin-section" style={{ marginTop: 24 }}>
          <div className="section-header-p" onClick={() => setIsProximosExpanded(!isProximosExpanded)}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <Calendar size={20} />
               <h3>Próximas llegadas ({proximas.length})</h3>
             </div>
             {isProximosExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
        <div className="header-title-container">
          <span className="header-subtitle">RESTAURANTE & HOTEL</span>
          <h1 className="header-title">Gallo Azul</h1>
        </div>
        {currentUser && (
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
        {currentView === 'pedidos' && (
          <div className="pedidos-view fade-in">
            <div className="view-header">
               <h2 className="view-title-premium">Comandera / Cocina</h2>
               <p className="view-subtitle-premium">Productos pendientes de entrega</p>
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
          </div>
        )}
        {currentView === 'impresora' && renderImpresora()}
        {currentView === 'admin' && renderAdmin()}
        {currentView === 'mesa' && renderMesa()}
        {currentView === 'checkout' && renderCheckout()}
      </div>

      {currentUser && (
        <div className="bottom-nav">
          <button className={`nav-item ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}>
            <HomeIcon className="nav-icon" />
            <span>Inicio</span>
          </button>
          <button className={`nav-item ${currentView === 'checkin' || currentView === 'registros' ? 'active' : ''}`} onClick={() => setCurrentView('checkin')}>
            <Building className="nav-icon" />
            <span>Hotel</span>
          </button>
          <button className={`nav-item ${currentView === 'salon' || currentView === 'mesa' || currentView === 'checkout' ? 'active' : ''}`} onClick={() => setCurrentView('salon')}>
            <LayoutGrid className="nav-icon" />
            <span>Salón</span>
          </button>
          <button className={`nav-item ${currentView === 'admin' ? 'active' : ''}`} onClick={() => setCurrentView('admin')}>
            <Settings className="nav-icon" />
            <span>Admin</span>
          </button>
        </div>
      )}

      {/* --- Modales --- */}

      {!currentUser && (
        <div className="login-overlay">
          <div className="login-card fade-in">
             <div className="login-header">
               <div className="login-logo">G</div>
               <h2>Gallo Azul</h2>
               <p>Ingresa tus credenciales para continuar</p>
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

      {showCheckinModal && (
        <div className="modal-overlay-premium" onClick={() => setShowCheckinModal(false)}>
           <div className="modal-content-premium full" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
               <div className="m-h-info">
                 <h3>Registro de Huésped</h3>
                 <p>Completa los datos para el check-in online</p>
               </div>
               <button className="m-close-btn" onClick={() => setShowCheckinModal(false)}><X size={20} /></button>
             </div>
             
             <div className="checkin-form-p">
                <div className="form-group-p">
                  <label>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={checkinForm.name} 
                    onChange={e => setCheckinForm({...checkinForm, name: e.target.value})} 
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div className="form-row-p">
                  <div className="form-group-p">
                    <label>Nacionalidad</label>
                    <select 
                      value={checkinForm.nationality}
                      onChange={e => setCheckinForm({...checkinForm, nationality: e.target.value, country: e.target.value})}
                    >
                      <option value="">Seleccionar...</option>
                      {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => (
                        <optgroup key={continent} label={continent}>
                          {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-p">
                    <label>Teléfono</label>
                    <input 
                      type="tel" 
                      value={checkinForm.phone} 
                      onChange={e => setCheckinForm({...checkinForm, phone: e.target.value})} 
                      placeholder="+52 1..."
                    />
                  </div>
                </div>

                <div className="form-group-p">
                  <label>Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={checkinForm.email} 
                    onChange={e => setCheckinForm({...checkinForm, email: e.target.value})} 
                    placeholder="ejemplo@correo.com"
                  />
                </div>

                <div className="form-row-p">
                  <div className="form-group-p">
                    <label>Ciudad de Residencia</label>
                    <input 
                      type="text" 
                      value={checkinForm.city} 
                      onChange={e => setCheckinForm({...checkinForm, city: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="checkin-res-summary">
                  <div className="res-sum-header">Detalles de la Estancia</div>
                  <div className="res-sum-grid">
                    <div className="res-s-item">
                       <span className="res-s-label">HABITACIÓN</span>
                       <span className="res-s-val">{checkinForm.roomName}</span>
                    </div>
                    <div className="res-s-item">
                       <span className="res-s-label">FECHAS</span>
                       <span className="res-s-val">
                         {new Date(checkinForm.arrivalDate + 'T12:00:00').toLocaleDateString('es-MX', {day:'numeric', month:'short'})} - {new Date(checkinForm.departureDate + 'T12:00:00').toLocaleDateString('es-MX', {day:'numeric', month:'short'})}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="form-group-p sig-section">
                  <label>Firma del Huésped</label>
                  <div className="signature-pad-p">
                    <p>El huésped debe firmar en este espacio</p>
                    {/* Placeholder for actual signature pad component */}
                  </div>
                </div>

                <button 
                  className="btn-premium-p" 
                  onClick={async () => {
                    try {
                      const { error } = await supabase.from('guest_registrations').insert([{
                        reservation_id: selectedReservation?.id,
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
                        currency: checkinForm.currency,
                        payment_status: checkinForm.paymentStatus,
                        source: checkinForm.source,
                        signature: checkinForm.signature
                      }]);
                      
                      if (error) throw error;
                      
                      alert('Check-in completado correctamente');
                      setShowCheckinModal(false);
                      fetchRegistrations();
                    } catch (err: any) {
                      alert('Error al registrar: ' + err.message);
                    }
                  }}
                >
                  Finalizar Registro
                </button>
             </div>
           </div>
        </div>
      )}

      {showNewResModal && (
        <div className="modal-overlay-premium" onClick={() => setShowNewResModal(false)}>
           <div className="modal-content-premium full" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
               <div className="m-h-info">
                 <h3>Crear Nueva Reserva</h3>
                 <p>Conexión directa con Hostaway API</p>
               </div>
               <button className="m-close-btn" onClick={() => setShowNewResModal(false)}><X size={20} /></button>
             </div>
             
             <div className="checkin-form-p">
                <div className="form-row-p">
                  <div className="form-group-p">
                    <label>Nombre</label>
                    <input 
                      type="text" 
                      value={newResForm.guestFirstName} 
                      onChange={e => setNewResForm({...newResForm, guestFirstName: e.target.value})} 
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="form-group-p">
                    <label>Apellido</label>
                    <input 
                      type="text" 
                      value={newResForm.guestLastName} 
                      onChange={e => setNewResForm({...newResForm, guestLastName: e.target.value})} 
                      placeholder="Apellido"
                    />
                  </div>
                </div>

                <div className="form-row-p">
                  <div className="form-group-p">
                    <label>Teléfono</label>
                    <input 
                      type="tel" 
                      value={newResForm.guestPhone} 
                      onChange={e => setNewResForm({...newResForm, guestPhone: e.target.value})} 
                      placeholder="+1 234..."
                    />
                  </div>
                  <div className="form-group-p">
                    <label>Email</label>
                    <input 
                      type="email" 
                      value={newResForm.guestEmail} 
                      onChange={e => setNewResForm({...newResForm, guestEmail: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="form-row-p">
                  <div className="form-group-p">
                    <label>Check-in</label>
                    <input 
                      type="date" 
                      value={newResForm.arrivalDate} 
                      onChange={e => setNewResForm({...newResForm, arrivalDate: e.target.value})} 
                    />
                  </div>
                  <div className="form-group-p">
                    <label>Check-out</label>
                    <input 
                      type="date" 
                      value={newResForm.departureDate} 
                      onChange={e => setNewResForm({...newResForm, departureDate: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="form-group-p">
                  <label>Habitación Asignada</label>
                  <select 
                    value={newResForm.listingId} 
                    onChange={e => setNewResForm({...newResForm, listingId: e.target.value})}
                    disabled={isLoadingAvailability || (!newResForm.arrivalDate || !newResForm.departureDate)}
                  >
                    <option value="">{isLoadingAvailability ? 'Buscando disponibles...' : 'Seleccionar habitación...'}</option>
                    {availableListings.map(l => (
                      <option key={l.id} value={l.id}>{l.name} - {formatCurrency(l.basePrice, l.currency)}/noche</option>
                    ))}
                  </select>
                  {!newResForm.arrivalDate && <small style={{ color: '#94a3b8' }}>Ingresa fechas para ver disponibilidad</small>}
                </div>

                <div className="price-config-box">
                  <div className="price-toggle-row">
                    <label>Precio Hostaway</label>
                    <div className="price-display">
                      {newResForm.listingId ? (
                        formatCurrency(availableListings.find(l => String(l.id) === String(newResForm.listingId))?.basePrice || 0, availableListings.find(l => String(l.id) === String(newResForm.listingId))?.currency)
                      ) : '--'}
                    </div>
                  </div>
                  
                  <div className="custom-price-toggle">
                     <input 
                        type="checkbox" 
                        id="useCustomPrice" 
                        checked={newResForm.useCustomPrice}
                        onChange={e => setNewResForm({...newResForm, useCustomPrice: e.target.checked})}
                     />
                     <label htmlFor="useCustomPrice">Personalizar precio</label>
                  </div>

                  {newResForm.useCustomPrice && (
                    <div className="custom-price-inputs fade-in">
                       <select 
                         value={newResForm.priceCurrency} 
                         onChange={e => setNewResForm({...newResForm, priceCurrency: e.target.value})}
                       >
                         <option value="USD">USD</option>
                         <option value="MXN">MXN</option>
                       </select>
                       <input 
                         type="number" 
                         placeholder="Nuevo precio total"
                         value={newResForm.customPrice}
                         onChange={e => setNewResForm({...newResForm, customPrice: e.target.value})}
                       />
                    </div>
                  )}
                </div>

                <button 
                  className="btn-premium-p highlight" 
                  onClick={handleCreateReservation}
                  disabled={isCreatingRes || !newResForm.listingId}
                >
                  {isCreatingRes ? 'Creando Reserva...' : 'Registrar en Hostaway'}
                </button>
             </div>
           </div>
        </div>
      )}

      {tableConfirmModal.isOpen && (
        <div className="modal-overlay-premium" onClick={() => setTableConfirmModal({isOpen: false, type: 'open', tableId: null})}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
                <h3>{tableConfirmModal.type === 'open' ? 'Abrir Mesa' : (tableConfirmModal.type === 'pay' ? 'Confirmar Pago' : 'Cerrar Mesa')}</h3>
             </div>
             <div style={{ padding: '20px 0', fontSize: 16, color: '#475569', textAlign: 'center' }}>
                {tableConfirmModal.type === 'open' 
                  ? `¿Deseas abrir la cuenta para la Mesa ${tableConfirmModal.tableId}?` 
                  : (tableConfirmModal.type === 'pay' ? '¿Confirmas el pago total de esta cuenta?' : `¿Deseas cerrar la Mesa ${tableConfirmModal.tableId}?`)}
             </div>
             <div className="modal-actions-p">
                <button className="btn-sec-p" onClick={() => setTableConfirmModal({isOpen: false, type: 'open', tableId: null})}>Cancelar</button>
                <button className="btn-pri-p" onClick={async () => {
                   if (tableConfirmModal.type === 'open' && tableConfirmModal.tableId) {
                      await createOrderForTable(tableConfirmModal.tableId);
                      setSelectedTableId(tableConfirmModal.tableId);
                      setCurrentView('mesa');
                   } else if (tableConfirmModal.type === 'closeEmpty' && tableConfirmModal.tableId) {
                      await cancelTable(tableConfirmModal.tableId);
                      setCurrentView('salon');
                   }
                   setTableConfirmModal({isOpen: false, type: 'open', tableId: null});
                }}>Confirmar</button>
             </div>
          </div>
        </div>
      )}

      {printCuentaModal.isOpen && (
        <div className="modal-overlay-premium" onClick={() => setPrintCuentaModal({isOpen: false, tableId: null})}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
                <h3>Imprimir Cuenta</h3>
             </div>
             <div style={{ padding: '20px 0', fontSize: 16, color: '#475569', textAlign: 'center' }}>
                Esto enviará el ticket a la cola de impresión en caja.<br/>
                Total: <strong>{formatCurrency(orderTotal)}</strong>
             </div>
             <div className="modal-actions-p">
                <button className="btn-sec-p" onClick={() => setPrintCuentaModal({isOpen: false, tableId: null})}>Volver</button>
                <button className="btn-pri-p" onClick={handleSendToPrinter}>Imprimir Ticket</button>
             </div>
          </div>
        </div>
      )}

      {isExpenseModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
               <h3>Registrar Gasto</h3>
               <button className="m-close-btn" onClick={() => setIsExpenseModalOpen(false)}><X size={20} /></button>
             </div>
             <div className="modal-form-p">
                <div className="form-group-p">
                  <label>Monto ($)</label>
                  <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="form-group-p">
                  <label>Concepto</label>
                  <select value={expenseConcept} onChange={e => setExpenseConcept(e.target.value)}>
                    <option>Pago a proveedores</option>
                    <option>Sueldos / Nómina</option>
                    <option>Servicios (Luz/Agua)</option>
                    <option>Mantenimiento</option>
                    <option>Otros</option>
                  </select>
                </div>
                <div className="form-group-p">
                  <label>Detalle (opcional)</label>
                  <input type="text" value={expenseDetail} onChange={e => setExpenseDetail(e.target.value)} placeholder="Ej. Compra de verdura" />
                </div>
                <button className="btn-pri-p" style={{ width: '100%', marginTop: 10 }} onClick={() => {
                  if (expenseAmount) {
                    addExpense(parseFloat(expenseAmount), expenseConcept, expenseDetail);
                    setIsExpenseModalOpen(false);
                    setExpenseAmount(''); setExpenseDetail('');
                  }
                }}>Guardar Gasto</button>
             </div>
          </div>
        </div>
      )}

      {isHotelModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsHotelModalOpen(false)}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
               <h3>Registrar Venta Hotel</h3>
               <button className="m-close-btn" onClick={() => setIsHotelModalOpen(false)}><X size={20} /></button>
             </div>
             <div className="modal-form-p">
                <div className="form-group-p">
                  <label>Monto</label>
                  <input type="number" value={hotelAmount} onChange={e => setHotelAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="form-group-p">
                  <label>Moneda</label>
                  <div className="config-row">
                    <button className={`config-opt ${hotelCurrency === 'MXN' ? 'active' : ''}`} onClick={() => setHotelCurrency('MXN')}>Pesos (MXN)</button>
                    <button className={`config-opt ${hotelCurrency === 'USD' ? 'active' : ''}`} onClick={() => setHotelCurrency('USD')}>Dólares (USD)</button>
                  </div>
                </div>
                <div className="form-group-p">
                  <label>Método de Pago</label>
                  <div className="methods-grid-p small">
                    <button className={`method-btn-p ${hotelPaymentMethod === 'efectivo' ? 'active' : ''}`} onClick={() => setHotelPaymentMethod('efectivo')}>
                      <Wallet size={18} /><span>Efec.</span>
                    </button>
                    <button className={`method-btn-p ${hotelPaymentMethod === 'tarjeta' ? 'active' : ''}`} onClick={() => setHotelPaymentMethod('tarjeta')}>
                      <CreditCard size={18} /><span>Tarj.</span>
                    </button>
                    <button className={`method-btn-p ${hotelPaymentMethod === 'transferencia' ? 'active' : ''}`} onClick={() => setHotelPaymentMethod('transferencia')}>
                      <Building size={18} /><span>Transf.</span>
                    </button>
                  </div>
                </div>
                <button className="btn-pri-p" style={{ width: '100%', marginTop: 10 }} onClick={() => {
                  if (hotelAmount) {
                    addHotelSale(parseFloat(hotelAmount), hotelCurrency, hotelPaymentMethod);
                    setIsHotelModalOpen(false);
                    setHotelAmount('');
                  }
                }}>Registrar Venta</button>
             </div>
          </div>
        </div>
      )}

      {isCierreModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsCierreModalOpen(false)}>
          <div className="modal-content-premium full" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
               <h3>Resumen de Cierre de Turno</h3>
               <button className="m-close-btn" onClick={() => setIsCierreModalOpen(false)}><X size={20} /></button>
             </div>
             
             <div className="cierre-preview-p">
                <div className="cierre-section">
                  <h4>Ventas Totales</h4>
                  <div className="cierre-grid">
                    <div className="c-item"><span>Restaurante</span><strong>{formatCurrency(todayIncome)}</strong></div>
                    <div className="c-item"><span>Hotel</span><strong>{formatCurrency(hotelCardSales + hotelCashSales)}</strong></div>
                    <div className="c-item highlight"><span>Gran Total</span><strong>{formatCurrency(todayIncome + hotelCardSales + hotelCashSales + todayTotalTips)}</strong></div>
                  </div>
                </div>

                <div className="cierre-section">
                  <h4>Métodos de Pago</h4>
                  <div className="cierre-grid">
                    <div className="c-item"><span>Efectivo (Pesos)</span><strong>{formatCurrency(todayCashIncome + hotelCashSales)}</strong></div>
                    <div className="c-item"><span>Tarjetas (TC)</span><strong>{formatCurrency(todayCardIncome + hotelCardSales)}</strong></div>
                    <div className="c-item"><span>Transferencias</span><strong>{formatCurrency(todayTransferIncome)}</strong></div>
                    <div className="c-item"><span>Propinas Totales</span><strong>{formatCurrency(todayTotalTips)}</strong></div>
                  </div>
                </div>

                <div className="cierre-section danger">
                  <h4>Gastos y Salidas</h4>
                  <div className="cierre-grid">
                    {todayExpensesList.map((exp, i) => (
                      <div key={i} className="c-item"><span>{exp.concept}</span><strong style={{ color: '#dc2626' }}>-{formatCurrency(exp.amount)}</strong></div>
                    ))}
                    <div className="c-item highlight"><span>Total Gastos</span><strong>{formatCurrency(todayExpenses)}</strong></div>
                  </div>
                </div>

                <div className="cierre-final-box">
                   <div className="f-title">Balance de Caja (Efectivo)</div>
                   <div className="f-math">
                     {formatCurrency(pettyCashInitial)} (Inicio) + {formatCurrency(todayCashIncome + hotelCashSales + todayCashTips)} (Ingresos) - {formatCurrency(todayExpenses)} (Gastos)
                   </div>
                   <div className="f-total">
                     <span>Total a Entregar:</span>
                     <strong>{formatCurrency(pettyCashInitial + (todayCashIncome + hotelCashSales + todayCashTips) - todayExpenses)}</strong>
                   </div>
                   <p className="f-note">Al confirmar, el turno se cerrará y los datos se archivarán en el historial.</p>
                </div>
             </div>

             <div className="modal-actions-p">
                <button className="btn-sec-p" onClick={() => setIsCierreModalOpen(false)}>Cancelar</button>
                <button className="btn-pri-p" style={{ background: '#0f172a' }} onClick={async () => {
                   setIsClosingTurn(true);
                   const res = await closeDay(currentUser?.name || 'Admin');
                   if (res.success) {
                      setIsCierreModalOpen(false);
                      setCurrentView('home');
                      alert('Cierre realizado con éxito.');
                   } else {
                      alert('Hubo un error al cerrar el turno. Por favor intenta de nuevo.');
                   }
                   setIsClosingTurn(false);
                }}>{isClosingTurn ? 'Cerrando...' : 'Confirmar Cierre de Día'}</button>
             </div>
          </div>
        </div>
      )}

      {isAddItemModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsAddItemModalOpen(false)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-p">
                <h3>Nuevo Producto</h3>
                <button className="m-close-btn" onClick={() => setIsAddItemModalOpen(false)}><X size={20} /></button>
              </div>
              <form className="modal-form-p" onSubmit={handleCreateMenuItem}>
                <div className="form-group-p">
                  <label>Nombre del Producto</label>
                  <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ej. Pizza Margarita" required />
                </div>
                <div className="form-group-p">
                  <label>Categoría</label>
                  <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="NEW">+ Nueva Categoría</option>
                  </select>
                </div>
                {newItemCategory === 'NEW' && (
                  <div className="form-group-p fade-in">
                    <label>Nombre de Categoría</label>
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Ej. Postres" />
                  </div>
                )}
                <div className="form-group-p">
                  <label>Tipo de Precio</label>
                  <div className="config-row">
                    <button type="button" className={`config-opt ${newItemType === 'fixed' ? 'active' : ''}`} onClick={() => setNewItemType('fixed')}>Fijo</button>
                    <button type="button" className={`config-opt ${newItemType === 'variants' ? 'active' : ''}`} onClick={() => setNewItemType('variants')}>Con Variantes</button>
                  </div>
                </div>
                {newItemType === 'fixed' ? (
                  <div className="form-group-p fade-in">
                    <label>Precio ($)</label>
                    <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" />
                  </div>
                ) : (
                  <div className="form-group-p fade-in">
                    <label>Variantes</label>
                    {newItemVariants.map((v, i) => (
                      <div key={i} className="variant-input-row">
                        <input type="text" placeholder="Opción" value={v.label} onChange={e => {
                          const next = [...newItemVariants];
                          next[i].label = e.target.value;
                          setNewItemVariants(next);
                        }} />
                        <input type="number" placeholder="$" value={v.price} onChange={e => {
                          const next = [...newItemVariants];
                          next[i].price = e.target.value;
                          setNewItemVariants(next);
                        }} />
                        <button type="button" onClick={() => setNewItemVariants(newItemVariants.filter((_, idx) => idx !== i))}>&times;</button>
                      </div>
                    ))}
                    <button type="button" className="add-var-btn" onClick={() => setNewItemVariants([...newItemVariants, {label: '', price: ''}])}>+ Añadir Variante</button>
                  </div>
                )}
                <button type="submit" className="btn-pri-p" style={{ width: '100%', marginTop: 10 }}>Crear Producto</button>
              </form>
           </div>
        </div>
      )}

      {isAddUserModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsAddUserModalOpen(false)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-p">
                <h3>Nuevo Usuario</h3>
                <button className="m-close-btn" onClick={() => setIsAddUserModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-form-p">
                <div className="form-group-p">
                  <label>Nombre Completo</label>
                  <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ej. Juan Pérez" />
                </div>
                <div className="form-group-p">
                  <label>Rol de Usuario</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)}>
                    <option value="Staff">Staff (Mesero)</option>
                    <option value="Encargado">Encargado</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
                <div className="form-group-p">
                  <label>Contraseña Provisional</label>
                  <input type="text" value={INITIAL_PASSWORD} disabled />
                  <small style={{ color: '#94a3b8' }}>El usuario podrá cambiarla después</small>
                </div>
                <button className="btn-pri-p" style={{ width: '100%', marginTop: 10 }} onClick={async () => {
                  if (newUserName) {
                    await addUser(newUserName, newUserRole, INITIAL_PASSWORD);
                    setIsAddUserModalOpen(false);
                    setNewUserName('');
                  }
                }}>Crear Usuario</button>
              </div>
           </div>
        </div>
      )}

      {isEditUserModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsEditUserModalOpen(false)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-p">
                <h3>Editar Usuario</h3>
                <button className="m-close-btn" onClick={() => setIsEditUserModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-form-p">
                <div className="form-group-p">
                  <label>Nombre Completo</label>
                  <input type="text" value={editUserName} onChange={e => setEditUserName(e.target.value)} />
                </div>
                <div className="form-group-p">
                  <label>Rol de Usuario</label>
                  <select value={editUserRole} onChange={e => setEditUserRole(e.target.value as any)}>
                    <option value="Staff">Staff (Mesero)</option>
                    <option value="Encargado">Encargado</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
                <button className="btn-pri-p" style={{ width: '100%', marginTop: 10 }} onClick={async () => {
                  if (editingUserId && editUserName) {
                    await updateUser(editingUserId, editUserName, editUserRole);
                    setIsEditUserModalOpen(false);
                  }
                }}>Guardar Cambios</button>
              </div>
           </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-overlay-premium" onClick={() => setEditTarget(null)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-p">
                <h3>Editar {editTarget.type === 'category' ? 'Categoría' : 'Producto'}</h3>
                <button className="m-close-btn" onClick={() => setEditTarget(null)}><X size={20} /></button>
              </div>
              <form className="modal-form-p" onSubmit={handleEditSave}>
                <div className="form-group-p">
                  <label>Nombre / Etiqueta</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
                </div>
                {editTarget.type !== 'category' && (
                  <div className="form-group-p">
                    <label>Precio ($)</label>
                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} required />
                  </div>
                )}
                <button type="submit" className="btn-pri-p" style={{ width: '100%', marginTop: 10 }}>Guardar Cambios</button>
              </form>
           </div>
        </div>
      )}

      {isDeliveryModalOpen && (
        <div className="modal-overlay-premium" onClick={() => setIsDeliveryModalOpen(false)}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
               <h3>Pedido para llevar</h3>
               <button className="m-close-btn" onClick={() => setIsDeliveryModalOpen(false)}><X size={20} /></button>
             </div>
             <div className="modal-form-p">
                <div className="form-group-p">
                  <label>Nombre del Cliente</label>
                  <input 
                    type="text" 
                    value={deliveryCustomerName} 
                    onChange={e => setDeliveryCustomerName(e.target.value)} 
                    placeholder="Ej. Juan Pérez" 
                  />
                </div>
                <button className="btn-pri-p" style={{ width: '100%', marginTop: 10 }} onClick={async () => {
                  if (deliveryCustomerName.trim()) {
                    const tableId = await createDeliveryOrder(deliveryCustomerName.trim());
                    if (tableId) {
                      setSelectedTableId(tableId);
                      setCurrentView('mesa');
                      setIsDeliveryModalOpen(false);
                      setDeliveryCustomerName('');
                    }
                  }
                }}>Empezar Pedido</button>
             </div>
          </div>
        </div>
      )}

      {confirmPending && (
        <div className="modal-overlay-premium" onClick={() => setConfirmPending(null)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-p">
                <h3>Añadir a la Orden</h3>
              </div>
              <div className="confirm-item-info-p">
                <span className="ci-name">{confirmPending.item.name}</span>
                {confirmPending.item.hasVariants && (
                   <div className="ci-variants-grid">
                      {confirmPending.item.variants?.filter(v => v.active).map(v => (
                        <button 
                          key={v.id} 
                          className={`ci-variant-btn ${confirmPending.variant?.id === v.id ? 'active' : ''}`}
                          onClick={() => setConfirmPending({ ...confirmPending, variant: v })}
                        >
                          <span className="v-label">{v.label}</span>
                          <span className="v-price">{formatCurrency(v.price)}</span>
                        </button>
                      ))}
                   </div>
                )}
                
                <div className="ci-notes-section">
                   <div className="notes-header-row" onClick={() => setShowExtras(!showExtras)}>
                     <label>Notas / Modificaciones</label>
                     {showExtras ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                   </div>
                   {showExtras && (
                     <div className="notes-input-box fade-in">
                        <textarea 
                          placeholder="Sin cebolla, extra salsa, etc..." 
                          value={confirmNotes}
                          onChange={(e) => setConfirmNotes(e.target.value)}
                        />
                     </div>
                   )}
                </div>
              </div>
              <div className="modal-actions-p">
                 <button className="btn-sec-p" onClick={() => setConfirmPending(null)}>Cancelar</button>
                 <button 
                  className="btn-pri-p" 
                  disabled={confirmPending.item.hasVariants && !confirmPending.variant}
                  onClick={() => {
                    addItemToOrder(selectedTableId!, confirmPending.item, confirmPending.variant, confirmNotes);
                    setConfirmPending(null);
                    setConfirmNotes('');
                    setShowExtras(false);
                  }}
                 >Añadir</button>
              </div>
           </div>
        </div>
      )}

      {notesModal && (
        <div className="modal-overlay-premium" onClick={() => setNotesModal(null)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-p">
                <h3>Editar Notas</h3>
              </div>
              <div className="modal-form-p">
                <textarea 
                  className="notes-textarea"
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Instrucciones especiales..."
                  autoFocus
                />
              </div>
              <div className="modal-actions-p">
                 <button className="btn-sec-p" onClick={() => setNotesModal(null)}>Cerrar</button>
                 <button className="btn-pri-p" onClick={() => {
                   updateItemNotes(notesModal.itemId, notesDraft);
                   setNotesModal(null);
                 }}>Guardar</button>
              </div>
           </div>
        </div>
      )}

      {deleteReportId && (
        <div className="modal-overlay-premium" onClick={() => setDeleteReportId(null)}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header-p">
                <h3>Eliminar Reporte</h3>
             </div>
             <div style={{ padding: '20px 0', fontSize: 16, color: '#475569', textAlign: 'center' }}>
                ¿Estás seguro de que deseas eliminar este reporte del historial?<br/>
                <strong>Esta acción no se puede deshacer.</strong>
             </div>
             <div className="modal-actions-p">
                <button className="btn-sec-p" onClick={() => setDeleteReportId(null)}>Cancelar</button>
                <button className="btn-pri-p" style={{ background: '#dc2626' }} onClick={async () => {
                   await deleteShiftSummary(deleteReportId);
                   setDeleteReportId(null);
                }}>Eliminar Permanentemente</button>
             </div>
          </div>
        </div>
      )}

      {isIosPromptVisible && (
        <div className="modal-overlay-premium" onClick={() => setIsIosPromptVisible(false)}>
           <div className="modal-content-premium" onClick={(e) => e.stopPropagation()} style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ background: '#f0f7ff', width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#3b82f6' }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Instalar Gallo Azul</h3>
              <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                Para instalar esta aplicación en tu iPhone:<br/><br/>
                1. Pulsa el botón <strong>'Compartir'</strong> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', margin: '0 2px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> en la parte inferior.<br/>
                2. Selecciona <strong>'Añadir a pantalla de inicio'</strong>.
              </p>
              <button className="btn-pri-p" style={{ width: '100%' }} onClick={() => setIsIosPromptVisible(false)}>Entendido</button>
           </div>
        </div>
      )}

      {ticketToPrint && (
        <div className="print-only">
          <div className="print-ticket">
            <div className="pt-header">
              <h1>Gallo Azul</h1>
              <p>Restaurante & Hotel</p>
              <p>{new Date().toLocaleString('es-MX')}</p>
            </div>
            <div className="pt-divider">********************************</div>
            <div className="pt-info">
              <p>Mesa: {ticketToPrint.table_id}</p>
              <p>Atendió: {ticketToPrint.printed_by}</p>
            </div>
            <div className="pt-divider">--------------------------------</div>
            <div className="pt-items">
              {ticketToPrint.items_summary.split(', ').map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <div className="pt-divider">--------------------------------</div>
            <div className="pt-total">
              <p>TOTAL: {formatCurrency(ticketToPrint.total)}</p>
            </div>
            <div className="pt-footer">
              <p>¡Gracias por su visita!</p>
              <p>Propina no incluida</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
