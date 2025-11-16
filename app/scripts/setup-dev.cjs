/**
 * Development Setup Script for EduLens
 * Prepares the development environment
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Setting up EduLens development environment...\n');

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  } else {
    console.log(`📁 Directory exists: ${dirPath}`);
  }
}

/**
 * Create file if it doesn't exist
 * @param {string} filePath - File path
 * @param {string} content - File content
 */
function ensureFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created file: ${filePath}`);
  } else {
    console.log(`📄 File exists: ${filePath}`);
  }
}

/**
 * Main setup function
 */
async function setupDev() {
  try {
    console.log('1. Creating necessary directories...');
    
    // Ensure all required directories exist
    const requiredDirs = [
      path.join(__dirname, '..', '..', 'data', 'storage'),
      path.join(__dirname, '..', '..', 'data', 'storage', 'transcripts'),
      path.join(__dirname, '..', '..', 'data', 'storage', 'embeddings'),
      path.join(__dirname, '..', '..', 'data', 'storage', 'sessions'),
      path.join(__dirname, '..', '..', 'data', 'storage', 'sessions', 'jobs'),
      path.join(__dirname, '..', 'backend', 'temp'),
      path.join(__dirname, '..', 'frontend', 'dist'),
      path.join(__dirname, '..', 'logs')
    ];
    
    requiredDirs.forEach(ensureDir);
    
    console.log('\n2. Creating configuration files...');
    
    // Create .env file if it doesn't exist
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = `# EduLens Environment Configuration
NODE_ENV=development
PORT=5000
VITE_PORT=5173
ELECTRON_START_URL=http://localhost:5173

# API Configuration
API_BASE=http://localhost:5000
VITE_API_BASE=http://localhost:5000

# AI Configuration
GROQ_API_KEY=your_groq_api_key_here
LMSTUDIO_BASE_URL=http://localhost:1234

# Development Settings
DEBUG=true
LOG_LEVEL=info
`;
    
    ensureFile(envPath, envContent);
    
    // Create runtime env file
    const runtimeEnvPath = path.join(__dirname, '..', '.runtime-env');
    const runtimeEnvContent = `API_BASE=http://localhost:5000
VITE_API_BASE=
PORT=5000
`;
    
    ensureFile(runtimeEnvPath, runtimeEnvContent);
    
    console.log('\n3. Checking dependencies...');
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('📦 Installing dependencies...');
      await runCommand('npm', ['install'], { cwd: path.join(__dirname, '..') });
    } else {
      console.log('📦 Dependencies already installed');
    }
    
    console.log('\n4. Setting up development database...');
    
    // Create index.json if it doesn't exist
    const indexPath = path.join(__dirname, '..', '..', 'data', 'storage', 'index.json');
    const indexContent = JSON.stringify({
      videos: {},
      sessions: {},
      analytics: {
        totalVideos: 0,
        totalSessions: 0,
        lastUpdated: new Date().toISOString()
      }
    }, null, 2);
    
    ensureFile(indexPath, indexContent);
    
    console.log('\n✅ Development environment setup complete!');
    console.log('\n🚀 You can now run:');
    console.log('   npm run dev:backend  - Start backend server');
    console.log('   npm run dev:frontend - Start frontend dev server');
    console.log('   npm run dev:electron - Start Electron app');
    console.log('   npm run start        - Start Electron with auto-backend');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Run a command and return a promise
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {object} options - Spawn options
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupDev().catch(console.error);
}

module.exports = { setupDev, ensureDir, ensureFile };
