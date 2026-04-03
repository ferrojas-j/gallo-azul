const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Safety check: ensure dist folder exists before serving
if (!fs.existsSync(DIST)) {
  console.error('[ERROR] dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}

// Serve static files from dist
app.use(express.static(DIST, {
  maxAge: '1d',
  etag: true,
}));

// SPA fallback — send all unknown routes to index.html
// This prevents 403/404 on direct URL access or page refresh
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[OK] La Mora Resto App running on port ${PORT}`);
  console.log(`[OK] Serving static files from: ${DIST}`);
});
