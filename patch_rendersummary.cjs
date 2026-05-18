const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'finanzas_corporativas', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// ─── 1. Guardar byMonth en window._concByMonth cuando CONCILIACIONES lo pasa a ANALISIS ───
const oldAnalisisCall = `if(typeof ANALISIS !== 'undefined') ANALISIS.render(byMonth, yearStr);`;
const newAnalisisCall = `window._concByMonth = byMonth; window._concYearStr = yearStr;\n    if(typeof ANALISIS !== 'undefined') ANALISIS.render(byMonth, yearStr);\n    // Actualizar Resumen Ejecutivo con datos exactos de Conciliaciones\n    renderSummary(window._summActiveMonth || 'ytd');`;

if (!html.includes(oldAnalisisCall)) {
  console.error('❌ No se encontró el marcador de ANALISIS.render()');
  process.exit(1);
}
html = html.replace(oldAnalisisCall, newAnalisisCall);
console.log('✅ Paso 1: Se guardará _concByMonth al cargar Conciliaciones');

// ─── 2. Reescribir renderSummary y setSummMonth ───────────────────────────
const oldRenderSummary = `function renderSummary(month){
  var s=window._sd;if(!s)return;
  var yearStr=s.yearStr,TODAY=s.TODAY,courtesyList=(typeof COURTESY!=='undefined')?COURTESY:[];
  var ROOMS=14,today=new Date(),curYear=parseInt(yearStr);
  var mStr=month==='ytd'?null:String(month).padStart(2,'0');
  var periodDays;if(mStr===null){periodDays=Math.floor((today-new Date(curYear+'-01-01'))/(864e5))+1;}else{var mi=parseInt(mStr);var dim=new Date(curYear,mi,0).getDate();periodDays=(today.getFullYear()===curYear&&today.getMonth()===mi-1)?today.getDate():dim;}
  var hInc=0,hExp=0,hNights=0,hIncNights=0,hIncRes=0;
  s.hotelRows.forEach(function(r){
    if(!r.arrival_date||r.arrival_date.slice(0,4)!==yearStr)return;
    if(mStr&&r.arrival_date.slice(5,7)!==mStr)return;
    if(courtesyList.indexOf(Number(r.id))>-1)return;
    var isB=r.source_name==='Booking.com';
    var rate=Number(r.mxn_rate||0);
    var mxn=r.mxn_amount?Number(r.mxn_amount):Number(r.total_amount||0)*rate;
    hNights+=Number(r.nights||0);
    if(r.channel_commission&&rate)hExp+=Number(r.channel_commission)*rate;
    if(isB)return;
    hInc+=mxn;hIncNights+=Number(r.nights||0);hIncRes++;
  });
  s.biRows.forEach(function(bi){
    if(!bi.income_date||bi.income_date.slice(0,4)!==yearStr)return;
    if(mStr&&bi.income_date.slice(5,7)!==mStr)return;
    hInc+=Number(bi.amount_mxn||0);
  });
  var rInc=0,rDays=0,rAccounts=0;
  s.restRows.forEach(function(r){
    if(!r.created_at||r.created_at.slice(0,4)!==yearStr)return;
    if(mStr&&r.created_at.slice(5,7)!==mStr)return;
    rInc+=Number(r.income||0);rDays++;
    rAccounts+=Number(r.accounts_count||0);
  });
  var gopH=0,gopR=0,gopG=0;
  s.gopRows.forEach(function(r){
    if(!r.date||r.date.slice(0,4)!==yearStr)return;
    if(mStr&&r.date.slice(5,7)!==mStr)return;
    var a=Number(r.amount||0);
    if(r.unit==='Hotel')gopH+=a;else if(r.unit==='Restaurante')gopR+=a;else gopG+=a;
  });
  var staffH=0,staffR=0,staffG=0;
  s.staffRows.forEach(function(sv){var v=Number(sv.remuneration||0);if(sv.unit==='Hotel')staffH+=v;else if(sv.unit==='Restaurante')staffR+=v;else staffG+=v;});
  var payMonths={};
  s.payRows.forEach(function(p){if(p.month!=null)payMonths[p.month]=true;});
  var pf;if(mStr===null){pf=Object.keys(payMonths).length||today.getMonth()+1;}else{var mNum=parseInt(mStr);pf=payMonths[mNum]?1:(mNum<=today.getMonth()?1:0);}
  var hExpF=hExp+gopH+staffH*pf,rExpF=gopR+staffR*pf,genExpF=gopG+staffG*pf;
  var hUtil=hInc-hExpF,rUtil=rInc-rExpF,tInc=hInc+rInc,tExp=hExpF+rExpF+genExpF,tUtil=tInc-tExp;
  var hRent=hInc>0?(hUtil/hInc)*100:0,rRent=rInc>0?(rUtil/rInc)*100:0,tRent=tInc>0?(tUtil/tInc)*100:0;
  var maxN=ROOMS*periodDays,occ=maxN>0?Math.min(100,(hNights/maxN)*100):0;
  var adrRes=hIncRes>0?hInc/hIncRes:0,adrN=hIncNights>0?hInc/hIncNights:0;
  var ventaD=rDays>0?rInc/rDays:0,ventaC=rAccounts>0?rInc/rAccounts:0;
  var fK=function(n){n=Number(n)||0;if(Math.abs(n)>=1e6)return'$'+(n/1e6).toFixed(1)+'M';if(Math.abs(n)>=1000)return'$'+(n/1000).toFixed(1)+'K';return'$'+n.toFixed(0);};
  var fP=function(n){return(Number(n)||0).toFixed(1)+'%';};
  var S=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  S('summ-h-inc',fK(hInc));S('summ-h-exp',fK(hExpF));S('summ-h-rent',fP(hRent));
  S('summ-h-adr',fK(adrRes));S('summ-h-adr-n',fK(adrN));S('summ-h-occ',fP(occ));S('summ-h-avg',fK(adrRes));
  S('summ-r-inc',fK(rInc));S('summ-r-exp',fK(rExpF));S('summ-r-rent',fP(rRent));
  S('summ-r-day',fK(ventaD));S('summ-r-ticket',fK(ventaC));
  S('summ-t-inc',fK(tInc));S('summ-t-exp',fK(tExp));S('summ-t-rent',fP(tRent));
  S('summ-t-util','Utilidad: '+fK(tUtil));
  var names=['Año en curso','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  S('summ-period-label',month==='ytd'?'Año en curso':names[parseInt(month)]||'');
}
function setSummMonth(m){
  document.querySelectorAll('.summ-tab').forEach(function(b){b.classList.remove('active');if(b.dataset.m==String(m))b.classList.add('active');});
  renderSummary(m);
}`;

// La nueva versión usa _concByMonth cuando está disponible (mismo cálculo que CONCILIACIONES/ANALISIS)
const newRenderSummary = `function renderSummary(month){
  window._summActiveMonth = month;
  var bm = window._concByMonth;
  var yearStr = window._concYearStr || (new Date().getFullYear().toString());

  var fK=function(n){n=Number(n)||0;if(Math.abs(n)>=1e6)return'$'+(n/1e6).toFixed(2)+'M';if(Math.abs(n)>=1000)return'$'+(n/1000).toFixed(1)+'K';return'$'+n.toFixed(0);};
  var fP=function(n){return(Number(n)||0).toFixed(1)+'%';};
  var S=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  var names=['Año en curso','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Si aún no cargaron los datos de Conciliaciones, mostrar espera
  if(!bm){
    ['summ-h-inc','summ-h-exp','summ-h-rent','summ-h-adr','summ-h-adr-n','summ-h-occ','summ-h-avg',
     'summ-r-inc','summ-r-exp','summ-r-rent','summ-r-day','summ-r-ticket',
     'summ-t-inc','summ-t-exp','summ-t-rent','summ-t-util'].forEach(function(id){S(id,'...');});
    return;
  }

  // Acumular meses según filtro (ytd = todos, o mes específico)
  var mNum = month === 'ytd' ? null : parseInt(month);
  var hInc=0,hExp=0,hNights=0,hIncRes=0,hIncNights=0;
  var rInc=0,rExp=0,rDays=0,rAccounts=0;
  var genExp=0;

  // Datos de shift_summaries para ADR/noches/cuentas vienen de _sd
  var s = window._sd;

  for(var m=1; m<=12; m++){
    if(mNum !== null && m !== mNum) continue;
    var d = bm[m];
    if(!d) continue;
    // hExp en CONCILIACIONES = commExp + gopH + nomH
    hInc    += d.hInc   || 0;
    hExp    += (d.commExp || 0) + (d.gopH || 0) + (d.nomH || 0);
    rInc    += d.rInc   || 0;
    // rExp en CONCILIACIONES = gopR + nomR + gmExp
    rExp    += (d.gopR  || 0) + (d.nomR || 0) + (d.gmExp || 0);
    genExp  += (d.gopG  || 0) + (d.nomG || 0);
  }

  // Noches, reservas y cuentas restaurante — se recalculan desde _sd (datos crudos)
  var ROOMS = 14;
  var today = new Date();
  var curYear = parseInt(yearStr);
  var periodDays;
  if(mNum === null){
    periodDays = Math.floor((today - new Date(curYear+'-01-01'))/(864e5))+1;
  } else {
    var dim = new Date(curYear, mNum, 0).getDate();
    periodDays = (today.getFullYear()===curYear && today.getMonth()===mNum-1) ? today.getDate() : dim;
  }
  var courtesyList = (typeof COURTESY !== 'undefined') ? COURTESY : [];

  if(s){
    var mStr = mNum ? String(mNum).padStart(2,'0') : null;
    s.hotelRows.forEach(function(r){
      if(!r.arrival_date || r.arrival_date.slice(0,4)!==yearStr) return;
      if(mStr && r.arrival_date.slice(5,7)!==mStr) return;
      if(courtesyList.indexOf(Number(r.id))>-1) return;
      hNights += Number(r.nights||0);
      if(r.source_name==='Booking.com') return;
      hIncRes++;
      hIncNights += Number(r.nights||0);
    });
    s.restRows.forEach(function(r){
      if(!r.created_at || r.created_at.slice(0,4)!==yearStr) return;
      if(mStr && r.created_at.slice(5,7)!==mStr) return;
      rDays++;
      rAccounts += Number(r.accounts_count||0);
    });
  }

  var hUtil = hInc - hExp;
  var rUtil = rInc - rExp;
  var tInc  = hInc + rInc;
  var tExp  = hExp + rExp + genExp;
  var tUtil = tInc - tExp;
  var hRent = hInc>0 ? (hUtil/hInc)*100 : 0;
  var rRent = rInc>0 ? (rUtil/rInc)*100 : 0;
  var tRent = tInc>0 ? (tUtil/tInc)*100 : 0;
  var maxN  = ROOMS * periodDays;
  var occ   = maxN>0 ? Math.min(100,(hNights/maxN)*100) : 0;
  var adrRes = hIncRes>0   ? hInc/hIncRes   : 0;
  var adrN   = hIncNights>0 ? hInc/hIncNights : 0;
  var ventaD = rDays>0     ? rInc/rDays     : 0;
  var ventaC = rAccounts>0  ? rInc/rAccounts  : 0;

  S('summ-h-inc',  fK(hInc));    S('summ-h-exp',  fK(hExp));    S('summ-h-rent', fP(hRent));
  S('summ-h-adr',  fK(adrRes));  S('summ-h-adr-n',fK(adrN));   S('summ-h-occ',  fP(occ));   S('summ-h-avg', fK(adrRes));
  S('summ-r-inc',  fK(rInc));    S('summ-r-exp',  fK(rExp));    S('summ-r-rent', fP(rRent));
  S('summ-r-day',  fK(ventaD));  S('summ-r-ticket',fK(ventaC));
  S('summ-t-inc',  fK(tInc));    S('summ-t-exp',  fK(tExp));    S('summ-t-rent', fP(tRent));
  S('summ-t-util', 'Utilidad: '+fK(tUtil));
  S('summ-period-label', month==='ytd' ? 'Año en curso' : names[mNum]||'');
}
function setSummMonth(m){
  document.querySelectorAll('.summ-tab').forEach(function(b){b.classList.remove('active');if(b.dataset.m==String(m))b.classList.add('active');});
  renderSummary(m);
}`;

if(!html.includes('function renderSummary(month){')){
  console.error('❌ No se encontró function renderSummary');
  process.exit(1);
}

// Find the exact block to replace
const rsStart = html.indexOf('function renderSummary(month){');
const ssEnd_marker = 'renderSummary(m);\n}';
const ssEnd = html.indexOf(ssEnd_marker, rsStart) + ssEnd_marker.length;

html = html.slice(0, rsStart) + newRenderSummary + html.slice(ssEnd);

fs.writeFileSync(filePath, html, 'utf8');

const verify = fs.readFileSync(filePath, 'utf8');
const ok1 = verify.includes('window._concByMonth = byMonth');
const ok2 = verify.includes('_summActiveMonth');
const ok3 = verify.includes('d.commExp || 0) + (d.gopH');
console.log(ok1 ? '✅ Paso 1 verificado: _concByMonth se guarda' : '❌ Fallo paso 1');
console.log(ok2 ? '✅ Paso 2 verificado: renderSummary nueva' : '❌ Fallo paso 2');
console.log(ok3 ? '✅ Paso 3 verificado: cálculo correcto hExp' : '❌ Fallo paso 3');
console.log('Tamaño final: ' + verify.length + ' bytes');
