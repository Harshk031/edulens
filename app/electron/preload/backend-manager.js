const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Safely import ipcRenderer (might not exist in testing)
let ipcRenderer = null;
try {
  ipcRenderer = require('electron').ipcRenderer;
} catch (err) {
  // Running outside Electron context (testing)
}

let backendProcess = null;
let isStarting = false;
let isShuttingDown = false;
let restartTimeout = null;

// Get project root (up one level from preload directory)
const projectRoot = path.join(__dirname, '..');
const serverPath = path.join(projectRoot, 'server', 'server.js');
const logsDir = path.join(projectRoot, 'logs');

// Ensure logs directory exists
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (err) {
  console.error('[BackendManager] Failed to create logs directory:', err);
}

// Enhanced logging helper with error levels
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [BackendManager] [${level}] ${message}`;
  
  // Color-coded console output
  const colors = {
    INFO: '\x1b[36m',    // cyan
    WARN: '\x1b[33m',    // yellow
    ERROR: '\x1b[31m',   // red
    SUCCESS: '\x1b[32m', // green
    RESET: '\x1b[0m'
  };
  
  console.log(`${colors[level] || ''}${logMessage}${colors.RESET}`);
  
  try {
    const logFile = path.join(logsDir, 'backend-manager.log');
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (err) {
    console.error('[BackendManager] Failed to write to log file:', err);
  }
};

// Enhanced error logging
const logError = (message, error) => {
  const errorDetails = error ? `${error.message} (${error.code || 'Unknown'})` : 'Unknown error';
  log(`${message}: ${errorDetails}`, 'ERROR');
  
  // Log stack trace for debugging
  if (error && error.stack) {
    try {
      const stackLogFile = path.join(logsDir, 'backend-errors.log');
      const timestamp = new Date().toISOString();
      fs.appendFileSync(stackLogFile, `${timestamp} ${message}\n${error.stack}\n\n`);
    } catch (err) {
      console.error('[BackendManager] Failed to write error stack:', err);
    }
  }
};

// Check if backend is running
const checkBackend = async () => {
  try {
    const response = await fetch('http://localhost:5000/health');
    return response.ok;
  } catch (err) {
    return false;
  }
};

// Start backend server
const startBackend = () => {
  if (isStarting || backendProcess) {
    log('Backend already starting or running');
    return;
  }

  if (isShuttingDown) {
    log('Cannot start backend - shutting down');
    return;
  }

  isStarting = true;
  log('Starting backend server...');

  try {
    // Clear any restart timeout
    if (restartTimeout) {
      clearTimeout(restartTimeout);
      restartTimeout = null;
    }

    const logFile = path.join(logsDir, 'server.log');
    const errFile = path.join(logsDir, 'server.err.log');
    
    // Start the server process
    backendProcess = spawn('node', [serverPath], {
      cwd: projectRoot,
      detached: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    log(`Backend process started with PID: ${backendProcess.pid}`);

    // Setup log file streams
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    const errStream = fs.createWriteStream(errFile, { flags: 'a' });

    // Pipe stdout and stderr to log files
    backendProcess.stdout.pipe(logStream);
    backendProcess.stderr.pipe(errStream);

    // Also log to console for debugging
    backendProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(`[Server] ${message}`);
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        log(`[Server Error] ${message}`);
      }
    });

    backendProcess.on('error', (err) => {
      log(`Backend process error: ${err.message}`);
      backendProcess = null;
      isStarting = false;
      
      if (!isShuttingDown) {
        log('Scheduling backend restart in 5 seconds...');
        restartTimeout = setTimeout(startBackend, 5000);
      }
    });

    backendProcess.on('exit', (code, signal) => {
      log(`Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
      isStarting = false;
      
      if (!isShuttingDown && code !== 0) {
        log('Scheduling backend restart in 3 seconds...');
        restartTimeout = setTimeout(startBackend, 3000);
      }
    });

    isStarting = false;
    
    // Wait a moment then check if backend is responding
    setTimeout(async () => {
      const isRunning = await checkBackend();
      log(`Backend health check: ${isRunning ? 'OK' : 'FAILED'}`);
      
      if (!isRunning && !isShuttingDown) {
        log('Backend not responding, attempting restart...');
        stopBackend();
        setTimeout(startBackend, 2000);
      }
    }, 3000);

  } catch (err) {
    log(`Failed to start backend: ${err.message}`);
    isStarting = false;
    
    if (!isShuttingDown) {
      log('Scheduling backend restart in 5 seconds...');
      restartTimeout = setTimeout(startBackend, 5000);
    }
  }
};

// Stop backend server
const stopBackend = () => {
  if (!backendProcess) {
    log('No backend process to stop');
    return;
  }

  log(`Stopping backend process (PID: ${backendProcess.pid})`);
  
  try {
    // Try graceful shutdown first
    backendProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        log('Force killing backend process');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
    
  } catch (err) {
    log(`Error stopping backend: ${err.message}`);
  }
  
  backendProcess = null;
};

// Initialize backend management
const initialize = () => {
  log('Backend manager initialized');
  
  if (ipcRenderer) {
    // Listen for app-ready signal from main process
    ipcRenderer.on('app-ready', () => {
      log('Received app-ready signal, starting backend...');
      startBackend();
    });
    
    // Listen for app-closing signal for cleanup
    ipcRenderer.on('app-closing', () => {
      log('Received app-closing signal, shutting down backend...');
      isShuttingDown = true;
      
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
      
      stopBackend();
    });
  } else {
    log('Running outside Electron context - manual backend management');
  }
  
  // Health monitoring
  const healthCheck = setInterval(async () => {
    if (isShuttingDown) {
      clearInterval(healthCheck);
      return;
    }
    
    if (backendProcess) {
      const isHealthy = await checkBackend();
      if (!isHealthy) {
        log('Backend health check failed, restarting...');
        stopBackend();
        setTimeout(startBackend, 1000);
      }
    } else if (!isStarting) {
      log('No backend process found, starting...');
      startBackend();
    }
  }, 30000); // Check every 30 seconds
};

// Start initialization
initialize();

log('Backend manager loaded and ready');

// Export functions for external use
module.exports = {
  startBackend: startBackend,
  stopBackend: stopBackend,
  checkBackend: checkBackend,
  isRunning: () => !!backendProcess
};
