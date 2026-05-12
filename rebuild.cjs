const fs = require('fs');
const path = 'public/finanzas_corporativas/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Add CSS before </style>
const newCSS = `
    /* ── Filter bar v2 ── */
    .hotel-filter-bar { background:#fff; border:1px solid #dde3ec; border-radius:14px; overflow:hidden; box-shadow:0 1px 6px rgba(15,23,42,.06); }
    .hotel-filter-row { display:grid; grid-template-columns:90px 1fr; min-height:48px; }
    .hotel-filter-row:not(:last-child) { border-bottom:1px solid #edf2f7; }
    .hotel-filter-label-cell { display:flex; align-items:center; padding:0 16px; background:#f8fafc; border-right:1px solid #edf2f7; font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.2px; white-space:nowrap; user-select:none; position:relative; }
    .hotel-filter-label-cell::before { content:''; position:absolute; left:0; top:20%; bottom:20%; width:3px; border-radius:0 3px 3px 0; }
    .label-accent-year::before { background:#6366f1; }
    .label-accent-month::before { background:#10b981; }
    .label-accent-channel::before { background:#f59e0b; }
    .hotel-filter-pills-cell { display:flex; align-items:center; flex-wrap:wrap; gap:5px; padding:8px 16px; }
    .month-pill,.channel-pill,.year-pill { padding:4px 13px; border:1.5px solid #e2e8f0; border-radius:7px; background:#fff; color:#64748b; font-size:12px; font-weight:600; cursor:pointer; transition:all .14s ease; white-space:nowrap; line-height:1.5; }
    .month-pill:hover,.year-pill:hover { border-color:#6366f1; color:#4f46e5; background:#eef2ff; }
    .channel-pill:hover { border-color:#94a3b8; background:#f8fafc; color:#334155; }
    .month-pill.active,.year-pill.active { background:#4f46e5; border-color:#4f46e5; color:#fff; font-weight:700; }
    .channel-pill.active { color:#fff; border-color:transparent; font-weight:700; }
    /* High-value rows */
    .row-high-value { background:linear-gradient(90deg,#fffbeb 0%,#ffffff 60%); }
    .row-high-value > td:first-child { border-left:4px solid #f59e0b; padding-left:12px; }
    .hv-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:800; color:#92400e; background:#fef3c7; border-radius:4px; padding:1px 6px; margin-left:6px; vertical-align:middle; }
  </style>`;

html = html.replace('  </style>', newCSS);

// 2. Add hotel section before </main>
const hotelSection = `
      <!-- ══ Hotel Detail Section ══ -->
      <div style="margin-top:32px">
        <!-- Filter bar -->
        <div class="hotel-filter-bar" style="margin-bottom:20px">
          <div class="hotel-filter-row">
            <div class="hotel-filter-label-cell label-accent-year">Año</div>
            <div class="hotel-filter-pills-cell hotel-year-pills">
              <button class="year-pill active" data-year="2026">2026</button>
            </div>
          </div>
          <div class="hotel-filter-row">
            <div class="hotel-filter-label-cell label-accent-month">Mes</div>
            <div class="hotel-filter-pills-cell hotel-month-pills">
              <button class="month-pill active" data-month="all">Todos</button>
              <button class="month-pill" data-month="01">Ene</button>
              <button class="month-pill" data-month="02">Feb</button>
              <button class="month-pill" data-month="03">Mar</button>
              <button class="month-pill" data-month="04">Abr</button>
              <button class="month-pill" data-month="05">May</button>
              <button class="month-pill" data-month="06">Jun</button>
              <button class="month-pill" data-month="07">Jul</button>
              <button class="month-pill" data-month="08">Ago</button>
              <button class="month-pill" data-month="09">Sep</button>
              <button class="month-pill" data-month="10">Oct</button>
              <button class="month-pill" data-month="11">Nov</button>
              <button class="month-pill" data-month="12">Dic</button>
            </div>
          </div>
          <div class="hotel-filter-row">
            <div class="hotel-filter-label-cell label-accent-channel">Canal</div>
            <div class="hotel-filter-pills-cell hotel-channel-pills" id="hotel-channel-pills">
              <button class="channel-pill active" data-channel="all">Todos</button>
            </div>
          </div>
        </div>
        <!-- Table -->
        <div class="table-container" style="padding:0">
          <div class="table-header" style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between">
            <h2 class="table-title" style="margin:0">Detalle de Reservas</h2>
            <span id="hotel-table-badge" style="font-size:11px;font-weight:700;background:#f1f5f9;color:var(--slate-500);padding:4px 12px;border-radius:100px">Cargando...</span>
          </div>
          <div style="overflow-x:auto">
            <table style="min-width:1050px">
              <thead><tr>
                <th style="min-width:110px">Fecha de reserva</th>
                <th style="min-width:100px">Check-in</th>
                <th>Huésped</th>
                <th>Habitación</th>
                <th style="min-width:60px">Noches</th>
                <th>Canal</th>
                <th style="text-align:right">Monto USD</th>
                <th style="text-align:right">Monto MXN</th>
                <th style="text-align:right">Comisión USD</th>
                <th style="text-align:right">Comisión MXN</th>
                <th>Estado</th>
              </tr></thead>
              <tbody id="hotel-table-body"><tr><td colspan="11" style="text-align:center;padding:48px;color:var(--slate-500)">Cargando reservas...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </main>`;

html = html.replace('    </main>', hotelSection);

// 3. Add hotel JS before </script>
const hotelJS = `
    // ══ Hotel Detail Module ══
    const SUPABASE_URL_H = 'https://quzjixxqowxbezbcmqws.supabase.co';
    const SUPABASE_KEY_H = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1emppeHhxb3d4YmV6YmNtcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYwMTcsImV4cCI6MjA5MzQ5MjAxN30.cp_eoG5fAbead2rOdVbsHjNo5hLFMRvkFS9OvL5rcyk';
    let allHotelReservations = [];
    let hotelFilterYear = '2026', hotelFilterMonth = 'all', hotelFilterChannel = 'all';
    const fmtMXN = v => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v);
    const fmtUSD = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
    const PREDEFINED_CHANNELS = ['Booking.com','Airbnb','Expedia','Webpage','Directo'];
    const CH_CFG = {
      'Booking.com': { label:'Booking.com', color:'#003580' },
      'Airbnb':      { label:'Airbnb',      color:'#e00b27' },
      'Expedia':     { label:'Expedia',      color:'#1a1a1a' },
      'Webpage':     { label:'Webpage',      color:'#ca8a04' },
      'Directo':     { label:'Directo',      color:'#ea580c' },
    };
    const getCh = n => CH_CFG[n] || { label: n, color:'#64748b' };

    function normalizeRoom(name) {
      if (!name) return '—';
      const n = name.toLowerCase();
      if (n.includes('king size bed') || n.includes('king size')) return 'King Size';
      if (n.includes('single doble') || n.includes('single double')) return 'Single Room';
      if (['la curandera','la artesana','el mariachi','el charro'].some(k => n.includes(k))) return 'Loft';
      return name;
    }

    async function loadHotelData() {
      document.getElementById('hotel-table-badge').textContent = 'Cargando...';
      allHotelReservations = [];
      try {
        const PAGE = 1000; let offset = 0;
        while (true) {
          const url = SUPABASE_URL_H + '/rest/v1/financial_reservations' +
            '?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount' +
            '&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)' +
            '&booking_date=gte.2025-01-01&booking_date=lte.2026-12-31' +
            '&order=booking_date.desc' +
            '&limit=' + PAGE + '&offset=' + offset;
          const res = await fetch(url, { headers:{ 'apikey':SUPABASE_KEY_H, 'Authorization':'Bearer '+SUPABASE_KEY_H, 'Prefer':'count=none' } });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const batch = await res.json();
          if (!Array.isArray(batch) || batch.length === 0) break;
          allHotelReservations = allHotelReservations.concat(batch);
          if (batch.length < PAGE) break;
          offset += PAGE;
        }
        buildChannelPills();
        applyHotelFilters();
      } catch(err) {
        document.getElementById('hotel-table-body').innerHTML = '<tr><td colspan="11" style="text-align:center;color:#f43f5e;padding:48px">Error: '+err.message+'</td></tr>';
        document.getElementById('hotel-table-badge').textContent = 'Error';
      }
    }

    function buildChannelPills() {
      const dataChannels = [...new Set(allHotelReservations.map(r=>r.source_name).filter(Boolean))];
      const extra = dataChannels.filter(c=>!PREDEFINED_CHANNELS.includes(c)).sort();
      const all = [...PREDEFINED_CHANNELS,...extra];
      const container = document.getElementById('hotel-channel-pills');
      container.innerHTML = '';
      const activate = (btn,color) => {
        document.querySelectorAll('.channel-pill').forEach(b=>{ b.classList.remove('active'); b.style.background=''; b.style.color=''; b.style.borderColor=''; });
        btn.classList.add('active');
        if(color){ btn.style.background=color; btn.style.color='white'; btn.style.borderColor=color; }
      };
      const todosBtn = document.createElement('button');
      todosBtn.className='channel-pill active'; todosBtn.dataset.channel='all'; todosBtn.textContent='Todos';
      todosBtn.style.cssText='background:#4f46e5;color:white;border-color:#4f46e5';
      todosBtn.onclick=()=>{ hotelFilterChannel='all'; activate(todosBtn,null); todosBtn.style.cssText='background:#4f46e5;color:white;border-color:#4f46e5'; applyHotelFilters(); };
      container.appendChild(todosBtn);
      all.forEach(ch=>{
        const cfg=getCh(ch); const btn=document.createElement('button');
        btn.className='channel-pill'; btn.dataset.channel=ch; btn.textContent=cfg.label;
        btn.onclick=()=>{ hotelFilterChannel=ch; activate(btn,cfg.color); applyHotelFilters(); };
        container.appendChild(btn);
      });
    }

    function applyHotelFilters() {
      let rows = allHotelReservations;
      if (hotelFilterYear !== 'all') rows = rows.filter(r=>r.booking_date&&r.booking_date.substring(0,4)===hotelFilterYear);
      if (hotelFilterMonth !== 'all') rows = rows.filter(r=>r.booking_date&&r.booking_date.substring(5,7)===hotelFilterMonth);
      if (hotelFilterChannel !== 'all') rows = rows.filter(r=>r.source_name===hotelFilterChannel);
      renderHotelTable(rows);
    }

    function renderHotelTable(rows) {
      const TODAY = new Date().toISOString().slice(0,10);
      const tbody = document.getElementById('hotel-table-body');
      if (!rows.length) { tbody.innerHTML='<tr><td colspan="11" style="text-align:center;padding:48px;color:#64748b">Sin resultados</td></tr>'; document.getElementById('hotel-table-badge').textContent='0 registros'; return; }
      document.getElementById('hotel-table-badge').textContent = rows.length + ' registros';
      tbody.innerHTML = rows.map(r => {
        const COURTESY_IDS = [59085086];
        const isCourtesy = COURTESY_IDS.includes(Number(r.id));
        const amount = isCourtesy ? 0 : Number(r.total_amount||0);
        const commission = isCourtesy ? 0 : Number(r.channel_commission||0);
        const mxnRate = Number(r.mxn_rate||0);
        const mxnAmount = isCourtesy ? 0 : (r.mxn_amount ? Number(r.mxn_amount) : amount*mxnRate);
        const commMXN = commission && mxnRate ? commission*mxnRate : 0;
        const isAutoP = (r.source_name==='Expedia'||r.source_name==='Directo') && r.arrival_date && r.arrival_date < TODAY;
        const isPaid = isCourtesy || r.is_paid || isAutoP;
        const fmtDate = d => { if(!d) return '—'; const[y,m,dd]=d.split('-'); const ms=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return \`\${parseInt(dd)} \${ms[parseInt(m)-1]} \${y}\`; };
        const ch = getCh(r.source_name);
        const room = normalizeRoom(r.room_name);
        const isHV = amount > 2000;
        const statusHTML = isCourtesy
          ? '<span class="status-badge" style="background:#f3f4f6;color:#374151">🎁 Cortesía</span>'
          : isPaid
            ? '<span class="status-badge status-paid">✓ Pagado</span>'
            : '<span class="status-badge status-pending">⏳ Pendiente</span>';
        return \`<tr class="\${isHV?'row-high-value':''}">
          <td>\${fmtDate(r.booking_date)}</td>
          <td style="color:#64748b">\${fmtDate(r.arrival_date)}</td>
          <td style="font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${r.guest_name||'—'}</td>
          <td><span style="background:#f1f5f9;color:#334155;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600">\${room}</span></td>
          <td style="text-align:center">\${r.nights||'—'}</td>
          <td><span class="channel-badge" style="background:\${ch.color}20;color:\${ch.color};border:1px solid \${ch.color}40">\${ch.label}</span></td>
          <td style="text-align:right;font-weight:700"><span style="font-size:10px;font-weight:400;color:#94a3b8">USD</span> \${fmtUSD(amount)}\${isHV?'<span class="hv-badge">★ TOP</span>':''}</td>
          <td style="text-align:right;font-weight:600;color:#334155">\${mxnAmount?fmtMXN(mxnAmount):'—'}\${mxnRate?'<br><span style="font-size:10px;color:#94a3b8">@'+fmtUSD(mxnRate)+'</span>':''}</td>
          <td style="text-align:right;color:#f43f5e;font-weight:600">\${commission?fmtUSD(commission):'—'}</td>
          <td style="text-align:right;color:#f43f5e;font-weight:600">\${commMXN?fmtMXN(commMXN):'—'}</td>
          <td>\${statusHTML}</td>
        </tr>\`;
      }).join('');
    }

    // Wire up year/month pills
    document.querySelectorAll('.year-pill').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.year-pill').forEach(x=>{x.classList.remove('active');});
      b.classList.add('active'); hotelFilterYear = b.dataset.year; applyHotelFilters();
    }));
    document.querySelectorAll('.month-pill').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.month-pill').forEach(x=>{x.classList.remove('active');});
      b.classList.add('active'); hotelFilterMonth = b.dataset.month; applyHotelFilters();
    }));

    // Load on start
    loadHotelData();
  </script>`;

html = html.replace('  </script>', hotelJS);

fs.writeFileSync(path, html, 'utf8');
console.log('Done. Size:', fs.statSync(path).size);
