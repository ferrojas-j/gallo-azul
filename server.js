import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, 'dist');

// Serve pre-built static files from dist/
app.use(express.static(DIST, { maxAge: '1d', etag: true }));

// Health check
app.get('/_health', (req, res) => {
  res.json({ status: 'ok', dist: existsSync(DIST) });
});

// SPA fallback — all routes → index.html (prevents 403/404)
app.get('*', (req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`La Mora Resto App running on port ${PORT}`);
});
