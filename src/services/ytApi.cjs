const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const YTDLP = process.env.YTDLP_PATH || 'C:\\whisper.cpp\\yt-dlp.exe';

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
    const mod = await import('youtube-transcript');
    const langPrefs = ['en', 'en-US', 'en-GB', 'hi'];
    let items = null;
    let used = null;
    for (const lang of langPrefs) {
      try {
        items = await mod.YoutubeTranscript.fetchTranscript(videoId, { lang });
        if (items?.length) { used = lang; break; }
      } catch {}
    }
    if (!items || !items.length) return null;
    const segments = items.map(it => ({
      start: (it.offset ?? it.start ?? 0),
      end: (it.offset ?? it.start ?? 0) + (it.duration ?? 0),
      text: it.text || ''
    }));
    const language = used && used.startsWith('hi') ? 'hi' : 'en';
    return { language, segments };
  } catch {
    return null;
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
    
    return new Promise((resolve, reject) => {
      const proc = exec(cmd);
      let lastProgress = 0;
      
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
        if (code === 0 && fs.existsSync(out)) {
          onProgress(1);
          resolve(out);
        } else {
          reject(new Error(`yt-dlp failed with code ${code}`));
        }
      });
      
      proc.on('error', reject);
    });
  } catch (e) {
    throw new Error(`Failed to download audio: ${e.message}`);
  }
}

module.exports = { getVideoMeta, tryGetEnglishCaptions, downloadAudio };