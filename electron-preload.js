import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC handlers to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Focus Mode APIs
  startFocusSession: (data) => ipcRenderer.invoke('start-focus-session', data),
  endFocusSession: (sessionId) => ipcRenderer.invoke('end-focus-session', sessionId),
  getFocusSession: (sessionId) => ipcRenderer.invoke('get-focus-session', sessionId),
  
  // Analytics APIs
  logAnalyticsEvent: (event) => ipcRenderer.invoke('log-analytics-event', event),
  getAnalyticsData: () => ipcRenderer.invoke('get-analytics-data'),
  
  // System APIs
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isProd: process.env.NODE_ENV === 'production',
});
