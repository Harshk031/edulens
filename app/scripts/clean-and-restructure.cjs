/**
 * Clean and Restructure Script for EduLens
 * Cleans up temporary files and maintains project structure
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning and restructuring EduLens project...\n');

/**
 * Remove directory recursively
 * @param {string} dirPath - Directory path to remove
 */
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`🗑️  Removed: ${dirPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not remove ${dirPath}: ${error.message}`);
    }
  }
}

/**
 * Remove file
 * @param {string} filePath - File path to remove
 */
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️  Could not remove file ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Clean temporary files and directories
 */
function cleanTemporaryFiles() {
  console.log('1. Cleaning temporary files...');
  
  const tempPaths = [
    // Temporary directories
    path.join(__dirname, '..', 'backend', 'temp'),
    path.join(__dirname, '..', 'frontend', 'dist'),
    path.join(__dirname, '..', 'logs'),
    
    // Build artifacts
    path.join(__dirname, '..', 'build'),
    path.join(__dirname, '..', '.vite'),
    
    // Test files
    path.join(__dirname, '..', '..', 'test-*.js'),
    path.join(__dirname, '..', '..', 'debug-*.js'),
    path.join(__dirname, '..', '..', 'quick-*.js'),
    path.join(__dirname, '..', '..', 'simple-*.js'),
    
    // Old launcher files
    path.join(__dirname, '..', '..', 'EDULENS-*.bat'),
    path.join(__dirname, '..', '..', 'START-*.bat'),
    path.join(__dirname, '..', '..', 'KAAMKA*.bat'),
    
    // Documentation that might be outdated
    path.join(__dirname, '..', '..', 'SYSTEM-*.md'),
    path.join(__dirname, '..', '..', 'FINAL-*.md'),
    path.join(__dirname, '..', '..', 'USER-*.md'),
    path.join(__dirname, '..', '..', 'HOW-TO-*.md'),
    path.join(__dirname, '..', '..', 'KAAMKA-*.md')
  ];
  
  tempPaths.forEach(tempPath => {
    if (tempPath.includes('*')) {
      // Handle glob patterns
      const dir = path.dirname(tempPath);
      const pattern = path.basename(tempPath);
      
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.match(pattern.replace('*', '.*'))) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
              removeDir(fullPath);
            } else {
              removeFile(fullPath);
            }
          }
        });
      }
    } else {
      if (fs.existsSync(tempPath)) {
        if (fs.statSync(tempPath).isDirectory()) {
          removeDir(tempPath);
        } else {
          removeFile(tempPath);
        }
      }
    }
  });
}

/**
 * Recreate necessary directories
 */
function recreateDirectories() {
  console.log('\n2. Recreating necessary directories...');
  
  const requiredDirs = [
    path.join(__dirname, '..', 'backend', 'temp'),
    path.join(__dirname, '..', 'logs'),
    path.join(__dirname, '..', '..', 'data', 'storage', 'sessions', 'jobs')
  ];
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created: ${dir}`);
    }
  });
}

/**
 * Clean old session data (optional)
 */
function cleanOldSessions() {
  console.log('\n3. Cleaning old session data...');
  
  const sessionsDir = path.join(__dirname, '..', '..', 'data', 'storage', 'sessions');
  
  if (fs.existsSync(sessionsDir)) {
    const files = fs.readdirSync(sessionsDir);
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      const filePath = path.join(sessionsDir, file);
      
      if (fs.statSync(filePath).isFile()) {
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneWeekAgo) {
          removeFile(filePath);
        }
      }
    });
  }
}

/**
 * Main cleanup function
 */
function cleanAndRestructure() {
  try {
    cleanTemporaryFiles();
    recreateDirectories();
    
    // Uncomment to clean old sessions (optional)
    // cleanOldSessions();
    
    console.log('\n✅ Cleanup and restructuring complete!');
    console.log('\n📊 Project structure maintained:');
    console.log('   app/backend/     - Backend server and APIs');
    console.log('   app/frontend/    - React frontend');
    console.log('   app/electron/    - Electron main process');
    console.log('   app/config/      - Configuration files');
    console.log('   data/storage/    - Application data');
    console.log('   launchers/       - Launch scripts');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanAndRestructure();
}

module.exports = { cleanAndRestructure, removeDir, removeFile };
