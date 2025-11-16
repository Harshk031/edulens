import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, '../frontend'),
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all interfaces (IPv4 and IPv6)
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // Increased to 30 seconds for long operations
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy] Error proxying to backend:', err.message);
            console.error('[Vite Proxy] Request:', req.method, req.url);
            console.error('[Vite Proxy] Backend is not running on port 5000');
            // Return a JSON error response instead of crashing
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Backend server is not running',
                message: 'Please start the backend server: node backend/server.js',
                status: 'error',
                timestamp: new Date().toISOString()
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy] Proxying request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Vite Proxy] Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src')
    }
  }
})