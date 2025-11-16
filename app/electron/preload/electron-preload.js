/**
 * Electron Preload Script for EduLens
 * Provides secure bridge between main and renderer processes
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System information
  platform: process.platform,
  version: process.versions,
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // File system operations (secure)
  selectFile: (options) => ipcRenderer.invoke('dialog-open-file', options),
  selectFolder: (options) => ipcRenderer.invoke('dialog-open-folder', options),
  saveFile: (options) => ipcRenderer.invoke('dialog-save-file', options),
  
  // Application lifecycle
  quit: () => ipcRenderer.invoke('app-quit'),
  restart: () => ipcRenderer.invoke('app-restart'),
  
  // Development tools
  openDevTools: () => ipcRenderer.invoke('dev-tools-open'),
  closeDevTools: () => ipcRenderer.invoke('dev-tools-close'),
  
  // Theme and appearance
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  
  // Notifications
  showNotification: (title, body, options) => 
    ipcRenderer.invoke('show-notification', { title, body, ...options }),
  
  // Clipboard operations
  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read'),
  
  // External links (secure)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Video capture/screenshot
  captureScreen: (options) => ipcRenderer.invoke('capture-screen', options),
  
  // Storage operations (secure)
  getStoragePath: (type) => ipcRenderer.invoke('get-storage-path', type),
  
  // Event listeners
  on: (channel, callback) => {
    const validChannels = [
      'theme-changed',
      'window-focus',
      'window-blur',
      'app-update-available',
      'app-update-downloaded',
      'clipboard-youtube-link'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // One-time listeners
  once: (channel, callback) => {
    const validChannels = [
      'app-ready',
      'window-ready'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, callback);
    }
  }
});

// Expose EduLens-specific APIs
contextBridge.exposeInMainWorld('eduLensAPI', {
  // Video processing
  processVideo: (videoData) => ipcRenderer.invoke('process-video', videoData),
  getVideoStatus: (videoId) => ipcRenderer.invoke('get-video-status', videoId),
  
  // AI operations
  queryAI: (query, options) => ipcRenderer.invoke('ai-query', query, options),
  getAIStatus: () => ipcRenderer.invoke('ai-status'),
  
  // Transcript operations
  getTranscript: (videoId) => ipcRenderer.invoke('get-transcript', videoId),
  searchTranscript: (videoId, query) => ipcRenderer.invoke('search-transcript', videoId, query),
  
  // Notes and annotations
  saveNotes: (videoId, notes) => ipcRenderer.invoke('save-notes', videoId, notes),
  loadNotes: (videoId) => ipcRenderer.invoke('load-notes', videoId),
  
  // Analytics and tracking
  trackEvent: (event, data) => ipcRenderer.invoke('track-event', event, data),
  getAnalytics: () => ipcRenderer.invoke('get-analytics'),
  
  // Settings and preferences
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // Export/Import
  exportData: (type, options) => ipcRenderer.invoke('export-data', type, options),
  importData: (type, data) => ipcRenderer.invoke('import-data', type, data)
});

// Development helpers (only in development)
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devAPI', {
    log: (...args) => console.log('[Renderer]', ...args),
    error: (...args) => console.error('[Renderer]', ...args),
    warn: (...args) => console.warn('[Renderer]', ...args),
    
    // Performance monitoring
    performance: {
      mark: (name) => performance.mark(name),
      measure: (name, start, end) => performance.measure(name, start, end),
      getEntries: () => performance.getEntries()
    }
  });
}

// Security: Remove Node.js globals from renderer
delete window.require;
delete window.exports;
delete window.module;

// Log successful preload
console.log('✅ EduLens preload script loaded successfully');
console.log('📱 Platform:', process.platform);
console.log('🔧 Electron version:', process.versions.electron);
console.log('🌐 Chrome version:', process.versions.chrome);
console.log('📦 Node version:', process.versions.node);