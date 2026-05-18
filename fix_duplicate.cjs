const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'finanzas_corporativas', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

const marker = 'Light Premium v2';
const first  = html.indexOf(marker);
const second = html.lastIndexOf(marker);

if (first === second) {
  console.log('✅ No hay duplicado — archivo ya limpio.');
  process.exit(0);
}

// El segundo bloque empieza con <style> antes del marker
// Buscamos el <style> más cercano antes del segundo marcador
const styleOpenBefore = html.lastIndexOf('<style>', second);
// El bloque duplicado termina con /exec-summary --> justo después del segundo HTML del exec-summary
// Buscamos el /exec-summary --> después del segundo marker
const endMarker = '/exec-summary -->';
const endPos    = html.indexOf(endMarker, second) + endMarker.length;

console.log('Bloque duplicado: chars', styleOpenBefore, '→', endPos);
console.log('Tamaño bloque a eliminar:', endPos - styleOpenBefore, 'chars');

// Verificación de seguridad: el primer bloque no debe estar en este rango
if (first >= styleOpenBefore) {
  console.error('❌ Error: el primer bloque también está en el rango. Abortando.');
  process.exit(1);
}

// Eliminar el bloque duplicado (dejar un salto de línea limpio)
html = html.slice(0, styleOpenBefore) + '\n' + html.slice(endPos);

fs.writeFileSync(filePath, html, 'utf8');

const verify = fs.readFileSync(filePath, 'utf8');
const firstV  = verify.indexOf(marker);
const secondV = verify.lastIndexOf(marker);
const lines   = verify.split('\n').length;

console.log(firstV === secondV
  ? `✅ Duplicado eliminado correctamente. Líneas: ${lines}`
  : `❌ Aún hay duplicado: first=${firstV} second=${secondV}`
);
