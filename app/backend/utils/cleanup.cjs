/**
 * Automatic cleanup utility for EduLens
 * Cleans temporary files and memory when app closes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class CleanupManager {
  constructor() {
    this.tempFiles = new Set();
    this.cleanupHandlers = [];
    this.isShuttingDown = false;
    
    // Register process exit handlers
    this.registerExitHandlers();
  }
  
  registerExitHandlers() {
    // Handle different exit scenarios
    process.on('exit', () => this.performCleanup('exit'));
    process.on('SIGINT', () => this.performCleanup('SIGINT'));
    process.on('SIGTERM', () => this.performCleanup('SIGTERM'));
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      this.performCleanup('uncaughtException');
    });
    
    // Windows-specific
    if (process.platform === 'win32') {
      const readline = require('readline');
      readline.createInterface({
        input: process.stdin,
        output: process.stdout
      }).on('SIGINT', () => {
        this.performCleanup('SIGINT');
        process.exit(0);
      });
    }
  }
  
  // Register a temp file for cleanup
  registerTempFile(filePath) {
    this.tempFiles.add(filePath);
    console.log(`[Cleanup] Registered temp file: ${path.basename(filePath)}`);
  }
  
  // Register a custom cleanup handler
  registerHandler(name, handler) {
    this.cleanupHandlers.push({ name, handler });
    console.log(`[Cleanup] Registered handler: ${name}`);
  }
  
  // Perform cleanup
  async performCleanup(reason = 'unknown') {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log(`\n🧹 [Cleanup] Starting cleanup (reason: ${reason})...`);
    
    try {
      // 1. Clean temp files
      await this.cleanTempFiles();
      
      // 2. Clean temp transcription sessions
      await this.cleanTranscriptionSessions();
      
      // 3. Clean audio downloads
      await this.cleanAudioFiles();
      
      // 4. Run custom handlers
      await this.runCustomHandlers();
      
      // 5. Force garbage collection if available
      if (global.gc) {
        console.log('[Cleanup] Running garbage collection...');
        global.gc();
      }
      
      console.log('✅ [Cleanup] Cleanup complete\n');
      
    } catch (error) {
      console.error('❌ [Cleanup] Error during cleanup:', error.message);
    }
  }
  
  async cleanTempFiles() {
    if (this.tempFiles.size === 0) return;
    
    console.log(`[Cleanup] Cleaning ${this.tempFiles.size} temp files...`);
    let cleaned = 0;
    
    for (const filePath of this.tempFiles) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          cleaned++;
          console.log(`   🗑️  Deleted: ${path.basename(filePath)}`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not delete ${path.basename(filePath)}: ${err.message}`);
      }
    }
    
    console.log(`[Cleanup] Cleaned ${cleaned}/${this.tempFiles.size} temp files`);
    this.tempFiles.clear();
  }
  
  async cleanTranscriptionSessions() {
    const tempDir = path.join(os.tmpdir(), 'edulens-transcription');
    
    try {
      if (!fs.existsSync(tempDir)) return;
      
      const sessions = fs.readdirSync(tempDir);
      console.log(`[Cleanup] Cleaning ${sessions.length} transcription sessions...`);
      
      for (const session of sessions) {
        try {
          const sessionPath = path.join(tempDir, session);
          await fs.promises.rm(sessionPath, { recursive: true, force: true });
          console.log(`   🗑️  Deleted session: ${session}`);
        } catch (err) {
          console.log(`   ⚠️  Could not delete session ${session}: ${err.message}`);
        }
      }
      
    } catch (err) {
      console.log(`[Cleanup] Could not clean transcription sessions: ${err.message}`);
    }
  }
  
  async cleanAudioFiles() {
    const projectRoot = path.join(__dirname, '..', '..');
    const audioPatterns = ['tmp-*.mp3', 'tmp-*.wav', 'tmp-*.m4a'];
    
    try {
      const files = fs.readdirSync(projectRoot);
      let cleaned = 0;
      
      for (const file of files) {
        if (audioPatterns.some(pattern => {
          const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
          return regex.test(file);
        })) {
          try {
            const filePath = path.join(projectRoot, file);
            await fs.promises.unlink(filePath);
            cleaned++;
            console.log(`   🗑️  Deleted audio: ${file}`);
          } catch (err) {
            // Ignore
          }
        }
      }
      
      if (cleaned > 0) {
        console.log(`[Cleanup] Cleaned ${cleaned} audio files`);
      }
      
    } catch (err) {
      console.log(`[Cleanup] Could not clean audio files: ${err.message}`);
    }
  }
  
  async runCustomHandlers() {
    if (this.cleanupHandlers.length === 0) return;
    
    console.log(`[Cleanup] Running ${this.cleanupHandlers.length} custom handlers...`);
    
    for (const { name, handler } of this.cleanupHandlers) {
      try {
        await handler();
        console.log(`   ✅ Handler completed: ${name}`);
      } catch (err) {
        console.log(`   ⚠️  Handler failed (${name}): ${err.message}`);
      }
    }
  }
  
  // Manual cleanup trigger
  async cleanup() {
    await this.performCleanup('manual');
  }
}

// Singleton instance
const cleanupManager = new CleanupManager();

module.exports = cleanupManager;

