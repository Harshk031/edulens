import { app, powerMonitor, globalShortcut, ipcMain } from 'electron';
import sessionManager from './sessionManager.js';

export class FocusLock {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.isFocusMode = false;
    this.sessionId = null;
    this.allowedExitMethods = new Set(['focusButton', 'payment', 'timer']);
    this.blockedShortcuts = [
      'Escape',
      'Alt+F4',
      'Ctrl+W',
      'Ctrl+Q',
      'Ctrl+Tab',
      'Alt+Tab',
      'Super+D',
      'Super+M',
    ];
  }

  /**
   * Start focus mode
   */
  startFocusMode(sessionData) {
    try {
      this.isFocusMode = true;
      this.sessionId = sessionData.id || Date.now();

      // Save session
      const session = sessionManager.saveFocusSession({
        ...sessionData,
        id: this.sessionId,
        status: 'active',
      });

      if (!session) {
        console.error('Failed to save session');
        return { success: false, error: 'Session save failed' };
      }

      // Set fullscreen
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setFullScreen(true);
        this.mainWindow.setResizable(false);
        this.mainWindow.setClosable(false);
      }

      // Block exit shortcuts
      this.blockExitMethods();

      // Monitor system shutdown/restart
      this.monitorSystemEvents();

      // Send focus mode active signal
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('focus-mode-started', session);
      }

      console.log('✅ Focus mode activated');
      return { success: true, session };
    } catch (error) {
      console.error('Failed to start focus mode:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exit focus mode (only via allowed methods)
   */
  exitFocusMode(method = 'focusButton', reason = '') {
    try {
      if (!this.isFocusMode) {
        return { success: false, error: 'Focus mode not active' };
      }

      if (!this.allowedExitMethods.has(method)) {
        console.warn(`Unauthorized exit method: ${method}`);
        return { success: false, error: 'Unauthorized exit method' };
      }

      // Mark session complete
      const session = sessionManager.completeSession(method);

      // Restore window state
      this.isFocusMode = false;
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setFullScreen(false);
        this.mainWindow.setResizable(true);
        this.mainWindow.setClosable(true);
        this.mainWindow.webContents.send('focus-mode-ended', { method, reason });
      }

      // Unblock shortcuts
      this.unblockExitMethods();

      console.log(`✅ Focus mode exited via ${method}`);
      return { success: true, session };
    } catch (error) {
      console.error('Failed to exit focus mode:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Pause focus mode (for payment screen)
   */
  pauseFocusMode() {
    try {
      if (!this.isFocusMode) return { success: false };

      const session = sessionManager.updateSessionTimer(0, true);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('focus-mode-paused');
      }
      return { success: true, session };
    } catch (error) {
      console.error('Failed to pause focus mode:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resume focus mode
   */
  resumeFocusMode() {
    try {
      if (!this.isFocusMode) return { success: false };

      const session = sessionManager.updateSessionTimer(0, false);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('focus-mode-resumed');
      }
      return { success: true, session };
    } catch (error) {
      console.error('Failed to resume focus mode:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Block exit methods
   */
  blockExitMethods() {
    try {
      // Unregister all shortcuts to prevent them
      this.blockedShortcuts.forEach(shortcut => {
        globalShortcut.unregister(shortcut);
      });

      // Intercept close attempts
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.on('close', (event) => {
          if (this.isFocusMode) {
            event.preventDefault();
            console.warn('⚠️ Close attempt blocked in focus mode');
            // Show motivational message to user
            this.mainWindow.webContents.send('exit-blocked', {
              message: '🔒 Focus Mode Active – Exit via timer or payment unlock only',
            });
          }
        });
      }

      console.log('🔒 Exit methods blocked');
    } catch (error) {
      console.error('Failed to block exit methods:', error.message);
    }
  }

  /**
   * Unblock exit methods
   */
  unblockExitMethods() {
    try {
      this.blockedShortcuts.forEach(shortcut => {
        // Re-enable shortcuts globally (app will handle them normally now)
        globalShortcut.register(shortcut, () => {
          // Default behavior restored
        });
      });

      console.log('🔓 Exit methods unblocked');
    } catch (error) {
      console.error('Failed to unblock exit methods:', error.message);
    }
  }

  /**
   * Monitor system events (shutdown, restart, sleep)
   */
  monitorSystemEvents() {
    try {
      // Handle app before-quit
      app.off('before-quit', this.handleBeforeQuit);
      app.on('before-quit', (event) => {
        if (this.isFocusMode) {
          event.preventDefault();
          this.autoRelaunch();
        }
      });

      // Handle system shutdown
      powerMonitor.on('shutdown', () => {
        if (this.isFocusMode) {
          console.warn('System shutting down during focus mode – saving session');
          const session = sessionManager.loadFocusSession();
          if (session) {
            session.metadata.interruptedBy = 'system-shutdown';
            sessionManager.saveFocusSession(session);
          }
        }
      });

      // Handle sleep (pause focus mode)
      powerMonitor.on('suspend', () => {
        if (this.isFocusMode) {
          console.log('System suspending – pausing focus mode');
          this.pauseFocusMode();
        }
      });

      // Resume after sleep
      powerMonitor.on('resume', () => {
        if (this.isFocusMode) {
          console.log('System resumed – resuming focus mode');
          this.resumeFocusMode();
        }
      });

      console.log('✅ System events monitored');
    } catch (error) {
      console.error('Failed to monitor system events:', error.message);
    }
  }

  /**
   * Auto-relaunch app with focus mode
   */
  autoRelaunch() {
    try {
      const session = sessionManager.loadFocusSession();
      if (session && session.status === 'active') {
        console.log('🔄 Auto-relaunching in focus mode...');
        // Store flag for app to detect on startup
        sessionManager.store.set('pendingFocusResume', true);
        app.relaunch();
      }
    } catch (error) {
      console.error('Failed to auto-relaunch:', error.message);
    }
  }

  /**
   * Check and resume interrupted session on app startup
   */
  static checkAndResumeSession(mainWindow) {
    try {
      const pendingResume = sessionManager.store.get('pendingFocusResume');
      if (pendingResume) {
        sessionManager.store.set('pendingFocusResume', false);

        const session = sessionManager.loadFocusSession();
        if (session && session.status === 'active') {
          console.log('📋 Resuming interrupted focus session');
          const focusLock = new FocusLock(mainWindow);
          focusLock.startFocusMode(session);
          return session;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to check/resume session:', error.message);
      return null;
    }
  }

  /**
   * Get focus status
   */
  getFocusStatus() {
    return {
      isFocusMode: this.isFocusMode,
      sessionId: this.sessionId,
      session: this.isFocusMode ? sessionManager.loadFocusSession() : null,
    };
  }
}

export default FocusLock;
