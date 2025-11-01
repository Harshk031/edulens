import { app, BrowserWindow, ipcMain, session, shell, clipboard } from 'electron';
import Store from 'electron-store';
import { openYouTubePlayer, closeYouTubePlayer } from './electron/YouTubePlayer.js';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

// Mitigate blank window / GPU driver issues on some Windows systems
app.disableHardwareAcceleration();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Place userData under LocalAppData to avoid OneDrive/controlled-folder-access (robust before "ready")
let userDataDir;
try {
  // Some Electron versions throw if called before ready; handle gracefully
  const localApp = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), 'AppData', 'Local');
  userDataDir = path.join(localApp, 'EduLensHybrid');
  fs.mkdirSync(userDataDir, { recursive: true });
  app.setPath('userData', userDataDir);

  // Force all Chromium caches into a writable location (avoid OneDrive/permissions)
  const cacheDir = path.join(userDataDir, 'Cache');
  const mediaCacheDir = path.join(userDataDir, 'MediaCache');
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(mediaCacheDir, { recursive: true });
  app.setPath('cache', cacheDir);
  app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
  app.commandLine.appendSwitch('media-cache-dir', mediaCacheDir);
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  // Embed stability switches
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicyByDefault,CrossOriginEmbedderPolicy');
} catch (e) {
  // Fallback to default userData if setPath fails
  userDataDir = app.getPath('userData');
}

const store = new Store();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0f0f1e',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload', 'electron-preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  // Spoof Chrome UA so YouTube treats the app as Chrome
  const CHROME_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/122.0.0.0 Safari/537.36';
  win.webContents.setUserAgent(CHROME_UA);

  // Permit required permissions; deny everything else
  const ses = session.fromPartition('default');
  ses.setPermissionRequestHandler((_, permission, callback) => {
    if (['media', 'fullscreen'].includes(permission)) return callback(true);
    return callback(false);
  });

  // Relax CSP during development to allow embeds
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    headers['Content-Security-Policy'] = [
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *;"
    ];
    callback({ responseHeaders: headers });
  });

  // Ensure YouTube requests carry expected Referer/Origin and UA
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    try {
      const u = details.url || ''
      if (u.includes('youtube.com') || u.includes('googlevideo.com') || u.includes('ytimg.com')) {
        details.requestHeaders['Referer'] = 'https://www.youtube.com/';
        details.requestHeaders['Origin'] = 'https://www.youtube.com';
        details.requestHeaders['User-Agent'] = CHROME_UA;
        details.requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
      }
    } catch {}
    callback({ requestHeaders: details.requestHeaders })
  });

  // Open DevTools to debug Error 153
  win.webContents.openDevTools({ mode: 'detach' });

  const startURL = process.env.ELECTRON_START_URL || 'http://127.0.0.1:5173';
  win.loadURL(startURL).catch(err => {
    console.error('Failed to load URL:', startURL, err);
  });
  
  return win;
};

let mainWindow;
let timerWin;

import { BrowserView } from 'electron';

// Feature flag: keep overlay code but DISABLED by default.
const ENABLE_TIMER_OVERLAY = process.env.EDULENS_TIMER_OVERLAY === '1';

function createTimerWindow(parent){
  try {
    if (!ENABLE_TIMER_OVERLAY) return; // disabled unless explicitly enabled
    const { join } = path;
    const timerPath = `file://${join(__dirname,'overlay','timer.html')}`;
    timerWin = new BrowserWindow({
      width: 420,
      height: 120,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      parent,
      backgroundColor: '#00000000',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, 'preload', 'timer-preload.cjs')
      }
    });
    timerWin.setIgnoreMouseEvents(false, { forward: true });
    try { timerWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch {}
    timerWin.loadURL(timerPath);
  } catch (e) { console.error('Timer overlay failed', e); }
}

app.whenReady().then(async () => {
  // Clear any stale caches at boot (first-run safety)
  try { await session.defaultSession.clearCache(); } catch {}

  mainWindow = createWindow();
  if (ENABLE_TIMER_OVERLAY) createTimerWindow(mainWindow);
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript("console.log('✅ EduLens hybrid runtime active (Electron only)')");
  });

  // Prevent navigation away from local embed route or app
  const allowedPrefix = 'http://127.0.0.1:5000/local/embed/';
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://127.0.0.1:5173') && !url.startsWith(allowedPrefix)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(allowedPrefix)) return { action: 'allow' };
    shell.openExternal(url); return { action: 'deny' };
  });
  // Controlled full-screen player fallback window
  ipcMain.handle('launch-youtube', (_e, url) => openYouTubePlayer(url));

  // Keep legacy event as no-op or open the new player
  ipcMain.on('open-youtube-view', (_e, url) => openYouTubePlayer(url));
  // External link opener
  ipcMain.on('open-external', (_e, url) => {
    try { if (url) shell.openExternal(url); } catch {}
  });
  // Clipboard monitor → send to renderer
  let lastClip = '';
  setInterval(() => {
    try {
      const txt = clipboard.readText() || '';
      if (txt && txt !== lastClip) {
        const m = txt.match(/(?:v=|be\/)([a-zA-Z0-9_-]{11})/);
        if (m && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('video:copied', m[1]);
        }
        lastClip = txt;
      }
    } catch {}
  }, 1500);

  // Timer persistence IPC + overlay bridge
  ipcMain.on('timer:sync', (_e, state) => { try { store.set('focus.timer', state); } catch {} });
  ipcMain.handle('timer:get', () => { try { return store.get('focus.timer'); } catch { return null } });
  ipcMain.on('focus:end', () => {
    try { store.set('focus.timer', { ...(store.get('focus.timer')||{}), running:false, ended:true }); } catch {}
    try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('focus:ended'); } catch {}
  });
  // Overlay -> main sync
  ipcMain.on('timer:update', (_e, state) => {
    try { store.set('focus.timer', state); } catch {}
    try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('timer-sync', state); } catch {}
  });
  ipcMain.on('timer:ended', () => {
    try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('focus:ended'); } catch {}
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Focus Mode
ipcMain.handle('start-focus-session', async (event, data) => {
  try {
    const sessionId = `session_${Date.now()}`;
    store.set(`session:${sessionId}`, {
      ...data,
      startTime: new Date().toISOString(),
    });
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('end-focus-session', async (event, sessionId) => {
  try {
    const session = store.get(`session:${sessionId}`);
    if (!session) throw new Error('Session not found');
    
    const endTime = new Date().toISOString();
    store.set(`session:${sessionId}`, {
      ...session,
      endTime,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-focus-session', async (event, sessionId) => {
  try {
    const session = store.get(`session:${sessionId}`);
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
