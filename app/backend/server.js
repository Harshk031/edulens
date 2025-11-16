// ==========================================
// CRITICAL: ERROR HANDLERS FIRST - BEFORE ANY OTHER CODE
// ==========================================
const fs = require('fs');
const path = require('path');

// Crash log file
const CRASH_LOG = path.join(__dirname, '..', 'backend-crash.log');

function logCrash(type, error, extra = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `
========================================
[${timestamp}] ${type}
Error: ${error?.message || error}
Stack: ${error?.stack || 'No stack trace'}
${extra}
========================================
`;
  
  try {
    fs.appendFileSync(CRASH_LOG, logEntry);
    console.error(logEntry);
  } catch (e) {
    console.error('Failed to write crash log:', e);
  }
}

// CRITICAL: Install error handlers BEFORE anything else
process.on('unhandledRejection', (reason, promise) => {
  logCrash('UNHANDLED REJECTION', reason, `Promise: ${promise}`);
  // DON'T EXIT - keep server alive
});

process.on('uncaughtException', (err, origin) => {
  logCrash('UNCAUGHT EXCEPTION', err, `Origin: ${origin}`);
  // DON'T EXIT - keep server alive
});

process.on('warning', (warning) => {
  console.warn('⚠️  Node Warning:', warning.name, warning.message);
});

// Prevent memory leaks
process.setMaxListeners(100);

console.log('✅ Crash protection installed');

// ==========================================
// NOW LOAD NORMAL DEPENDENCIES
// ==========================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { default: chalk } = require('chalk');
const detect = require('detect-port').default || require('detect-port');

// Auto cleanup on server exit
try {
  const cleanupManager = require('./utils/cleanup.cjs');
  console.log('✅ Cleanup manager loaded for server');
} catch (err) {
  console.warn('⚠️  Cleanup manager not available:', err.message);
}

// Load environment variables first - prioritize .env.local over .env
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

// Load .env.local first (higher priority for local development)
if (require('fs').existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log(`[init] Loading .env.local from: ${envLocalPath}`);
}
// Then load .env as fallback
dotenv.config({ path: envPath });
console.log(`[init] Loading .env from: ${envPath}`);
console.log(`[init] WHISPER_CPP_BIN = ${process.env.WHISPER_CPP_BIN}`);
console.log(`[init] WHISPER_MODEL = ${process.env.WHISPER_MODEL}`);
console.log(`[init] YTDLP_PATH = ${process.env.YTDLP_PATH}`);

const app = express();
let PORT = parseInt(process.env.PORT || '5000', 10);

// Storage path helper function - CRITICAL FIX: Use process.cwd() for consistent paths
const getStoragePath = (type) => {
  // Use process.cwd() to get app root, then go to data/storage
  const basePath = path.join(process.cwd(), 'data', 'storage');
  switch(type) {
    case 'transcripts': return path.join(basePath, 'transcripts');
    case 'embeddings': return path.join(basePath, 'embeddings');
    case 'sessions': return path.join(basePath, 'sessions');
    default: return basePath;
  }
};

// Ensure storage dirs for Phase-4 pipeline - CRITICAL FIX: Create all directories
const fsExtra = require('fs-extra');
const storageDirs = [
  getStoragePath('transcripts'),
  getStoragePath('embeddings'),
  getStoragePath('sessions'),
  path.join(getStoragePath('sessions'), 'jobs') // Also create jobs subdirectory
];

// Create all storage directories immediately
storageDirs.forEach(dir => {
  try {
    fsExtra.ensureDirSync(dir);
    console.log(`✅ Storage directory ensured: ${dir}`);
  } catch (err) {
    console.error(`❌ Failed to create storage directory ${dir}:`, err.message);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use((req,res,next)=>{ console.log(`[req] ${req.method} ${req.url}`); next(); });

// Focus status route (simple, avoids 500s)
const focusStatus = require('./routes/focus.js');
app.use('/api/focus', focusStatus);

// Also register comprehensive focus routes from src/server
try {
  const comprehensiveFocus = require('./routes/focus.cjs');
  app.use('/api/focus', comprehensiveFocus);
  console.log('✅ Comprehensive focus routes loaded');
} catch (err) {
  console.warn('⚠️  Comprehensive focus routes not available:', err.message);
}

// Fallback focus routes to ensure basic functionality
app.post('/api/focus/session', async (req, res) => {
  try {
    const { duration, videoId } = req.body;
    console.log(`[Fallback/focus/session] Creating session: duration=${duration}, videoId=${videoId}`);
    
    if (!duration) {
      return res.status(400).json({ 
        error: 'Missing duration',
        hint: 'Please provide a duration in minutes'
      });
    }
    
    const sessionId = `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionData = {
      sessionId,
      startTime: new Date().toISOString(),
      duration,
      videoId: videoId || null,
      status: 'active'
    };
    
    console.log(`[Fallback/focus/session] Session created successfully: ${sessionId}`);
    res.json(sessionData);
    
  } catch (error) {
    console.error('[Fallback/focus/session] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create focus session',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/focus/stats', async (req, res) => {
  try {
    console.log(`[Fallback/focus/stats] Retrieving focus stats`);
    
    const mockStats = {
      totalTime: 3600,
      sessions: 5,
      averageSessionTime: 720,
      streak: 3,
      lastSession: new Date().toISOString(),
      achievements: ['First Session', '3-Day Streak'],
      weeklyGoal: 1500,
      weeklyProgress: 3600
    };
    
    console.log(`[Fallback/focus/stats] Stats retrieved successfully`);
    res.json(mockStats);
    
  } catch (error) {
    console.error('[Fallback/focus/stats] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to retrieve focus stats',
      timestamp: new Date().toISOString()
    });
  }
});

console.log('✅ Fallback focus routes created');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'video-routes',
    timestamp: new Date().toISOString(),
    storage: {
      transcripts: getStoragePath('transcripts'),
      embeddings: getStoragePath('embeddings'),
      sessions: getStoragePath('sessions')
    }
  });
});

// Local YouTube embed route (serves minimal HTML wrapper)
app.get('/local/embed/:videoId', (req, res) => {
  const { videoId } = req.params;
  const id = (videoId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const startTime = req.query.start ? parseInt(req.query.start, 10) : 0;
  const autoplay = req.query.autoplay ? 1 : 0;
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
</head>
<style>
html,body{height:100%;margin:0;padding:0;background:#000;overflow:hidden}
iframe{width:100%;height:100%;border:0;display:block}
</style>
<body>
  <iframe
    id="player"
    title="YouTube video player"
    src="https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1&start=${startTime}&autoplay=${autoplay}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups">
  </iframe>
  <script>
    console.log('[LocalEmbed] Loaded video ${id} (start=${startTime}, autoplay=${autoplay})');
    window.addEventListener('error', (e) => console.error('[LocalEmbed Error]', e));
  </script>
</body>
</html>`;
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('X-Content-Type-Options', 'nosniff');
  try { console.log(`[embed] /local/embed/${id}?start=${startTime}&autoplay=${autoplay}`); } catch {}
  res.status(200).send(html);
});

// Dynamically load routes to prevent startup failures
const loadRoutes = () => {
  // Ollama routes removed - using LM Studio only
  try {
    const ttsRoutes = require('./routes/ttsRoutes.js');
    app.use('/api/tts', ttsRoutes);
  } catch (err) {
    console.warn('⚠️  TTS routes not available:', err.message);
  }
  try {
    const onlineAI = require('./routes/onlineAI.js');
    app.use('/api/ai/online', onlineAI);
  } catch (err) {
    console.warn('⚠️  Online AI routes not available:', err.message);
  }
  try {
    const analytics = require('../frontend/api/analyticsRoutes.js');
    app.use('/api/analytics', analytics); // CRITICAL FIX: Mount at /api/analytics instead of /api to avoid conflicts
  } catch (err) {
    console.warn('⚠️  Analytics routes not available:', err.message);
  }
  // Fallback stub routes so frontend never breaks during dev
  app.post('/api/analytics/log-event', (req, res) => res.json({ success: true, event: req.body || {} }));
  app.get('/api/analytics/summary/:userId', (req, res) => res.json({ success: true, summary: { totalEvents: 0, totalSessions: 0 } }));
  app.get('/api/analytics/sessions/:userId', (req, res) => res.json({ success: true, sessions: [] }));
  app.get('/api/analytics/gamification/:userId', (req, res) => res.json({ success: true, gamification: { points: 0, streak: 0, badges: [] } }));
  
  // Video loader logging endpoint
  app.post('/api/logs/videoloader', (req, res) => {
    const { line, level, timestamp } = req.body;
    console.log(`[VideoLoader/${level}] ${timestamp}: ${line}`);
    res.json({ success: true, logged: true });
  });

  // Phase-4 pipeline routes (video processing + AI tools)
  try {
    const videoRoutesPath = path.join(__dirname, './routes/videoRoutes.cjs');
    const videoRoutes = require(videoRoutesPath);
    app.use('/api/video', videoRoutes);
    console.log('✅ Video routes loaded');
  } catch (err) {
    console.warn('⚠️  Video routes not available:', err.message);
  }
  
  // Code extraction and compilation routes
  try {
    const codeRoutesPath = path.join(__dirname, './routes/codeRoutes.cjs');
    const codeRoutes = require(codeRoutesPath);
    app.use('/api/code', codeRoutes);
    console.log('✅ Code routes loaded');
  } catch (err) {
    console.warn('⚠️  Code routes not available:', err.message);
  }
  try {
    const aiRoutesPath = path.join(__dirname, './routes/aiRoutes.cjs');
    if (fs.existsSync(aiRoutesPath)) {
      const aiRoutes = require(aiRoutesPath);
      app.use('/api/ai', aiRoutes);
      console.log('✅ AI routes loaded successfully');
    } else {
      throw new Error(`AI routes file not found: ${aiRoutesPath}`);
    }
  } catch (err) {
    console.warn('⚠️  AI routes not available:', err.message);
    console.log('🔧 Creating fallback AI routes...');
    
    // Fallback AI routes for testing
    app.post('/api/ai/query', (req, res) => {
      console.log('📡 Fallback AI query called:', req.body);
      res.json({
        text: 'This is a test response from fallback AI system. The main AI system is not available.',
        sourceChunks: [],
        creditUseEstimate: { tokensIn: 100, tokensOut: 50 }
      });
    });
    
    app.post('/api/ai/summary', (req, res) => {
      console.log('📡 Fallback AI summary called:', req.body);
      res.json({
        text: 'Test Summary: This is a fallback summary response. The video discusses various topics.',
        sourceChunks: [],
        creditUseEstimate: { tokensIn: 200, tokensOut: 100 }
      });
    });
    
    app.post('/api/ai/flashcards', (req, res) => {
      console.log('📡 Fallback AI flashcards called:', req.body);
      res.json({
        text: 'Test Flashcards:\nCard 1: Front: Key concept | Back: Definition\nCard 2: Front: Important point | Back: Explanation',
        flashcards: 'Fallback flashcard content',
        sourceChunks: [],
        creditUseEstimate: { tokensIn: 120, tokensOut: 60 }
      });
    });
    
    app.post('/api/ai/quiz', (req, res) => {
      console.log('📡 Fallback AI quiz called:', req.body);
      res.json({
        text: 'Test Quiz:\n1. What is the main topic? A) Topic A B) Topic B C) Topic C\n2. Key point? A) Point 1 B) Point 2',
        quiz: 'Fallback quiz content',
        sourceChunks: [],
        creditUseEstimate: { tokensIn: 150, tokensOut: 80 }
      });
    });
    
    app.post('/api/ai/mindmap', (req, res) => {
      console.log('📡 Fallback AI mindmap called:', req.body);
      res.json({
        text: 'Test Mindmap:\nCentral Topic\n├── Branch 1\n│   ├── Sub-point A\n│   └── Sub-point B\n└── Branch 2\n    ├── Detail X\n    └── Detail Y',
        sourceChunks: [],
        creditUseEstimate: { tokensIn: 130, tokensOut: 70 }
      });
    });
    
    console.log('✅ Fallback AI routes created');
  }

  // Advanced AI routes (comprehensive transcript analysis)
  try {
    const advancedAIRoutesPath = path.join(__dirname, './routes/advancedAIRoutes.cjs');
    if (fs.existsSync(advancedAIRoutesPath)) {
      const advancedAIRoutes = require(advancedAIRoutesPath);
      app.use('/api/ai/advanced', advancedAIRoutes);
      console.log('✅ Advanced AI routes loaded successfully');
    } else {
      console.warn('⚠️  Advanced AI routes not available');
    }
  } catch (err) {
    console.warn('⚠️  Advanced AI routes not available:', err.message);
  }

  // Complete AI routes (comprehensive implementation)
  try {
    const completeAIRoutesPath = path.join(__dirname, './routes/completeAIRoutes.cjs');
    if (fs.existsSync(completeAIRoutesPath)) {
      const completeAIRoutes = require(completeAIRoutesPath);
      app.use('/api/complete-ai', completeAIRoutes);
      console.log('✅ Complete AI routes loaded successfully');
    } else {
      console.warn('⚠️  Complete AI routes not available');
    }
  } catch (err) {
    console.warn('⚠️  Complete AI routes not available:', err.message);
  }

  // Timeline-aware AI query routes
  try {
    const timelineRoutesPath = path.join(__dirname, './routes/timelineAiRoutes.cjs');
    const timelineRoutes = require(timelineRoutesPath);
    app.use('/api/timeline', timelineRoutes);
    console.log('✅ Timeline AI routes loaded');
  } catch (err) {
    console.warn('⚠️  Timeline AI routes not available:', err.message);
  }

  // AI Tools routes (summary, quiz, notes, flashcards, mindmap)
  try {
    const aiToolsRoutesPath = path.join(__dirname, './routes/aiToolsRoutes.cjs');
    if (fs.existsSync(aiToolsRoutesPath)) {
      const aiToolsRoutes = require(aiToolsRoutesPath);
      app.use('/api/tools', aiToolsRoutes);
      console.log('✅ AI Tools routes loaded');
    } else {
      console.warn('⚠️  AI Tools routes not available:', err.message);
    }
  } catch (err) {
    console.warn('⚠️  AI Tools routes not available:', err.message);
  }

  // Parallel transcriber routes (new orchestrator-based pipeline)
  try {
    const transcriberRoutes = require('./routes/transcriber-routes-wrapper.js');
    app.use('/api/transcriber', transcriberRoutes);
    console.log('✅ Transcriber routes loaded');
  } catch (err) {
    console.warn('⚠️  Transcriber routes not available:', err.message);
  }
};

// Load routes BEFORE static files to ensure API routes are registered first
loadRoutes();

// Serve frontend static files from the frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Fallback frontend route for SPA (this catches everything not matched above)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback response if index.html doesn't exist
    res.status(404).json({ 
      error: 'Frontend not found',
      message: 'This is a backend-only server. Frontend should be served separately via Vite.'
    });
  }
});

// Ensure storage directories are created
for (const d of storageDirs) {
  try {
    fsExtra.ensureDirSync(d);
  } catch (err) {
    console.warn(`⚠️  Could not create directory ${d}:`, err.message);
  }
}

// AUTOMATIC PORT CLEANUP: Kill ONLY the process on port 5000 (not all node processes)
async function cleanupPort5000() {
  const { execSync } = require('child_process');
  console.log(chalk.cyan('🧹 Checking port 5000...'));
  
  try {
    // Check if port 5000 is occupied
    const checkCmd = process.platform === 'win32'
      ? 'netstat -ano | findstr ":5000.*LISTENING"'
      : 'lsof -ti:5000';
    
    const output = execSync(checkCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    
    if (output && output.trim()) {
      console.log(chalk.yellow('⚠️  Port 5000 is occupied. Auto-cleaning...'));
      
      if (process.platform === 'win32') {
        // Windows: Extract PID and kill ONLY that specific process
        const lines = output.trim().split('\n');
        const pids = new Set();
        
        for (const line of lines) {
          const match = line.match(/\s+(\d+)\s*$/);
          if (match) {
            pids.add(match[1]);
          }
        }
        
        // Kill only the specific PIDs on port 5000, not all node.exe
        for (const pid of pids) {
          try {
            console.log(chalk.yellow(`  Killing PID ${pid} on port 5000...`));
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } catch (e) {
            // Process might already be dead
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      } else {
        // Linux/Mac: Kill process by port
        execSync('lsof -ti:5000 | xargs kill -9', { stdio: 'ignore' });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(chalk.green('✅ Port 5000 cleaned'));
    } else {
      console.log(chalk.green('✅ Port 5000 already free'));
    }
  } catch (err) {
    // No process found or command failed - port is likely free
    if (err.message && !err.message.includes('Command failed')) {
      console.warn(chalk.yellow(`⚠️  Port cleanup check: ${err.message}`));
    }
    console.log(chalk.green('✅ Port 5000 is free (or cleanup completed)'));
  }
}

// FIXED: Check if port 5000 is available - NO AUTO-FALLBACK!
// Frontend expects backend on port 5000, so we MUST use 5000 or fail
cleanupPort5000().then(() => detect(PORT)).then(chosenPort => {
  if (chosenPort !== PORT) {
    // PORT CONFLICT DETECTED!
    console.error(`\n${'='.repeat(70)}`);
    console.error(chalk.red.bold(`❌ CRITICAL ERROR: Port ${PORT} is already in use!`));
    console.error(chalk.yellow(`\n🔍 Another process is using port ${PORT}.`));
    console.error(chalk.yellow(`   Frontend expects backend on port ${PORT} exactly.`));
    console.error(chalk.yellow(`   Backend CANNOT switch to port ${chosenPort}.`));
    console.error(chalk.cyan(`\n💡 SOLUTION:`));
    console.error(chalk.white(`   1. Kill the process using port ${PORT}:`));
    console.error(chalk.gray(`      Windows: netstat -ano | findstr :${PORT}`));
    console.error(chalk.gray(`               taskkill /F /PID [PID]`));
    console.error(chalk.gray(`      Linux:   lsof -ti:${PORT} | xargs kill -9`));
    console.error(chalk.white(`   2. Or restart using the launcher:`));
    console.error(chalk.gray(`      launchers/EDULENS-FIXED-LAUNCHER.cmd`));
    console.error(`${'='.repeat(70)}\n`);
    process.exit(1); // Exit with error code
  }
  
  // Port 5000 is free - proceed
  console.log(chalk.green(`✅ Port ${PORT} is available`));
  process.env.ACTUAL_PORT = String(PORT);
  
  // Write runtime env for frontend/tools
  // NOTE: VITE_API_BASE should be empty to use relative URLs via Vite proxy
  try {
    const runtimePath = path.join(__dirname, '..', '.runtime-env');
    const apiBase = `http://localhost:${PORT}`;
    // Don't set VITE_API_BASE - let frontend use relative URLs via Vite proxy
    fs.writeFileSync(runtimePath, `API_BASE=${apiBase}\nVITE_API_BASE=\nPORT=${PORT}\n`);
    console.log(`🔧 Runtime env written to .runtime-env (API_BASE=${apiBase}, VITE_API_BASE=empty for proxy)`);
  } catch (e) { console.warn('Could not write .runtime-env', e?.message); }
  
  // Start server
  const server = app.listen(PORT, () => {
    console.log(`\n${chalk.green('✅ EduLens Hybrid AI Server running on')} ${chalk.blue(`http://localhost:${PORT}`)}`);
    console.log(`${chalk.green('🔗 Health:')} ${chalk.gray(`http://localhost:${PORT}/health`)}`);
    console.log(`${chalk.green('📍 LM Studio AI:')} ${chalk.gray('http://192.168.29.151:1234')}`);
    console.log(`${chalk.green('📍 Online AI (Groq/Claude/Gemini):')} ${chalk.gray(`http://localhost:${PORT}/api/ai/online`)}`);
    console.log(`${chalk.green('🔗 Status:')} ${chalk.gray(`http://localhost:${PORT}/api/status`)}`);
    console.log(chalk.magenta('🧠 EduLens backend initialized successfully'));
    console.log(chalk.green('✅ Server is ready for connections'));
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
  });
});

// CRITICAL: Cleanup for stuck jobs on server start (with recovery support)
function cleanupStuckJobs() {
  const jobsDir = path.join(__dirname, '..', '..', 'data', 'storage', 'sessions', 'jobs');
  if (!fs.existsSync(jobsDir)) return;
  
  const files = fs.readdirSync(jobsDir);
  const now = Date.now();
  
  files.forEach(file => {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(jobsDir, file);
        const jobData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // CRITICAL: Check if job is truly stuck (no update in last 10 minutes)
        const lastUpdate = new Date(jobData.updatedAt || jobData.startedAt).getTime();
        const timeSinceUpdate = now - lastUpdate;
        const timeoutThreshold = 10 * 60 * 1000; // 10 minutes of no updates = stuck
        
        if (jobData.status === 'processing' && timeSinceUpdate > timeoutThreshold) {
          // Job is stuck (no updates for 10 minutes)
          console.log(`[Server] ⚠️  Found stuck job: ${file}`);
          console.log(`[Server]    Last update: ${Math.round(timeSinceUpdate / 60000)} minutes ago`);
          console.log(`[Server]    Progress: ${jobData.progress}%`);
          
          // Mark as failed but keep progress for potential recovery
          jobData.status = 'failed';
          jobData.error = `Job stuck - no updates for ${Math.round(timeSinceUpdate / 60000)} minutes`;
          jobData.stuckAt = jobData.progress;
          jobData.canRecover = true;
          fs.writeFileSync(filePath, JSON.stringify(jobData, null, 2));
          console.log(`[Server] ✅ Marked job as failed (recoverable)`);
        } else if (jobData.status === 'processing') {
          // Job is still active
          const minutesSinceUpdate = Math.round(timeSinceUpdate / 60000);
          console.log(`[Server] ✅ Active job found: ${file} (${jobData.progress}%, updated ${minutesSinceUpdate}m ago)`);
        }
      } catch (error) {
        console.warn(`[Server] Failed to process job file ${file}:`, error);
      }
    }
  });
}

// CRITICAL: Watchdog to monitor active transcriptions
let transcriptionWatchdog = null;

function startTranscriptionWatchdog() {
  if (transcriptionWatchdog) {
    clearInterval(transcriptionWatchdog);
  }
  
  transcriptionWatchdog = setInterval(() => {
    try {
      const jobsDir = path.join(__dirname, '..', '..', 'data', 'storage', 'sessions', 'jobs');
      if (!fs.existsSync(jobsDir)) return;
      
      const files = fs.readdirSync(jobsDir).filter(f => f.endsWith('.json'));
      const now = Date.now();
      
      files.forEach(file => {
        try {
          const filePath = path.join(jobsDir, file);
          const jobData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (jobData.status === 'processing') {
            const lastUpdate = new Date(jobData.updatedAt || jobData.startedAt).getTime();
            const minutesSinceUpdate = Math.round((now - lastUpdate) / 60000);
            
            if (minutesSinceUpdate >= 5) {
              console.warn(`[Watchdog] ⚠️  Job ${file} has not updated in ${minutesSinceUpdate} minutes (${jobData.progress}%)`);
            }
          }
        } catch (err) {
          // Ignore individual file errors
        }
      });
    } catch (error) {
      console.error('[Watchdog] Error:', error.message);
    }
  }, 2 * 60 * 1000); // Check every 2 minutes
  
  console.log('[Watchdog] ✅ Transcription watchdog started');
}

// Initialize server
try {
  // Cleanup stuck jobs
  cleanupStuckJobs();
  
  // Start watchdog
  startTranscriptionWatchdog();
} catch (error) {
  console.warn('⚠️  Could not initialize server safety features:', error);
}

// CRITICAL: Global safety nets to PREVENT process crash
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  CRITICAL: UnhandledRejection detected!');
  console.error('   Reason:', reason?.message || reason);
  console.error('   Stack:', reason?.stack);
  console.error('   Promise:', promise);
  // DON'T EXIT - keep process alive for long-running transcriptions
  console.error('   ✅ Process kept alive (crash prevented)');
});

process.on('uncaughtException', (err, origin) => {
  console.error('⚠️  CRITICAL: UncaughtException detected!');
  console.error('   Error:', err?.message || err);
  console.error('   Stack:', err?.stack);
  console.error('   Origin:', origin);
  // DON'T EXIT - keep process alive for long-running transcriptions
  console.error('   ✅ Process kept alive (crash prevented)');
});

// CRITICAL: Prevent memory leaks from too many listeners
process.setMaxListeners(50);

// CRITICAL: Memory monitoring and auto-GC for long transcriptions
let lastMemoryCheck = Date.now();
const MEMORY_CHECK_INTERVAL = 60000; // Check every 60 seconds
const MEMORY_THRESHOLD_MB = 1024; // 1GB threshold

setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024);
  
  if (Date.now() - lastMemoryCheck >= MEMORY_CHECK_INTERVAL) {
    console.log(`[Memory] Heap: ${heapUsedMB}MB, RSS: ${rssUsedMB}MB`);
    lastMemoryCheck = Date.now();
    
    // Force garbage collection if memory is high
    if (heapUsedMB > MEMORY_THRESHOLD_MB && global.gc) {
      console.log(`[Memory] High memory usage detected, forcing GC...`);
      global.gc();
      const newHeapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      console.log(`[Memory] After GC: ${newHeapMB}MB (freed ${heapUsedMB - newHeapMB}MB)`);
    }
  }
}, 30000); // Check every 30 seconds

// CRITICAL: Handle SIGTERM and SIGINT gracefully
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, gracefully shutting down...');
  // Give ongoing operations time to complete
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, gracefully shutting down...');
  // Give ongoing operations time to complete
  setTimeout(() => process.exit(0), 5000);
});

// Express error handler - CRITICAL FIX: Always return valid JSON
app.use((err, _req, res, _next) => {
  console.error('Express error:', err?.message || err);
  // CRITICAL: Set content-type header FIRST
  res.setHeader('Content-Type', 'application/json');
  // CRITICAL: Always return valid JSON, even on errors
  res.status(500).json({ 
    error: err?.message || 'Internal error',
    timestamp: new Date().toISOString(),
    status: 'error'
  });
});