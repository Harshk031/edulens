try {
  const { app, BrowserWindow, ipcMain } = require('electron');
  const path = require('path');
  const { spawn } = require('child_process');

  console.log('Electron modules loaded successfully');
  console.log('app:', typeof app);
  console.log('BrowserWindow:', typeof BrowserWindow);

  // Auto cleanup on app exit
  let cleanupManager;
  try {
    cleanupManager = require('./src/utils/cleanup.cjs');
    console.log('✅ Cleanup manager loaded for Electron');
  } catch (err) {
    console.warn('⚠️  Cleanup manager not available:', err.message);
  }

  // Setup IPC handlers for frontend communication
  function setupIpcHandlers() {
    const { clipboard, dialog, shell } = require('electron');
    
    // Clipboard handlers
    ipcMain.handle('clipboard-read', async () => {
      try {
        const text = clipboard.readText();
        console.log('[IPC] Clipboard read:', text ? `${text.length} characters` : 'empty');
        return text || '';
      } catch (error) {
        console.error('[IPC] Clipboard read error:', error);
        return '';
      }
    });
    
    // Start clipboard monitoring for YouTube links
    let lastClipboardText = '';
    let clipboardMonitorInterval = null;
    
    function startClipboardMonitoring(mainWindow) {
      if (clipboardMonitorInterval) return; // Already monitoring
      
      clipboardMonitorInterval = setInterval(() => {
        try {
          const currentText = clipboard.readText();
          
          // Only process if clipboard changed and contains YouTube link
          if (currentText && currentText !== lastClipboardText) {
            lastClipboardText = currentText;
            
            // Check if it's a YouTube link
            const youtubeMatch = currentText.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i) ||
                                 currentText.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i);
            
            if (youtubeMatch && mainWindow && !mainWindow.isDestroyed()) {
              // Extract full URL
              let youtubeUrl = currentText.trim();
              if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
                youtubeUrl = `https://www.youtube.com/watch?v=${youtubeMatch[1]}`;
              }
              
              console.log('[Clipboard Monitor] ✅ YouTube link detected:', youtubeUrl);
              
              // Send to renderer process
              mainWindow.webContents.send('clipboard-youtube-link', youtubeUrl);
            }
          }
        } catch (error) {
          // Silently handle clipboard read errors
          if (!error.message?.includes('permission')) {
            console.warn('[Clipboard Monitor] Error:', error.message);
          }
        }
      }, 500); // Check every 500ms
      
      console.log('[Clipboard Monitor] Started monitoring clipboard for YouTube links');
    }
    
    function stopClipboardMonitoring() {
      if (clipboardMonitorInterval) {
        clearInterval(clipboardMonitorInterval);
        clipboardMonitorInterval = null;
        console.log('[Clipboard Monitor] Stopped monitoring');
      }
    }
    
    // Store monitoring function for use in createWindow
    setupIpcHandlers.startClipboardMonitoring = startClipboardMonitoring;
    setupIpcHandlers.stopClipboardMonitoring = stopClipboardMonitoring;
    
    ipcMain.handle('clipboard-write', async (event, text) => {
      try {
        clipboard.writeText(text || '');
        console.log('[IPC] Clipboard write:', text ? `${text.length} characters` : 'empty');
        return true;
      } catch (error) {
        console.error('[IPC] Clipboard write error:', error);
        return false;
      }
    });
    
    // Window control handlers
    ipcMain.handle('window-minimize', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) window.minimize();
    });
    
    ipcMain.handle('window-maximize', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        } else {
          window.maximize();
        }
      }
    });
    
    ipcMain.handle('window-close', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) window.close();
    });
    
    // Dialog handlers
    ipcMain.handle('dialog-open-file', async (event, options) => {
      try {
        const result = await dialog.showOpenDialog(options);
        return result;
      } catch (error) {
        console.error('[IPC] Dialog open file error:', error);
        return { canceled: true };
      }
    });
    
    ipcMain.handle('dialog-save-file', async (event, options) => {
      try {
        const result = await dialog.showSaveDialog(options);
        return result;
      } catch (error) {
        console.error('[IPC] Dialog save file error:', error);
        return { canceled: true };
      }
    });
    
    // External link handler
    ipcMain.handle('open-external', async (event, url) => {
      try {
        await shell.openExternal(url);
        return true;
      } catch (error) {
        console.error('[IPC] Open external error:', error);
        return false;
      }
    });
    
    // App control handlers
    ipcMain.handle('app-quit', async () => {
      app.quit();
    });
    
    ipcMain.handle('app-restart', async () => {
      app.relaunch();
      app.quit();
    });
    
    // Development tools
    ipcMain.handle('dev-tools-open', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) window.webContents.openDevTools();
    });
    
    ipcMain.handle('dev-tools-close', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) window.webContents.closeDevTools();
    });
    
    // Screen capture handler
    ipcMain.handle('capture-screen', async (event) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          return { success: false, error: 'Window not found' };
        }
        
        // Capture the window contents
        const image = await window.webContents.capturePage();
        const dataURL = image.toDataURL();
        
        // Get timestamp from current video if available
        // This would need to be passed from frontend
        const timestamp = '0:00'; // Placeholder
        
        return {
          success: true,
          dataURL: dataURL,
          timestamp: timestamp
        };
      } catch (error) {
        console.error('[IPC] Screen capture error:', error);
        return { success: false, error: error.message };
      }
    });
    
    console.log('✅ IPC handlers registered successfully');
  }

  function createWindow() {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      fullscreen: true, // Open in fullscreen mode
      backgroundColor: '#0a1410', // Dark background to prevent white flash
      show: false, // Don't show until ready
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload', 'electron-preload.js')
      }
    });

    // Show window when ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Load the frontend with proper error handling
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    console.log('Loading EduLens frontend from:', startUrl);
    
    // Add error handling for URL loading
    mainWindow.loadURL(startUrl).catch(error => {
      console.error('Failed to load URL:', error);
      // Fallback: try to load after a delay
      setTimeout(() => {
        console.log('Retrying URL load...');
        mainWindow.loadURL(startUrl);
      }, 2000);
    });
    
    // DevTools disabled for production
    // mainWindow.webContents.openDevTools(); // Disabled - use Ctrl+Shift+I to open if needed
    
    // Log console messages from renderer
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[RENDERER] ${message} (${sourceId}:${line})`);
    });
    
    // Start clipboard monitoring once window is ready
    mainWindow.webContents.once('did-finish-load', () => {
      if (setupIpcHandlers.startClipboardMonitoring) {
        setupIpcHandlers.startClipboardMonitoring(mainWindow);
      }
    });
    
    // Stop clipboard monitoring when window is closed
    mainWindow.on('closed', () => {
      if (setupIpcHandlers.stopClipboardMonitoring) {
        setupIpcHandlers.stopClipboardMonitoring();
      }
    });

    // Handle IPC messages
    ipcMain.on('close-app', () => {
      console.log('[Electron] Close app requested');
      mainWindow.close();
    });

    ipcMain.on('cleanup-processes', async () => {
      console.log('[Electron] Cleanup processes requested');
      await performCleanup();
    });
  }

  // Cleanup function to kill related processes
  async function performCleanup() {
    console.log('🔄 [Electron] Starting process cleanup...');
    
    try {
      // Kill node.exe processes (backend servers)
      const killNode = spawn('taskkill', ['/F', '/IM', 'node.exe'], { shell: true });
      killNode.on('close', (code) => {
        console.log(`[Cleanup] Node processes killed with code: ${code}`);
      });

      // Kill any remaining electron processes
      setTimeout(() => {
        const killElectron = spawn('taskkill', ['/F', '/IM', 'electron.exe'], { shell: true });
        killElectron.on('close', (code) => {
          console.log(`[Cleanup] Electron processes killed with code: ${code}`);
        });
      }, 1000);

      // Use cleanup manager if available
      if (cleanupManager) {
        await cleanupManager.cleanup();
      }
      
      console.log('✅ [Electron] Cleanup completed');
    } catch (error) {
      console.error('❌ [Electron] Cleanup error:', error.message);
    }
  }

  if (app && typeof app.whenReady === 'function') {
    app.whenReady().then(() => {
    // Setup IPC handlers before creating window
    setupIpcHandlers();
    
    createWindow();
    
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

    app.on('window-all-closed', async () => {
      console.log('[Electron] All windows closed');
      
      // Perform cleanup before quitting
      if (cleanupManager) {
        console.log('[Electron] Running cleanup...');
        try {
          await cleanupManager.cleanup();
        } catch (err) {
          console.error('[Electron] Cleanup error:', err.message);
        }
      }
      
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } else {
    console.error('app is not properly initialized');
  }
} catch (error) {
  console.error('Error loading electron modules:', error.message);
  console.error('Stack:', error.stack);
}