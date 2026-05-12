const fs=require('fs');
const part2=`<script>
const SB='https://quzjixxqowxbezbcmqws.supabase.co';
const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1emppeHhxb3d4YmV6YmNtcXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYwMTcsImV4cCI6MjA5MzQ5MjAxN30.cp_eoG5fAbead2rOdVbsHjNo5hLFMRvkFS9OvL5rcyk';
let allData=[], filterYear='2026', filterMonth='all', filterChannel='all';
const fmtUSD=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
const fmtMXN=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v);
const fmtDate=d=>{if(!d)return'—';const[y,m,dd]=d.split('-');const ms=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return \`\${parseInt(dd)} \${ms[parseInt(m)-1]} \${y}\`};
const CH={
  'Booking.com':{label:'Booking.com',color:'#003580'},
  'Airbnb':{label:'Airbnb',color:'#e00b27'},
  'Expedia':{label:'Expedia',color:'#1a1a1a'},
  'Webpage':{label:'Webpage',color:'#ca8a04'},
  'Directo':{label:'Directo',color:'#ea580c'},
  'Sitio Web':{label:'Sitio Web',color:'#ca8a04'}
};
const getCh=n=>CH[n]||{label:n||'—',color:'#64748b'};
const COURTESY=[59085086];
function normalizeRoom(n){
  if(!n)return'—';
  const l=n.toLowerCase();
  if(l.includes('king size'))return'King Size';
  if(l.includes('single doble')||l.includes('single double'))return'Single Room';
  if(['la curandera','la artesana','el mariachi','el charro'].some(k=>l.includes(k)))return'Loft';
  return n;
}
async function loadHotelData(){
  document.getElementById('globalLoader').classList.remove('hidden');
  document.getElementById('hotel-table-badge').textContent='Cargando...';
  allData=[];
  try{
    let offset=0; const PAGE=1000;
    while(true){
      const url=SB+'/rest/v1/financial_reservations?select=id,guest_name,room_name,arrival_date,departure_date,nights,total_amount,channel_commission,source_name,is_paid,booking_date,mxn_rate,mxn_amount&status=in.(new,confirmed,reserved,modified,ownerStay,inquiryPreapproved)&booking_date=gte.2025-01-01&booking_date=lte.2026-12-31&order=booking_date.desc&limit='+PAGE+'&offset='+offset;
      const r=await fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Prefer':'count=none'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const batch=await r.json();
      if(!Array.isArray(batch)||batch.length===0)break;
      allData=allData.concat(batch);
      if(batch.length<PAGE)break;
      offset+=PAGE;
    }
    buildChannelPills();
    applyFilters();
  }catch(err){
    document.getElementById('hotel-table-body').innerHTML='<tr><td colspan="11" style="text-align:center;color:#f43f5e;padding:48px">Error: '+err.message+'</td></tr>';
    document.getElementById('hotel-table-badge').textContent='Error';
  }finally{
    document.getElementById('globalLoader').classList.add('hidden');
  }
}
function buildChannelPills(){
  const ORDER=['Booking.com','Airbnb','Expedia','Webpage','Directo','Sitio Web'];
  const found=[...new Set(allData.map(r=>r.source_name).filter(Boolean))];
  const sorted=[...ORDER.filter(c=>found.includes(c)),...found.filter(c=>!ORDER.includes(c)).sort()];
  const wrap=document.getElementById('hotel-channel-pills');
  wrap.innerHTML='';
  const mk=(ch,color)=>{
    const b=document.createElement('button');
    b.className='channel-pill';b.dataset.channel=ch;
    const cfg=getCh(ch);b.textContent=cfg.label;
    b.style.cssText=color?'background:'+cfg.color+';color:#fff;border-color:'+cfg.color:'';
    b.onclick=()=>{filterChannel=ch;[...wrap.querySelectorAll('.channel-pill')].forEach(x=>{x.classList.remove('active');x.style.cssText='';});b.classList.add('active');b.style.cssText='background:'+cfg.color+';color:#fff;border-color:'+cfg.color;applyFilters();};
    return b;
  };
  const all=document.createElement('button');
  all.className='channel-pill active';all.dataset.channel='all';all.textContent='Todos';
  all.style.cssText='background:#4f46e5;color:#fff;border-color:#4f46e5';
  all.onclick=()=>{filterChannel='all';[...wrap.querySelectorAll('.channel-pill')].forEach(x=>{x.classList.remove('active');x.style.cssText='';});all.classList.add('active');all.style.cssText='background:#4f46e5;color:#fff;border-color:#4f46e5';applyFilters();};
  wrap.appendChild(all);
  sorted.forEach(ch=>wrap.appendChild(mk(ch,false)));
}
function applyFilters(){
  let rows=allData;
  if(filterYear!=='all')rows=rows.filter(r=>r.booking_date&&r.booking_date.slice(0,4)===filterYear);
  if(filterMonth!=='all')rows=rows.filter(r=>r.booking_date&&r.booking_date.slice(5,7)===filterMonth);
  if(filterChannel!=='all')rows=rows.filter(r=>r.source_name===filterChannel);
  renderTable(rows);
}
function renderTable(rows){
  const TODAY=new Date().toISOString().slice(0,10);
  const badge=document.getElementById('hotel-table-badge');
  const tbody=document.getElementById('hotel-table-body');
  badge.textContent=rows.length+' registros';
  updateKPIs(rows);
  if(!rows.length){tbody.innerHTML='<tr><td colspan="11" style="text-align:center;padding:48px;color:#94a3b8">Sin resultados para este filtro</td></tr>';return;}
  tbody.innerHTML=rows.map(r=>{
    const isC=COURTESY.includes(Number(r.id));
    const amount=isC?0:Number(r.total_amount||0);
    const comm=isC?0:Number(r.channel_commission||0);
    const rate=Number(r.mxn_rate||0);
    const mxnAmt=isC?0:(r.mxn_amount?Number(r.mxn_amount):amount*rate);
    const mxnComm=comm&&rate?comm*rate:0;
    const autoP=(r.source_name==='Expedia'||r.source_name==='Directo')&&r.arrival_date&&r.arrival_date<TODAY;
    const paid=isC||r.is_paid||autoP;
    const ch=getCh(r.source_name);
    const room=normalizeRoom(r.room_name);
    const isHV=amount>2000;
    const stHtml=isC
      ?'<span class="status-courtesy">🎁 Cortesía</span>'
      :paid
        ?'<span class="status-paid">✓ Pagado</span>'
        :'<span class="status-pending">⏳ Pendiente</span>';
    return \`<tr class="\${isHV?'row-high-value':''}">
      <td>\${fmtDate(r.booking_date)}</td>
      <td style="color:#94a3b8">\${fmtDate(r.arrival_date)}</td>
      <td style="font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${r.guest_name||''}">\${r.guest_name||'—'}</td>
      <td><span style="background:#f1f5f9;color:#334155;padding:2px 9px;border-radius:5px;font-size:11px;font-weight:700">\${room}</span></td>
      <td style="text-align:center;font-weight:600">\${r.nights||'—'}</td>
      <td><span class="channel-badge" style="background:\${ch.color}22;color:\${ch.color};border-color:\${ch.color}40">\${ch.label}</span></td>
      <td style="text-align:right;font-weight:700"><span style="font-size:10px;font-weight:400;color:#94a3b8">USD</span> \${fmtUSD(amount).replace('US','')}\${isHV?'<span class="hv-badge">★ TOP</span>':''}</td>
      <td style="text-align:right;color:#334155">\${mxnAmt?fmtMXN(mxnAmt).replace('MX',''):'—'}\${rate?'<br><span style="font-size:10px;color:#94a3b8">@\${fmtUSD(rate).replace('US','')}</span>':''}</td>
      <td style="text-align:right;color:#f43f5e;font-weight:600">\${comm?fmtUSD(comm).replace('US',''):'—'}</td>
      <td style="text-align:right;color:#f43f5e;font-weight:600">\${mxnComm?fmtMXN(mxnComm).replace('MX',''):'—'}</td>
      <td>\${stHtml}</td>
    </tr>\`;
  }).join('');
}
function updateKPIs(rows){
  const TODAY=new Date().toISOString().slice(0,10);
  let rev=0,nights=0,comm=0;
  rows.forEach(r=>{
    const isC=COURTESY.includes(Number(r.id));
    rev+=isC?0:Number(r.total_amount||0);
    nights+=Number(r.nights||0);
    comm+=isC?0:Number(r.channel_commission||0);
  });
  const adr=nights>0?rev/nights:0;
  document.getElementById('kpi-revenue').textContent=fmtUSD(rev);
  document.getElementById('kpi-res').textContent=rows.length;
  document.getElementById('kpi-adr').textContent=fmtUSD(adr);
  document.getElementById('kpi-com').textContent=fmtUSD(comm);
}
document.querySelectorAll('.year-pill').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.year-pill').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');filterYear=b.dataset.year;applyFilters();
}));
document.querySelectorAll('.month-pill').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.month-pill').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');filterMonth=b.dataset.month;applyFilters();
}));
document.getElementById('btnSync').addEventListener('click',async()=>{
  const btn=document.getElementById('btnSync');btn.classList.add('loading');
  try{
    const res=await fetch(SB+'/functions/v1/hostaway-financial-sync',{method:'POST',headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({})});
    const d=await res.json();
    if(d.error)throw new Error(d.error);
    alert('Sincronización exitosa: '+(d.synced||0)+' reservas actualizadas.');
    loadHotelData();
  }catch(err){alert('Error: '+err.message);}
  finally{btn.classList.remove('loading');}
});
window.addEventListener('error',e=>{document.getElementById('globalLoader').classList.add('hidden');});
window.addEventListener('unhandledrejection',e=>{document.getElementById('globalLoader').classList.add('hidden');});
loadHotelData();
<\/script></body></html>`;
fs.appendFileSync('public/finanzas_corporativas/index.html', part2, 'utf8');
const size=fs.statSync('public/finanzas_corporativas/index.html').size;
console.log('Part 2 appended. Total size:', size);
