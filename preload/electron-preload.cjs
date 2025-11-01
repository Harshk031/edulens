const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Focus Mode APIs (kept for compatibility)
  startFocusSession: (data) => ipcRenderer.invoke('start-focus-session', data),
  endFocusSession: (sessionId) => ipcRenderer.invoke('end-focus-session', sessionId),
  getFocusSession: (sessionId) => ipcRenderer.invoke('get-focus-session', sessionId),

  // Analytics APIs
  logAnalyticsEvent: (event) => ipcRenderer.invoke('log-analytics-event', event),
  getAnalyticsData: () => ipcRenderer.invoke('get-analytics-data'),

  // System APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isProd: (process && process.env && process.env.NODE_ENV === 'production'),
  readClipboard: () => {
    try { return clipboard.readText(); } catch { return ''; }
  },
  openYouTubeView: (url) => {
    try { ipcRenderer.send('open-youtube-view', url); } catch {}
  },
  launchYouTube: (url) => {
    try { ipcRenderer.invoke('launch-youtube', url); } catch {}
  },
  endFocusSession: () => {
    try { ipcRenderer.send('end-focus-session'); } catch {}
  },
  openExternal: (url) => {
    try { ipcRenderer.send('open-external', url); } catch {}
  },
  onVideoCopied: (handler) => {
    try { ipcRenderer.on('video:copied', (_e, id) => handler && handler(id)); } catch {}
  },
  // Focus timer persistence & end signal
  timerSync: (state) => { try { ipcRenderer.send('timer:sync', state); } catch {} },
  timerGet: () => { try { return ipcRenderer.invoke('timer:get'); } catch { return null } },
  focusEnd: () => { try { ipcRenderer.send('focus:end'); } catch {} },
  onFocusEnded: (handler) => { try { ipcRenderer.on('focus:ended', () => handler && handler()); } catch {} },
});
