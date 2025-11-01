import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load runtime env written by server at dev-time
function loadRuntimeApiBase() {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const p = path.join(__dirname, '.runtime-env')
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/).filter(Boolean)
      const map = Object.fromEntries(lines.map(l => l.split('=')))
      // Support either key in runtime file
      return map.VITE_API_BASE || map.API_BASE
    }
  } catch {}
  return null
}

function dynamicProxy() {
  const fixed = process.env.VITE_API_BASE || loadRuntimeApiBase() || null
  const fallback = 'http://127.0.0.1:5001'
  return {
    changeOrigin: true,
    // http-proxy option to choose target per request reliably
    router: () => fixed || loadRuntimeApiBase() || fallback,
    target: fixed || fallback,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const runtime = loadRuntimeApiBase()
  if (runtime) process.env.VITE_API_BASE = runtime
  const api = process.env.VITE_API_BASE || ''
  console.log(`⚙️ Using backend base: ${api || '(relative / proxy)'}`)
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      cors: true,
      proxy: {
        '/api': dynamicProxy(),
        '/health': dynamicProxy(),
        '/local': dynamicProxy(),
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Opener-Policy': 'unsafe-none',
      },
    }
  }
})
