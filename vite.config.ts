import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

const BUILD_TIME = Date.now();

// ── Build-time version file ────────────────────────────────────────────────
// Writes public/version.json so the running app can compare its embedded
// BUILD_TIME against the server's latest build. Works regardless of SW state.
const versionPlugin = {
  name: 'write-version-json',
  buildStart() {
    writeFileSync('public/version.json', JSON.stringify({ build: BUILD_TIME }));
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    versionPlugin,
  ],
  define: {
    __BUILD_TIME__: BUILD_TIME,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})
