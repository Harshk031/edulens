const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// Try multiple possible yt-dlp locations
const possibleYtdlpPaths = [
  process.env.YTDLP_PATH,
  process.platform === 'win32' ? 'C:\\whisper.cpp\\yt-dlp.exe' : '/usr/local/bin/yt-dlp',
  path.join(process.cwd(), 'yt-dlp'),
  path.join(process.cwd(), 'whisper.cpp', 'yt-dlp'),
  path.join(process.cwd(), '..', 'whisper.cpp', 'yt-dlp'),
  'yt-dlp' // Try PATH as last resort
].filter(Boolean);

let YTDLP = possibleYtdlpPaths.find(p => {
  try { return fs.existsSync(p) || p === 'yt-dlp'; } catch { return false; }
}) || possibleYtdlpPaths[0];

async function getVideoMeta(url) {
  try {
    // Use yt-dlp to get metadata
    const { stdout } = await execAsync(`"${YTDLP}" --dump-json --no-warnings "${url}"`);
    const info = JSON.parse(stdout);
    const videoId = info.id;
    const title = info.title || `YouTube ${videoId}`;
    const duration = parseInt(info.duration, 10) || 3600;
    const languageHint = info.language || 'en';
    return { videoId, title, duration, languageHint, url };
  } catch (e) {
    // Fallback: parse ID from URL
    let videoId = null;
    try {
      const u = new URL(url.replace('youtu.be/', 'www.youtube.com/watch?v='));
      videoId = u.searchParams.get('v') || (url.includes('/') ? url.split('/').pop() : null);
    } catch {}
    if (!videoId) throw new Error('Could not extract video ID');
    const title = `YouTube ${videoId}`;
    const duration = 3600;
    const languageHint = 'en';
    return { videoId, title, duration, languageHint, url };
  }
}

async function tryGetEnglishCaptions(videoId) {
  
  
  try {
    let YoutubeTranscript;
    try {
      // Try to require the module
      YoutubeTranscript = require('youtube-transcript')?.YoutubeTranscript;
      
    } catch (e) {
      console.error('[ytApi] ❌ CRITICAL: youtube-transcript module not available:', e.message);
      console.error('[ytApi] ACTION: Will proceed with audio-based transcription');
      return {
        error: 'youtube-transcript module not available',
        errorType: 'MODULE_UNAVAILABLE',
        willFallback: true,
        message: 'Caption retrieval failed, will use audio transcription'
      };
    }
    
    if (!YoutubeTranscript) {
      console.error('[ytApi] ❌ CRITICAL: YoutubeTranscript not found in module');
      console.error('[ytApi] ACTION: Will proceed with audio-based transcription');
      return {
        error: 'YoutubeTranscript not found in module',
        errorType: 'MODULE_INVALID',
        willFallback: true,
        message: 'Caption retrieval failed, will use audio transcription'
      };
    }
    
    const langPrefs = ['en', 'hi'];
    let items = null;
    let used = null;
    let lastError = null;
    
    console.log(`[ytApi] 🔍 Attempting to fetch captions for ${videoId}...`);
    
    // CRITICAL FIX: Try fetching WITHOUT specifying language first (gets default/auto)
    try {
      console.log(`[ytApi]    Trying default/auto captions...`);
      items = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (items && items.length > 0) {
        used = 'auto';
        console.log(`[ytApi] ✅ SUCCESS: Fetched ${items.length} caption items (auto/default)`);
      }
    } catch (autoError) {
      console.log(`[ytApi]    ⚠️  Auto captions failed: ${autoError.message?.substring(0, 100)}`);
      
      // Fall back to trying specific languages
      for (const lang of langPrefs) {
        try {
          console.log(`[ytApi]    Trying language: ${lang}`);
          items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
          
          if (items && items.length > 0) {
            used = lang;
            console.log(`[ytApi] ✅ SUCCESS: Fetched ${items.length} caption items in ${lang}`);
            break;
          } else {
            console.log(`[ytApi]    ⚠️  No items returned for ${lang}`);
          }
        } catch (e) {
          // Parse available languages from error message
          const availableMatch = e.message?.match(/Available languages: (.+)/);
          if (availableMatch) {
            const availableLangs = availableMatch[1].split(',').map(l => l.trim());
            console.log(`[ytApi]    ⚠️  ${lang} not available. Available: ${availableLangs.join(', ')}`);
            
            // Try the FIRST available language (most likely to work)
            if (availableLangs.length > 0) {
              const firstAvail = availableLangs[0];
              console.log(`[ytApi]    🔄 Trying first available: ${firstAvail}`);
              try {
                items = await YoutubeTranscript.fetchTranscript(videoId, { lang: firstAvail });
                if (items && items.length > 0) {
                  used = firstAvail;
                  console.log(`[ytApi] ✅ SUCCESS: Fetched ${items.length} caption items in ${firstAvail}`);
                  break;
                }
              } catch (retryErr) {
                console.log(`[ytApi]    ❌ Retry failed for ${firstAvail}: ${retryErr.message?.substring(0, 80)}`);
              }
            }
          }
          
          lastError = e;
          console.log(`[ytApi]    ❌ Error for ${lang}: ${e.message?.substring(0, 100)}`);
        }
        
        if (items && items.length > 0) break;
      }
    }
    
    if (!items || !items.length) {
      console.error(`[ytApi] ❌ CRITICAL: No captions found for video: ${videoId}`);
      console.error(`[ytApi] ACTION: Will proceed with audio-based transcription`);
      console.error(`[ytApi] Last error: ${lastError?.message || 'No specific error'}`);
      
      return {
        error: 'No captions available for this video',
        errorType: 'NO_CAPTIONS',
        willFallback: true,
        message: 'No captions found, will use audio transcription',
        attemptedLanguages: langPrefs,
        lastError: lastError?.message
      };
    }
    
    // Validate caption items before processing
    const validItems = items.filter(item => item && (item.text || '').trim().length > 0);
    if (validItems.length === 0) {
      console.error(`[ytApi] ❌ CRITICAL: All caption items are empty or invalid for video: ${videoId}`);
      console.error(`[ytApi] ACTION: Will proceed with audio-based transcription`);
      
      return {
        error: 'All caption items are empty or invalid',
        errorType: 'INVALID_CAPTIONS',
        willFallback: true,
        message: 'Captions exist but are invalid, will use audio transcription',
        totalItems: items.length,
        validItems: validItems.length
      };
    }
    
    if (validItems.length < items.length) {
      console.warn(`[ytApi] ⚠️ Filtered out ${items.length - validItems.length} empty caption items`);
    }
    
    const segments = validItems.map(it => ({
      start: (it.offset ?? it.start ?? 0),
      end: (it.offset ?? it.start ?? 0) + (it.duration ?? 0),
      text: it.text || ''
    }));
    
    const language = used && used.startsWith('hi') ? 'hi' : 'en';
    
    console.log(`[ytApi] ✅ Returning transcript: ${segments.length} segments, language: ${language}`);
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ytApi returning: ${segments.length} segments\n`);
    
    return { language, segments };
    
  } catch (e) {
    console.error(`[ytApi] ❌ CRITICAL: tryGetEnglishCaptions failed with unexpected error:`, {
      message: e.message,
      name: e.name,
      stack: e.stack?.substring(0, 300)
    });
    console.error(`[ytApi] ACTION: Will proceed with audio-based transcription`);
    
    return {
      error: 'Unexpected error during caption retrieval',
      errorType: 'UNEXPECTED_ERROR',
      willFallback: true,
      message: 'Caption retrieval failed with unexpected error, will use audio transcription',
      originalError: e.message
    };
  }
}

async function downloadAudio(videoId, onProgress = () => {}) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const out = path.join(process.cwd(), `tmp-${videoId}.mp3`);
  
  try {
    // Get ffmpeg location from ffmpeg-static
    const ffmpegDir = path.dirname(ffmpegPath);
    
    // Use yt-dlp to download audio directly
    const cmd = `"${YTDLP}" -x --audio-format mp3 --audio-quality 128K --ffmpeg-location "${ffmpegDir}" -o "${out}" --no-warnings --no-playlist "${url}"`;
    
    console.log(`[ytApi] Starting audio download with 5min timeout: ${videoId}`);
    
    return new Promise((resolve, reject) => {
      const proc = exec(cmd, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
      let lastProgress = 0;
      let hasResolved = false;
      
      // 5 minute timeout for download
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          console.error(`[ytApi] ❌ Download timeout after 5 minutes for: ${videoId}`);
          try {
            proc.kill('SIGTERM');
            setTimeout(() => proc.kill('SIGKILL'), 1000); // Force kill after 1s
          } catch (e) {
            console.error(`[ytApi] Failed to kill process:`, e.message);
          }
          reject(new Error('Audio download timeout after 5 minutes'));
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      proc.stderr.on('data', (data) => {
        const match = data.toString().match(/([0-9.]+)%/);
        if (match) {
          const progress = parseFloat(match[1]) / 100;
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(Math.min(0.99, progress));
          }
        }
      });
      
      proc.on('close', (code) => {
        if (hasResolved) return; // Already timed out
        clearTimeout(timeout);
        hasResolved = true;
        
        if (code === 0 && fs.existsSync(out)) {
          console.log(`[ytApi] ✅ Audio downloaded successfully: ${out}`);
          onProgress(1);
          resolve(out);
        } else {
          console.error(`[ytApi] ❌ yt-dlp failed with code ${code} for: ${videoId}`);
          reject(new Error(`yt-dlp failed with code ${code}`));
        }
      });
      
      proc.on('error', (err) => {
        if (hasResolved) return;
        clearTimeout(timeout);
        hasResolved = true;
        console.error(`[ytApi] ❌ Download process error:`, err.message);
        reject(err);
      });
    });
  } catch (e) {
    console.error(`[ytApi] ❌ downloadAudio exception:`, e.message);
    throw new Error(`Failed to download audio: ${e.message}`);
  }
}

module.exports = { getVideoMeta, tryGetEnglishCaptions, downloadAudio };