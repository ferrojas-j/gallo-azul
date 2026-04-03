const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Debug info (visible in Hostinger logs)
console.log('[START] server.js starting...');
console.log('[INFO] __dirname:', __dirname);
console.log('[INFO] DIST path:', DIST);
console.log('[INFO] PORT:', PORT);
console.log('[INFO] dist exists:', fs.existsSync(DIST));
console.log('[INFO] Node version:', process.version);

// Serve static files from dist/
app.use(express.static(DIST, { maxAge: '1d', etag: true }));

// Health check endpoint
app.get('/_health', (req, res) => {
  res.json({ status: 'ok', dist: fs.existsSync(DIST) });
});

// SPA fallback — all routes → index.html
app.get('*', (req, res) => {
  const indexFile = path.join(DIST, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(503).send('[ERROR] dist/index.html not found. Rebuild required.');
  }
});

// Listen on all interfaces
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[OK] App listening on 0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('[ERROR] Server failed to start:', err.message);
  process.exit(1);
});
