const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Serve pre-built static files from dist/
app.use(express.static(DIST, { maxAge: '1d', etag: true }));

// SPA fallback — all routes → index.html (prevents 403/404 on refresh)
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`La Mora Resto App running on port ${PORT}`);
});
