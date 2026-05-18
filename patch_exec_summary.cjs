const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'finanzas_corporativas', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

const startMarker = '<style>\r\n/* ── RESUMEN EJECUTIVO — Premium Redesign';
const endMarker   = '/exec-summary -->';

const s = html.indexOf(startMarker);
const e = html.indexOf(endMarker) + endMarker.length;

if (s === -1 || e < endMarker.length) {
  console.error('❌ Marcadores no encontrados. s=' + s + ' e=' + e);
  process.exit(1);
}

const newBlock = `<style>
/* ── RESUMEN EJECUTIVO — Light Premium v2 ───────────────── */
#exec-summary {
  background: #ffffff;
  border-radius: 20px;
  padding: 0;
  margin-bottom: 28px;
  box-shadow: 0 4px 28px rgba(0,0,0,.08);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}
#exec-summary .es-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
#exec-summary .es-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #94a3b8;
}
#exec-summary .es-period {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin-left: 10px;
}
#exec-summary .es-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
#exec-summary .es-tab {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
}
#exec-summary .es-tab:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
#exec-summary .es-tab.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: #fff;
  box-shadow: 0 2px 8px rgba(79,70,229,.3);
}
/* Grid */
#exec-summary .es-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}
#exec-summary .es-col {
  padding: 22px 24px 24px;
  position: relative;
}
#exec-summary .es-col:not(:last-child) {
  border-right: 1px solid #f1f5f9;
}
/* Column pill header */
#exec-summary .es-col-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px 7px 8px;
  border-radius: 40px;
  margin-bottom: 20px;
}
#exec-summary .es-col-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
#exec-summary .es-col-name {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .02em;
}
.es-hotel .es-col-pill  { background: #fff7ed; border: 1.5px solid #fdba74; }
.es-hotel .es-col-icon  { background: linear-gradient(135deg,#f97316,#ea580c); }
.es-hotel .es-col-name  { color: #c2410c; }
.es-rest  .es-col-pill  { background: #eff6ff; border: 1.5px solid #93c5fd; }
.es-rest  .es-col-icon  { background: linear-gradient(135deg,#3b82f6,#1d4ed8); }
.es-rest  .es-col-name  { color: #1d4ed8; }
.es-total .es-col-pill  { background: #f0fdf4; border: 1.5px solid #86efac; }
.es-total .es-col-icon  { background: linear-gradient(135deg,#10b981,#059669); }
.es-total .es-col-name  { color: #047857; }
/* Big KPI card */
#exec-summary .es-kpi-card {
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
#exec-summary .es-kpi-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 6px;
}
#exec-summary .es-kpi-value {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1.2px;
  line-height: 1;
}
.es-hotel .es-kpi-card.income  { background: #fff7ed; border: 1px solid #fed7aa; }
.es-hotel .es-kpi-card.income .es-kpi-label { color: #f97316; }
.es-hotel .es-kpi-card.income .es-kpi-value { color: #ea580c; }
.es-hotel .es-kpi-card.expense { background: #f8fafc; border: 1px solid #e2e8f0; }
.es-hotel .es-kpi-card.expense .es-kpi-label { color: #94a3b8; }
.es-hotel .es-kpi-card.expense .es-kpi-value { color: #475569; }
.es-rest  .es-kpi-card.income  { background: #eff6ff; border: 1px solid #bfdbfe; }
.es-rest  .es-kpi-card.income .es-kpi-label { color: #3b82f6; }
.es-rest  .es-kpi-card.income .es-kpi-value { color: #1d4ed8; }
.es-rest  .es-kpi-card.expense { background: #f8fafc; border: 1px solid #e2e8f0; }
.es-rest  .es-kpi-card.expense .es-kpi-label { color: #94a3b8; }
.es-rest  .es-kpi-card.expense .es-kpi-value { color: #475569; }
.es-total .es-kpi-card.income  { background: #f0fdf4; border: 1px solid #bbf7d0; }
.es-total .es-kpi-card.income .es-kpi-label { color: #10b981; }
.es-total .es-kpi-card.income .es-kpi-value { color: #059669; }
.es-total .es-kpi-card.expense { background: #f8fafc; border: 1px solid #e2e8f0; }
.es-total .es-kpi-card.expense .es-kpi-label { color: #94a3b8; }
.es-total .es-kpi-card.expense .es-kpi-value { color: #475569; }
/* Bar indicator */
#exec-summary .es-bar { height: 3px; border-radius: 3px; overflow: hidden; background: #f1f5f9; margin: -6px 0 10px; }
#exec-summary .es-bar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }
/* Stat chips row */
#exec-summary .es-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-top: 4px;
}
#exec-summary .es-stats.two-col { grid-template-columns: repeat(2, 1fr); }
#exec-summary .es-stat {
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 10px;
  padding: 9px 8px;
  text-align: center;
}
#exec-summary .es-stat-label {
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
  margin-bottom: 4px;
}
#exec-summary .es-stat-val {
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}
/* Rentabilidad box */
#exec-summary .es-rent-box {
  border-radius: 16px;
  padding: 22px 18px 20px;
  text-align: center;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 1.5px solid #6ee7b7;
  margin-top: 10px;
  position: relative;
  overflow: hidden;
}
#exec-summary .es-rent-box::before {
  content: '';
  position: absolute;
  top: -24px; right: -24px;
  width: 90px; height: 90px;
  border-radius: 50%;
  background: rgba(16,185,129,.12);
  pointer-events: none;
}
#exec-summary .es-rent-label {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #047857;
  margin-bottom: 8px;
}
#exec-summary .es-rent-val {
  font-size: 46px;
  font-weight: 900;
  color: #059669;
  letter-spacing: -2px;
  line-height: 1;
}
#exec-summary .es-rent-sub {
  font-size: 12px;
  color: #10b981;
  font-weight: 700;
  margin-top: 7px;
  opacity: .8;
}
/* Icon badge for kpi-card */
#exec-summary .es-kpi-icon {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.es-hotel .es-kpi-card.income  .es-kpi-icon { background: rgba(249,115,22,.12); }
.es-hotel .es-kpi-card.expense .es-kpi-icon { background: rgba(100,116,139,.08); }
.es-rest  .es-kpi-card.income  .es-kpi-icon { background: rgba(59,130,246,.12); }
.es-rest  .es-kpi-card.expense .es-kpi-icon { background: rgba(100,116,139,.08); }
.es-total .es-kpi-card.income  .es-kpi-icon { background: rgba(16,185,129,.12); }
.es-total .es-kpi-card.expense .es-kpi-icon { background: rgba(100,116,139,.08); }
</style>

<div id="panel-dashboard" style="display:none">

  <!-- RESUMEN EJECUTIVO Light v2 -->
  <div id="exec-summary">

    <div class="es-header">
      <div>
        <span class="es-title">Resumen Ejecutivo</span>
        <span id="summ-period-label" class="es-period">Año en curso</span>
      </div>
      <div class="es-tabs" id="summ-tabs">
        <button class="es-tab active summ-tab" data-m="ytd" onclick="setSummMonth('ytd')">YTD</button>
        <button class="es-tab summ-tab" data-m="1"  onclick="setSummMonth(1)">Ene</button>
        <button class="es-tab summ-tab" data-m="2"  onclick="setSummMonth(2)">Feb</button>
        <button class="es-tab summ-tab" data-m="3"  onclick="setSummMonth(3)">Mar</button>
        <button class="es-tab summ-tab" data-m="4"  onclick="setSummMonth(4)">Abr</button>
        <button class="es-tab summ-tab" data-m="5"  onclick="setSummMonth(5)">May</button>
        <button class="es-tab summ-tab" data-m="6"  onclick="setSummMonth(6)">Jun</button>
        <button class="es-tab summ-tab" data-m="7"  onclick="setSummMonth(7)">Jul</button>
        <button class="es-tab summ-tab" data-m="8"  onclick="setSummMonth(8)">Ago</button>
        <button class="es-tab summ-tab" data-m="9"  onclick="setSummMonth(9)">Sep</button>
        <button class="es-tab summ-tab" data-m="10" onclick="setSummMonth(10)">Oct</button>
        <button class="es-tab summ-tab" data-m="11" onclick="setSummMonth(11)">Nov</button>
        <button class="es-tab summ-tab" data-m="12" onclick="setSummMonth(12)">Dic</button>
      </div>
    </div>

    <div class="es-grid">

      <!-- HOTEL -->
      <div class="es-col es-hotel">
        <div class="es-col-pill">
          <div class="es-col-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span class="es-col-name">Hotel</span>
        </div>

        <div class="es-kpi-card income">
          <div>
            <div class="es-kpi-label">Ingresos</div>
            <div id="summ-h-inc" class="es-kpi-value">—</div>
          </div>
          <div class="es-kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="es-bar"><div class="es-bar-fill" style="background:linear-gradient(90deg,#f97316,#fb923c);width:100%"></div></div>

        <div class="es-kpi-card expense">
          <div>
            <div class="es-kpi-label">Gastos</div>
            <div id="summ-h-exp" class="es-kpi-value">—</div>
          </div>
          <div class="es-kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
        </div>

        <div class="es-stats" style="margin-top:14px">
          <div class="es-stat">
            <div class="es-stat-label">Rentab.</div>
            <div id="summ-h-rent" class="es-stat-val">—</div>
          </div>
          <div class="es-stat">
            <div class="es-stat-label">ADR/Res.</div>
            <div id="summ-h-adr" class="es-stat-val">—</div>
          </div>
          <div class="es-stat">
            <div class="es-stat-label">ADR/Noche</div>
            <div id="summ-h-adr-n" class="es-stat-val">—</div>
          </div>
          <div class="es-stat">
            <div class="es-stat-label">Ocupación</div>
            <div id="summ-h-occ" class="es-stat-val">—</div>
          </div>
          <div class="es-stat">
            <div class="es-stat-label">P. Prom.</div>
            <div id="summ-h-avg" class="es-stat-val">—</div>
          </div>
        </div>
      </div>

      <!-- RESTAURANTE -->
      <div class="es-col es-rest">
        <div class="es-col-pill">
          <div class="es-col-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          </div>
          <span class="es-col-name">Restaurante</span>
        </div>

        <div class="es-kpi-card income">
          <div>
            <div class="es-kpi-label">Ingresos</div>
            <div id="summ-r-inc" class="es-kpi-value">—</div>
          </div>
          <div class="es-kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="es-bar"><div class="es-bar-fill" style="background:linear-gradient(90deg,#3b82f6,#60a5fa);width:100%"></div></div>

        <div class="es-kpi-card expense">
          <div>
            <div class="es-kpi-label">Gastos</div>
            <div id="summ-r-exp" class="es-kpi-value">—</div>
          </div>
          <div class="es-kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
        </div>

        <div class="es-stats" style="margin-top:14px">
          <div class="es-stat">
            <div class="es-stat-label">Venta/Día</div>
            <div id="summ-r-day" class="es-stat-val">—</div>
          </div>
          <div class="es-stat">
            <div class="es-stat-label">V./Cuenta</div>
            <div id="summ-r-ticket" class="es-stat-val">—</div>
          </div>
          <div class="es-stat">
            <div class="es-stat-label">Rentab.</div>
            <div id="summ-r-rent" class="es-stat-val">—</div>
          </div>
        </div>
      </div>

      <!-- TOTAL -->
      <div class="es-col es-total">
        <div class="es-col-pill">
          <div class="es-col-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span class="es-col-name">Total Consolidado</span>
        </div>

        <div class="es-kpi-card income">
          <div>
            <div class="es-kpi-label">Ingresos totales</div>
            <div id="summ-t-inc" class="es-kpi-value">—</div>
          </div>
          <div class="es-kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="es-bar"><div class="es-bar-fill" style="background:linear-gradient(90deg,#10b981,#34d399);width:100%"></div></div>

        <div class="es-kpi-card expense">
          <div>
            <div class="es-kpi-label">Gastos totales</div>
            <div id="summ-t-exp" class="es-kpi-value">—</div>
          </div>
          <div class="es-kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
        </div>

        <div class="es-rent-box">
          <div class="es-rent-label">Rentabilidad General</div>
          <div id="summ-t-rent" class="es-rent-val">—</div>
          <div id="summ-t-util" class="es-rent-sub">—</div>
        </div>
      </div>

    </div>
  </div><!-- /exec-summary -->`;

html = html.slice(0, s) + newBlock + html.slice(e);
fs.writeFileSync(filePath, html, 'utf8');

// Verify
const verify = fs.readFileSync(filePath, 'utf8');
const found = verify.includes('Light Premium v2');
console.log(found ? '✅ Patch aplicado correctamente.' : '❌ Verificación falló.');
console.log('Nuevo tamaño: ' + verify.length + ' bytes');
