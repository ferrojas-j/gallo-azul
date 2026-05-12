const fs=require('fs');
const part1=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Control Financiero · Gallo Azul</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/><script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script><style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--indigo:#4f46e5;--indigo-dark:#3730a3;--slate-50:#f8fafc;--slate-100:#f1f5f9;--slate-200:#e2e8f0;--slate-300:#cbd5e1;--slate-400:#94a3b8;--slate-500:#64748b;--slate-700:#334155;--slate-800:#1e293b;--slate-900:#0f172a;--emerald:#10b981;--rose:#f43f5e;--amber:#f59e0b;--sky:#0ea5e9}
body{font-family:'Inter',system-ui,sans-serif;background:var(--slate-50);color:var(--slate-900);min-height:100vh;display:flex}
.sidebar{width:220px;min-height:100vh;background:#0f172a;display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto}
.sidebar-brand{padding:24px 20px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
.brand-logo{width:36px;height:36px;background:linear-gradient(135deg,var(--indigo),var(--indigo-dark));border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
.brand-logo svg{width:20px;height:20px;stroke:white;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.brand-name{font-size:15px;font-weight:800;color:#fff;line-height:1.2}
.brand-sub{font-size:11px;color:rgba(255,255,255,.4);font-weight:500}
.sidebar-nav{padding:16px 12px;flex:1}
.nav-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1.2px;padding:0 8px;margin:16px 0 6px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:rgba(255,255,255,.55);transition:all .15s;margin-bottom:2px}
.nav-item:hover{background:rgba(255,255,255,.07);color:rgba(255,255,255,.85)}
.nav-item.active{background:rgba(79,70,229,.25);color:#818cf8}
.nav-item svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
.nav-sub{padding-left:36px}
.nav-sub-item{display:block;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;color:rgba(255,255,255,.4);cursor:pointer;transition:all .12s;margin-bottom:1px}
.nav-sub-item:hover{color:rgba(255,255,255,.75)}
.nav-sub-item.active{color:#a5b4fc;background:rgba(79,70,229,.15)}
.main-content{flex:1;min-width:0;display:flex;flex-direction:column}
.page-header{display:flex;align-items:center;justify-content:space-between;padding:28px 36px 0;flex-wrap:wrap;gap:12px}
.page-title{font-size:24px;font-weight:800;letter-spacing:-.5px;color:var(--slate-900)}
.sync-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--indigo),var(--indigo-dark));color:#fff;border:none;padding:10px 20px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;transition:all .2s}
.sync-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,70,229,.35)}
.sync-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sync-btn.loading svg{animation:spin 1s linear infinite}
@keyframes spin{100%{transform:rotate(360deg)}}
.content-body{padding:24px 36px 40px;flex:1}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
.kpi-card{background:#fff;border:1px solid var(--slate-200);border-radius:14px;padding:20px 24px;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.kpi-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}
.kpi-card:nth-child(1)::before{background:var(--indigo)}
.kpi-card:nth-child(2)::before{background:var(--emerald)}
.kpi-card:nth-child(3)::before{background:var(--sky)}
.kpi-card:nth-child(4)::before{background:var(--rose)}
.kpi-label{font-size:11px;font-weight:700;color:var(--slate-400);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px}
.kpi-value{font-size:26px;font-weight:800;color:var(--slate-900);letter-spacing:-.5px;line-height:1.1}
.kpi-card:nth-child(4) .kpi-value{color:var(--rose)}
.kpi-sub{font-size:11px;color:var(--slate-400);margin-top:6px;font-weight:500}
.hotel-filter-bar{background:#fff;border:1px solid #dde3ec;border-radius:14px;overflow:hidden;box-shadow:0 1px 6px rgba(15,23,42,.06);margin-bottom:20px}
.hotel-filter-row{display:grid;grid-template-columns:90px 1fr;min-height:48px}
.hotel-filter-row:not(:last-child){border-bottom:1px solid #edf2f7}
.hotel-filter-label-cell{display:flex;align-items:center;padding:0 16px;background:#f8fafc;border-right:1px solid #edf2f7;font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.2px;white-space:nowrap;user-select:none;position:relative}
.hotel-filter-label-cell::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:3px;border-radius:0 3px 3px 0}
.label-accent-year::before{background:#6366f1}
.label-accent-month::before{background:#10b981}
.label-accent-channel::before{background:#f59e0b}
.hotel-filter-pills-cell{display:flex;align-items:center;flex-wrap:wrap;gap:5px;padding:8px 16px}
.month-pill,.channel-pill,.year-pill{padding:4px 13px;border:1.5px solid #e2e8f0;border-radius:7px;background:#fff;color:#64748b;font-size:12px;font-weight:600;cursor:pointer;transition:all .14s;white-space:nowrap;line-height:1.5}
.month-pill:hover,.year-pill:hover{border-color:#6366f1;color:#4f46e5;background:#eef2ff}
.channel-pill:hover{border-color:#94a3b8;background:#f8fafc;color:#334155}
.month-pill.active,.year-pill.active{background:#4f46e5;border-color:#4f46e5;color:#fff;font-weight:700}
.channel-pill.active{color:#fff;border-color:transparent;font-weight:700}
.table-container{background:#fff;border:1px solid var(--slate-200);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.05);overflow:hidden}
.table-header{padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--slate-100)}
.table-title{font-size:15px;font-weight:700;color:var(--slate-800)}
.table-badge{font-size:11px;font-weight:700;background:#f1f5f9;color:var(--slate-500);padding:4px 12px;border-radius:100px}
table{width:100%;border-collapse:collapse;text-align:left}
th{background:var(--slate-50);padding:11px 16px;font-size:11px;font-weight:700;color:var(--slate-400);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--slate-200);white-space:nowrap}
td{padding:14px 16px;font-size:13px;color:var(--slate-700);border-bottom:1px solid var(--slate-100)}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafbfc}
.channel-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;border:1px solid transparent}
.status-paid{background:#dcfce7;color:#166534;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;white-space:nowrap}
.status-pending{background:#fef9c3;color:#854d0e;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;white-space:nowrap}
.status-courtesy{background:#f3f4f6;color:#374151;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;white-space:nowrap}
.row-high-value{background:linear-gradient(90deg,#fffbeb,#fff 70%)}
.row-high-value>td:first-child{border-left:3px solid #f59e0b}
.hv-badge{display:inline-flex;align-items:center;font-size:10px;font-weight:800;color:#92400e;background:#fef3c7;border-radius:4px;padding:1px 6px;margin-left:5px;vertical-align:middle}
.loader-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;transition:opacity .3s}
.loader-overlay.hidden{opacity:0;pointer-events:none}
.spinner{width:38px;height:38px;border:4px solid var(--slate-200);border-top-color:var(--indigo);border-radius:50%;animation:spin 1s linear infinite}
</style></head><body>
<div id="globalLoader" class="loader-overlay"><div class="spinner"></div></div>
<div class="sidebar">
  <div class="sidebar-brand">
    <div class="brand-logo"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
    <div class="brand-name">Finanzas</div>
    <div class="brand-sub">Gallo Azul</div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-label">Módulos</div>
    <div class="nav-item active"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Ingresos</div>
    <div class="nav-sub">
      <div class="nav-sub-item active">Hotel</div>
      <div class="nav-sub-item">Restaurante</div>
    </div>
    <div class="nav-item"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>Gastos</div>
    <div class="nav-item"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Conciliaciones</div>
  </nav>
</div>
<div class="main-content">
  <div class="page-header">
    <h1 class="page-title">Ingresos por venta de habitaciones</h1>
    <button class="sync-btn" id="btnSync"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>Sincronizar</button>
  </div>
  <div class="content-body">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Ingresos Totales</div><div class="kpi-value" id="kpi-revenue">$0.00</div><div class="kpi-sub">Registros mostrados</div></div>
      <div class="kpi-card"><div class="kpi-label">Reservas</div><div class="kpi-value" id="kpi-res">0</div><div class="kpi-sub">Confirmadas / modificadas</div></div>
      <div class="kpi-card"><div class="kpi-label">ADR Promedio</div><div class="kpi-value" id="kpi-adr">$0.00</div><div class="kpi-sub">Ingreso / noche</div></div>
      <div class="kpi-card"><div class="kpi-label">Comisiones OTA</div><div class="kpi-value" id="kpi-com">$0.00</div><div class="kpi-sub">Pagadas a canales</div></div>
    </div>
    <div class="hotel-filter-bar">
      <div class="hotel-filter-row">
        <div class="hotel-filter-label-cell label-accent-year">Año</div>
        <div class="hotel-filter-pills-cell hotel-year-pills"><button class="year-pill active" data-year="2026">2026</button></div>
      </div>
      <div class="hotel-filter-row">
        <div class="hotel-filter-label-cell label-accent-month">Mes</div>
        <div class="hotel-filter-pills-cell hotel-month-pills">
          <button class="month-pill active" data-month="all">Todos</button>
          <button class="month-pill" data-month="01">Ene</button><button class="month-pill" data-month="02">Feb</button>
          <button class="month-pill" data-month="03">Mar</button><button class="month-pill" data-month="04">Abr</button>
          <button class="month-pill" data-month="05">May</button><button class="month-pill" data-month="06">Jun</button>
          <button class="month-pill" data-month="07">Jul</button><button class="month-pill" data-month="08">Ago</button>
          <button class="month-pill" data-month="09">Sep</button><button class="month-pill" data-month="10">Oct</button>
          <button class="month-pill" data-month="11">Nov</button><button class="month-pill" data-month="12">Dic</button>
        </div>
      </div>
      <div class="hotel-filter-row">
        <div class="hotel-filter-label-cell label-accent-channel">Canal</div>
        <div class="hotel-filter-pills-cell hotel-channel-pills" id="hotel-channel-pills"><button class="channel-pill active" data-channel="all" style="background:#4f46e5;color:#fff;border-color:#4f46e5">Todos</button></div>
      </div>
    </div>
    <div class="table-container">
      <div class="table-header">
        <span class="table-title">Detalle de Reservas</span>
        <span class="table-badge" id="hotel-table-badge">Cargando...</span>
      </div>
      <div style="overflow-x:auto">
        <table style="min-width:1100px">
          <thead><tr>
            <th style="min-width:110px">Fecha de reserva</th>
            <th style="min-width:100px">Check-in</th>
            <th style="min-width:140px">Huésped</th>
            <th>Habitación</th>
            <th>Noches</th>
            <th>Canal</th>
            <th style="text-align:right">Monto USD</th>
            <th style="text-align:right">Monto MXN</th>
            <th style="text-align:right">Comisión USD</th>
            <th style="text-align:right">Comisión MXN</th>
            <th>Estado</th>
          </tr></thead>
          <tbody id="hotel-table-body"><tr><td colspan="11" style="text-align:center;padding:48px;color:#94a3b8">Cargando reservas...</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
`;
fs.writeFileSync('public/finanzas_corporativas/index.html', part1, 'utf8');
console.log('Part 1 written. Size:', fs.statSync('public/finanzas_corporativas/index.html').size);
