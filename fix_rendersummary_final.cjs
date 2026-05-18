const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'finanzas_corporativas', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// Find and replace the broken renderSummary with a clean, correct version
const startMarker = 'function renderSummary(month){';
const endMarker   = 'function setSummMonth(m){';

const s = html.indexOf(startMarker);
const e = html.indexOf(endMarker);

if(s === -1 || e === -1 || s >= e){
  console.error('❌ Cannot find renderSummary boundaries. s=' + s + ' e=' + e);
  process.exit(1);
}

console.log('renderSummary: chars', s, '→', e);

const newRenderSummary = `function renderSummary(month){
  window._summActiveMonth = month;
  var yearStr = window._concYearStr || (new Date().getFullYear().toString());
  var bm      = window._concByMonth;

  var fK=function(n){n=Number(n)||0;if(Math.abs(n)>=1e6)return'$'+(n/1e6).toFixed(2)+'M';if(Math.abs(n)>=1000)return'$'+(n/1000).toFixed(1)+'K';return'$'+n.toFixed(0);};
  var fP=function(n){return(Number(n)||0).toFixed(1)+'%';};
  var S=function(id,v){var el=document.getElementById(id);if(el)el.textContent=v;};
  var names=['Año en curso','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Si _concByMonth no está disponible, disparar CONCILIACIONES y usar _sd como datos temporales
  if(!bm){
    if(typeof CONCILIACIONES !== 'undefined' && !window._concLoading){
      window._concLoading = true;
      CONCILIACIONES.init(); // Al terminar llamará renderSummary de nuevo con datos exactos
    }
    // Mientras tanto usar _sd (datos cargados por loadDashboardKPIs)
    bm = null;
  }

  var ROOMS=14, today=new Date(), curYear=parseInt(yearStr);
  var mNum = month==='ytd' ? null : parseInt(month);
  var mStr = mNum ? String(mNum).padStart(2,'0') : null;
  var periodDays;
  if(!mNum){ periodDays=Math.floor((today-new Date(curYear+'-01-01'))/(864e5))+1; }
  else{ var dim=new Date(curYear,mNum,0).getDate(); periodDays=(today.getFullYear()===curYear&&today.getMonth()===mNum-1)?today.getDate():dim; }

  var hInc=0,hExp=0,hNights=0,hIncRes=0,hIncNights=0;
  var rInc=0,rExp=0,rDays=0,rAccounts=0,genExp=0;
  var courtesyList=(typeof COURTESY!=='undefined')?COURTESY:[];
  var s=window._sd;

  if(bm){
    // MODO PRECISO: usar byMonth de CONCILIACIONES (misma lógica que tabla de conciliaciones)
    for(var m=1;m<=12;m++){
      if(mNum!==null&&m!==mNum)continue;
      var d=bm[m]; if(!d)continue;
      hInc   += d.hInc   || 0;
      hExp   += (d.commExp||0)+(d.gopH||0)+(d.nomH||0);
      rInc   += d.rInc   || 0;
      rExp   += (d.gopR||0)+(d.nomR||0)+(d.gmExp||0);
      genExp += (d.gopG||0)+(d.nomG||0);
    }
    // Noches/reservas/cuentas desde _sd
    if(s){
      s.hotelRows.forEach(function(r){
        if(!r.arrival_date||r.arrival_date.slice(0,4)!==yearStr)return;
        if(mStr&&r.arrival_date.slice(5,7)!==mStr)return;
        if(courtesyList.indexOf(Number(r.id))>-1)return;
        hNights+=Number(r.nights||0);
        if(r.source_name==='Booking.com')return;
        hIncRes++;hIncNights+=Number(r.nights||0);
      });
      s.restRows.forEach(function(r){
        if(!r.created_at||r.created_at.slice(0,4)!==yearStr)return;
        if(mStr&&r.created_at.slice(5,7)!==mStr)return;
        rDays++;rAccounts+=Number(r.accounts_count||0);
      });
    }
  } else if(s){
    // MODO FALLBACK: usar _sd con lógica simplificada mientras Conciliaciones carga
    var payMonths={};
    s.payRows.forEach(function(p){if(p.month!=null)payMonths[p.month]=true;});
    var pf=mNum?payMonths[mNum]?1:0:Object.keys(payMonths).length||today.getMonth()+1;
    var gopH=0,gopR=0,gopG=0,staffH=0,staffR=0,staffG=0;
    s.hotelRows.forEach(function(r){
      if(!r.arrival_date||r.arrival_date.slice(0,4)!==yearStr)return;
      if(mStr&&r.arrival_date.slice(5,7)!==mStr)return;
      if(courtesyList.indexOf(Number(r.id))>-1)return;
      var rate=Number(r.mxn_rate||0);
      var mxn=r.mxn_amount?Number(r.mxn_amount):Number(r.total_amount||0)*rate;
      hNights+=Number(r.nights||0);
      if(r.channel_commission&&rate)hExp+=Number(r.channel_commission)*rate;
      if(r.source_name==='Booking.com')return;
      hInc+=mxn;hIncRes++;hIncNights+=Number(r.nights||0);
    });
    s.biRows.forEach(function(bi){
      if(!bi.income_date||bi.income_date.slice(0,4)!==yearStr)return;
      if(mStr&&bi.income_date.slice(5,7)!==mStr)return;
      hInc+=Number(bi.amount_mxn||0);
    });
    s.restRows.forEach(function(r){
      if(!r.created_at||r.created_at.slice(0,4)!==yearStr)return;
      if(mStr&&r.created_at.slice(5,7)!==mStr)return;
      rInc+=Number(r.income||0);rDays++;rAccounts+=Number(r.accounts_count||0);
    });
    s.gopRows.forEach(function(r){
      if(!r.date||r.date.slice(0,4)!==yearStr)return;
      if(mStr&&r.date.slice(5,7)!==mStr)return;
      var a=Number(r.amount||0);
      if(r.unit==='Hotel')gopH+=a;else if(r.unit==='Restaurante')gopR+=a;else gopG+=a;
    });
    s.staffRows.forEach(function(sv){var v=Number(sv.remuneration||0);if(sv.unit==='Hotel')staffH+=v;else if(sv.unit==='Restaurante')staffR+=v;else staffG+=v;});
    hExp+=gopH+staffH*pf;rExp=gopR+staffR*pf;genExp=gopG+staffG*pf;
  } else {
    return; // sin datos aún
  }

  var hUtil=hInc-hExp,rUtil=rInc-rExp,tInc=hInc+rInc,tExp=hExp+rExp+genExp,tUtil=tInc-tExp;
  var hRent=hInc>0?(hUtil/hInc)*100:0,rRent=rInc>0?(rUtil/rInc)*100:0,tRent=tInc>0?(tUtil/tInc)*100:0;
  var maxN=ROOMS*periodDays,occ=maxN>0?Math.min(100,(hNights/maxN)*100):0;
  var adrRes=hIncRes>0?hInc/hIncRes:0,adrN=hIncNights>0?hInc/hIncNights:0;
  var ventaD=rDays>0?rInc/rDays:0,ventaC=rAccounts>0?rInc/rAccounts:0;

  S('summ-h-inc',fK(hInc));    S('summ-h-exp',fK(hExp));    S('summ-h-rent',fP(hRent));
  S('summ-h-adr',fK(adrRes));  S('summ-h-adr-n',fK(adrN)); S('summ-h-occ',fP(occ));  S('summ-h-avg',fK(adrRes));
  S('summ-r-inc',fK(rInc));    S('summ-r-exp',fK(rExp));    S('summ-r-rent',fP(rRent));
  S('summ-r-day',fK(ventaD));  S('summ-r-ticket',fK(ventaC));
  S('summ-t-inc',fK(tInc));    S('summ-t-exp',fK(tExp));    S('summ-t-rent',fP(tRent));
  S('summ-t-util','Utilidad: '+fK(tUtil));
  S('summ-period-label',month==='ytd'?'Año en curso':names[mNum]||'');
}
`;

html = html.slice(0, s) + newRenderSummary + html.slice(e);

fs.writeFileSync(filePath, html, 'utf8');

const verify = fs.readFileSync(filePath, 'utf8');
const checks = ['MODO PRECISO','MODO FALLBACK','function setSummMonth','CONCILIACIONES','window._concByMonth'];
let ok = true;
checks.forEach(function(c){ 
  const f = verify.includes(c);
  console.log((f?'✅':'❌')+' '+c);
  if(!f) ok=false;
});
console.log('\nTamaño:', verify.length, 'bytes | Líneas:', verify.split('\n').length);
console.log(ok?'✅ renderSummary reparado correctamente':'❌ Verificación fallida');
