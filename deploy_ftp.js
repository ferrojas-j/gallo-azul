import ftp from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log('🔌 Conectando al servidor FTP de Hostinger...');
    await client.access({
      host: '77.37.59.101',
      port: 21,
      user: 'u621550599.gallops.cloud',
      password: 'Xhell25.11',
      secure: false
    });

    console.log('✅ Conectado a gallops.cloud (Hostinger)');
    console.log('📂 Subiendo dist/ → /public_html ...');

    const distPath = path.join(__dirname, 'dist');
    await client.uploadFromDir(distPath, '/public_html');

    console.log('🚀 ¡Deploy completado! gallops.cloud actualizado.');
  } catch (err) {
    console.error('❌ Error en el deploy:', err.message);
    process.exit(1);
  }

  client.close();
}

deploy();
