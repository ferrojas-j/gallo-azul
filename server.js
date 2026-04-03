const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Serve static files from dist
app.use(express.static(DIST));

// SPA fallback — send all unknown routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`La Mora Resto App running on port ${PORT}`);
});
