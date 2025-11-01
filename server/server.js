import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Focus status route (simple, avoids 500s)
import focusStatus from './routes/focus.js';
app.use('/api/focus', focusStatus);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    offlineAI: 'ready',
    onlineAI: 'ready',
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
    sandbox="allow-scripts allow-same-origin allow-forms">
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
  console.log(`\n✅ EduLens Hybrid AI Server running on port ${PORT}`);
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
  process.exit(1);
});
