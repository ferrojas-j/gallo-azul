const fs=require('fs');
const h=fs.readFileSync('public/finanzas_corporativas/index.html','utf8');
const si=h.indexOf('<script>');
const se=h.lastIndexOf('</script>');
const s=h.slice(si,se);
let i=s.indexOf('`');
while(i>-1){
  console.log('pos:',i,'ctx:',s.slice(Math.max(0,i-40),i+40));
  i=s.indexOf('`',i+1);
}
