// UTF-8 ENCODING
process.env.LANG = 'en_US.UTF-8';
process.env.LC_ALL = 'en_US.UTF-8';
process.env.PYTHONIOENCODING = 'utf-8';

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

// CRITICAL: Use faster-whisper as primary method (much more stable)
const fasterWhisper = require('./fasterWhisper.cjs');

// CRITICAL: Force kill process on Windows and Unix
function killProcess(childProcess) {
  if (!childProcess || !childProcess.pid) {
    console.warn('[killProcess] No valid process to kill');
    return;
  }
  
  const pid = childProcess.pid;
  console.log(`[killProcess] Killing process ${pid}...`);
  
  try {
    // Try graceful termination first
    childProcess.kill('SIGTERM');
    
    // Force kill after 1 second
    setTimeout(() => {
      try {
        if (process.platform === 'win32') {
          // Windows: Use taskkill with /F (force) and /T (tree)
          exec(`taskkill /F /T /PID ${pid}`, (error) => {
            if (error) {
              console.error(`[killProcess] taskkill failed: ${error.message}`);
            } else {
              console.log(`[killProcess] Process ${pid} force killed (Windows)`);
            }
          });
        } else {
          // Unix: Use SIGKILL
          childProcess.kill('SIGKILL');
          console.log(`[killProcess] Process ${pid} force killed (Unix)`);
        }
      } catch (killError) {
        console.error(`[killProcess] Force kill failed: ${killError.message}`);
      }
    }, 1000);
  } catch (error) {
    console.error(`[killProcess] Error killing process: ${error.message}`);
  }
}

async function toWav16k(inputPath) {
  const out = inputPath.replace(/\.[^.]+$/, '') + '-16k.wav';
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .format('wav')
      .save(out)
      .on('end', resolve)
      .on('error', reject);
  });
  return out;
}

async function transcribe(audioFile, { language = 'auto' } = {}, onProgress = () => {}) {
  // PRIORITY 1: Try faster-whisper (Python, most stable)
  console.log('[whisper] Attempting faster-whisper (Python)...');
  try {
    const isAvailable = await fasterWhisper.isAvailable();
    if (isAvailable) {
      console.log('[whisper] ✅ faster-whisper available, using it');
      const result = await fasterWhisper.transcribe(audioFile, { 
        language: language === 'auto' ? null : language,
        onProgress 
      });
      return result;
    } else {
      console.log('[whisper] ⚠️ faster-whisper not available, falling back to whisper.cpp');
    }
  } catch (error) {
    console.error('[whisper] ❌ faster-whisper failed:', error.message);
    console.log('[whisper] Falling back to whisper.cpp');
  }
  
  // FALLBACK: Use whisper.cpp (less stable, but works without Python)
  console.log('[whisper] Using whisper.cpp fallback...');
  
  // Try multiple possible installation directories
  const possibleDirs = [
    process.env.WHISPER_CPP_DIR,
    process.platform === 'win32' ? 'C://whisper.cpp' : '/usr/local/whisper.cpp',
    path.join(process.cwd(), 'whisper.cpp'),
    path.join(process.cwd(), '..', 'whisper.cpp'),
    '/opt/whisper.cpp'
  ].filter(Boolean);
  
  const defaultDir = possibleDirs.find(dir => {
    try { return fs.existsSync(dir); } catch { return false; }
  }) || possibleDirs[0];
  
  const resolvedBin = process.env.WHISPER_CPP_BIN || path.join(defaultDir, process.platform === 'win32' ? 'main.exe' : 'main');
  const candidateModels = [
    process.env.WHISPER_MODEL,
    path.join(defaultDir, 'ggml-base.en.bin'),
    path.join(defaultDir, 'ggml-base.bin'),
    path.join(defaultDir, 'ggml-small.bin'),
    path.join(defaultDir, 'models', 'ggml-base.en.bin'),
    path.join(defaultDir, 'models', 'ggml-base.bin'),
  ].filter(Boolean);
  const resolvedModel = candidateModels.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  
  // Try to list what's in default dir
  if (fs.existsSync(defaultDir)) {
    try {
      const files = fs.readdirSync(defaultDir).slice(0, 10);
      
    } catch (e) {
      
    }
  }
  
  if (resolvedBin && resolvedModel && fs.existsSync(resolvedBin)) {
    try {
      const wav = await toWav16k(audioFile);
      const outJson = wav + '.json';
      
      return await new Promise((resolve, reject) => {
        const args = ['-f', wav, '-m', resolvedModel, '-oj'];
        if (language && language !== 'auto') { args.push('-l', language); }
        
        const child = spawn(resolvedBin, args);
        let timedOut = false;
        let lastOutput = Date.now();
        const silenceTimeout = 30000; // REDUCED: 30s silence timeout
        
        // REDUCED: 90-second total timeout (chunks should be small)
        const timeout = setTimeout(() => {
          timedOut = true;
          console.warn(`⏱️  Whisper.cpp timeout (90s) - killing process...`);
          killProcess(child);
          reject(new Error('Whisper.cpp timeout after 90 seconds'));
        }, 90000);
        
        // Monitor for silence stalls every 5 seconds
        const silenceCheck = setInterval(() => {
          if (Date.now() - lastOutput > silenceTimeout) {
            console.warn(`⏱️  No output for 30s - killing process...`);
            clearInterval(silenceCheck);
            clearTimeout(timeout);
            timedOut = true;
            killProcess(child);
            reject(new Error('Whisper.cpp stalled - no output for 30s'));
          }
        }, 5000);
        
        // Track any output to detect stalls
        child.stderr.on('data', () => { lastOutput = Date.now(); });
        child.stdout.on('data', () => { lastOutput = Date.now(); });
        
        child.on('close', (code) => {
          clearTimeout(timeout);
          clearInterval(silenceCheck);
          if (timedOut) return;
          
          console.log(`[whisper] Process exited with code ${code}`);
          
          try {
            if (!fs.existsSync(outJson)) {
              console.error(`[whisper] ❌ JSON output not found: ${outJson}`);
              console.error(`[whisper] This means whisper.cpp failed to produce output`);
              return resolve({ language: 'en', segments: [] });
            }
            const data = JSON.parse(fs.readFileSync(outJson, 'utf-8'));
            const segments = (data.transcription || []).map(s => ({
              start: (s.offsets?.from || 0) / 1000.0,
              end: (s.offsets?.to || 0) / 1000.0,
              text: String(s.text || '').trim()
            })).filter(s => s.text.length > 0);
            onProgress(1);
            const detectedLang = data.params?.language || 'en';
            
            resolve({ language: detectedLang, segments });
          } catch (e) {
            console.error('JSON parse error:', e.message);
            resolve({ language: 'en', segments: [] });
          }
        });
      });
    } catch (e) {
      console.warn(`⚠️  Whisper.cpp error: ${e.message}`);
      // Fall through to caption fallback
    }
  }
  
  console.error('❌ Whisper.cpp not available');
  console.error('   - Binary: ' + (resolvedBin || 'NOT SET'));
  console.error('   - Model: ' + (resolvedModel || 'NOT FOUND'));
  onProgress(1);
  return { language: 'en', segments: [] };
}

module.exports = { transcribe };