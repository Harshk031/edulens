// src/renderer/video-loader.js
// Single source-of-truth YouTube loader with retries and fallbacks

let _currentLoadId = 0;
let _currentLoadPromise = null;

const isElectron = () => {
  try {
    return !!(window?.process?.versions?.electron || window?.electronAPI || navigator.userAgent.includes('Electron'));
  } catch { return false; }
};

function extractVideoId(videoUrl) {
  try {
    if (!videoUrl) return null;
    const u = new URL(videoUrl.replace('youtu.be/', 'www.youtube.com/watch?v='));
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return id;
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && parts[1]) return parts[1];
    }
    // raw ID
    if (/^[a-zA-Z0-9_-]{6,}$/.test(videoUrl)) return videoUrl;
  } catch {}
  return null;
}

function logLine(msg) {
  const line = `[VideoLoader] ${new Date().toISOString()} ${msg}`;
  console.log(line);
  // Best-effort send to backend file
  try {
    fetch('http://127.0.0.1:5000/api/logs/videoloader', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line }) }).catch(()=>{});
  } catch {}
}

async function attemptEmbed(container, tagName, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tagName);
    el.src = url;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.border = '0';
    el.allow = 'autoplay; encrypted-media; picture-in-picture';
    const cleanup = () => {
      try { el.onload = null; } catch {}
    };
    const to = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeoutMs);
    el.onload = () => {
      clearTimeout(to);
      cleanup();
      resolve(true);
    };
    container.innerHTML = '';
    container.appendChild(el);
  });
}

export async function loadYouTubeVideo(container, videoUrl) {
  if (!container) throw new Error('container required');
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error('Invalid YouTube URL/ID');

  const origin = 'http://127.0.0.1:5000';
  const sources = [
    `${origin}/local/embed/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
    `https://www.youtube-nocookie.com/embed/${videoId}`,
  ];

  const myId = ++_currentLoadId;
  if (_currentLoadPromise) {
    logLine('cancel previous load (new request)');
  }

  _currentLoadPromise = (async () => {
    logLine(`Starting load for ${videoId}`);
    let ok = false; let lastErr = null;
    for (let i = 0; i < sources.length; i++) {
      if (myId !== _currentLoadId) return; // superseded
      const url = sources[i];
      logLine(`try ${i+1}/${sources.length}: ${url}`);
      try {
        // Always use iframe (more stable with local embed); webview can trigger YT checks
        const tag = 'iframe';
        await attemptEmbed(container, tag, url, 12000);
        logLine('iframe onload fired');
        ok = true; break;
      } catch (e) {
        lastErr = e; logLine(`embed failed: ${e.message}`);
      }
    }

    if (!ok) {
      // Do NOT open new windows automatically; keep user in-place and log
      logLine(`FINAL FAIL for ${videoId} — not opening external player. Last error: ${lastErr?.message || 'unknown'}`);
    }
  })();

  return _currentLoadPromise;
}