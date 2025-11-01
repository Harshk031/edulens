import { BrowserWindow, ipcMain, session, app } from 'electron';
import path from 'path';
import Store from 'electron-store';

let playerWin = null;
let pollTimer = null;
const store = new Store();

function normalizeUrl(input) {
  if (!input) return null;
  // Accept full watch URLs or short links; convert to watch format
  try {
    if (input.includes('youtube.com/embed/')) {
      const id = input.split('embed/')[1].split('?')[0];
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (input.includes('youtu.be/')) {
      const id = input.split('youtu.be/')[1].split(/[?&]/)[0];
      return `https://www.youtube.com/watch?v=${id}`;
    }
    // already a watch url
    if (input.startsWith('https://www.youtube.com/watch')) return input;
    // raw id
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return `https://www.youtube.com/watch?v=${input}`;
  } catch {}
  return input;
}

export function closeYouTubePlayer() {
  try {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (playerWin && !playerWin.isDestroyed()) {
      playerWin.close();
    }
    playerWin = null;
  } catch {}
}

export function openYouTubePlayer(videoUrl) {
  const url = normalizeUrl(videoUrl);
  if (!url) return;

  // Close previous if exists
  if (playerWin && !playerWin.isDestroyed()) playerWin.close();

  // Persist last URL
  store.set('yt.lastUrl', url);

  playerWin = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,
    fullscreen: true,
    alwaysOnTop: true,
    kiosk: true,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Hardening: only allow YouTube navigation
  playerWin.webContents.on('will-navigate', (e, navUrl) => {
    if (!/^https:\/\/(www\.)?youtube\.com\/watch/.test(navUrl)) e.preventDefault();
  });
  playerWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Spoof modern Chrome UA
  const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  playerWin.webContents.setUserAgent(CHROME_UA);

  // Extra CSP leniency for YouTube pages
  const ses = session.fromPartition('default');
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    headers['Content-Security-Policy'] = [
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *;"
    ];
    callback({ responseHeaders: headers });
  });

  // Load
  playerWin.loadURL(url);

  // Poll playback position every 5s for resume
  pollTimer = setInterval(async () => {
    try {
      const t = await playerWin.webContents.executeJavaScript(
        "(function(){const v=document.querySelector('video'); return v?Math.floor(v.currentTime||0):0;})()",
        true
      );
      if (Number.isFinite(t)) store.set('yt.lastTime', t);
    } catch {}
  }, 5000);

  playerWin.on('closed', () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    playerWin = null;
  });

  // Close on focus end
  ipcMain.removeAllListeners('end-focus-session');
  ipcMain.on('end-focus-session', () => closeYouTubePlayer());
}
