const fs=require('fs');
let h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');

// 1. Add section panels to the HTML - insert after the hotel table-container div, before </div></div>
// Find the closing of main-content > content-body
const insertBefore='</div>\n</div>\n<script>';
const newPanels=`
<div id="panel-restaurante" style="display:none">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:64px 32px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05)">
    <div style="width:64px;height:64px;background:linear-gradient(135deg,#10b981,#059669);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
    </div>
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px">Ingresos Restaurante</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px">Módulo en desarrollo — próximamente disponible.</p>
    <span style="background:#dcfce7;color:#166534;padding:6px 18px;border-radius:100px;font-size:12px;font-weight:700">Próximamente</span>
  </div>
</div>
<div id="panel-gastos" style="display:none">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:64px 32px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05)">
    <div style="width:64px;height:64px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px">Gastos Operacionales</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px">Módulo en desarrollo — próximamente disponible.</p>
    <span style="background:#fef3c7;color:#92400e;padding:6px 18px;border-radius:100px;font-size:12px;font-weight:700">Próximamente</span>
  </div>
</div>
<div id="panel-conciliaciones" style="display:none">
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:64px 32px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05)">
    <div style="width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </div>
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px">Conciliaciones</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px">Módulo en desarrollo — próximamente disponible.</p>
    <span style="background:#ede9fe;color:#5b21b6;padding:6px 18px;border-radius:100px;font-size:12px;font-weight:700">Próximamente</span>
  </div>
</div>
`;

const idx=h.indexOf(insertBefore);
console.log('Insert index:',idx);
if(idx>-1) h=h.slice(0,idx)+newPanels+h.slice(idx);

// 2. Add navigation JS - insert just before loadHotelData() at the bottom of the script
const navJS=`
// ---- NAV PANEL SWITCHING ----
function showPanel(name){
  var panels=['hotel','restaurante','gastos','conciliaciones'];
  panels.forEach(function(p){
    var el=document.getElementById('panel-'+p)||document.querySelector('.hotel-filter-bar')&&(p==='hotel'?null:null);
    if(p==='hotel'){
      // hotel panel = filter bar + table container
      var fb=document.querySelector('.hotel-filter-bar');
      var tc=document.querySelector('.table-container');
      var ph=document.querySelector('.page-title');
      if(fb) fb.style.display=name==='hotel'?'':'none';
      if(tc) tc.style.display=name==='hotel'?'':'none';
      var kg=document.querySelector('.kpi-grid');
      if(kg) kg.style.display=name==='hotel'?'':'none';
    } else {
      var panel=document.getElementById('panel-'+p);
      if(panel) panel.style.display=name===p?'':'none';
    }
  });
  // Update sidebar active states
  document.querySelectorAll('.nav-item,.nav-sub-item').forEach(function(el){el.classList.remove('active');});
  var titles={'hotel':'Ingresos por venta de habitaciones','restaurante':'Ingresos Restaurante','gastos':'Gastos Operacionales','conciliaciones':'Conciliaciones'};
  document.querySelector('.page-title').textContent=titles[name]||'';
  if(name==='hotel'){
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    document.querySelectorAll('.nav-sub-item')[0].classList.add('active');
  } else if(name==='restaurante'){
    document.querySelectorAll('.nav-item')[0].classList.add('active');
    document.querySelectorAll('.nav-sub-item')[1].classList.add('active');
  } else if(name==='gastos'){
    document.querySelectorAll('.nav-item')[1].classList.add('active');
  } else if(name==='conciliaciones'){
    document.querySelectorAll('.nav-item')[2].classList.add('active');
  }
}
document.querySelectorAll('.nav-sub-item')[0].addEventListener('click',function(){showPanel('hotel');});
document.querySelectorAll('.nav-sub-item')[1].addEventListener('click',function(){showPanel('restaurante');});
document.querySelectorAll('.nav-item')[1].addEventListener('click',function(){showPanel('gastos');});
document.querySelectorAll('.nav-item')[2].addEventListener('click',function(){showPanel('conciliaciones');});
// Also clicking "Ingresos" nav-item selects Hotel by default
document.querySelectorAll('.nav-item')[0].addEventListener('click',function(){showPanel('hotel');});
`;

const beforeLoad='loadHotelData();';
const li=h.lastIndexOf(beforeLoad);
console.log('loadHotelData index:',li);
if(li>-1) h=h.slice(0,li)+navJS+h.slice(li);

fs.writeFileSync('public/finanzas_corporativas/index.html',h,'utf8');
fs.copyFileSync('public/finanzas_corporativas/index.html','dist/finanzas_corporativas/index.html');
console.log('Done. Size:',fs.statSync('public/finanzas_corporativas/index.html').size);
