// src/renderer/video-loader.js
// Single source-of-truth YouTube loader with retries and fallbacks

const API_BASE = import.meta.env.VITE_API_BASE || '';
let _currentLoadId = 0;
let _currentLoadPromise = null;
let _lastContainer = null;

const isElectron = () => {
  try {
    return !!(window?.process?.versions?.electron || window?.electronAPI || navigator.userAgent.includes('Electron'));
  } catch { return false; }
};

function extractVideoId(videoUrl) {
  try {
    if (!videoUrl) return null;
    // If raw ID provided
    if (/^[A-Za-z0-9_-]{11}$/.test(videoUrl)) return videoUrl;

    const u = new URL(videoUrl);
    const host = (u.hostname || '').replace(/^www\./, '');
    let id = null;

    if (host === 'youtu.be') {
      id = (u.pathname || '').split('/').filter(Boolean)[0] || null;
    } else if (host.endsWith('youtube.com')) {
      id = u.searchParams.get('v');
      if (!id) {
        const parts = (u.pathname || '').split('/').filter(Boolean);
        const embedIdx = parts.indexOf('embed');
        if (embedIdx >= 0 && parts[embedIdx + 1]) id = parts[embedIdx + 1];
        else if (parts[0] === 'shorts' && parts[1]) id = parts[1];
        else if (parts[0] === 'live' && parts[1]) id = parts[1];
      }
    }

    if (id) {
      id = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 11);
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {}
  return null;
}

function logLine(msg) {
  const line = `[VideoLoader] ${new Date().toISOString()} ${msg}`;
  console.log(line);
  // Best-effort send to backend file
  try {
    fetch(`${API_BASE}/api/logs/videoloader`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line }) }).catch(()=>{});
  } catch {}
}

async function attemptEmbed(container, tagName, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(tagName);
    el.src = url;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.border = '0';
    // Enable richer playback features
    el.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share';
    try { el.setAttribute('allowfullscreen', ''); } catch {}
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

// Listen for seek events from UI
try {
  window.addEventListener('video:seek', (e) => {
    const seconds = Math.max(0, Math.floor(e.detail?.seconds || 0));
    const vid = window.__edulensCurrentVideoId;
    if (!vid || !_lastContainer) return;
    const origin = API_BASE || '';
    const url = `${origin}/local/embed/${vid}?start=${seconds}&autoplay=1`;
    attemptEmbed(_lastContainer, 'iframe', url, 10000).catch(()=>{});
  });
} catch {}

export async function loadYouTubeVideo(container, videoUrl) {
  if (!container) throw new Error('container required');
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error('Invalid YouTube URL/ID');
  try { window.__edulensCurrentVideoId = videoId; window.dispatchEvent(new CustomEvent('video:loaded', { detail: { videoId } })); } catch {}

  const origin = API_BASE || '';
  const sources = [
    `${origin}/local/embed/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
    `https://www.youtube-nocookie.com/embed/${videoId}`,
  ];

  const myId = ++_currentLoadId;
  if (_currentLoadPromise) {
    logLine('cancel previous load (new request)');
  }

  _lastContainer = container;
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