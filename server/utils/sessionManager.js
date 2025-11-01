import Store from 'electron-store';
import CryptoJS from 'crypto-js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const ENCRYPTION_KEY = 'edulens-focus-2025'; // In production, use secure key management
const SESSION_FILE = path.join(app.getPath('appData'), 'EduLens', 'session.json');
const BACKUP_DIR = path.join(app.getPath('appData'), 'EduLens', 'backups');

// Ensure directories exist
function ensureDirectories() {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Encrypt data
function encrypt(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

// Decrypt data
function decrypt(encryptedData) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return null;
  }
}

export class SessionManager {
  constructor() {
    ensureDirectories();
    this.store = new Store({
      name: 'edulens-session',
      cwd: path.join(app.getPath('appData'), 'EduLens'),
    });
  }

  // Save focus session
  saveFocusSession(sessionData) {
    try {
      const session = {
        id: sessionData.id || Date.now(),
        startTime: sessionData.startTime || Date.now(),
        endTime: sessionData.endTime || null,
        timerDuration: sessionData.timerDuration || 1800000, // 30 min default
        elapsedTime: sessionData.elapsedTime || 0,
        paused: sessionData.paused || false,
        pausedAt: sessionData.pausedAt || null,
        status: sessionData.status || 'active', // active, paused, completed, exited
        transcript: sessionData.transcript || '',
        aiContext: sessionData.aiContext || {},
        aiMode: sessionData.aiMode || 'offline',
        provider: sessionData.provider || 'groq',
        unlockedBy: sessionData.unlockedBy || null, // 'timer' or 'payment'
        metadata: sessionData.metadata || {},
        timestamp: Date.now(),
      };

      // Save encrypted to file
      const encrypted = encrypt(session);
      fs.writeFileSync(SESSION_FILE, encrypted, 'utf8');

      // Also save to electron-store for quick access
      this.store.set('currentSession', session);

      // Create backup
      this.createBackup(session);

      return session;
    } catch (error) {
      console.error('Failed to save focus session:', error.message);
      return null;
    }
  }

  // Load focus session
  loadFocusSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const encrypted = fs.readFileSync(SESSION_FILE, 'utf8');
        const decrypted = decrypt(encrypted);
        if (decrypted) {
          return decrypted;
        }
      }
      return this.store.get('currentSession');
    } catch (error) {
      console.error('Failed to load focus session:', error.message);
      return null;
    }
  }

  // Restore session from backup
  restoreFromBackup(backupId) {
    try {
      const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);
      if (fs.existsSync(backupPath)) {
        const encrypted = fs.readFileSync(backupPath, 'utf8');
        const session = decrypt(encrypted);
        if (session) {
          this.saveFocusSession(session);
          return session;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to restore from backup:', error.message);
      return null;
    }
  }

  // Create backup
  createBackup(sessionData) {
    try {
      const backupId = `backup-${Date.now()}`;
      const backupPath = path.join(BACKUP_DIR, `${backupId}.json`);
      const encrypted = encrypt(sessionData);
      fs.writeFileSync(backupPath, encrypted, 'utf8');

      // Keep only last 10 backups
      const files = fs.readdirSync(BACKUP_DIR)
        .sort()
        .reverse();
      if (files.length > 10) {
        for (let i = 10; i < files.length; i++) {
          fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
        }
      }

      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error.message);
      return null;
    }
  }

  // Update session timer
  updateSessionTimer(elapsedTime, paused = false) {
    const session = this.loadFocusSession();
    if (session) {
      session.elapsedTime = elapsedTime;
      session.paused = paused;
      if (paused) {
        session.pausedAt = Date.now();
      }
      return this.saveFocusSession(session);
    }
    return null;
  }

  // Mark session complete
  completeSession(unlockedBy = 'timer') {
    const session = this.loadFocusSession();
    if (session) {
      session.endTime = Date.now();
      session.status = 'completed';
      session.unlockedBy = unlockedBy;
      return this.saveFocusSession(session);
    }
    return null;
  }

  // Clear session
  clearSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
      this.store.delete('currentSession');
      return true;
    } catch (error) {
      console.error('Failed to clear session:', error.message);
      return false;
    }
  }

  // Get session history
  getSessionHistory(limit = 10) {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .sort()
        .reverse()
        .slice(0, limit);

      const history = files.map(file => {
        try {
          const encrypted = fs.readFileSync(path.join(BACKUP_DIR, file), 'utf8');
          return decrypt(encrypted);
        } catch {
          return null;
        }
      }).filter(Boolean);

      return history;
    } catch (error) {
      console.error('Failed to get session history:', error.message);
      return [];
    }
  }

  // Export session data (for analytics)
  exportSession(sessionId) {
    try {
      const history = this.getSessionHistory(50);
      const session = history.find(s => s.id === sessionId);
      if (session) {
        return {
          success: true,
          data: session,
        };
      }
      return { success: false, error: 'Session not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new SessionManager();
