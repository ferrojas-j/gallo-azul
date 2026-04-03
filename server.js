const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

// Auto-build if dist/ doesn't exist (needed on Hostinger first deploy)
if (!fs.existsSync(DIST)) {
  console.log('[BUILD] dist/ not found — running npm run build...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('[BUILD] Build completed successfully.');
  } catch (err) {
    console.error('[BUILD] Build failed:', err.message);
    process.exit(1);
  }
}

// Serve static files from dist with caching
app.use(express.static(DIST, {
  maxAge: '1d',
  etag: true,
}));

// SPA fallback — all unknown routes → index.html (prevents 403/404)
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[OK] La Mora Resto App running on port ${PORT}`);
});
