import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  LayoutGrid, ClipboardCheck, Settings, ChevronLeft, Users, Check, X,
  Plus, Lock, Home as HomeIcon, UserPlus, Trash2, User, ChevronRight,
  FileEdit, PlusCircle, TrendingUp, TrendingDown, CalendarDays, Calendar, Search, StickyNote,

  Pencil, ChevronDown, ChevronUp, AlertTriangle, Zap, Eye, Clock, Printer, Wallet, Building, Globe, ShoppingBag, CreditCard, PenTool, ClipboardList,
  FileText, Package, Utensils,

  UserMinus, ExternalLink, CheckCircle2, AlertCircle, Calculator

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
        <div className="rpc-info-group">
          <div className="rpc-date-block">
            <Calendar size={18} style={{ color: '#94a3b8', marginTop: '2px' }} />
            <div className="rpc-date-text">
              <span className="rpc-date-main">
                {new Date(report.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              <div className="rpc-user-tag">
                <User size={12} strokeWidth={3} />
                ADMIN: {adminName}
              </div>
            </div>
          </div>
          <div className="rpc-time-pill">
            {new Date(report.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }).replace('a. m.', 'a.m.').replace('p. m.', 'p.m.')}
          </div>
        </div>
        
        <div className="rpc-metrics-summary">
          <div className="rpc-m-item">
            <span className="rpc-m-label">VENTAS TOTALES</span>
            <span className="rpc-m-val">{formatCurrency(grandTotalSales)}</span>
          </div>
          <div className="rpc-m-item">
            <span className="rpc-m-label">BALANCE NETO</span>
            <span className="rpc-m-val net">{formatCurrency(netBalance)}</span>
          </div>
          <div className={`rpc-chevron-wrap ${expanded ? 'rotated' : ''}`}>
            <ChevronDown size={16} strokeWidth={3} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="rpc-details fade-in">
          <div className="rpc-section">
            <h5><LayoutGrid size={16} /> UNIDADES DE NEGOCIO</h5>
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
              <div className="rpc-metric-card highlight-green">
                <span className="rpc-metric-label">Total Propinas</span>
                <span className="rpc-metric-value" style={{ color: '#10b981' }}>{formatCurrency(totalTips)}</span>
              </div>
            </div>
          </div>

          <div className="rpc-section">
            <h5><Wallet size={16} /> MÉTODOS DE PAGO</h5>
            <div className="rpc-methods-grid">
               <div className="rpc-method-row">
                 <div className="rpc-method-icon cash">
                   <Wallet size={18} />
                 </div>
                 <div className="rpc-method-content">
                   <span className="rm-name">Efectivo</span>
                   <span className="rm-base">{formatCurrency(report.cash_income || 0)}</span>
                   {Number(report.cash_tips || 0) > 0 && (
                     <span className="rm-tip">+{formatCurrency(report.cash_tips || 0)}</span>
                   )}
                 </div>
               </div>
               <div className="rpc-method-row">
                 <div className="rpc-method-icon card">
                   <Printer size={18} />
                 </div>
                 <div className="rpc-method-content">
                   <span className="rm-name">Tarjetas / TC</span>
                   <span className="rm-base">{formatCurrency((report.card_income || 0) + (report.card_tips || 0) + (report.debit_tips || 0) + (report.credit_tips || 0))}</span>
                 </div>
               </div>
               <div className="rpc-method-row">
                 <div className="rpc-method-icon transfer">
                   <Building size={18} />
                 </div>
                 <div className="rpc-method-content">
                   <span className="rm-name">Transferencia</span>
                   <span className="rm-base">{formatCurrency((report.transfer_income || 0) + (report.transfer_tips || 0))}</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="rpc-section">
            <h5><Check size={16} /> RESUMEN DE ENTREGA FINAL</h5>
            <div className="rpc-handover-panel">
              <div className="rpc-h-item">
                <span className="rpc-h-label">EFECTIVO A ENTREGAR</span>
                <span className="rpc-h-val">{formatCurrency(hCash)}</span>
              </div>
              <div className="rpc-h-item">
                <span className="rpc-h-label">DÓLARES (CONVERTIDOS)</span>
                <span className="rpc-h-val">{formatCurrency(hDollars)}</span>
              </div>
              <div className="rpc-h-item">
                <span className="rpc-h-label">TARJETAS (TC)</span>
                <span className="rpc-h-val">{formatCurrency(hCard)}</span>
              </div>
              <div className="rpc-h-item total">
                <span className="rpc-h-label">ENTREGA TOTAL</span>
                <span className="rpc-h-val total-val">{formatCurrency(hTotal)}</span>
              </div>
            </div>
          </div>

          {report.expenses_list?.length > 0 && (
            <div className="rpc-section">
              <h5><TrendingDown size={16} /> GASTOS REGISTRADOS</h5>
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

          <div className="rpc-actions">
            <button className="rpc-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}>
              <Trash2 size={16} /> Eliminar Reporte de Historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FORM i18n ────────────────────────────────────────────
const FORM_I18N: Record<string, {
  flag: string; label: string;
  title: string; subtitle: string;
  guestInfo: string; stayDetails: string; idPhoto: string; signature: string;
  fullName: string; fullNamePh: string;
  nationality: string; nationalityPh: string;
  email: string; emailPh: string;
  phone: string; phonePh: string;
  city: string; cityPh: string;
  country: string; countryPh: string;
  address: string; addressPh: string;
  room: string; roomNum: string; roomNumPh: string; source: string; pax: string;
  arrival: string; departure: string; nights: string; price: string;
  captureDoc: string; useCamera: string; uploadFile: string; formats: string;
  capCenter: string; cancel: string; capture: string; photoOk: string; retake: string;
  clearSig: string; finalize: string;
}> = {
  es: {
    flag: '🇲🇽', label: 'Español',
    title: 'Registro de Huésped', subtitle: 'Complete la información para finalizar el check-in',
    guestInfo: 'Información del Huésped', stayDetails: 'Detalles de la Estancia',
    idPhoto: 'Foto de Identificación Oficial / Pasaporte', signature: 'Firma Digital del Huésped',
    fullName: 'Nombre Completo', fullNamePh: 'Nombre como aparece en ID',
    nationality: 'Nacionalidad', nationalityPh: 'Seleccionar país...',
    email: 'E-mail', emailPh: 'correo@ejemplo.com',
    phone: 'Celular / Teléfono', phonePh: 'Número sin código',
    city: 'Ciudad', cityPh: 'Ciudad de origen',
    country: 'País', countryPh: 'Seleccionar país...',
    address: 'Dirección', addressPh: 'Calle, número, colonia...',
    room: 'Habitación Asignada', roomNum: 'No. de Habitación', roomNumPh: 'Seleccionar...', source: 'Origen de Reserva', pax: 'PAX (Cantidad de personas)',
    arrival: 'Fecha de Llegada', departure: 'Fecha de Salida', nights: 'Noches', price: 'Precio de Estancia',
    captureDoc: 'Captura una foto clara del documento', useCamera: '📸 Usar Cámara', uploadFile: '📁 Subir Archivo',
    formats: 'Formatos aceptados: JPG, PNG, PDF | Calidad mínima recomendada: 720p',
    capCenter: 'Centra el documento dentro del recuadro', cancel: 'Cancelar', capture: '📸 Capturar',
    photoOk: '✅ Foto capturada', retake: '🔄 Retomar', clearSig: 'Limpiar Firma', finalize: 'Finalizar Registro',
  },
  en: {
    flag: '🇺🇸', label: 'English',
    title: 'Guest Registration', subtitle: 'Complete the information to finalize check-in',
    guestInfo: 'Guest Information', stayDetails: 'Stay Details',
    idPhoto: 'Official ID / Passport Photo', signature: 'Guest Digital Signature',
    fullName: 'Full Name', fullNamePh: 'Name as shown on ID',
    nationality: 'Nationality', nationalityPh: 'Select country...',
    email: 'E-mail', emailPh: 'email@example.com',
    phone: 'Mobile / Phone', phonePh: 'Number without code',
    city: 'City', cityPh: 'City of origin',
    country: 'Country', countryPh: 'Select country...',
    address: 'Address', addressPh: 'Street, number, neighborhood...',
    room: 'Assigned Room', roomNum: 'Room Number', roomNumPh: 'Select...', source: 'Booking Source', pax: 'PAX (Number of guests)',
    arrival: 'Arrival Date', departure: 'Departure Date', nights: 'Nights', price: 'Stay Price',
    captureDoc: 'Capture a clear photo of the document', useCamera: '📸 Use Camera', uploadFile: '📁 Upload File',
    formats: 'Accepted formats: JPG, PNG, PDF | Minimum recommended quality: 720p',
    capCenter: 'Center the document within the frame', cancel: 'Cancel', capture: '📸 Capture',
    photoOk: '✅ Photo captured', retake: '🔄 Retake', clearSig: 'Clear Signature', finalize: 'Finalize Registration',
  },
  fr: {
    flag: '🇫🇷', label: 'Français',
    title: 'Enregistrement du client', subtitle: 'Complétez les informations pour finaliser le check-in',
    guestInfo: 'Informations du client', stayDetails: 'Détails du séjour',
    idPhoto: 'Photo de pièce d\'identité / Passeport', signature: 'Signature numérique du client',
    fullName: 'Nom complet', fullNamePh: 'Nom tel qu\'il apparaît sur la pièce d\'identité',
    nationality: 'Nationalité', nationalityPh: 'Sélectionner un pays...',
    email: 'E-mail', emailPh: 'email@exemple.com',
    phone: 'Mobile / Téléphone', phonePh: 'Numéro sans indicatif',
    city: 'Ville', cityPh: 'Ville d\'origine',
    country: 'Pays', countryPh: 'Sélectionner un pays...',
    address: 'Adresse', addressPh: 'Rue, numéro, quartier...',
    room: 'Chambre assignée', roomNum: 'Numéro de chambre', roomNumPh: 'Sélectionner...', source: 'Origine de la réservation', pax: 'PAX (Nombre de personnes)',
    arrival: 'Date d\'arrivée', departure: 'Date de départ', nights: 'Nuits', price: 'Prix du séjour',
    captureDoc: 'Prenez une photo nette du document', useCamera: '📸 Utiliser la caméra', uploadFile: '📁 Téléverser un fichier',
    formats: 'Formats acceptés : JPG, PNG, PDF | Qualité minimale recommandée : 720p',
    capCenter: 'Centrez le document dans le cadre', cancel: 'Annuler', capture: '📸 Capturer',
    photoOk: '✅ Photo capturée', retake: '🔄 Reprendre', clearSig: 'Effacer la signature', finalize: 'Finaliser l\'enregistrement',
  }
};


// ─── IdPhotoCapture component ─────────────────────────────

function IdPhotoCapture({ idPhoto, onChange, t }: { idPhoto: string; onChange: (photo: string) => void; t: typeof FORM_I18N['es'] }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [camMode, setCamMode] = React.useState<'idle'|'live'|'done'>(idPhoto ? 'done' : 'idle');
  const [stream, setStream] = React.useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(s);
      setCamMode('live');
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      }, 100);
    } catch {
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onChange(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCamMode('done');
  };

  const retakePhoto = () => {
    onChange('');
    setCamMode('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      onChange(ev.target?.result as string);
      setCamMode('done');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="checkin-section-title" style={{ marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        {t.idPhoto}
      </div>

      {camMode === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569', fontWeight: 600 }}>{t.captureDoc}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={startCamera}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                {t.useCamera}
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.uploadFile}
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{t.formats}</p>
        </div>
      )}

      {camMode === 'live' && (
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '75%', height: '55%', border: '2.5px dashed rgba(255,255,255,0.7)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
          </div>
          <p style={{ position: 'absolute', bottom: 60, width: '100%', textAlign: 'center', margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{t.capCenter}</p>
          <div style={{ position: 'absolute', bottom: 12, width: '100%', display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setCamMode('idle'); }}
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {t.cancel}
            </button>
            <button onClick={capturePhoto}
              style={{ background: '#fff', color: '#1e293b', border: 'none', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              {t.capture}
            </button>
          </div>
        </div>
      )}

      {camMode === 'done' && idPhoto && (
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '2px solid #86efac' }}>
          <img src={idPhoto} alt="ID capturada" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
            <div style={{ background: '#22c55e', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>{t.photoOk}</div>
            <button onClick={retakePhoto}
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {t.retake}
            </button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment"
        style={{ display: 'none' }} onChange={handleFileChange} />
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
    createOrderForTable, addItemToOrder, removeItem, markItemDone, markTableDone, updateItemNotes, markItemsPrinted,
    checkoutTable, confirmPayment, cancelTable, addExpense,
    toggleMenuItem, toggleMenuVariant,
    updateMenuItem, updateMenuVariant, updateCategory,
    addCategory, addMenuItem, addMenuVariant,
    addTable, updateTable, deleteTable, deleteMenuItem,
    addUser, deleteUser, updateUser, closeSession,
    closeDay, deleteShiftSummary, logPrintedTicket,
    addHotelSale, deleteHotelSale, updateHotelSale, exchangeRate,
    pendingTickets, markTicketPrinted, deleteTicket, deleteClosedOrder, fetchTodayTotals,
    createDeliveryOrder, registrations, fetchRegistrations, deleteRegistration, rectificarCuenta,
    updateExpense, deleteExpense, revertHotelSaleByReservation
  } = useSupabaseSync();

  // UI state
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: 'Administrador' | 'Staff' | 'Encargado' } | null>({
    id: 'default-admin', name: 'Administrador', role: 'Administrador'
  });

  const [currentView, setCurrentView] = useState<'home' | 'salon' | 'pedidos' | 'impresora' | 'admin' | 'mesa' | 'checkout' | 'checkin' | 'registros' | 'control-financiero'>('home');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [adminSubView, setAdminSubView] = useState<'main' | 'menu' | 'users' | 'tables' | 'stats'>('main');
  const [expandedAdminCategories, setExpandedAdminCategories] = useState<Set<string>>(new Set());
  
  const toggleAdminCategory = (category: string) => {
    setExpandedAdminCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };
  const [statsSubView, setStatsSubView] = useState<'history' | 'analytics'>('history');
  const [analyticsFilter, setAnalyticsFilter] = useState<'day' | 'month' | 'total'>('day');
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [deleteRegistrationId, setDeleteRegistrationId] = useState<string | null>(null);
  const [showPosExpenseModal, setShowPosExpenseModal] = useState(false);
  const [posExpenseDesc, setPosExpenseDesc] = useState('');
  const [posExpenseAmount, setPosExpenseAmount] = useState('');
  // Records modals
  const [showHotelSalesModal, setShowHotelSalesModal] = useState(false);
  const [showGastosModal, setShowGastosModal] = useState(false);
  const [showRestaurantSalesModal, setShowRestaurantSalesModal] = useState(false);
  const [editingHotelSale, setEditingHotelSale] = useState<any | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editHotelForm, setEditHotelForm] = useState({ amount: '', currency: 'MXN', payment_method: 'efectivo', note: '' });
  const [editExpenseForm, setEditExpenseForm] = useState({ amount: '', concept: '', detail: '' });
  const [contractLang, setContractLang] = useState<string>('es');
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const showIosButton = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as any).standalone;

  // Checkout & Discount State
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'amount'>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [tipPercent, setTipPercent] = useState('none');
  const [customTip, setCustomTip] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);
  const [expandedPedidos, setExpandedPedidos] = useState<number[]>([]);

  const [upcomingCheckins, setUpcomingCheckins] = useState<Reservation[]>([]);
  const [hoveredPagadoId, setHoveredPagadoId] = useState<number | null>(null);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [checkinsError, setCheckinsError] = useState('');
  const [isProximosExpanded, setIsProximosExpanded] = useState(false);
  const [isEnCasaExpanded, setIsEnCasaExpanded] = useState(true);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState<any>(null);
  const [contractViewLang, setContractViewLang] = useState<string>('es');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [registroSourceFilter, setRegistroSourceFilter] = useState('Todos');
  const [registroDateFilter, setRegistroDateFilter] = useState('Todos');

  // Modal de Reasignar Habitación
  const [showRoomAssignModal, setShowRoomAssignModal] = useState(false);
  const [roomAssignData, setRoomAssignData] = useState<{
    registrationId?: string;
    hostawayReservationId?: number;
    currentRoom?: string;
    guestName?: string;
  }>({});

  // Estados para Nueva Reserva
  const [showNewResModal, setShowNewResModal] = useState(false);
  const [showHotelPaymentModal, setShowHotelPaymentModal] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState<{
    isOpen: boolean;
    guestName: string;
    amount: number;
    currency: string;
    hostawayLink: string;
    method: string;
  } | null>(null);
  const [hotelPaymentForm, setHotelPaymentForm] = useState({
    reservationId: 0,
    guestName: '',
    roomName: '',
    roomNumber: '',
    amount: 0,
    currency: 'USD',
    method: 'cash',
    title: 'Pago en recepción',
    description: '',
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
    registrationId: '',
    name: '', nationality: '', homeAddress: '', phone: '', city: '', country: '', email: '',
    roomName: '', roomNumber: '', arrivalDate: '', departureDate: '', nights: 0, pax: 1, price: 0, currency: 'USD', paymentStatus: 'Por Pagar', source: '', signature: '', idPhoto: ''
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
      const validViews = ['home', 'salon', 'pedidos', 'impresora', 'admin', 'mesa', 'checkout', 'checkin', 'control-financiero'];
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

  const fetchCheckinsSilently = useCallback(async () => {
    try {
      const data = await getUpcomingCheckins();
      const uniqueReservations = Array.from(
        new Map(data.map((res: any) => [res.id, res])).values()
      );
      setUpcomingCheckins(uniqueReservations as Reservation[]);
    } catch (err) {
      console.error('Error fetching checkins:', err);
    }
  }, []);

  const hotelChannelRef = useRef<any>(null);

  useEffect(() => {
    if (currentView === 'checkin') {
      setIsLoadingCheckins(true);
      setCheckinsError('');
      fetchCheckinsSilently().finally(() => {
        setIsLoadingCheckins(false);
      });
    }

    // Set up broadcast listener for realtime sync across devices
    const channel = supabase.channel('hotel-events');
    channel.on('broadcast', { event: 'refresh_reservations' }, () => {
      if (currentView === 'checkin') {
        fetchCheckinsSilently();
      }
    });
    channel.subscribe();
    hotelChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      hotelChannelRef.current = null;
    };
  }, [currentView, fetchCheckinsSilently]);

  const notifyReservationChange = useCallback(() => {
    if (hotelChannelRef.current) {
      hotelChannelRef.current.send({
        type: 'broadcast',
        event: 'refresh_reservations',
        payload: { timestamp: Date.now() }
      });
    }
  }, []);

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
      const listings = data || [];
      listings.sort((a: any, b: any) => {
        const isLoftA = a.name?.toLowerCase().includes('loft');
        const isLoftB = b.name?.toLowerCase().includes('loft');
        if (isLoftA && !isLoftB) return -1;
        if (!isLoftA && isLoftB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setAvailableListings(listings);
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
    if (isSubmittingPayment) return;
    if (!hotelPaymentForm.hostaway_reservation_id) {
      alert('❌ No hay reserva de Hostaway asociada.');
      return;
    }
    if (hotelPaymentForm.amount === undefined || hotelPaymentForm.amount === null || hotelPaymentForm.amount < 0) {
      alert('❌ Ingresa un monto válido (puede ser 0 para cortesías).');
      return;
    }

    setIsSubmittingPayment(true);

    // Step 1: Register payment note in Hostaway (writes [PAID] to hostNote)
    try {
      await updateReservationStatus(
        hotelPaymentForm.hostaway_reservation_id,
        undefined, // status
        undefined, // noShow
        'host',    // cancelledBy
        true       // isPaid
      );
    } catch (hwErr: any) {
      alert(`❌ Error al registrar en Hostaway: ${hwErr.message}`);
      setIsSubmittingPayment(false);
      return;
    }

    // Step 2: Register locally for Ventas Hotel reporting
    try {
      // Normalize Hostaway method codes to internal values used by fetchTodayTotals
      const methodMap: Record<string, string> = {
        'cash': 'efectivo',
        'creditCard': 'tarjeta',
        'bankTransfer': 'transferencia',
        'check': 'cheque',
        'paypal': 'paypal',
        'paymentLink': 'pago_online',
      };
      const normalizedMethod = methodMap[hotelPaymentForm.method] || hotelPaymentForm.method;
      await addHotelSale(hotelPaymentForm.amount, hotelPaymentForm.currency, normalizedMethod, hotelPaymentForm.hostaway_reservation_id, hotelPaymentForm.guestName, hotelPaymentForm.roomName, hotelPaymentForm.roomNumber || undefined);
      await fetchTodayTotals();
    } catch (localErr: any) {
      console.warn('Local sale record failed:', localErr.message);
    }

    // Step 3: Update local state immediately so badge switches to "Pagado"
    setUpcomingCheckins(prev => prev.map(r =>
      String(r.id) === String(hotelPaymentForm.hostaway_reservation_id)
        ? { ...r, isPaid: true, paymentStatus: 'Pagado' }
        : r
    ));

    const hostawayLink = `https://dashboard.hostaway.com/reservations/${hotelPaymentForm.hostaway_reservation_id}`;

    setShowHotelPaymentModal(false);
    fetchRegistrations();

    // Show success modal with Hostaway link
    setPaymentSuccessModal({
      isOpen: true,
      guestName: hotelPaymentForm.guestName,
      amount: hotelPaymentForm.amount,
      currency: hotelPaymentForm.currency,
      hostawayLink,
      method: hotelPaymentForm.method
    });

    // Refresh from Hostaway after 2.5s and notify other devices
    setTimeout(() => {
      getUpcomingCheckins().then(data => {
        const uniqueReservations = Array.from(
          new Map(data.map((res: any) => [res.id, res])).values()
        );
        setUpcomingCheckins(uniqueReservations as Reservation[]);
      });
      notifyReservationChange();
      setIsSubmittingPayment(false);
    }, 2500);
  };

  const handleRevertPagado = async (hostawayReservationId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres revertir el pago a "No pagado"? Esto borrará el registro en "Ventas Hotel" y quitará la marca de "Pagado" en Hostaway.')) {
      return;
    }
    
    try {
      // 1. Update Hostaway API (isPaid: false)
      await updateReservationStatus(hostawayReservationId, undefined, undefined, undefined, false);
      
      // 2. Revert local Hotel Sale
      await revertHotelSaleByReservation(hostawayReservationId);
      
      // 3. Update local state immediately
      setUpcomingCheckins(prev => prev.map(r =>
        String(r.id) === String(hostawayReservationId)
          ? { ...r, isPaid: false, paymentStatus: 'Por Pagar' }
          : r
      ));
      
      alert('Pago revertido con éxito.');
      fetchRegistrations();
      notifyReservationChange();
      
    } catch (err: any) {
      alert(`❌ Error al revertir el pago: ${err.message}`);
    }
  };

  const handleCreateReservation = async () => {
    if (!newResForm.listingId) return;

    // ── Validación de campos obligatorios ───────────────────────────────
    const missing: string[] = [];
    if (!newResForm.guestFirstName.trim()) missing.push('Nombre');
    if (!newResForm.guestLastName.trim()) missing.push('Apellido');
    const phoneNumber = (() => {
      const prefixMatch = (window as any).__COUNTRY_CODES__?.find?.((c: any) => newResForm.guestPhone.startsWith(c.code));
      return prefixMatch ? newResForm.guestPhone.substring(prefixMatch.code.length).trim() : newResForm.guestPhone.trim();
    })();
    if (!newResForm.guestPhone.trim() || newResForm.guestPhone.replace(/\D/g,'').length < 7) missing.push('Teléfono');
    if (!newResForm.guestNationality) missing.push('Nacionalidad');
    if (!newResForm.arrivalDate) missing.push('Fecha de Check-in');
    if (!newResForm.departureDate) missing.push('Fecha de Check-out');
    if (missing.length > 0) {
      alert(`❌ Completa los campos obligatorios:\n\n• ${missing.join('\n• ')}`);
      return;
    }

    setIsCreatingRes(true);
    try {
      const selectedListing = availableListings.find(l => String(l.id) === String(newResForm.listingId));
      if (!selectedListing) throw new Error("Debes seleccionar una habitación.");

      const arrival = new Date(`${newResForm.arrivalDate}T00:00:00`);
      const departure = new Date(`${newResForm.departureDate}T00:00:00`);
      const timeDiff = departure.getTime() - arrival.getTime();
      const nights = Math.max(1, Math.round(timeDiff / (1000 * 3600 * 24)));

      const totalAmount = newResForm.useCustomPrice
        ? parseFloat(newResForm.customPrice)
        : selectedListing.basePrice * nights;

      // Precio y moneda: precio personalizado tiene prioridad
      const currency = newResForm.useCustomPrice ? newResForm.priceCurrency : selectedListing.currency;
      const guestName = `${newResForm.guestFirstName} ${newResForm.guestLastName}`.trim();

      // ── Sanitize email: Hostaway requires a valid format with TLD ──────────
      const rawEmail = (newResForm.guestEmail || '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const safeEmail = emailRegex.test(rawEmail) ? rawEmail : 'noemail@galloazul.com';

      const params = {
        channelId: 2000,
        listingMapId: parseInt(newResForm.listingId),
        arrivalDate: newResForm.arrivalDate,
        departureDate: newResForm.departureDate,
        guestName,
        guestFirstName: newResForm.guestFirstName,
        guestLastName: newResForm.guestLastName,
        guestEmail: safeEmail,
        guestCity: newResForm.guestCity,
        guestCountry: newResForm.guestNationality,
        phone: newResForm.guestPhone,
        totalPrice: totalAmount,  // precio correcto (base o personalizado)
        currency,                 // moneda correcta
        isPaid: newResForm.isPaid ? 1 : 0,
        paymentStatus: newResForm.isPaid ? 'paid' : 'unpaid',
        paidAmount: newResForm.isPaid ? totalAmount : 0,
        hostNote: '',             // la nota de pago la escribe n8n si isPaid
        numberOfGuests: 1,
        adults: 1
      };

      const res = await createReservation(params);
      if (res?.status === 'failed' || !res?.result?.id) {
        throw new Error(`Hostaway rechazó la reserva: ${JSON.stringify(res)}`);
      }
      const newResId = res.result.id;

      // ── Paso 1: Pago via n8n (mismo flujo que registro manual) ────────────
      if (newResForm.isPaid) {
        const methodMap: Record<string, string> = {
          'cash': 'efectivo',
          'creditCard': 'tarjeta',
          'bankTransfer': 'transferencia',
          'check': 'cheque',
          'paypal': 'paypal',
          'paymentLink': 'pago_online',
          'otaPayment': 'ota',
        };
        const normalizedMethod = methodMap[newResForm.transactionMethod] || newResForm.transactionMethod;
        try { await addHotelSale(totalAmount, currency, normalizedMethod, newResId, guestName, selectedListing.name || 'Habitación'); }
        catch (saleErr) { console.warn('Local sale record failed:', saleErr); }

        // Mark as [PAID] in Hostaway (same flow as handleHotelPaymentSubmit)
        try {
          await updateReservationStatus(
            newResId,
            undefined,  // status
            undefined,  // noShow
            'host',     // cancelledBy
            true        // isPaid
          );
        } catch (hwPayErr) { console.warn('Hostaway isPaid update failed:', hwPayErr); }

        try {
          await addTransaction(newResId, {
            title: 'Pago Inicial',
            description: newResForm.transactionDescription || 'Pago al crear reserva directa',
            amount: totalAmount,
            currency,
            paymentMethod: newResForm.transactionMethod || 'cash'
          });
        } catch (txErr) { console.warn('n8n payment note failed:', txErr); }
      }

      // ── Paso 2: Check-in de hoy → registro local → pasa a "En Casa" ───────
      // La reserva queda en "Llegadas de hoy" para que recepción haga el check-in con firma.

      // ── Paso 3: Actualizar lista de Hostaway ──────────────────────────────
      // Actualización optimista para evitar retrasos de caché de la API de Hostaway
      const optimisticRes = {
        id: newResId,
        guestName: guestName,
        guestEmail: safeEmail,
        guestPhone: newResForm.guestPhone,
        guestCountry: newResForm.guestNationality,
        guestCity: newResForm.guestCity,
        guestAddress: '',
        totalAmount: totalAmount,
        currency: currency,
        paymentStatus: newResForm.isPaid ? 'Pagado' : 'Por Pagar',
        isPaid: newResForm.isPaid,
        roomName: selectedListing?.name || 'Habitación',
        arrivalDate: newResForm.arrivalDate,
        departureDate: newResForm.departureDate,
        nights: nights,
        status: 'new',
        adults: 1,
        children: 0,
        sourceName: 'direct',
        channelName: 'direct',
        listingMapId: Number(newResForm.listingId)
      };
      setUpcomingCheckins(prev => [optimisticRes, ...prev]);

      // También lanzamos la petición real en background
      getUpcomingCheckins().then(data => {
        const uniqueReservations = Array.from(
          new Map(data.map((res: any) => [res.id, res])).values()
        );
        setUpcomingCheckins(uniqueReservations as Reservation[]);
        notifyReservationChange();
      });
      if (newResForm.isPaid) {
        await fetchTodayTotals();
      }
      setShowNewResModal(false);
      setNewResForm({
        guestFirstName: '', guestLastName: '', guestPhone: '', guestEmail: '', guestNationality: '', guestCity: '',
        arrivalDate: '', departureDate: '', listingId: '', customPrice: '', priceCurrency: 'USD',
        useCustomPrice: false, isPaid: false, transactionMethod: 'cash', transactionDescription: '',
        adults: 1, children: 0
      });

      // ── Paso 4: Feedback ─────────────────────────────────────────────────
      if (newResForm.isPaid) {
        setPaymentSuccessModal({
          isOpen: true,
          guestName,
          amount: totalAmount,
          currency,
          hostawayLink: `https://dashboard.hostaway.com/reservations/${newResId}`,
          method: newResForm.transactionMethod || 'cash'
        });
      } else {
        alert(`✅ Reserva creada en Hostaway.\n\n👤 ${guestName}\n📅 ${newResForm.arrivalDate} → ${newResForm.departureDate}`);
      }

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
  const [hotelGuestName, setHotelGuestName] = useState('');
  const [hotelRoomName, setHotelRoomName] = useState('');
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
    if (paymentMethod !== 'efectivo') {
      if (tipPercent === 'Otro') {
        tipVal = parseFloat(customTip) || 0;
      } else if (tipPercent !== 'none') {
        const p = parseFloat(tipPercent);
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
  const [showCierreConfirm, setShowCierreConfirm] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [overrideCashTips, setOverrideCashTips] = useState<string>('');
  const [isEditingCashTips, setIsEditingCashTips] = useState<boolean>(false);
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
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [deliveryConfirmTable, setDeliveryConfirmTable] = useState<number | null>(null);

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
          {/* ── Title row ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div className="admin-welcome" style={{ margin: 0 }}>
              <h1>Panel de Administración</h1>
              <p style={{ margin: 0 }}>{mexicoDate} • {mexicoTime}</p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              padding: '7px 16px',
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

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

          {/* ── Stats grid ── */}
          <div className="admin-stats-summary">
            <div className="admin-stat-pill" style={{ cursor: 'pointer' }}>
              <span className="label">Ventas restaurante</span>
              <span className="value">{formatCurrency(todayIncome)}</span>
              <button
                onClick={() => setShowRestaurantSalesModal(true)}
                style={{ marginTop: 8, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)', padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}
              >Ver registros →</button>
            </div>
            <div className="admin-stat-pill" style={{ cursor: 'pointer' }}>
              <span className="label">Ventas hotel</span>
              <span className="value">{formatCurrency(hotelCardSales + hotelCashSales)}</span>
              <button
                onClick={() => setShowHotelSalesModal(true)}
                style={{ marginTop: 8, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.25)', padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}
              >Ver registros →</button>
            </div>

            <div className="admin-stat-pill" style={{ gridColumn: '1 / -1', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="label" style={{ marginBottom: 0, fontSize: '12px', color: '#94a3b8' }}>Ventas Totales</span>
              <span className="value" style={{ fontSize: '20px', color: '#f8fafc', marginBottom: 0 }}>{formatCurrency(todayIncome + hotelCardSales + hotelCashSales)}</span>
            </div>
            <div className="admin-stat-pill">
              <span className="label">Fondo (caja chica)</span>
              <span className="value">{formatCurrency(pettyCashInitial - todayExpenses)}</span>
            </div>
            <div className="admin-stat-pill" style={{ cursor: 'pointer' }}>
              <span className="label">Gastos</span>
              <span className="value">{formatCurrency(todayExpenses)}</span>
              <button
                onClick={() => setShowGastosModal(true)}
                style={{ marginTop: 8, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%' }}
              >Ver registros →</button>
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
    const groupedMenu = adminMenuItems.reduce((acc, item) => {
      const cat = item.category || 'Sin Categoría';
      let mainCat = cat;
      let subCat = '';

      if (cat.includes(':')) {
        const parts = cat.split(':');
        mainCat = parts[0].trim();
        subCat = parts.slice(1).join(':').trim();
      }

      if (!acc[mainCat]) {
        acc[mainCat] = { items: [], subcategories: {} };
      }

      if (subCat) {
        if (!acc[mainCat].subcategories[subCat]) {
          acc[mainCat].subcategories[subCat] = [];
        }
        acc[mainCat].subcategories[subCat].push(item);
      } else {
        acc[mainCat].items.push(item);
      }

      return acc;
    }, {} as Record<string, { items: MenuItem[], subcategories: Record<string, MenuItem[]> }>);

    const renderAdminMenuItem = (item: MenuItem) => {
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
              <button className="btn-icon" style={{ background: '#fff1f2', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if(window.confirm('¿Eliminar producto permanentemente?')) deleteMenuItem(item.id); }}><Trash2 size={18} color="#e11d48" /></button>
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
    };

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
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>
          {adminMenuItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ background: 'white', display: 'inline-flex', padding: '16px', borderRadius: '50%', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Search size={32} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)' }}>No se encontraron platillos</h3>
              <p style={{ marginTop: '8px', fontSize: '15px' }}>Intenta con otro término de búsqueda o agrega un nuevo item.</p>
            </div>
          ) : (
            Object.entries(groupedMenu)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([mainCategory, mainGroup]) => {
                const isMainExpanded = expandedAdminCategories.has(mainCategory);

                return (
                  <div key={mainCategory} style={{ marginBottom: '8px' }}>
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '16px', 
                        borderBottom: '2px solid #e2e8f0', 
                        paddingBottom: '8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleAdminCategory(mainCategory)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn-icon" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          {isMainExpanded ? <ChevronUp size={18} color="var(--primary-dark)" /> : <ChevronDown size={18} color="var(--primary-dark)" />}
                        </button>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {mainCategory}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* We don't have a categoryId for the generic mainCategory since it's just a prefix, but we could allow editing if we wanted */}
                      </div>
                    </div>
                    
                    {isMainExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: Object.keys(mainGroup.subcategories).length > 0 ? '16px' : '0' }}>
                        {mainGroup.items.map(item => renderAdminMenuItem(item))}

                        {Object.entries(mainGroup.subcategories)
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([subCategory, items]) => {
                            const fullCategoryName = `${mainCategory}: ${subCategory}`;
                            const isSubExpanded = expandedAdminCategories.has(fullCategoryName);
                            const categoryId = items[0]?.categoryId;
                            
                            return (
                              <div key={subCategory} style={{ marginBottom: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: isSubExpanded ? '16px' : '0', 
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => toggleAdminCategory(fullCategoryName)}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button className="btn-icon" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                                      {isSubExpanded ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
                                    </button>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                                      {subCategory}
                                    </h4>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    {categoryId && (
                                      <button 
                                        className="btn-icon" 
                                        onClick={(e) => { e.stopPropagation(); openEditCategory(categoryId, fullCategoryName); }}
                                        style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      >
                                        <Pencil size={14} color="var(--text-dark)" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {isSubExpanded && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {items.map(item => renderAdminMenuItem(item))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })
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

  const renderAdminTables = () => {
    return (
      <div className="fade-in admin-tables-view">
        <div className="admin-menu-header" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, flex: 1, color: '#0f172a' }}>Configuración de Mesas</h3>
          <button className="btn-primary" style={{ width: 'auto', padding: '0 20px', height: '48px', whiteSpace: 'nowrap', borderRadius: '14px' }} onClick={handleAdminAddTable}>
            <Plus size={18} /> Agregar Mesa
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
          {tables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              No hay mesas configuradas.
            </div>
          ) : (
            Object.entries(
              tables.reduce((acc, table) => {
                const cat = table.category || 'Sin Sector';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(table);
                return acc;
              }, {} as Record<string, typeof tables[0][]>)
            ).sort((a, b) => a[0].localeCompare(b[0])).map(([category, catTables]) => {
              return (
                <div key={category} style={{ marginBottom: '8px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '16px', 
                      borderBottom: '2px solid #e2e8f0', 
                      paddingBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dark)', margin: 0 }}>
                        {category}
                      </h4>
                      <span style={{ fontSize: '12px', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {catTables.length} {catTables.length === 1 ? 'mesa' : 'mesas'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {catTables.sort((a, b) => a.id - b.id).map(table => (
                      <div key={table.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            🪑
                          </div>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{table.name || `Mesa ${table.id}`}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-icon" 
                            style={{ width: '32px', height: '32px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => {
                               const newName = window.prompt('Nuevo nombre para la mesa (ej: "Mesa 1", "Mesa J2", "Hugo"):', table.name || `Mesa ${table.id}`);
                               if (newName !== null) {
                                 const newCat = window.prompt('Nuevo sector (ej: "Salón", "Terraza", "Barra", "Jardín"):', table.category || 'Salón');
                                 if (newCat !== null) {
                                   updateTable(table.id, newName.trim(), newCat.trim());
                                 }
                               }
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            className="btn-icon danger" 
                            style={{ width: '32px', height: '32px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleAdminDeleteTable(table.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
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
          <div className="home-action-btn financial" onClick={() => window.open('/finanzas_corporativas', '_blank')} style={{ gridColumn: 'span 2', marginTop: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white' }}>
            <div className="home-action-icon-wrap" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <TrendingUp size={24} />
            </div>
            <span className="home-action-label" style={{ color: 'white' }}>Control financiero</span>
          </div>
        </div>
      </div>
    );
  };

  const renderControlFinanciero = () => {
    // 1. Occupancy Rate
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    const occupiedRooms = registrations.filter(r => {
      if (!r.room_number) return false;
      const arrival = new Date(r.arrival_date);
      arrival.setHours(0,0,0,0);
      const departure = new Date(r.departure_date);
      departure.setHours(0,0,0,0);
      return arrival.getTime() <= todayTime && departure.getTime() > todayTime;
    });
    const uniqueOccupiedRooms = new Set(occupiedRooms.map(r => r.room_number)).size;
    const occupancyRate = (uniqueOccupiedRooms / 14) * 100;

    // 2. Income by channel
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const thisMonthRegs = registrations.filter(r => {
      const d = new Date(r.created_at || r.arrival_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const incomeByChannel: Record<string, number> = {};
    let totalIncomeThisMonth = 0;
    thisMonthRegs.forEach(r => {
      const source = r.source || 'Directa';
      const amount = Number(r.price) || 0;
      if (!incomeByChannel[source]) incomeByChannel[source] = 0;
      incomeByChannel[source] += amount;
      totalIncomeThisMonth += amount;
    });

    // 3. Expenses this month
    const thisMonthSummaries = dailySummaries.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const expensesThisMonth = thisMonthSummaries.reduce((sum, s) => sum + (Number(s.expenses) || 0), 0) + todayExpenses;

    return (
      <div className="fade-in" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: '#f8fafc', 
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Header/Toolbar */}
        <div style={{ 
          background: 'white', 
          padding: '16px 24px', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
              color: 'white', 
              padding: '8px', 
              borderRadius: '12px' 
            }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Control Financiero</h2>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Dashboard y Reportes Operativos</span>
            </div>
          </div>
          <button 
            onClick={() => setCurrentView('home')}
            style={{ 
              background: '#f1f5f9', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '10px',
              fontSize: 13, 
              fontWeight: 700, 
              color: '#475569', 
              cursor: 'pointer' 
            }}
          >
            Volver al inicio
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Top KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Ocupación */}
              <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tasa de Ocupación</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Día actual</p>
                  </div>
                  <div style={{ background: '#eff6ff', color: '#3b82f6', padding: 8, borderRadius: 10 }}>
                    <Building size={18} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>{occupancyRate.toFixed(0)}%</span>
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>({uniqueOccupiedRooms} / 14 habs)</span>
                </div>
                <div style={{ marginTop: 16, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${occupancyRate}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: 3 }} />
                </div>
              </div>

              {/* Ingresos Mes */}
              <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ingresos Estimados</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Mes actual</p>
                  </div>
                  <div style={{ background: '#ecfdf5', color: '#10b981', padding: 8, borderRadius: 10 }}>
                    <Wallet size={18} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>${totalIncomeThisMonth.toLocaleString('es-MX')}</span>
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>USD</span>
                </div>
              </div>

              {/* Gastos Operativos Mes */}
              <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gastos Operativos</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>Mes actual</p>
                  </div>
                  <div style={{ background: '#fef2f2', color: '#ef4444', padding: 8, borderRadius: 10 }}>
                    <TrendingDown size={18} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>${expensesThisMonth.toLocaleString('es-MX')}</span>
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>MXN</span>
                </div>
              </div>
            </div>

            {/* Gráficas / Reportes detallados */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              
              {/* Income by Channel */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={18} color="#6366f1" />
                  Ingresos por Canal (Mes Actual)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(incomeByChannel).sort((a,b) => b[1]-a[1]).map(([source, amount]) => {
                    const percentage = totalIncomeThisMonth > 0 ? (amount / totalIncomeThisMonth) * 100 : 0;
                    return (
                      <div key={source}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#334155' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#6366f1' }} />
                            {source}
                          </span>
                          <span>${amount.toLocaleString('es-MX')} USD <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>({percentage.toFixed(1)}%)</span></span>
                        </div>
                        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, background: '#6366f1', borderRadius: 3 }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(incomeByChannel).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                      No hay ingresos registrados este mes.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Operational Expenses */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="#ef4444" />
                  Reporte de Gastos Operativos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
                  {todayExpensesList.length > 0 ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Gastos de Hoy</div>
                      {todayExpensesList.map((exp: any) => (
                        <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{exp.concept || 'Sin concepto'}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{exp.detail || 'N/A'}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>
                            -${Number(exp.amount).toLocaleString('es-MX')}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : null}

                  {thisMonthSummaries.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Cierres Históricos (Mes)</div>
                      {thisMonthSummaries.map((s) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 12, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Cierre de Turno</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(s.created_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>
                            -${Number(s.expenses || 0).toLocaleString('es-MX')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {todayExpensesList.length === 0 && thisMonthSummaries.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                      No hay gastos operativos registrados este mes.
                    </div>
                  )}
                </div>
              </div>

            </div>
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
              onClick={() => {
                setNewResForm({
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
                setShowNewResModal(true);
              }}
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
              Venta directa
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
              
              // ─── IDs de reservas que ya tienen ingreso registrado (check-in hecho) ──
              const registeredIds = new Set(
                registrations.map(r => String(r.hostaway_reservation_id))
              );

              // ─── Llegadas de hoy: SOLO las que aún NO han hecho check-in ─────────
              const checkinHoy = upcomingCheckins.filter(res =>
                res.arrivalDate === todayStr && !registeredIds.has(String(res.id))
              );

              // ─── En casa: llegaron antes de hoy Y salen después, MÁS las de hoy ya registradas ─
              const enCasa = upcomingCheckins.filter(res =>
                (res.arrivalDate < todayStr && res.departureDate > todayStr) ||
                (res.arrivalDate === todayStr && registeredIds.has(String(res.id)) && res.departureDate > todayStr)
              ).sort((a, b) => {
                const regA = registrations.find(r => String(r.hostaway_reservation_id) === String(a.id) && r.status !== 'checked_out');
                const regB = registrations.find(r => String(r.hostaway_reservation_id) === String(b.id) && r.status !== 'checked_out');
                const numA = regA?.room_number ? parseInt(regA.room_number) : 999;
                const numB = regB?.room_number ? parseInt(regB.room_number) : 999;
                return numA - numB;
              });

              // ─── Próximos: llegadas en los siguientes 7 días (excluye hoy) ───
              const next7Date = new Date(now);
              next7Date.setDate(next7Date.getDate() + 7);
              const next7Str = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Mazatlan'}).format(next7Date);
              const proximos = upcomingCheckins.filter(res => res.arrivalDate > todayStr && res.arrivalDate <= next7Str);

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
                                      <span 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRevertPagado(reg.hostaway_reservation_id);
                                        }}
                                        style={{ 
                                          background: hoveredPagadoId === reg.hostaway_reservation_id ? '#fecaca' : '#dcfce7', 
                                          color: hoveredPagadoId === reg.hostaway_reservation_id ? '#991b1b' : '#166534', 
                                          padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, 
                                          border: `1px solid ${hoveredPagadoId === reg.hostaway_reservation_id ? '#fca5a5' : '#bbf7d0'}`, 
                                          display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s' 
                                        }}
                                        onMouseEnter={() => setHoveredPagadoId(reg.hostaway_reservation_id)}
                                        onMouseLeave={() => setHoveredPagadoId(null)}
                                      >
                                        {hoveredPagadoId === reg.hostaway_reservation_id ? (
                                          <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                            Revertir
                                          </>
                                        ) : (
                                          <>
                                            <Check size={12} strokeWidth={3} /> Pagado
                                          </>
                                        )}
                                      </span>
                                    ) : (
                                      title === 'En casa / Hospedados' ? (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setHotelPaymentForm({
                                              reservationId: reg.id,
                                              guestName: reg.name || `${reg.first_name || ''} ${reg.last_name || ''}`.trim() || 'Huésped',
                                              roomName: reg.room_name,
                                              roomNumber: reg.room_number ? String(reg.room_number) : '',
                                              amount: res?.totalAmount || 0,
                                              currency: res?.currency || 'USD',
                                              method: 'cash',
                                              title: 'Pago en recepción',
                                              description: '',
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
                                {(() => {
                                  const res = upcomingCheckins.find(r => r.id === reg.hostaway_reservation_id);
                                  if (!res || !res.totalAmount) return null;
                                  return (
                                    <div>
                                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                                          {res.currency} ${res.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        {res.currency === 'USD' && (
                                          <div style={{ fontSize: 11, color: '#64748b' }}>
                                            MXN ${(res.totalAmount * exchangeRate).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 10 }}>(TC: {exchangeRate})</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                               {/* Checkout today: room cleaning banner + button */}
                               {reg.departure_date === todayStr && (
                                 <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff7ed', borderRadius: 12, border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                     <span style={{ fontSize: 16 }}>🛏️</span>
                                     <div>
                                       <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c' }}>Check-out hoy — 12:00</div>
                                       <div style={{ fontSize: 11, color: '#9a3412' }}>Habitación pendiente de limpieza</div>
                                     </div>
                                   </div>
                                   <button
                                     onClick={async (e) => {
                                       e.stopPropagation();
                                       const { error } = await supabase.from('guest_registrations').update({ room_cleaned: true }).eq('id', reg.id);
                                       if (error) { alert('Error: ' + error.message); return; }
                                       await fetchRegistrations();
                                     }}
                                     style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                                   >
                                     ✔ Habitación limpia
                                   </button>
                                 </div>
                               )}

                               {/* Sección de Habitación Asignada y Reasignar */}
                               <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div>
                                   <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Habitación Asignada</div>
                                   <div style={{ fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
                                     {reg.room_number ? (parseInt(reg.room_number) <= 4 ? `Loft ${reg.room_number}` : `Habitación ${reg.room_number}`) : 'Sin asignar'}
                                   </div>
                                 </div>
                                 <button 
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      setRoomAssignData({
                                        registrationId: reg.id,
                                        hostawayReservationId: reg.hostaway_reservation_id,
                                        currentRoom: reg.room_number || '',
                                        guestName: reg.name || 'Huésped'
                                      });
                                      setShowRoomAssignModal(true);
                                   }}
                                   style={{
                                     background: '#fff',
                                     color: '#3b82f6',
                                     border: '1px solid #bfdbfe',
                                     padding: '6px 12px',
                                     borderRadius: '8px',
                                     fontSize: 12,
                                     fontWeight: 600,
                                     cursor: 'pointer',
                                     display: 'flex',
                                     alignItems: 'center',
                                     gap: 6,
                                     boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                   }}
                                 >
                                   <Pencil size={12} /> Reasignar
                                 </button>
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
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                  {res.guestName}
                                </h3>
                                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🛏️</div>
                                  {res.roomName}
                                </div>
                                {res.sourceName && (() => {
                                  const src = (res.sourceName || '').toLowerCase();
                                  const isAirbnb = src.includes('airbnb');
                                  const isBooking = src.includes('booking.com') || (src.includes('booking') && !src.includes('engine') && !src.includes('website'));
                                  const isDirect = src.includes('direct') || src === 'direct';
                                  const isExpedia = src.includes('expedia');
                                  const isVrbo = src.includes('vrbo') || src.includes('homeaway');
                                  const isWebsite = src.includes('engine') || src.includes('website') || src.includes('booking engine');
                                  const label = isAirbnb ? 'Airbnb' : isBooking ? 'Booking.com' : isDirect ? 'Directa' : isExpedia ? 'Expedia' : isVrbo ? 'VRBO' : isWebsite ? 'Website' : res.sourceName;
                                  const icon = isAirbnb ? '🏠' : isBooking ? '🔵' : isDirect ? '🟠' : isExpedia ? '⬛' : isVrbo ? '🏡' : isWebsite ? '🌐' : '🌐';
                                  // Booking.com: Azul | Expedia: Negro | Directa: Naranja | Website: Amarillo | Airbnb: Rojo
                                  const bg     = isAirbnb ? '#fff0f0' : isBooking ? '#eff6ff' : isDirect ? '#fff7ed' : isExpedia ? '#1e293b' : isWebsite ? '#fefce8' : '#f8fafc';
                                  const color  = isAirbnb ? '#dc2626' : isBooking ? '#1d4ed8' : isDirect ? '#ea580c' : isExpedia ? '#f8fafc' : isWebsite ? '#a16207' : '#475569';
                                  const border = isAirbnb ? '#fca5a5' : isBooking ? '#bfdbfe' : isDirect ? '#fed7aa' : isExpedia ? '#334155'  : isWebsite ? '#fef08a' : '#e2e8f0';
                                  return (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '2px 7px' }}>
                                      <span style={{ fontSize: 10 }}>{icon}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                              {/* Status badges column */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                                {res.arrivalDate < todayStr && (
                                  <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #dcfce7' }}>
                                    EN CASA
                                  </span>
                                )}
                                {res.arrivalDate === todayStr && (
                                  <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                                    Check-in Hoy
                                  </span>
                                )}
                                {/* Payment badge — pulled 100% from Hostaway */}
                                {res.isPaid ? (
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevertPagado(res.id);
                                    }}
                                    style={{
                                      background: hoveredPagadoId === res.id ? '#fecaca' : '#dcfce7',
                                      color: hoveredPagadoId === res.id ? '#991b1b' : '#15803d',
                                      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                      border: `1px solid ${hoveredPagadoId === res.id ? '#fca5a5' : '#86efac'}`,
                                      display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={() => setHoveredPagadoId(res.id)}
                                    onMouseLeave={() => setHoveredPagadoId(null)}
                                  >
                                    {hoveredPagadoId === res.id ? (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                        Revertir
                                      </>
                                    ) : (
                                      <>
                                        <Check size={11} strokeWidth={3} /> Pagado
                                      </>
                                    )}
                                  </span>
                                ) : (
                                  <span style={{
                                    background: '#fef3c7', color: '#92400e',
                                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                                    border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 4
                                  }}>
                                    ⚠ Por pagar
                                  </span>
                                )}
                              </div>
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
                              {(() => {
                                const sale = hotelSalesList.find((s: any) => String(s.reservation_id) === String(res.id));
                                const displayAmount = sale ? Number(sale.amount) : res.totalAmount;
                                const displayCurrency = sale ? (sale.currency || 'MXN') : res.currency;
                                const hasSale = !!sale;
                                if (!hasSale && !res.totalAmount) return null;
                                return (
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>Total</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      {displayAmount === 0 ? (
                                        <div style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>🎁 Cortesía</div>
                                      ) : (
                                        <>
                                          <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                                            {displayCurrency} ${displayAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                          {displayCurrency === 'USD' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                                              <div style={{ fontSize: 13, color: '#059669', fontWeight: 800 }}>
                                                MXN ${(displayAmount * exchangeRate).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </div>
                                              <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>
                                                (TC: {exchangeRate})
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>

                            {/* Registrar pago: solo para reservas sin pagar */}
                            {!res.isPaid && (
                              <div style={{ marginTop: 4 }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHotelPaymentForm({
                                      reservationId: res.id,
                                      guestName: res.guestName,
                                      roomName: res.roomName,
                                      roomNumber: '',
                                      amount: res.totalAmount,
                                      currency: res.currency || 'USD',
                                      method: 'cash',
                                      title: 'Pago en recepción',
                                      description: '',
                                      hostaway_reservation_id: res.id
                                    });
                                    setShowHotelPaymentModal(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0',
                                    padding: '8px',
                                    borderRadius: 10,
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <CreditCard size={14} /> Registrar Pago
                                </button>
                              </div>
                            )}

                            {/* Check-in actions and Room Assignment */}
                            {(() => {
                              const reg = registrations.find(
                                r => String(r.hostaway_reservation_id) === String(res.id)
                              );
                              if (reg) {
                                return (
                                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowContractModal(reg);
                                        }}
                                        style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <Check size={14} strokeWidth={3} /> Ingreso registrado
                                      </button>
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Habitación Asignada</div>
                                        <div style={{ fontSize: 16, color: '#0f172a', fontWeight: 800 }}>
                                          {reg.room_number ? (parseInt(reg.room_number) <= 4 ? `Loft ${reg.room_number}` : `Habitación ${reg.room_number}`) : 'Sin asignar'}
                                        </div>
                                      </div>
                                      <button 
                                        onClick={(e) => {
                                           e.stopPropagation();
                                           setRoomAssignData({
                                             registrationId: reg.id,
                                             hostawayReservationId: res.id,
                                             currentRoom: reg.room_number || '',
                                             guestName: reg.name || res.guestName
                                           });
                                           setShowRoomAssignModal(true);
                                        }}
                                        style={{
                                          background: '#fff',
                                          color: '#3b82f6',
                                          border: '1px solid #bfdbfe',
                                          padding: '6px 12px',
                                          borderRadius: '8px',
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}
                                      >
                                        <Pencil size={12} /> Reasignar
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              
                              if (res.arrivalDate === todayStr) {
                                return (
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
                                      Cancelar reserva
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
                                        registrationId: '',
                                        name: res.guestName || '',
                                        nationality: initialCountry,
                                        homeAddress: res.guestAddress || '',
                                        phone: res.guestPhone || (phonePrefix ? `${phonePrefix.code} ` : ''),
                                        city: res.guestCity || '',
                                        country: initialCountry,
                                        email: res.guestEmail || '',
                                        roomName: res.roomName || '',
                                        roomNumber: '',
                                        arrivalDate: res.arrivalDate || '',
                                        departureDate: res.departureDate || '',
                                        nights: res.nights || 0,
                                        pax: (res.adults || 0) + (res.children || 0) || 1,
                                        price: (() => { const rs = hotelSalesList.find((s: any) => String(s.reservation_id) === String(res.id)); return rs ? Number(rs.amount) : (res.totalAmount || 0); })(),
                                        currency: (() => { const rs = hotelSalesList.find((s: any) => String(s.reservation_id) === String(res.id)); return rs ? (rs.currency || 'MXN') : (res.currency || 'USD'); })(),
                                        paymentStatus: res.paymentStatus || 'Por Pagar',
                                        source: res.sourceName || '',
                                        signature: '',
                                        idPhoto: ''
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
                                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                                    }}
                                  >
                                    <UserPlus size={18} />
                                    Registrar ingreso
                                  </button>
                                </div>
                                );
                              }

                              return (
                                <div style={{ marginTop: 12 }}>
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
                                        registrationId: '',
                                        name: res.guestName || '',
                                        nationality: initialCountry,
                                        homeAddress: res.guestAddress || '',
                                        phone: res.guestPhone || (phonePrefix ? `${phonePrefix.code} ` : ''),
                                        city: res.guestCity || '',
                                        country: initialCountry,
                                        email: res.guestEmail || '',
                                        roomName: res.roomName || '',
                                        roomNumber: '',
                                        arrivalDate: res.arrivalDate || '',
                                        departureDate: res.departureDate || '',
                                        nights: res.nights || 0,
                                        pax: (res.adults || 0) + (res.children || 0) || 1,
                                        price: (() => { const rs = hotelSalesList.find((s: any) => String(s.reservation_id) === String(res.id)); return rs ? Number(rs.amount) : (res.totalAmount || 0); })(),
                                        currency: (() => { const rs = hotelSalesList.find((s: any) => String(s.reservation_id) === String(res.id)); return rs ? (rs.currency || 'MXN') : (res.currency || 'USD'); })(),
                                        paymentStatus: res.paymentStatus || 'Por Pagar',
                                        source: res.sourceName || '',
                                        signature: '',
                                        idPhoto: ''
                                      });
                                      setShowCheckinModal(true);
                                    }}
                                    className="btn-premium"
                                    style={{ 
                                      width: '100%',
                                      background: 'white',
                                      color: '#3b82f6', 
                                      border: '1.5px solid #bfdbfe', 
                                      borderRadius: 12, 
                                      padding: '12px', 
                                      fontWeight: 700, 
                                      fontSize: 14, 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 8,
                                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.05)'
                                    }}
                                  >
                                    <ClipboardList size={16} />
                                    Asignar Habitación
                                  </button>
                                </div>
                              );
                            })()}
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
                  {renderGroup('En casa / Hospedados', enCasa, '#22c55e', false, true, isEnCasaExpanded, setIsEnCasaExpanded)}
                  {renderGroup('Próximos ingresos (7 días)', proximos, '#f59e0b', false, true, isProximosExpanded, setIsProximosExpanded)}
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

    const paymentMethods = [
      { value: 'cash',         label: '💵 Efectivo',               group: 'offline' },
      { value: 'creditCard',   label: '💳 Tarjeta de crédito',     group: 'offline' },
      { value: 'bankTransfer', label: '🏦 Transferencia bancaria',  group: 'offline' },
      { value: 'check',        label: '📋 Cheque',                  group: 'offline' },
      { value: 'paypal',       label: '🅿 PayPal',                  group: 'offline' },
      { value: 'paymentLink',  label: '🔗 Pago en línea (link)',    group: 'online'  },
    ];

    return (
      <div className="modal-overlay" style={{ zIndex: 3000, padding: 16 }}>
        <div className="modal-content fade-in" style={{ maxWidth: 480, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 24, padding: 0, overflowY: 'auto', overflowX: 'hidden' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>Registrar cargo</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Hostaway · Add transaction</p>
            </div>
            <button onClick={() => setShowHotelPaymentModal(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', padding: '8px', borderRadius: 12, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
              <X size={18} />
            </button>
          </div>

          {/* Reservation info pill */}
          <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏨</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hotelPaymentForm.guestName}</div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{hotelPaymentForm.roomName} · ID {hotelPaymentForm.hostaway_reservation_id}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{hotelPaymentForm.currency} ${hotelPaymentForm.amount?.toLocaleString('es-MX')}</div>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Nombre del cargo <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                value={(hotelPaymentForm as any).title ?? 'Pago en recepción'}
                onChange={(e) => setHotelPaymentForm({ ...hotelPaymentForm, title: e.target.value } as any)}
                placeholder="Ej: Pago en recepción"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, fontWeight: 500, outline: 'none', background: '#fff' }}
              />
            </div>

            {/* Room number */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>🚪 Habitación asignada</label>
              <select
                value={hotelPaymentForm.roomNumber}
                onChange={(e) => {
                  const num = e.target.value;
                  const label = num ? (parseInt(num) <= 4 ? `Loft ${num}` : `Habitación ${num}`) : '';
                  // Also update roomName to keep consistency with the label shown
                  setHotelPaymentForm({ ...hotelPaymentForm, roomNumber: num, roomName: num ? label : hotelPaymentForm.roomName });
                }}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, fontWeight: 600, background: '#fff', outline: 'none', color: hotelPaymentForm.roomNumber ? '#0f172a' : '#94a3b8' }}
              >
                <option value="">Sin asignar / mantener existente</option>
                {[...Array(14)].map((_, i) => {
                  const num = String(i + 1);
                  const label = i < 4 ? `Loft ${num}` : `Habitación ${num}`;
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                  const isOccupied = registrations.some((r: any) => {
                    if (String(r.room_number) !== num || !r.arrival_date || !r.departure_date) return false;
                    const arr = String(r.arrival_date).slice(0, 10);
                    const dep = String(r.departure_date).slice(0, 10);
                    if (!(arr <= todayStr && dep > todayStr)) return false;
                    // Solo contar como ocupada si la reserva Hostaway sigue activa
                    if (r.hostaway_reservation_id) {
                      return upcomingCheckins.some((res: any) => String(res.id) === String(r.hostaway_reservation_id));
                    }
                    return true;
                  });
                  return (
                    <option key={num} value={num} disabled={isOccupied} style={{ color: isOccupied ? '#94a3b8' : '#0f172a' }}>
                      {label}{isOccupied ? ' 🔴 Ocupada' : ' 🟢'}
                    </option>
                  );
                })}
              </select>
              {hotelPaymentForm.roomNumber && (
                <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>
                  {parseInt(hotelPaymentForm.roomNumber) <= 4 ? `Loft ${hotelPaymentForm.roomNumber}` : `Habitación ${hotelPaymentForm.roomNumber}`}
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Descripción</label>
              <textarea
                value={(hotelPaymentForm as any).description ?? ''}
                onChange={(e) => setHotelPaymentForm({ ...hotelPaymentForm, description: e.target.value } as any)}
                placeholder="Notas adicionales sobre el pago..."
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, fontWeight: 500, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff' }}
              />
            </div>

            {/* Amount + Currency */}
            {/* Amount + Currency */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Divisa</label>
                <select
                  value={hotelPaymentForm.currency}
                  onChange={(e) => {
                    const newCurrency = e.target.value;
                    const oldCurrency = hotelPaymentForm.currency;
                    let newAmount = hotelPaymentForm.amount;
                    if (oldCurrency === 'USD' && newCurrency === 'MXN') {
                      newAmount = Math.round(newAmount * exchangeRate * 100) / 100;
                    } else if (oldCurrency === 'MXN' && newCurrency === 'USD') {
                      newAmount = Math.round((newAmount / exchangeRate) * 100) / 100;
                    }
                    setHotelPaymentForm({ ...hotelPaymentForm, currency: newCurrency, amount: newAmount });
                  }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 10px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, fontWeight: 600, background: '#fff', outline: 'none' }}
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Monto del cargo <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number"
                  value={hotelPaymentForm.amount}
                  onChange={(e) => setHotelPaymentForm({ ...hotelPaymentForm, amount: Number(e.target.value) })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 16, fontWeight: 700, outline: 'none', background: '#fff' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: -2 }}>
                  {hotelPaymentForm.amount === 0 ? (
                    <div style={{ color: '#059669', fontWeight: 700, fontSize: 12 }}>🎁 Cortesía — sin cargo al huésped</div>
                  ) : (
                    <div>
                      {hotelPaymentForm.currency === 'USD' 
                        ? `≈ MXN ${(hotelPaymentForm.amount * exchangeRate).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `≈ USD ${(hotelPaymentForm.amount / exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    </div>
                  )}
                  {hotelPaymentForm.amount > 0 && (
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      (TC: {exchangeRate})
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Método de pago <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ value: 'cash', icon: '💵', label: 'Efectivo' },
                  { value: 'creditCard', icon: '💳', label: 'Tarjeta' },
                  { value: 'bankTransfer', icon: '🏦', label: 'Transferencia' },
                  { value: 'check', icon: '📋', label: 'Cheque' },
                  { value: 'paypal', icon: '🅿', label: 'PayPal' },
                  { value: 'paymentLink', icon: '🔗', label: 'Pago online' },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setHotelPaymentForm({ ...hotelPaymentForm, method: m.value })}
                    style={{
                      padding: '10px 8px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      border: hotelPaymentForm.method === m.value ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                      background: hotelPaymentForm.method === m.value ? '#eff6ff' : '#f8fafc',
                      color: hotelPaymentForm.method === m.value ? '#1d4ed8' : '#475569',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hybrid flow info */}
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
              <div style={{ margin: 0, fontSize: 12, color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                El pago quedará <strong>anotado en Hostaway</strong> (Host Note) y registrado aquí.
                Después recibirás un enlace para confirmar el pago en Hostaway con <strong>1 clic</strong>.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px 24px', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => setShowHotelPaymentModal(false)}
              style={{ padding: '14px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >Cancelar</button>
            <button
              onClick={handleHotelPaymentSubmit}
              disabled={isSubmittingPayment}
              style={{ padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: 'white', fontWeight: 800, cursor: isSubmittingPayment ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(59,130,246,0.4)', opacity: isSubmittingPayment ? 0.7 : 1 }}
            >
              {isSubmittingPayment ? 'Registrando...' : <><Check size={16} strokeWidth={3} /> Registrar pago</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNewResModal = () => {
    if (!showNewResModal) return null;

    return (
      <div className="modal-overlay venta-directa-overlay" style={{ zIndex: 3000, padding: 16, overflowX: 'hidden', touchAction: 'pan-y' }}>
        <div className="modal-content fade-in" style={{ maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as any, borderRadius: 28, padding: '24px 20px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>Venta Directa</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>Registrar una nueva estancia en Hostaway</p>
            </div>
            <button onClick={() => setShowNewResModal(false)} style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', padding: 10, borderRadius: '14px', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group-premium">
              <label>Nombre <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="text" 
                value={newResForm.guestFirstName} 
                onChange={e => setNewResForm({...newResForm, guestFirstName: e.target.value})}
                placeholder="Nombre"
                autoComplete="new-password"
                style={!newResForm.guestFirstName.trim() ? { borderColor: '#fca5a5' } : {}}
              />
            </div>
            <div className="form-group-premium">
              <label>Apellido <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="text" 
                value={newResForm.guestLastName} 
                onChange={e => setNewResForm({...newResForm, guestLastName: e.target.value})}
                placeholder="Apellido"
                autoComplete="new-password"
                style={!newResForm.guestLastName.trim() ? { borderColor: '#fca5a5' } : {}}
              />
            </div>
            <div className="form-group-premium">
              <label>E-mail <span style={{fontSize:11, color:'#94a3b8', fontWeight:400}}>(opcional)</span></label>
              <input 
                type="email" 
                value={newResForm.guestEmail} 
                onChange={e => setNewResForm({...newResForm, guestEmail: e.target.value})}
                placeholder="correo@ejemplo.com"
                autoComplete="new-password"
                style={newResForm.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newResForm.guestEmail) ? { borderColor: '#fbbf24', background: '#fffbeb' } : {}}
              />
              {newResForm.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newResForm.guestEmail) && (
                <span style={{ fontSize: 11, color: '#d97706', marginTop: 4, display: 'block' }}>
                  ⚠️ Formato inválido — si se deja así, se usará un correo genérico
                </span>
              )}
            </div>
            <div className="form-group-premium">
              <label>Teléfono <span style={{color:'#ef4444'}}>*</span></label>
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
                  autoComplete="new-password"
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    border: '1.5px solid #ef4444',
                    padding: '0 14px',
                    fontSize: 15,
                    outline: 'none',
                    background: '#fff5f5',
                  }}
                />

              </div>
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

            <div className="form-group-premium">
              <label>Fecha de Check-in <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="date"
                value={newResForm.arrivalDate} 
                onChange={e => setNewResForm({...newResForm, arrivalDate: e.target.value})}
                style={{ 
                  width: '100%', 
                  boxSizing: 'border-box',
                  fontSize: 16,
                  minHeight: 48,
                  ...(!newResForm.arrivalDate ? { borderColor: '#fca5a5' } : {}) 
                }}
              />
              {!newResForm.arrivalDate && (
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>📅 Selecciona la fecha de llegada</span>
              )}
            </div>
            <div className="form-group-premium">
              <label>Fecha de Check-out <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="date"
                value={newResForm.departureDate} 
                onChange={e => setNewResForm({...newResForm, departureDate: e.target.value})}
                style={{ 
                  width: '100%', 
                  boxSizing: 'border-box',
                  fontSize: 16,
                  minHeight: 48,
                  ...(!newResForm.departureDate ? { borderColor: '#fca5a5' } : {}) 
                }}
              />
              {!newResForm.departureDate && (
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>📅 Selecciona la fecha de salida</span>
              )}
            </div>
            <div className="form-group-premium">
              <label>Nacionalidad <span style={{color:'#ef4444'}}>*</span></label>
               <select 
                value={newResForm.guestNationality} 
                onChange={e => setNewResForm({...newResForm, guestNationality: e.target.value})}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: `1px solid ${!newResForm.guestNationality ? '#fca5a5' : '#e2e8f0'}`, fontSize: 15, fontWeight: 600, color: '#0f172a', background: 'white' }}
              >
                <option value="">Seleccionar...</option>
                <optgroup label="⭐ Más frecuentes">
                  <option value="México">&#127474;&#127485; México</option>
                  <option value="Estados Unidos">&#127482;&#127480; Estados Unidos</option>
                  <option value="Canadá">&#127464;&#127462; Canadá</option>
                </optgroup>
                <optgroup label="Todos los países">
                  {Object.values(COUNTRIES_BY_CONTINENT).flat().sort().map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>
            <div className="form-group-premium">
              <label>Ciudad</label>
              <input 
                type="text" 
                value={newResForm.guestCity} 
                onChange={e => setNewResForm({...newResForm, guestCity: e.target.value})}
                placeholder="Ciudad"
                autoComplete="new-password"
              />
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 0' }} />

            <div className="form-group-premium">
              <label>Habitación Asignada (Disponibles)</label>
              <select 
                value={newResForm.listingId} 
                onChange={e => {
                  const lid = e.target.value;
                  const listing = availableListings.find(l => String(l.id) === lid);
                  const arrival = new Date(`${newResForm.arrivalDate}T00:00:00`);
                  const departure = new Date(`${newResForm.departureDate}T00:00:00`);
                  const timeDiff = departure.getTime() - arrival.getTime();
                  const nights = Math.max(1, Math.round(timeDiff / (1000 * 3600 * 24)));
                  const calculatedTotal = listing ? listing.basePrice * nights : '';
                  setNewResForm({...newResForm, listingId: lid, customPrice: String(calculatedTotal)});
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
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CreditCard size={18} color="rgba(255,255,255,0.9)" />
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '0.3px' }}>PRECIO Y PAGO</span>
                </div>

                <div style={{ background: 'white', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Precio radios */}
                  {(() => {
                    const arrival = new Date(`${newResForm.arrivalDate}T00:00:00`);
                    const departure = new Date(`${newResForm.departureDate}T00:00:00`);
                    const nights = Math.max(1, Math.round((departure.getTime() - arrival.getTime()) / (1000 * 3600 * 24)));
                    const selectedListing = availableListings.find(l => String(l.id) === String(newResForm.listingId));
                    const hostawayTotal = selectedListing ? selectedListing.basePrice * nights : 0;
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: `Precio Hostaway ($${hostawayTotal})`, sub: `${nights} noche${nights > 1 ? 's' : ''} a $${selectedListing?.basePrice}/noche${selectedListing?.currency === 'USD' ? ` (≈ MXN ${(hostawayTotal * exchangeRate).toLocaleString('es-MX', {maximumFractionDigits:2})})` : ` (≈ USD ${(hostawayTotal / exchangeRate).toLocaleString('en-US', {maximumFractionDigits:2})})`}`, val: false },
                          { label: 'Precio Personalizado', sub: 'Definir monto total manualmente', val: true }
                        ].map(opt => (
                          <label key={String(opt.val)} style={{ 
                            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                            padding: '12px 16px', borderRadius: 14,
                            border: `2px solid ${newResForm.useCustomPrice === opt.val ? '#2563eb' : '#e2e8f0'}`,
                            background: newResForm.useCustomPrice === opt.val ? '#eff6ff' : '#f8fafc', transition: 'all 0.2s'
                          }}>
                            <input type="radio" name="priceMode" checked={newResForm.useCustomPrice === opt.val} onChange={() => setNewResForm({...newResForm, useCustomPrice: opt.val})} style={{ accentColor: '#2563eb' }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: newResForm.useCustomPrice === opt.val ? '#1d4ed8' : '#334155' }}>{opt.label}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{opt.sub}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    );
                  })()}

                  {newResForm.useCustomPrice && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="fade-in">
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={newResForm.priceCurrency}
                          onChange={e => {
                            const newCurrency = e.target.value;
                            const oldCurrency = newResForm.priceCurrency;
                            let newAmount = Number(newResForm.customPrice) || 0;
                            if (newAmount > 0) {
                              if (oldCurrency === 'USD' && newCurrency === 'MXN') {
                                newAmount = newAmount * exchangeRate;
                              } else if (oldCurrency === 'MXN' && newCurrency === 'USD') {
                                newAmount = newAmount / exchangeRate;
                              }
                            }
                            setNewResForm({...newResForm, priceCurrency: newCurrency, customPrice: newAmount >= 0 && newResForm.customPrice !== '' ? String(Math.round(newAmount * 100) / 100) : ''});
                          }}
                          style={{ width: 90, height: 48, borderRadius: 12, border: '2px solid #e2e8f0', background: 'white', fontWeight: 700, fontSize: 14, padding: '0 8px' }}
                        >
                          <option value="USD">USD</option>
                          <option value="MXN">MXN</option>
                        </select>
                        <input
                          type="number"
                          value={newResForm.customPrice}
                          onChange={e => setNewResForm({...newResForm, customPrice: e.target.value})}
                          placeholder="Monto"
                          autoComplete="new-password"
                          style={{ flex: 1, height: 48, borderRadius: 12, border: '2px solid #e2e8f0', padding: '0 16px', fontSize: 16, fontWeight: 600 }}
                        />
                      </div>
                      {Number(newResForm.customPrice) > 0 && (
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, alignSelf: 'flex-end', marginTop: -4 }}>
                          {newResForm.priceCurrency === 'USD' 
                            ? `≈ MXN ${(Number(newResForm.customPrice) * exchangeRate).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (TC: ${exchangeRate})`
                            : `≈ USD ${(Number(newResForm.customPrice) / exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (TC: ${exchangeRate})`
                          }
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ height: 1, background: '#f1f5f9' }} />

                  {/* Toggle Pagado */}
                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                    padding: '14px 18px', borderRadius: 14,
                    border: `2px solid ${newResForm.isPaid ? '#10b981' : '#e2e8f0'}`,
                    background: newResForm.isPaid ? '#ecfdf5' : '#f8fafc', transition: 'all 0.2s'
                  }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: 8,
                      border: `2px solid ${newResForm.isPaid ? '#10b981' : '#cbd5e1'}`,
                      background: newResForm.isPaid ? '#10b981' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', flexShrink: 0
                    }}>
                      {newResForm.isPaid && <Check size={14} color="white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" checked={newResForm.isPaid} onChange={e => setNewResForm({...newResForm, isPaid: e.target.checked})} style={{ display: 'none' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: newResForm.isPaid ? '#065f46' : '#334155' }}>Marcar como Pagado</div>
                      <div style={{ fontSize: 12, color: newResForm.isPaid ? '#059669' : '#94a3b8', marginTop: 2 }}>Registrará el pago formalmente en Hostaway</div>
                    </div>
                  </label>

                  {/* Detalles Transacción */}
                  {newResForm.isPaid && (
                    <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }} className="fade-in">
                      <div style={{ background: '#f1f5f9', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Wallet size={14} color="#64748b" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalles de la Transacción</span>
                      </div>
                      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Método de Pago</label>
                          <select
                            value={newResForm.transactionMethod}
                            onChange={e => setNewResForm({...newResForm, transactionMethod: e.target.value})}
                            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontWeight: 600, color: '#0f172a', background: 'white' }}
                          >
                            <option value="cash">💵 Efectivo (Cash)</option>
                            <option value="creditCard">💳 Tarjeta (Credit Card)</option>
                            <option value="bankTransfer">🏦 Transferencia (Bank Transfer)</option>
                            <option value="paypal">🔵 PayPal</option>
                            <option value="otaPayment">🌐 Pago por OTA</option>
                            <option value="other">📋 Otro</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Descripción (Opcional)</label>
                          <input
                            type="text"
                            value={newResForm.transactionDescription}
                            onChange={e => setNewResForm({...newResForm, transactionDescription: e.target.value})}
                            placeholder="Ej. Pago en recepción, Depósito..."
                            style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#0f172a', background: 'white', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
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
    const t = FORM_I18N[contractLang] || FORM_I18N.es;

    const handleSave = async () => {
      try {
        const payload = {
          hostaway_reservation_id: selectedReservation?.id,
          name: checkinForm.name,
          nationality: checkinForm.nationality,
          home_address: checkinForm.homeAddress,
          phone: checkinForm.phone,
          city: checkinForm.city,
          country: checkinForm.country,
          email: checkinForm.email,
          room_name: checkinForm.roomNumber ? `${checkinForm.roomName} (Hab. ${checkinForm.roomNumber})` : checkinForm.roomName,
          room_number: checkinForm.roomNumber,
          arrival_date: checkinForm.arrivalDate,
          departure_date: checkinForm.departureDate,
          nights: checkinForm.nights,
          pax: checkinForm.pax,
          price: checkinForm.price,
          source: checkinForm.source,
          signature_data: checkinForm.signature,
          id_photo_data: checkinForm.idPhoto || null
        };

        if (checkinForm.registrationId) {
          const { error } = await supabase.from('guest_registrations').update(payload).eq('id', checkinForm.registrationId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('guest_registrations').insert(payload);
          if (error) throw error;
        }

        // Refresh registrations immediately so guest appears in EN CASA list
        await fetchRegistrations();
        notifyReservationChange();
        setShowCheckinModal(false);
      } catch (err: any) {
        alert('Error al guardar: ' + err.message);
      }
    };

    return (
      <div className="modal-overlay" style={{ zIndex: 3000, padding: 16 }}>
        <div className="modal-content fade-in checkin-modal" style={{ maxWidth: 650, width: '100%', maxHeight: '95vh', overflowY: 'auto', borderRadius: 28, padding: '32px' }}>

          {/* ── Language Picker ── */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 20,
            padding: '20px 16px',
            marginBottom: 24,
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.5px' }}>
                Selecciona tu idioma
              </span>
              <span style={{ color: '#475569', margin: '0 10px', fontWeight: 400 }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', fontStyle: 'italic' }}>
                Select your language
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(FORM_I18N).map(([code, lang]) => (
                <button key={code} onClick={() => setContractLang(code)} style={{
                  background: contractLang === code
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'rgba(255,255,255,0.07)',
                  color: contractLang === code ? '#fff' : '#94a3b8',
                  border: contractLang === code ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24, padding: '7px 16px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: contractLang === code ? '0 4px 12px rgba(59,130,246,0.4)' : 'none',
                  letterSpacing: '0.2px'
                }}>{lang.flag} {lang.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>{t.title}</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>{t.subtitle}</p>
            </div>
            <button onClick={() => setShowCheckinModal(false)} style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', padding: 10, borderRadius: '14px', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <div className="checkin-section-title">
            <User size={16} /> {t.guestInfo}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group-premium">
              <label>{t.fullName}</label>
              <input type="text" value={checkinForm.name}
                onChange={e => setCheckinForm({...checkinForm, name: e.target.value})}
                placeholder={t.fullNamePh} />
            </div>
            
            <div className="form-group-premium">
              <label>{t.nationality}</label>
              <select value={checkinForm.nationality}
                onChange={e => setCheckinForm({...checkinForm, nationality: e.target.value, country: e.target.value})}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 600, color: '#0f172a', background: 'white' }}>
                <option value="">{t.nationalityPh}</option>
                {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => (
                  <optgroup key={continent} label={continent}>
                    {countries.map(country => <option key={country} value={country}>{country}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group-premium">
              <label>{t.email}</label>
              <input type="email" value={checkinForm.email}
                onChange={e => setCheckinForm({...checkinForm, email: e.target.value})}
                placeholder={t.emailPh} />
            </div>

            <div className="form-group-premium">
              <label>{t.phone}</label>
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
                  style={{ width: '110px', height: 48, borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: 16 }}
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
                  placeholder={t.phonePh}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group-premium">
              <label>{t.city}</label>
              <input type="text" value={checkinForm.city}
                onChange={e => setCheckinForm({...checkinForm, city: e.target.value})}
                placeholder={t.cityPh} />
            </div>

            <div className="form-group-premium">
              <label>{t.country}</label>
              <select value={checkinForm.country}
                onChange={e => setCheckinForm({...checkinForm, country: e.target.value, nationality: e.target.value})}
                style={{ width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 600, color: '#0f172a', background: 'white' }}>
                <option value="">{t.countryPh}</option>
                {Object.entries(COUNTRIES_BY_CONTINENT).map(([continent, countries]) => (
                  <optgroup key={continent} label={continent}>
                    {countries.map(country => <option key={country} value={country}>{country}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
              <label>{t.address}</label>
              <input type="text" value={checkinForm.homeAddress}
                onChange={e => setCheckinForm({...checkinForm, homeAddress: e.target.value})}
                placeholder={t.addressPh} />
            </div>
          </div>

          <div className="checkin-section-title">
            <Building size={16} /> {t.stayDetails}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group-premium">
              <label>{t.room}</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" value={checkinForm.roomName} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>{t.roomNum}</label>
              <div style={{ position: 'relative' }}>
                <HomeIcon size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <select
                  value={checkinForm.roomNumber}
                  onChange={e => setCheckinForm({...checkinForm, roomNumber: e.target.value})}
                  style={{ width: '100%', height: 48, paddingLeft: 44, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 16, fontWeight: 600, color: '#0f172a', background: 'white', appearance: 'none' }}
                >
                  <option value="">{t.roomNumPh}</option>
                  {[...Array(14)].map((_, i) => {
                    const num = String(i + 1);
                    const label = i < 4 ? `Loft ${num}` : `Habitación ${num}`;
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                    const isOccupied = registrations.some((r: any) => {
                      if (String(r.room_number) !== num || !r.arrival_date || !r.departure_date) return false;
                      const arr = String(r.arrival_date).slice(0, 10);
                      const dep = String(r.departure_date).slice(0, 10);
                      if (!(arr <= todayStr && dep > todayStr)) return false;
                      if (r.hostaway_reservation_id) {
                        return upcomingCheckins.some((res: any) => String(res.id) === String(r.hostaway_reservation_id));
                      }
                      return true;
                    });
                    const isCurrent = checkinForm.roomNumber === num;
                    const disabled = isOccupied && !isCurrent;
                    return (
                      <option key={i + 1} value={num} disabled={disabled} style={{ color: disabled ? '#94a3b8' : '#0f172a' }}>
                        {label}{disabled ? ' 🔴 Ocupada' : ' 🟢 Disponible'}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>{t.source}</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="text" value={checkinForm.source} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>{t.pax}</label>
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
              <label>{t.arrival}</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="date" value={checkinForm.arrivalDate} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="form-group-premium">
              <label>{t.departure}</label>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input type="date" value={checkinForm.departureDate} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
              </div>
            </div>

            <div className="nights-price-grid">
              <div className="form-group-premium">
                <label>{t.nights}</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="number" value={checkinForm.nights} readOnly style={{ paddingLeft: 44, background: '#f1f5f9', cursor: 'not-allowed', borderStyle: 'dashed' }} />
                </div>
              </div>

              <div className="form-group-premium">
                <label>{t.price}</label>
                {/* Premium price card */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
                  borderRadius: 18,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 4px 16px rgba(37,99,235,0.18)'
                }}>
                  {/* Read-only amount — shows exact paid amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CreditCard size={20} color="rgba(255,255,255,0.7)" />
                    <span style={{
                      color: '#fff',
                      fontSize: 32,
                      fontWeight: 900,
                      letterSpacing: '-1px',
                      lineHeight: 1
                    }}>
                      {checkinForm.currency === 'MXN'
                        ? `$${checkinForm.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : checkinForm.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, fontSize: 18 }}>
                      {checkinForm.currency || 'USD'}
                    </span>
                  </div>

                  {/* MXN conversion — only shown when currency is USD */}
                  {checkinForm.currency === 'USD' && checkinForm.price > 0 && (
                    <div style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600 }}>
                        Equivalente en MXN
                      </span>
                      <span style={{ color: '#4ade80', fontSize: 16, fontWeight: 800 }}>
                        $ {(checkinForm.price * exchangeRate)
                            .toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </span>
                    </div>
                  )}

                  {/* TC row — only when USD */}
                  {checkinForm.currency === 'USD' && (
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>
                      TC: 1 USD = {exchangeRate.toFixed(2)} MXN
                    </div>
                  )}
                </div>


                {/* Payment status badge below the card */}
                <div style={{
                  marginTop: 10,
                  padding: '10px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: checkinForm.paymentStatus === 'Pagado' ? '#dcfce7' : '#fee2e2',
                  color: checkinForm.paymentStatus === 'Pagado' ? '#166534' : '#991b1b',
                  border: `1.5px solid ${checkinForm.paymentStatus === 'Pagado' ? '#bbf7d0' : '#fecaca'}`,
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}>
                  {checkinForm.paymentStatus === 'Pagado' ? '✅ ' : '⏳ '}{checkinForm.paymentStatus}
                </div>
              </div>

            </div>
          </div>

          {/* ══════════════ FOTO ID / PASAPORTE ══════════════ */}
          <IdPhotoCapture
            idPhoto={checkinForm.idPhoto}
            onChange={(photo) => setCheckinForm(prev => ({ ...prev, idPhoto: photo }))}
            t={t}
          />
          {/* ══════════════ FIN FOTO ID ══════════════ */}

          {/* ══════════════ CONTRATO DE ESTANCIA ══════════════ */}
          {(() => {
            const CONTRACT_LANGS: Record<string, {
              flag: string; label: string;
              title: string; subtitle: string;
              rules_title: string; rules: { icon: string; text: string }[];
              reminders_title: string; reminders: { icon: string; text: string }[];
              pool_title: string; pool_schedule: string; pool_rules: { icon: string; text: string }[];
              consent: string;
            }> = {
              es: {
                flag: '🇲🇽', label: 'Español',
                title: 'Contrato de Estancia',
                subtitle: 'Reglamento y condiciones del Gallo Azul Hotel',
                rules_title: '📋 Reglamento General',
                rules: [
                  { icon: '🕛', text: 'Check-out: 12:00 PM' },
                  { icon: '🚭', text: 'No fumar en las instalaciones' },
                  { icon: '🐾', text: 'No se permiten mascotas' },
                  { icon: '🎉', text: 'Prohibido hacer fiestas o tener invitados' },
                  { icon: '🔇', text: 'Horario de silencio: 9:30 PM – 9:30 AM' },
                ],
                reminders_title: '💡 Recordatorios',
                reminders: [
                  { icon: '❄️', text: 'Apaga el aire acondicionado y electrodomésticos al salir de la habitación' },
                ],
                pool_title: '🏊 Área de Piscina',
                pool_schedule: 'Horario: 9:00 AM – 9:00 PM',
                pool_rules: [
                  { icon: '👙', text: 'Utilizar siempre traje de baño' },
                  { icon: '🚿', text: 'Ducharse antes de entrar a la piscina' },
                  { icon: '👶', text: 'Los niños siempre bajo supervisión de un adulto' },
                  { icon: '🏃', text: 'No correr en el área de la piscina' },
                  { icon: '🍔', text: 'No se permiten alimentos ni bebidas dentro de la alberca' },
                  { icon: '🔊', text: 'No se permiten parlantes o bocinas' },
                  { icon: '🍾', text: 'No se permite vidrio de ningún tipo' },
                  { icon: '🤿', text: 'No tirarse clavados' },
                ],
                consent: 'Al firmar este documento, el huésped declara haber leído, comprendido y aceptado el reglamento y condiciones del Gallo Azul Hotel.',
              },
              en: {
                flag: '🇺🇸', label: 'English',
                title: 'Stay Contract',
                subtitle: 'Gallo Azul Hotel Rules and Conditions',
                rules_title: '📋 General Rules',
                rules: [
                  { icon: '🕛', text: 'Check-out: 12:00 PM' },
                  { icon: '🚭', text: 'No smoking on the premises' },
                  { icon: '🐾', text: 'Pets are not allowed' },
                  { icon: '🎉', text: 'Parties or outside guests are strictly prohibited' },
                  { icon: '🔇', text: 'Quiet hours: 9:30 PM – 9:30 AM' },
                ],
                reminders_title: '💡 Reminders',
                reminders: [
                  { icon: '❄️', text: 'Turn off the AC and appliances when leaving the room' },
                ],
                pool_title: '🏊 Pool Area',
                pool_schedule: 'Hours: 9:00 AM – 9:00 PM',
                pool_rules: [
                  { icon: '👙', text: 'Swimwear is required at all times' },
                  { icon: '🚿', text: 'Shower before entering the pool' },
                  { icon: '👶', text: 'Children must be supervised by an adult at all times' },
                  { icon: '🏃', text: 'No running in the pool area' },
                  { icon: '🍔', text: 'No food or drinks allowed inside the pool' },
                  { icon: '🔊', text: 'No speakers or loud music allowed' },
                  { icon: '🍾', text: 'No glass of any kind is permitted' },
                  { icon: '🤿', text: 'No diving' },
                ],
                consent: 'By signing this document, the guest declares to have read, understood, and accepted the rules and conditions of Gallo Azul Hotel.',
              },
              fr: {
                flag: '🇫🇷', label: 'Français',
                title: 'Contrat de Séjour',
                subtitle: 'Règlement et conditions du Gallo Azul Hotel',
                rules_title: '📋 Règlement Général',
                rules: [
                  { icon: '🕛', text: 'Check-out : 12h00' },
                  { icon: '🚭', text: 'Interdiction de fumer dans l\'établissement' },
                  { icon: '🐾', text: 'Les animaux de compagnie ne sont pas autorisés' },
                  { icon: '🎉', text: 'Les fêtes et les invités extérieurs sont strictement interdits' },
                  { icon: '🔇', text: 'Heures de silence : 21h30 – 9h30' },
                ],
                reminders_title: '💡 Rappels',
                reminders: [
                  { icon: '❄️', text: 'Éteignez la climatisation et les appareils électriques en quittant la chambre' },
                ],
                pool_title: '🏊 Espace Piscine',
                pool_schedule: 'Horaires : 9h00 – 21h00',
                pool_rules: [
                  { icon: '👙', text: 'Le port du maillot de bain est obligatoire' },
                  { icon: '🚿', text: 'Douche obligatoire avant d\'entrer dans la piscine' },
                  { icon: '👶', text: 'Les enfants doivent toujours être sous la surveillance d\'un adulte' },
                  { icon: '🏃', text: 'Ne pas courir autour de la piscine' },
                  { icon: '🍔', text: 'Nourriture et boissons interdites dans la piscine' },
                  { icon: '🔊', text: 'Les enceintes et la musique forte sont interdites' },
                  { icon: '🍾', text: 'Le verre est strictement interdit' },
                  { icon: '🤿', text: 'Plongeons interdits' },
                ],
                consent: 'En signant ce document, le client déclare avoir lu, compris et accepté le règlement et les conditions du Gallo Azul Hotel.',
              }
            };

            const lang = CONTRACT_LANGS[contractLang] || CONTRACT_LANGS.es;


            return (
              <div style={{ marginBottom: 28 }}>
                {/* Header del contrato */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                  borderRadius: '20px 20px 0 0',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Gallo Azul Hotel</div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>📄 {lang.title}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{lang.subtitle}</p>
                  </div>
                  {/* Selector de idioma */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(CONTRACT_LANGS).map(([code, l]) => (
                      <button
                        key={code}
                        onClick={() => setContractLang(code)}
                        style={{
                          background: contractLang === code ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                          border: contractLang === code ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: contractLang === code ? 800 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >{l.flag} {l.label}</button>
                    ))}
                  </div>
                </div>

                {/* Cuerpo del contrato */}
                <div style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderTop: 'none',
                  borderRadius: '0 0 20px 20px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}>

                  {/* Reglamento General */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang.rules_title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {lang.rules.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: i % 2 === 0 ? '#f8fafc' : '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
                          <span style={{ fontSize: 13, color: '#334155', fontWeight: 500, lineHeight: 1.5 }}>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recordatorios */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang.reminders_title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {lang.reminders.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: '#fefce8', borderRadius: 12, border: '1px solid #fef08a' }}>
                          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
                          <span style={{ fontSize: 13, color: '#713f12', fontWeight: 500, lineHeight: 1.5 }}>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Área de Piscina */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lang.pool_title}</div>
                    <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🕘 {lang.pool_schedule}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {lang.pool_rules.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                          <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
                          <span style={{ fontSize: 12, color: '#0c4a6e', fontWeight: 500, lineHeight: 1.4 }}>{r.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nota de consentimiento */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '1.5px solid #86efac',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>✍️</span>
                    <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic' }}>
                      {lang.consent}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* ══════════════ FIN CONTRATO ══════════════ */}

          <div className="checkin-section-title">
            <PenTool size={16} /> {t.signature}
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
              {t.finalize}
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
      if (!isOccupied) {
        const table = (tables || []).find(t => t.id === tableId);
        if (table && table.category === 'Pedidos para llevar' && table.status === 'occupied') {
          return 'occupied-done';
        }
        return 'free';
      }
      const items = (activeItems || []).filter(i => i.table_id === tableId);
      const hasPending = items.some(i => i.status === 'pending');
      return hasPending ? 'occupied-pending' : 'occupied-done';
    };
    const safeTables = tables || [];
    const safeActiveItems = activeItems || [];
    const filteredTablesForCounts = safeTables.filter(t => ['Salón', 'Terraza', 'Jardín', 'Barra', 'Camastros Alberca'].includes(t.category || ''));
    const occupiedCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'occupied-pending').length;
    const payingCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'occupied-done').length;
    const freeCount = filteredTablesForCounts.filter(t => getEffectiveStatus(t.id) === 'free').length;

    return (
      <div className="salon-view fade-in">
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
          <button 
            onClick={() => setShowPosExpenseModal(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 8,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              cursor: 'pointer',
              letterSpacing: '0.3px',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            <Plus size={16} strokeWidth={3} /> Compra
          </button>
        </div>

        <div className="salon-legend">
           <div className="salon-legend-item free"><div className="salon-legend-pip"></div> LIBRES</div>
           <div className="salon-legend-item occupied-pending"><div className="salon-legend-pip"></div> CON PENDIENTES</div>
           <div className="salon-legend-item occupied-done"><div className="salon-legend-pip"></div> SIN PENDIENTES</div>
        </div>

        {/* Table grid grouped by category */}
        {['Salón', 'Terraza', 'Jardín', 'Barra', 'Camastros Alberca', 'Pedidos para llevar'].filter(c => c === 'Pedidos para llevar' || safeTables.some(t => t.category === c)).map(category => (
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
                  {/* Running Total */}
                  <div style={{
                    margin: '12px 0 0 0',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                    borderRadius: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total acumulado
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                        {selectedTableItems.length} {selectedTableItems.length === 1 ? 'producto' : 'productos'}
                      </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.5px' }}>
                      ${selectedTableItems.reduce((sum, i) => sum + i.price * i.qty, 0).toFixed(0)}
                    </div>
                  </div>
                  <div className="order-actions-grid" style={{ marginTop: 12, paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    const tipVal = isEfectivo ? 0 : (tipPercent === 'Otro' 
      ? parseFloat(customTip) || 0 
      : (tipPercent === 'none' 
          ? 0 
          : finalTotal * (parseFloat(tipPercent)/100)
        ));
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
            {showChangeCalculator ? (
              <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="label" style={{ margin: 0 }}>Calculadora de Cambio</label>
                  <button onClick={() => { setShowChangeCalculator(false); setCashReceived(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={18} />
                  </button>
                </div>
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
                  <span style={{ color: '#059669', fontWeight: 800, fontSize: 20 }}>${Math.max(0, (parseFloat(cashReceived) || 0) - grandTotal).toFixed(0)}</span>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 24 }}>
                <button 
                  onClick={() => setShowChangeCalculator(true)}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Calculator size={18} />
                  ¿Necesitas calcular el cambio?
                </button>
              </div>
            )}
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
                elapsedMinutes = Math.max(0, Math.floor((currentTime.getTime() - new Date(oldestPending.created_at).getTime()) / 60000));
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
                    <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 16 }}>
                      {oldestPending && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeliveryConfirmTable(tableId); }}
                          style={{
                            background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <Check size={16} strokeWidth={3} />
                          Completar
                        </button>
                      )}
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
                            
                            {isDone && (
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
              const closedKey = `closed-${order.id}`;
              const isClosedCollapsed = !expandedPedidos.includes(closedKey as any);
              const toggleClosed = () => setExpandedPedidos(prev =>
                prev.includes(closedKey as any) ? prev.filter(id => id !== (closedKey as any)) : [...prev, closedKey as any]
              );
              // Parse items_summary (format: "1x Producto, 2x Otro, ...")
              const rawSummary: string = order.items_summary || '';
              // Split by ', ' but avoid splitting within notes like "Desc: ..."
              const closedItems: string[] = rawSummary
                ? rawSummary.split(', ').filter((s: string) => s.trim().length > 0 && /^\d+x /.test(s.trim()))
                : [];
              return (
                <div className="qa-card" key={`closed-order-${order.id}`} style={{ padding: 0, overflow: 'hidden', opacity: 0.75 }}>
                  <div 
                    className="qa-header" 
                    onClick={toggleClosed}
                    style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderBottom: isClosedCollapsed ? 'none' : '1px solid #f1f5f9', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="qa-table-badge" style={{ opacity: 0.7 }}>Mesa {tableName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                        <Check size={14} strokeWidth={3} />
                        Cobrada
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      {isClosedCollapsed ? <ChevronDown size={20} strokeWidth={2.5} /> : <ChevronUp size={20} strokeWidth={2.5} />}
                    </div>
                  </div>
                  {!isClosedCollapsed && closedItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {closedItems.map((line: string, idx: number) => (
                        <div key={idx} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Check size={14} color="#10b981" strokeWidth={3} />
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#475569', textDecoration: 'line-through' }}>{line.trim()}</span>
                          </div>
                        </div>
                      ))}
                      {order.total > 0 && (
                        <div style={{ padding: '10px 16px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Total cobrado</span>
                          <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>${order.total}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!isClosedCollapsed && closedItems.length === 0 && rawSummary && (
                    <div style={{ padding: '12px 16px', fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap' }}>{rawSummary}</div>
                  )}
                  {!isClosedCollapsed && !rawSummary && (
                    <div style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Sin detalle disponible</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Confirmación de Entrega */}
        {deliveryConfirmTable !== null && (
          <div className="variants-modal-p" onClick={() => setDeliveryConfirmTable(null)} style={{ zIndex: 9999 }}>
            <div className="variants-modal-content scale-in" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', maxWidth: '400px' }}>
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '18px' }}>Confirmar entrega</h3>
                <button 
                  onClick={() => setDeliveryConfirmTable(null)}
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
                <p style={{ color: '#475569', marginBottom: '24px', fontWeight: 600, fontSize: '16px' }}>¿Marcar la comanda completa de la mesa como entregada?</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setDeliveryConfirmTable(null)}
                    style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      const pendingIds = (activeItems || [])
                        .filter(i => i.table_id === deliveryConfirmTable && i.status === 'pending')
                        .map(i => i.id);
                      await markTableDone(pendingIds);
                      setDeliveryConfirmTable(null);
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
      notifyReservationChange();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoadingCheckins(false);
    }
  };

  const handleCancelRes = async (res: Reservation) => {
    if (!window.confirm(`¿Estás seguro de que deseas cancelar la reserva de ${res.guestName}?`)) return;
    
    try {
      setIsLoadingCheckins(true);
      await updateReservationStatus(res.id, 'cancelled');
      alert('Reserva cancelada correctamente');
      setUpcomingCheckins(prev => prev.filter(r => r.id !== res.id));
      notifyReservationChange();
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
        {currentView === 'control-financiero' && renderControlFinanciero()}
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
                const propinasEfectivoAMostrar = overrideCashTips !== '' ? Number(overrideCashTips) : 0;
                const propinasTotales = todayTotalTips - todayCashTips + propinasEfectivoAMostrar;
                const ventasHotel = hotelCardSales + hotelCashSales;
                const ventasTotales = ventasRestauranteBase + ventasHotel;
                
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
                        {/* Pesos = fondo inicial - compras + ventas en efectivo */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Pesos:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(pettyCashInitial - todayExpenses + totalEfectivoPesos)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Dólares convertidos:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(dolaresEfectivoConvertido)}</span>
                        </div>
                        {/* Tarjetas = total cobrado en tarjeta incl. propinas */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Tarjetas:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(totalTarjeta + todayCardTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Transferencias:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(totalTransferencia + todayTransferTips)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Compras:</span>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatCurrency(todayExpenses)}</span>
                        </div>
                        {/* Venta Total = Ingresos totales (debe coincidir siempre) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Venta Total:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(ventasTotales)}</span>
                        </div>
                        {/* Fondo + Propinas = Pesos + Dólares + Tarjetas + Transfer + Compras - VentaTotal */}
                        {(() => {
                          const pesosVal = pettyCashInitial - todayExpenses + totalEfectivoPesos;
                          const fondoPropinas = pesosVal + dolaresEfectivoConvertido + (totalTarjeta + todayCardTips) + (totalTransferencia + todayTransferTips) + todayExpenses - ventasTotales;
                          const fondo = fondoPropinas - propinasTC;
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>Fondo + Propinas en tarjetas:</span>
                                <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(fondoPropinas)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>Propinas en tarjetas:</span>
                                <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(propinasTC)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                                <span>Fondo:</span>
                                <span>{formatCurrency(fondo)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Propinas */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Propinas</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', alignItems: 'center' }}>
                          <span>Propinas en efectivo:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isEditingCashTips ? (
                              <input 
                                type="number" 
                                value={overrideCashTips} 
                                onChange={e => setOverrideCashTips(e.target.value)} 
                                style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} 
                                autoFocus
                                onBlur={() => setIsEditingCashTips(false)}
                                onKeyDown={e => { if (e.key === 'Enter') setIsEditingCashTips(false); }}
                              />
                            ) : (
                              <>
                                <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(propinasEfectivoAMostrar)}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setIsEditingCashTips(true); }}
                                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                                >
                                  <Pencil size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Propinas en tarjetas:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency(propinasTC)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                          <span>Total propinas:</span>
                          <span style={{ color: '#16a34a' }}>{formatCurrency(propinasTotales)}</span>
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
                          <span style={{ fontWeight: 600 }}>{formatCurrency(propinasTotales)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e40af' }}>
                          <span>Gastos:</span>
                          <span style={{ fontWeight: 600, color: '#dc2626' }}>-{formatCurrency(todayExpenses)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed #93c5fd', fontWeight: 800, color: '#1e3a8a', fontSize: '16px' }}>
                          <span>Entrega final del día:</span>
                          <span>{formatCurrency(ventasTotales + propinasTotales - todayExpenses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Desglose de entrega */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desglose de entrega</h4>
                      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Efectivo:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{formatCurrency((pettyCashInitial + totalEfectivoPesos - todayExpenses + propinasEfectivoAMostrar) - 5000)}</span>
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
                          <span>{formatCurrency(((pettyCashInitial + totalEfectivoPesos - todayExpenses + propinasEfectivoAMostrar) - 5000) + dolaresEfectivoConvertido + (totalTarjeta + todayCardTips) + (totalTransferencia + todayTransferTips))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>


            {/* ── Modal de confirmación de cierre ── */}
            {showCierreConfirm && (
              <div onClick={() => setShowCierreConfirm(false)} style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 24,
              }}>
                <div onClick={e => e.stopPropagation()} style={{
                  background: '#fff', borderRadius: 24, padding: 32,
                  maxWidth: 380, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
                  textAlign: 'center', animation: 'fadeIn 0.18s ease',
                }}>
                  <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                    ¿Confirmar cierre general?
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
                    Esta acción <strong>archivará todas las comandas, ventas y gastos</strong> del turno actual y no se puede deshacer fácilmente.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                      disabled={isClosingTurn}
                      onClick={async () => {
                        if (isClosingTurn) return;
                        try {
                          setIsClosingTurn(true);
                          const result = await closeDay(
                            currentUser?.name || 'Administrador',
                            overrideCashTips !== '' ? Number(overrideCashTips) : todayCashTips
                          );
                          if (!result.success) {
                            const errMsg = result.error instanceof Error ? result.error.message : JSON.stringify(result.error);
                            throw new Error(errMsg || 'Error desconocido al ejecutar el cierre');
                          }
                          setShowCierreConfirm(false);
                          setIsCierreModalOpen(false);
                          alert('✅ Cierre general completado con éxito.');
                        } catch (err) {
                          alert('❌ Error al ejecutar el cierre: ' + (err instanceof Error ? err.message : String(err)));
                        } finally {
                          setIsClosingTurn(false);
                        }
                      }}
                      style={{
                        height: 52, borderRadius: 14, border: 'none', cursor: isClosingTurn ? 'not-allowed' : 'pointer',
                        background: isClosingTurn ? '#94a3b8' : 'linear-gradient(135deg, #dc2626, #991b1b)',
                        color: '#fff', fontSize: 16, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        opacity: isClosingTurn ? 0.7 : 1,
                      }}
                    >
                      {isClosingTurn ? (<><div className="spinner-small" /> Ejecutando...</>) : (<><Lock size={18} /> Sí, ejecutar cierre</>)}
                    </button>
                    <button
                      onClick={() => setShowCierreConfirm(false)}
                      style={{
                        height: 48, borderRadius: 14, border: '2px solid #e2e8f0',
                        background: '#f8fafc', color: '#475569', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              className={`btn-primary cierre-submit`}
              disabled={isClosingTurn}
              onClick={() => setShowCierreConfirm(true)}
              style={{
                marginTop: 12, height: 56, fontSize: 16, fontWeight: 800,
                opacity: isClosingTurn ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
              }}
            >
              <Lock size={20} />
              Ejecutar Cierre General
            </button>

            {/* Botón Imprimir Cierre */}
            <button
              onClick={() => {
                const propinasEfectivoAMostrar = overrideCashTips !== '' ? Number(overrideCashTips) : 0;
                const propinasTotales = todayTotalTips - todayCashTips + propinasEfectivoAMostrar;
                const ventasHotel = hotelCardSales + hotelCashSales;
                const ventasTotales = todayIncome + ventasHotel;
                const efectivoMXNHotel = hotelSalesList.filter((s: any) => s.currency === 'MXN' && s.payment_method === 'efectivo').reduce((acc: number, s: any) => acc + Number(s.amount), 0);
                const dolaresConv = hotelSalesList.filter((s: any) => s.currency === 'USD' && s.payment_method === 'efectivo').reduce((acc: number, s: any) => acc + (Number(s.amount) * (s.exchange_rate || exchangeRate)), 0);
                const totalEfectivoPesos = todayCashIncome + efectivoMXNHotel;
                const totalTarjeta = todayCardIncome + hotelCardSales;
                const totalTransferencia = todayTransferIncome;
                const propinasTC = todayCardTips + todayTransferTips;
                const entregaEfectivo = (pettyCashInitial + totalEfectivoPesos - todayExpenses) - 5000;
                const entregaTotal = entregaEfectivo + dolaresConv + (totalTarjeta + todayCardTips) + (totalTransferencia + todayTransferTips);
                const entregaFinal = ventasTotales + propinasTotales - todayExpenses;
                const fechaImp = new Date().toLocaleString('es-MX', { timeZone: 'America/Mazatlan', dateStyle: 'long', timeStyle: 'short' });
                const fw = formatCurrency;

                const printWin = window.open('', '_blank', 'width=420,height=750');
                if (!printWin) { alert('Permite ventanas emergentes para imprimir.'); return; }
                printWin.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Cierre Gallo Azul</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',Courier,monospace;font-size:13px;color:#000;padding:16px;max-width:380px;margin:auto;}.logo{text-align:center;font-size:20px;font-weight:bold;letter-spacing:3px;margin-bottom:3px;}.sub{text-align:center;font-size:11px;color:#444;margin-bottom:6px;}.fecha{text-align:center;font-size:11px;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:5px 0;margin-bottom:14px;}.sec{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #000;padding-bottom:3px;margin:14px 0 7px;}.row{display:flex;justify-content:space-between;padding:2px 0;font-size:12px;}.row.total{font-weight:bold;border-top:1px dashed #000;margin-top:4px;padding-top:5px;font-size:13px;}.row.grand{font-weight:bold;border-top:2px solid #000;margin-top:7px;padding-top:6px;font-size:15px;}.neg{color:#b00;}.foot{text-align:center;font-size:10px;color:#555;margin-top:20px;border-top:1px dashed #000;padding-top:8px;line-height:1.6;}.btn-volver{display:block;margin:28px auto 0;padding:14px 32px;background:#1e293b;color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;font-family:sans-serif;cursor:pointer;letter-spacing:0.3px;box-shadow:0 4px 16px rgba(0,0,0,0.18);}@media print{body{padding:4px;}.btn-volver{display:none;}}</style></head><body>
<div class="logo">GALLO AZUL</div>
<div class="sub">Restaurante &amp; Hotel — Todos Santos, BCS</div>
<div class="fecha">CIERRE DE JORNADA &nbsp;|&nbsp; ${fechaImp}</div>
<div class="sec">Reporte Diario</div>
<div class="row"><span>Ventas restaurante (Base):</span><span>${fw(todayIncome)}</span></div>
<div class="row"><span>Ventas hotel:</span><span>${fw(ventasHotel)}</span></div>
<div class="row total"><span>Ingresos totales:</span><span>${fw(ventasTotales)}</span></div>
<div class="sec">Corte</div>
<div class="row"><span>Pesos:</span><span>${fw(pettyCashInitial - todayExpenses + totalEfectivoPesos)}</span></div>
<div class="row"><span>Dólares convertidos:</span><span>${fw(dolaresConv)}</span></div>
<div class="row"><span>Tarjetas:</span><span>${fw(totalTarjeta + todayCardTips)}</span></div>
<div class="row"><span>Transferencias:</span><span>${fw(totalTransferencia + todayTransferTips)}</span></div>
<div class="row neg"><span>Compras:</span><span>${fw(todayExpenses)}</span></div>
<div class="row"><span>Venta Total:</span><span>${fw(ventasTotales)}</span></div>
<div class="row"><span>Fondo + Propinas en tarjetas:</span><span>${fw((pettyCashInitial - todayExpenses + totalEfectivoPesos) + dolaresConv + (totalTarjeta + todayCardTips) + (totalTransferencia + todayTransferTips) + todayExpenses - ventasTotales)}</span></div>
<div class="row"><span>Propinas en tarjetas:</span><span>${fw(propinasTC)}</span></div>
<div class="row total"><span>Fondo:</span><span>${fw((pettyCashInitial - todayExpenses + totalEfectivoPesos) + dolaresConv + (totalTarjeta + todayCardTips) + (totalTransferencia + todayTransferTips) + todayExpenses - ventasTotales - propinasTC)}</span></div>
<div class="sec">Propinas</div>
<div class="row"><span>Propinas en efectivo:</span><span>${fw(propinasEfectivoAMostrar)}</span></div>
<div class="row"><span>Propinas en tarjetas:</span><span>${fw(propinasTC)}</span></div>
<div class="row total"><span>Total propinas:</span><span>${fw(propinasTotales)}</span></div>
<div class="sec">Entrega</div>
<div class="row"><span>Ventas totales:</span><span>${fw(ventasTotales)}</span></div>
<div class="row"><span>Total propinas:</span><span>${fw(propinasTotales)}</span></div>
<div class="row neg"><span>Compras:</span><span>-${fw(todayExpenses)}</span></div>
<div class="row grand"><span>Entrega final del día:</span><span>${fw(entregaFinal)}</span></div>
<div class="sec">Desglose de Entrega</div>
<div class="row"><span>Efectivo:</span><span>${fw(entregaEfectivo)}</span></div>
<div class="row"><span>Dólares:</span><span>${fw(dolaresConv)}</span></div>
<div class="row"><span>Tarjetas (incl. propina):</span><span>${fw(totalTarjeta + todayCardTips)}</span></div>
<div class="row"><span>Transferencias:</span><span>${fw(totalTransferencia + todayTransferTips)}</span></div>
<div class="row grand"><span>Entrega:</span><span>${fw(entregaTotal)}</span></div>
<div class="foot">Impreso por: ${currentUser?.name || 'Administrador'}</div>
<button onclick="window.close()" class="btn-volver">← Volver a la app</button>
</body></html>`);
                printWin.document.close();
                printWin.focus();
                setTimeout(() => { printWin.print(); }, 350);
              }}
              style={{ marginTop: 10, height: 50, width: '100%', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f1f5f9', color: '#334155', border: '1.5px solid #e2e8f0', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <Printer size={18} strokeWidth={2.5} /> Imprimir cierre
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Huésped</label>
                  <input type="text" value={hotelGuestName} onChange={(e) => setHotelGuestName(e.target.value)} placeholder="Ej: Juan Pérez" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Hab.</label>
                  <input type="text" value={hotelRoomName} onChange={(e) => setHotelRoomName(e.target.value)} placeholder="Ej: Hab 2" style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }} />
                </div>
              </div>
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
                  await addHotelSale(numericalValue, hotelCurrency, hotelPaymentMethod, undefined, hotelGuestName, hotelRoomName);
                  setIsHotelModalOpen(false);
                  setHotelAmount('');
                  setHotelGuestName('');
                  setHotelRoomName('');
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
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Mesa: {tables.find(t => t.id === previewTicket.table_id)?.name || previewTicket.table_id}</div>
                <div style={{ fontSize: 14, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{previewTicket.items_summary}</div>
              </div>

              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  <span>Total:</span>
                  <span style={{ color: '#10b981' }}>{formatCurrency(previewTicket.total)}</span>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                {new Date(previewTicket.created_at).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Botón Rectificar cuenta */}
              <button
                id="btn-rectificar-cuenta"
                onClick={async () => {
                  if (!previewTicket.id || !previewTicket.table_id) return;
                  const btn = document.getElementById('btn-rectificar-cuenta') as HTMLButtonElement;
                  if (btn) { btn.disabled = true; btn.textContent = 'Reabriendo…'; }
                  const result = await rectificarCuenta(previewTicket.id, previewTicket.table_id);
                  if (result?.success) {
                    setPreviewTicket(null);
                    setSelectedTableId(previewTicket.table_id);
                    setCurrentView('mesa');
                  } else {
                    alert('Error al rectificar la cuenta. Intenta de nuevo.');
                    if (btn) { btn.disabled = false; btn.textContent = '✏️ Rectificar cuenta'; }
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                  transition: 'all 0.2s',
                  letterSpacing: '-0.2px',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.45)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.35)'; }}
              >
                <Pencil size={17} strokeWidth={2.5} /> Rectificar cuenta
              </button>
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

      {/* Modal Éxito de Pago — Flujo Híbrido */}
      {paymentSuccessModal?.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000, padding: 16 }} onClick={() => setPaymentSuccessModal(null)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', borderRadius: 24, padding: 0, overflow: 'hidden', textAlign: 'center' }}>
            {/* Success header */}
            <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', padding: '28px 28px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 30 }}>
                ✅
              </div>
              <h2 style={{ color: 'white', margin: 0, fontSize: 20, fontWeight: 800 }}>Pago registrado</h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0', fontSize: 13 }}>
                {paymentSuccessModal.guestName}
              </p>
            </div>

            {/* Details */}
            <div style={{ padding: '20px 28px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#15803d' }}>
                  {paymentSuccessModal.currency} ${paymentSuccessModal.amount.toLocaleString('es-MX')}
                </div>
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                  {{cash:'Efectivo', creditCard:'Tarjeta de crédito', bankTransfer:'Transferencia', check:'Cheque', paypal:'PayPal', paymentLink:'Pago online'}[paymentSuccessModal.method] || paymentSuccessModal.method}
                </div>
              </div>

              <button
                onClick={() => setPaymentSuccessModal(null)}
                style={{ width: '100%', padding: '12px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {renderCheckinModal()}
      {renderHotelPaymentModal()}
      {renderNewResModal()}

      {/* ══════════ MODAL: VENTAS HOTEL ══════════ */}
      {/* ══════════ MODAL: VENTAS RESTAURANTE ══════════ */}
      {showRestaurantSalesModal && (() => {
        const closed = (todayClosedOrders || []).slice().reverse();
        const pmIcon = (pm: string) => pm === 'tarjeta' ? '💳' : pm === 'transferencia' ? '🏦' : '💵';
        return (
          <div className="modal-overlay" style={{ zIndex: 4000, padding: 16 }} onClick={() => setShowRestaurantSalesModal(false)}>
            <div className="modal-content fade-in" style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, padding: 28 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>🍽️ Ventas Restaurante</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{closed.length} cuenta(s) cerrada(s) en el turno actual</p>
                </div>
                <button onClick={() => setShowRestaurantSalesModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>✕ Cerrar</button>
              </div>

              {closed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                  <p style={{ margin: 0, fontWeight: 600 }}>No hay ventas de restaurante en este turno</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {closed.map((order: any) => {
                    const total = Number(order.final_total ?? order.total ?? 0);
                    const tip = Number(order.tip ?? 0);
                    const pm = order.payment_method || 'efectivo';
                    const tableName = order.table_name || (order.table_id ? `Mesa ${order.table_id}` : '—');
                    const closedAt = order.closed_at || order.updated_at || order.created_at;
                    return (
                      <div key={order.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            {pmIcon(pm)} {pm.charAt(0).toUpperCase() + pm.slice(1)} · 🪑 {tableName}
                            {tip > 0 ? ` · 🙌 Propina $${tip.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{closedAt ? new Date(closedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={async () => { if (window.confirm('¿Eliminar este registro de venta?')) { await deleteClosedOrder(order.id); } }}
                            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑 Borrar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Total del turno:</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{formatCurrency(todayIncome)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {showHotelSalesModal && (() => {
        const fmt = (n: number, cur = 'MXN') => cur === 'USD'
          ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
          : `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
        return (
          <div className="modal-overlay" style={{ zIndex: 4000, padding: 16 }} onClick={() => { setShowHotelSalesModal(false); setEditingHotelSale(null); }}>
            <div className="modal-content fade-in" style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, padding: 28 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>💳 Ventas Hotel</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{hotelSalesList.length} registro(s) del turno actual</p>
                </div>
                <button onClick={() => { setShowHotelSalesModal(false); setEditingHotelSale(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>✕ Cerrar</button>
              </div>

              {hotelSalesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                  <p style={{ margin: 0, fontWeight: 600 }}>No hay ventas de hotel registradas en este turno</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {hotelSalesList.map((sale: any) => (
                    <div key={sale.id}>
                      {editingHotelSale?.id === sale.id ? (
                        /* ── Edit form ── */
                        <div style={{ background: '#f0f9ff', border: '2px solid #38bdf8', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#0c4a6e', marginBottom: 4 }}>✏️ Editando registro</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Monto</label>
                              <input type="number" value={editHotelForm.amount} onChange={e => setEditHotelForm(p => ({ ...p, amount: e.target.value }))}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #bae6fd', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Moneda</label>
                              <select value={editHotelForm.currency} onChange={e => setEditHotelForm(p => ({ ...p, currency: e.target.value }))}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #bae6fd', fontSize: 14, fontWeight: 600 }}>
                                <option value="MXN">MXN</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Método de pago</label>
                            <select value={editHotelForm.payment_method} onChange={e => setEditHotelForm(p => ({ ...p, payment_method: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #bae6fd', fontSize: 14, fontWeight: 600 }}>
                              <option value="efectivo">Efectivo</option>
                              <option value="tarjeta">Tarjeta</option>
                              <option value="transferencia">Transferencia</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nota (opcional)</label>
                            <input type="text" value={editHotelForm.note} onChange={e => setEditHotelForm(p => ({ ...p, note: e.target.value }))}
                              placeholder="Nombre del huésped, habitación..."
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #bae6fd', fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingHotelSale(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>Cancelar</button>
                            <button onClick={async () => {
                              await updateHotelSale(sale.id, parseFloat(editHotelForm.amount), editHotelForm.currency, editHotelForm.payment_method, editHotelForm.note);
                              setEditingHotelSale(null);
                            }} style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Guardar</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Row view ── */
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{fmt(Number(sale.amount), sale.currency)}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                              {sale.payment_method === 'tarjeta' ? '💳 Tarjeta' : sale.payment_method === 'transferencia' ? '🏦 Transferencia' : '💵 Efectivo'}
                              {sale.note ? ` · ${sale.note}` : ''}
                            </span>
                            {(sale.guest_name || sale.room_name || sale.room_number) && (
                              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                👤 {sale.guest_name || 'Huésped'}
                                {sale.room_number
                                  ? ` · 🚪 ${parseInt(sale.room_number) <= 4 ? `Loft ${sale.room_number}` : `Habitación ${sale.room_number}`}`
                                  : sale.room_name ? ` · 🚪 ${sale.room_name}` : ''}
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{sale.created_at ? new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditingHotelSale(sale); setEditHotelForm({ amount: String(sale.amount), currency: sale.currency, payment_method: sale.payment_method, note: sale.note || '' }); }}
                              style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ Editar</button>
                            <button onClick={async () => { 
                              if (window.confirm('¿Eliminar este registro de venta?')) { 
                                if (sale.reservation_id) {
                                  try { await updateReservationStatus(sale.reservation_id, undefined, undefined, undefined, false); }
                                  catch (err) { console.error('Error updating Hostaway status', err); }
                                  
                                  setUpcomingCheckins(prev => prev.map(r =>
                                    String(r.id) === String(sale.reservation_id)
                                      ? { ...r, isPaid: false, paymentStatus: 'Por Pagar' }
                                      : r
                                  ));
                                }
                                await deleteHotelSale(sale.id); 
                              } 
                            }}
                              style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑 Borrar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Total del turno:</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{formatCurrency(hotelCardSales + hotelCashSales)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════ MODAL: GASTOS ══════════ */}
      {showGastosModal && (() => {
        return (
          <div className="modal-overlay" style={{ zIndex: 4000, padding: 16 }} onClick={() => { setShowGastosModal(false); setEditingExpense(null); }}>
            <div className="modal-content fade-in" style={{ maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, padding: 28 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>💸 Gastos del Turno</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{todayExpensesList.length} gasto(s) registrado(s)</p>
                </div>
                <button onClick={() => { setShowGastosModal(false); setEditingExpense(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>✕ Cerrar</button>
              </div>

              {todayExpensesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <p style={{ margin: 0, fontWeight: 600 }}>No se han registrado gastos en este turno</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {todayExpensesList.map((exp: any) => (
                    <div key={exp.id}>
                      {editingExpense?.id === exp.id ? (
                        /* ── Edit form ── */
                        <div style={{ background: '#fff7ed', border: '2px solid #fb923c', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#7c2d12', marginBottom: 4 }}>✏️ Editando gasto</div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Monto (MXN)</label>
                            <input type="number" value={editExpenseForm.amount} onChange={e => setEditExpenseForm(p => ({ ...p, amount: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #fed7aa', fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Concepto</label>
                            <input type="text" value={editExpenseForm.concept} onChange={e => setEditExpenseForm(p => ({ ...p, concept: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #fed7aa', fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Detalle</label>
                            <input type="text" value={editExpenseForm.detail} onChange={e => setEditExpenseForm(p => ({ ...p, detail: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1.5px solid #fed7aa', fontSize: 13, boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingExpense(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>Cancelar</button>
                            <button onClick={async () => {
                              await updateExpense(exp.id, parseFloat(editExpenseForm.amount), editExpenseForm.concept, editExpenseForm.detail);
                              setEditingExpense(null);
                            }} style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Guardar</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Row view ── */
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: '#dc2626' }}>-{formatCurrency(Number(exp.amount))}</span>
                            <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{exp.concept || 'Sin concepto'}</span>
                            {exp.detail && <span style={{ fontSize: 12, color: '#64748b' }}>{exp.detail}</span>}
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{exp.created_at ? new Date(exp.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditingExpense(exp); setEditExpenseForm({ amount: String(exp.amount), concept: exp.concept || '', detail: exp.detail || '' }); }}
                              style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ Editar</button>
                            <button onClick={async () => { if (window.confirm('¿Eliminar este gasto?')) { await deleteExpense(exp.id); } }}
                              style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑 Borrar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Total gastos:</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>-{formatCurrency(todayExpenses)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {showRoomAssignModal && (
        <div className="modal-overlay" style={{ zIndex: 4000, padding: 16 }} onClick={() => setShowRoomAssignModal(false)}>
          <div className="modal-content fade-in" style={{ maxWidth: 400, width: '100%', borderRadius: 24, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 900, color: '#0f172a' }}>Asignar Habitación</h2>
            {roomAssignData.guestName && (
              <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16, fontWeight: 600 }}>
                Huésped: {roomAssignData.guestName}
              </div>
            )}
            
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>Selecciona la habitación (1-14)</label>
            <select
              value={roomAssignData.currentRoom || ''}
              onChange={(e) => setRoomAssignData({ ...roomAssignData, currentRoom: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '2px solid #e2e8f0',
                fontSize: 15,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 24,
                backgroundColor: '#f8fafc'
              }}
            >
              <option value="">-- Seleccionar --</option>
              {Array.from({ length: 14 }, (_, i) => String(i + 1)).map(num => {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                const isOccupied = registrations.some((r: any) => {
                  if (String(r.room_number) !== num || !r.arrival_date || !r.departure_date) return false;
                  const arr = String(r.arrival_date).slice(0, 10);
                  const dep = String(r.departure_date).slice(0, 10);
                  if (!(arr <= todayStr && dep > todayStr)) return false;
                  if (r.hostaway_reservation_id) {
                    return upcomingCheckins.some((res: any) => String(res.id) === String(r.hostaway_reservation_id));
                  }
                  return true;
                });
                const isCurrent = roomAssignData.currentRoom === num;
                const disabled = isOccupied && !isCurrent;
                const roomLabel = parseInt(num) <= 4 ? `Loft ${num}` : `Habitación ${num}`;
                return (
                  <option key={num} value={num} disabled={disabled} style={{ color: disabled ? '#94a3b8' : '#0f172a' }}>
                    {roomLabel}{disabled ? ' 🔴 Ocupada' : ' 🟢 Disponible'}
                  </option>
                );
              })}
            </select>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setShowRoomAssignModal(false)}
                style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '12px', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (!roomAssignData.currentRoom) {
                      setShowRoomAssignModal(false);
                      return;
                    }
                    if (roomAssignData.registrationId) {
                      await supabase.from('guest_registrations').update({ room_number: roomAssignData.currentRoom }).eq('id', roomAssignData.registrationId);
                    } else if (roomAssignData.hostawayReservationId) {
                      const res = upcomingCheckins.find(r => r.id === roomAssignData.hostawayReservationId);
                      if (res) {
                        await supabase.from('guest_registrations').insert({
                          hostaway_reservation_id: res.id,
                          name: res.guestName,
                          room_name: res.roomName,
                          room_number: roomAssignData.currentRoom,
                          arrival_date: res.arrivalDate,
                          departure_date: res.departureDate,
                          nights: res.nights,
                          price: res.totalAmount,
                          source: res.sourceName,
                          status: 'registered'
                        });
                      }
                    }
                    await fetchRegistrations();
                    setShowRoomAssignModal(false);
                  } catch (e: any) {
                    alert('Error al asignar: ' + e.message);
                  }
                }}
                style={{ flex: 1, background: '#3b82f6', color: 'white', padding: '12px', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (() => {
        const CONTRACT_TERMS: Record<string, {
          flag: string; label: string;
          title: string; subtitle: string;
          rules_title: string; rules: { icon: string; text: string }[];
          reminders_title: string; reminders: { icon: string; text: string }[];
          pool_title: string; pool_schedule: string; pool_rules: { icon: string; text: string }[];
          consent: string;
        }> = {
          es: {
            flag: '🇲🇽', label: 'ES',
            title: 'Contrato de Estancia',
            subtitle: 'Reglamento y condiciones del Gallo Azul Hotel',
            rules_title: '📋 Reglamento General',
            rules: [
              { icon: '🕛', text: 'Check-out: 12:00 PM' },
              { icon: '🚭', text: 'No fumar en las instalaciones' },
              { icon: '🐾', text: 'No se permiten mascotas' },
              { icon: '🎉', text: 'Prohibido hacer fiestas o tener invitados' },
              { icon: '🔇', text: 'Horario de silencio: 9:30 PM – 9:30 AM' },
            ],
            reminders_title: '💡 Recordatorios',
            reminders: [
              { icon: '❄️', text: 'Apaga el aire acondicionado y electrodomésticos al salir de la habitación' },
            ],
            pool_title: '🏊 Área de Piscina',
            pool_schedule: 'Horario: 9:00 AM – 9:00 PM',
            pool_rules: [
              { icon: '👙', text: 'Utilizar siempre traje de baño' },
              { icon: '🚿', text: 'Ducharse antes de entrar a la piscina' },
              { icon: '👶', text: 'Los niños siempre bajo supervisión de un adulto' },
              { icon: '🏃', text: 'No correr en el área de la piscina' },
              { icon: '🍔', text: 'No se permiten alimentos ni bebidas dentro de la alberca' },
              { icon: '🔊', text: 'No se permiten parlantes o bocinas' },
              { icon: '🍾', text: 'No se permite vidrio de ningún tipo' },
              { icon: '🤿', text: 'No tirarse clavados' },
            ],
            consent: 'Al firmar este documento, el huésped declara haber leído, comprendido y aceptado el reglamento y condiciones del Gallo Azul Hotel.',
          },
          en: {
            flag: '🇺🇸', label: 'EN',
            title: 'Stay Contract',
            subtitle: 'Gallo Azul Hotel Rules and Conditions',
            rules_title: '📋 General Rules',
            rules: [
              { icon: '🕛', text: 'Check-out: 12:00 PM' },
              { icon: '🚭', text: 'No smoking on the premises' },
              { icon: '🐾', text: 'Pets are not allowed' },
              { icon: '🎉', text: 'Parties or outside guests are strictly prohibited' },
              { icon: '🔇', text: 'Quiet hours: 9:30 PM – 9:30 AM' },
            ],
            reminders_title: '💡 Reminders',
            reminders: [
              { icon: '❄️', text: 'Turn off the AC and appliances when leaving the room' },
            ],
            pool_title: '🏊 Pool Area',
            pool_schedule: 'Hours: 9:00 AM – 9:00 PM',
            pool_rules: [
              { icon: '👙', text: 'Swimwear is required at all times' },
              { icon: '🚿', text: 'Shower before entering the pool' },
              { icon: '👶', text: 'Children must be supervised by an adult at all times' },
              { icon: '🏃', text: 'No running in the pool area' },
              { icon: '🍔', text: 'No food or drinks allowed inside the pool' },
              { icon: '🔊', text: 'No speakers or loud music allowed' },
              { icon: '🍾', text: 'No glass of any kind is permitted' },
              { icon: '🤿', text: 'No diving' },
            ],
            consent: 'By signing this document, the guest declares to have read, understood, and accepted the rules and conditions of Gallo Azul Hotel.',
          },
          fr: {
            flag: '🇫🇷', label: 'FR',
            title: 'Contrat de Séjour',
            subtitle: 'Règlement et conditions du Gallo Azul Hotel',
            rules_title: '📋 Règlement Général',
            rules: [
              { icon: '🕛', text: 'Check-out : 12h00' },
              { icon: '🚭', text: "Interdiction de fumer dans l'établissement" },
              { icon: '🐾', text: 'Les animaux de compagnie ne sont pas autorisés' },
              { icon: '🎉', text: 'Les fêtes et les invités extérieurs sont strictement interdits' },
              { icon: '🔇', text: 'Heures de silence : 21h30 – 9h30' },
            ],
            reminders_title: '💡 Rappels',
            reminders: [
              { icon: '❄️', text: "Éteignez la climatisation et les appareils électriques en quittant la chambre" },
            ],
            pool_title: '🏊 Espace Piscine',
            pool_schedule: 'Horaires : 9h00 – 21h00',
            pool_rules: [
              { icon: '👙', text: 'Le port du maillot de bain est obligatoire' },
              { icon: '🚿', text: "Douche obligatoire avant d'entrer dans la piscine" },
              { icon: '👶', text: "Les enfants doivent toujours être sous la surveillance d'un adulte" },
              { icon: '🏃', text: 'Ne pas courir autour de la piscine' },
              { icon: '🍔', text: 'Nourriture et boissons interdites dans la piscine' },
              { icon: '🔊', text: 'Les enceintes et la musique forte sont interdites' },
              { icon: '🍾', text: 'Le verre est strictement interdit' },
              { icon: '🤿', text: 'Plongeons interdits' },
            ],
            consent: 'En signant ce document, le client déclare avoir lu, compris et accepté le règlement et les conditions du Gallo Azul Hotel.',
          },
        };
        const cl = CONTRACT_TERMS[contractViewLang] || CONTRACT_TERMS.es;
        const reg = showContractModal;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: '24px 24px 0 0', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Gallo Azul Hotel</div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>📄 {cl.title}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{cl.subtitle}</p>
                  </div>
                  <button onClick={() => { setShowContractModal(null); setContractViewLang('es'); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                    <X size={18} color="#fff" />
                  </button>
                </div>
                {/* Language switcher */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(CONTRACT_TERMS).map(([code, l]) => (
                    <button key={code} onClick={() => setContractViewLang(code)} style={{ background: contractViewLang === code ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', border: contractViewLang === code ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.15)', color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: contractViewLang === code ? 800 : 500, cursor: 'pointer' }}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Guest info */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Huésped</div>
                  <div style={{ fontSize: 17, color: '#0f172a', fontWeight: 800 }}>{reg.name}</div>
                  {reg.arrival_date && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{reg.arrival_date} → {reg.departure_date} · {reg.nights} noches</div>}
                </div>

                {/* Rules */}
                <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ background: '#1e3a5f', padding: '10px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{cl.rules_title}</div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cl.rules.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                        <span style={{ fontSize: 16 }}>{r.icon}</span> {r.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reminders */}
                <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ background: '#0f766e', padding: '10px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{cl.reminders_title}</div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cl.reminders.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                        <span style={{ fontSize: 16 }}>{r.icon}</span> {r.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pool rules */}
                <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ background: '#0369a1', padding: '10px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{cl.pool_title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{cl.pool_schedule}</div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cl.pool_rules.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155' }}>
                        <span style={{ fontSize: 16 }}>{r.icon}</span> {r.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consent text */}
                <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600, lineHeight: 1.5 }}>
                    ✅ {cl.consent}
                  </div>
                </div>

                {/* Signature */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Firma del Huésped</div>
                  {(reg.signature_data || reg.signature) ? (
                    <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'center' }}>
                      <img src={reg.signature_data || reg.signature} alt="Firma del huésped" style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No hay firma registrada</div>
                  )}
                </div>

                {/* ID photo */}
                {(reg.id_photo_data || reg.id_photo) && (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Identificación Oficial</div>
                    <div style={{ background: '#fff', padding: 12, borderRadius: 10, border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'center' }}>
                      <img src={reg.id_photo_data || reg.id_photo} alt="ID del huésped" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      </div>
    </>
  );
}
