import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
let morgan;
try { ({ default: morgan } = await import('morgan')); } catch { morgan = null; }

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
let PORT = parseInt(process.env.PORT || '5000', 10);

// Ensure storage dirs for Phase-4 pipeline
import fsExtra from 'fs-extra';
const storageDirs = [
  path.join(__dirname, '..', 'src', 'storage'),
  path.join(__dirname, '..', 'src', 'storage', 'transcripts'),
  path.join(__dirname, '..', 'src', 'storage', 'embeddings'),
  path.join(__dirname, '..', 'src', 'storage', 'sessions'),
];
for (const d of storageDirs) { await fsExtra.ensureDir(d); }

// Middleware
app.use(cors());
app.use(express.json());
if (morgan) { app.use(morgan('dev')); } else { app.use((req,res,next)=>{ console.log(`[req] ${req.method} ${req.url}`); next(); }); }

// Focus status route (simple, avoids 500s)
import focusStatus from './routes/focus.js';
app.use('/api/focus', focusStatus);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Local YouTube embed route (serves minimal HTML wrapper)
app.get('/local/embed/:videoId', (req, res) => {
  const { videoId } = req.params;
  const id = (videoId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<style>html,body{height:100%;margin:0;background:#000}iframe{width:100%;height:100%;border:0}</style>
<body>
  <iframe
    src="https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1"
    frameborder="0"
    allow="autoplay; encrypted-media; picture-in-picture"
    allowfullscreen
    sandbox="allow-scripts allow-same-origin allow-forms allow-presentation">
  </iframe>
</body>
</html>`;
  res.set('Content-Type', 'text/html');
  res.set('Cache-Control', 'no-store');
  try { console.log(`[embed] /local/embed/${id}`); } catch {}
  res.status(200).send(html);
});

// Dynamically load routes to prevent startup failures
const loadRoutes = async () => {
  try {
    const { default: offlineAI } = await import('./routes/offlineAI.js');
    app.use('/api/ai/offline', offlineAI);
  } catch (err) {
    console.warn('⚠️  Offline AI routes not available:', err.message);
  }
  try {
    const { default: ttsRoutes } = await import('./routes/ttsRoutes.js');
    app.use('/api/tts', ttsRoutes);
  } catch (err) {
    console.warn('⚠️  TTS routes not available:', err.message);
  }

  try {
    const { default: onlineAI } = await import('./routes/onlineAI.js');
    app.use('/api/ai/online', onlineAI);
  } catch (err) {
    console.warn('⚠️  Online AI routes not available:', err.message);
  }

  try {
    const { default: focus } = await import('../src/api/focusRoutes.js');
    app.use('/api', focus);
  } catch (err) {
    console.warn('⚠️  Focus routes not available:', err.message);
  }

  try {
    const { default: analytics } = await import('../src/api/analyticsRoutes.js');
    app.use('/api', analytics);
  } catch (err) {
    console.warn('⚠️  Analytics routes not available:', err.message);
    // Fallback stub routes so frontend never breaks during dev
    app.post('/api/analytics/log-event', (req, res) => res.json({ success: true, event: req.body || {} }));
    app.get('/api/analytics/summary/:userId', (req, res) => res.json({ success: true, summary: { totalEvents: 0, totalSessions: 0 } }));
    app.get('/api/analytics/sessions/:userId', (req, res) => res.json({ success: true, sessions: [] }));
    app.get('/api/analytics/gamification/:userId', (req, res) => res.json({ success: true, gamification: { points: 0, streak: 0, badges: [] } }));
  }

  // Phase-4 pipeline routes (video processing + AI tools)
  try {
    const videoRoutesMod = await import('../src/server/routes/videoRoutes.cjs');
    const videoRoutes = videoRoutesMod.default || videoRoutesMod;
    app.use('/api/video', videoRoutes);
  } catch (err) {
    console.warn('⚠️  Video routes not available:', err.message);
  }
  try {
    const aiRoutesMod = await import('../src/server/routes/aiRoutes.cjs');
    const aiRoutes = aiRoutesMod.default || aiRoutesMod;
    app.use('/api/ai', aiRoutes);
  } catch (err) {
    console.warn('⚠️  AI routes not available:', err.message);
  }

  try {
    // simple log ingestion for videoloader
    app.post('/api/logs/videoloader', async (req, res) => {
      try {
        const logDir = path.join(__dirname, '..', 'logs');
        await (await import('fs-extra')).default.ensureDir(logDir);
        const target = path.join(logDir, 'videoloader.log');
        await (await import('fs-extra')).default.appendFile(target, (req.body?.line || '') + '\n');
        res.json({ ok: true });
      } catch { res.json({ ok: false }); }
    });
  } catch {}

};

// Load routes after app is ready
await loadRoutes();

// Choose free port (auto-fallback)
import detect from 'detect-port';
const chosenPort = await detect(PORT);
if (chosenPort !== PORT) {
  console.warn(`⚠️  Port ${PORT} busy, switching to ${chosenPort}`);
  PORT = chosenPort;
}
process.env.ACTUAL_PORT = String(PORT);
// Write runtime env for the frontend/tools
try {
  const runtimePath = path.join(__dirname, '..', '.runtime-env');
  const apiBase = `http://localhost:${PORT}`;
  fs.writeFileSync(runtimePath, `API_BASE=${apiBase}\nVITE_API_BASE=${apiBase}\nPORT=${PORT}\n`);
  console.log(`🔧 Runtime env written to .runtime-env (API_BASE=${apiBase})`);
} catch (e) { console.warn('Could not write .runtime-env', e?.message); }

// Root status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'EduLens Hybrid AI Backend',
    version: '1.0.0',
    phase: 'Phase 1',
    endpoints: {
      offline: '/api/ai/offline/*',
      online: '/api/ai/online/*',
    },
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ EduLens Hybrid AI Server running on http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📍 Offline AI (Ollama): http://localhost:${PORT}/api/ai/offline`);
  console.log(`📍 Online AI (Groq/Claude/Gemini): http://localhost:${PORT}/api/ai/online`);
  console.log(`🔗 Status: http://localhost:${PORT}/api/status`);
  console.log(`🧠 EduLens backend initialized successfully`);
  console.log(`✅ Server is ready for connections\n`);
});

server.on('error', (err) => {
  console.error(`❌ Server error: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  }
});

// Global safety nets to avoid process crash during dev
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ UnhandledRejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ UncaughtException:', err?.message || err);
});

// Express error handler
app.use((err, _req, res, _next) => {
  console.error('Express error:', err?.message || err);
  res.status(500).json({ error: err?.message || 'Internal error' });
});
