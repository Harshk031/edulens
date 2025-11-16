/**
 * Cleanup Manager for Electron
 * Handles graceful shutdown and resource cleanup
 */

const { spawn } = require('child_process');
const path = require('path');

class CleanupManager {
  constructor() {
    this.processes = new Set();
    this.cleanupHandlers = new Set();
    this.isShuttingDown = false;
  }

  /**
   * Register a process for cleanup
   * @param {ChildProcess} process - Process to track
   */
  registerProcess(process) {
    if (process && process.pid) {
      this.processes.add(process);
      console.log(`[Cleanup] Registered process ${process.pid}`);
      
      process.on('exit', () => {
        this.processes.delete(process);
        console.log(`[Cleanup] Process ${process.pid} exited`);
      });
    }
  }

  /**
   * Register a cleanup handler
   * @param {Function} handler - Cleanup function
   */
  registerHandler(handler) {
    if (typeof handler === 'function') {
      this.cleanupHandlers.add(handler);
      console.log('[Cleanup] Registered cleanup handler');
    }
  }

  /**
   * Kill all registered processes
   */
  async killProcesses() {
    console.log(`[Cleanup] Killing ${this.processes.size} processes...`);
    
    const killPromises = Array.from(this.processes).map(async (process) => {
      try {
        if (process && process.pid && !process.killed) {
          console.log(`[Cleanup] Killing process ${process.pid}`);
          
          // Try graceful shutdown first
          process.kill('SIGTERM');
          
          // Force kill after timeout
          setTimeout(() => {
            if (!process.killed) {
              console.log(`[Cleanup] Force killing process ${process.pid}`);
              process.kill('SIGKILL');
            }
          }, 3000);
        }
      } catch (error) {
        console.warn(`[Cleanup] Error killing process:`, error.message);
      }
    });

    await Promise.allSettled(killPromises);
    this.processes.clear();
  }

  /**
   * Run all cleanup handlers
   */
  async runCleanupHandlers() {
    console.log(`[Cleanup] Running ${this.cleanupHandlers.size} cleanup handlers...`);
    
    const handlerPromises = Array.from(this.cleanupHandlers).map(async (handler) => {
      try {
        await handler();
      } catch (error) {
        console.warn('[Cleanup] Handler error:', error.message);
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  /**
   * Kill specific processes by name (Windows)
   * @param {string} processName - Process name to kill
   */
  async killProcessByName(processName) {
    try {
      console.log(`[Cleanup] Killing all ${processName} processes...`);
      
      if (process.platform === 'win32') {
        const killProcess = spawn('taskkill', ['/F', '/IM', processName], {
          stdio: 'pipe'
        });
        
        return new Promise((resolve) => {
          killProcess.on('close', (code) => {
            if (code === 0) {
              console.log(`[Cleanup] Successfully killed ${processName}`);
            } else {
              console.log(`[Cleanup] No ${processName} processes found or already terminated`);
            }
            resolve();
          });
        });
      } else {
        // Unix-like systems
        const killProcess = spawn('pkill', ['-f', processName], {
          stdio: 'pipe'
        });
        
        return new Promise((resolve) => {
          killProcess.on('close', () => {
            console.log(`[Cleanup] Attempted to kill ${processName}`);
            resolve();
          });
        });
      }
    } catch (error) {
      console.warn(`[Cleanup] Error killing ${processName}:`, error.message);
    }
  }

  /**
   * Perform complete cleanup
   */
  async cleanup() {
    if (this.isShuttingDown) {
      console.log('[Cleanup] Already shutting down...');
      return;
    }

    this.isShuttingDown = true;
    console.log('[Cleanup] Starting cleanup process...');

    try {
      // Run custom cleanup handlers
      await this.runCleanupHandlers();

      // Kill registered processes
      await this.killProcesses();

      // Kill common EduLens processes
      await this.killProcessByName('node.exe');
      await this.killProcessByName('electron.exe');

      console.log('[Cleanup] Cleanup completed successfully');
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    }
  }

  /**
   * Setup automatic cleanup on app exit
   * @param {Electron.App} app - Electron app instance
   */
  setupAutoCleanup(app) {
    if (!app) {
      console.warn('[Cleanup] No app instance provided for auto cleanup');
      return;
    }

    // Handle various exit scenarios
    const exitEvents = ['before-quit', 'window-all-closed', 'will-quit'];
    
    exitEvents.forEach(event => {
      app.on(event, async (e) => {
        console.log(`[Cleanup] App ${event} event triggered`);
        
        if (!this.isShuttingDown) {
          e.preventDefault();
          await this.cleanup();
          app.quit();
        }
      });
    });

    // Handle process signals
    process.on('SIGINT', async () => {
      console.log('[Cleanup] SIGINT received');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('[Cleanup] SIGTERM received');
      await this.cleanup();
      process.exit(0);
    });

    console.log('[Cleanup] Auto cleanup handlers registered');
  }
}

// Export singleton instance
const cleanupManager = new CleanupManager();
module.exports = cleanupManager;
