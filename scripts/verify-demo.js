import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// ============================================
// COLOR OUTPUT HELPERS
// ============================================
const SUCCESS = (msg) => console.log(chalk.green(`✅ ${msg}`));
const ERROR = (msg) => console.log(chalk.red(`❌ ${msg}`));
const INFO = (msg) => console.log(chalk.cyan(`ℹ️  ${msg}`));
const WARN = (msg) => console.log(chalk.yellow(`⚠️  ${msg}`));

// ============================================
// CHECKS
// ============================================
const checks = {
  launcherScript: false,
  batchWrapper: false,
  desktopShortcut: false,
  packageJsonScripts: false,
  createShortcutScript: false,
};

const errors = [];

console.log(chalk.bold.cyan('\n🔍 EduLens Hybrid Demo Launcher Verification\n'));

// ============================================
// 1. CHECK LAUNCHER SCRIPT
// ============================================
INFO('Checking launcher script...');
const launcherPath = path.join(projectRoot, 'scripts', 'launch-edulens.ps1');
if (fs.pathExistsSync(launcherPath)) {
  const content = fs.readFileSync(launcherPath, 'utf-8');
if (
    content.includes('node server/server.js') &&
    content.includes('Invoke-WebRequest') &&
    content.includes('/health') &&
    content.includes('Free-Port')
  ) {
    SUCCESS('Launcher script found and valid');
    checks.launcherScript = true;
  } else {
    ERROR('Launcher script exists but missing key functions');
    errors.push('Launcher script missing key functions (Write-Success, npm run dev:backend, etc.)');
  }
} else {
  ERROR(`Launcher script not found: ${launcherPath}`);
  errors.push(`Launcher script missing at ${launcherPath}`);
}

// ============================================
// 2. CHECK BATCH WRAPPER
// ============================================
INFO('Checking batch wrapper...');
const batchPath = path.join(projectRoot, 'launch-edulens.bat');
if (fs.pathExistsSync(batchPath)) {
  const content = fs.readFileSync(batchPath, 'utf-8');
if (content.includes('powershell') && content.includes('launch-edulens.ps1')) {
    SUCCESS('Batch wrapper found and valid');
    checks.batchWrapper = true;
  } else {
    ERROR('Batch wrapper exists but missing PowerShell invocation');
    errors.push('Batch wrapper missing PowerShell invocation');
  }
} else {
  ERROR(`Batch wrapper not found: ${batchPath}`);
  errors.push(`Batch wrapper missing at ${batchPath}`);
}

// ============================================
// 3. CHECK CREATE SHORTCUT SCRIPT
// ============================================
INFO('Checking create-shortcut script...');
const createShortcutPath = path.join(projectRoot, 'scripts', 'create-shortcut.ps1');
if (fs.pathExistsSync(createShortcutPath)) {
  const content = fs.readFileSync(createShortcutPath, 'utf-8');
  if (
    content.includes('WScript.Shell') &&
    content.includes('CreateShortcut') &&
    content.includes('launch-edulens.bat')
  ) {
    SUCCESS('Create-shortcut script found and valid');
    checks.createShortcutScript = true;
  } else {
    ERROR('Create-shortcut script exists but missing key functions');
    errors.push('Create-shortcut script missing WScript.Shell or CreateShortcut');
  }
} else {
  ERROR(`Create-shortcut script not found: ${createShortcutPath}`);
  errors.push(`Create-shortcut script missing at ${createShortcutPath}`);
}

// ============================================
// 4. CHECK DESKTOP SHORTCUT
// ============================================
INFO('Checking for desktop shortcut...');
// Use node-style environment path (works better on Windows)
const getDesktopPath = () => {
  const home = process.env.USERPROFILE || process.env.HOME;
  // Check OneDrive Desktop first
  const oneDriveDesktop = path.join(home, 'OneDrive', 'Desktop');
  if (fs.pathExistsSync(oneDriveDesktop)) {
    return oneDriveDesktop;
  }
  // Fallback to standard Desktop
  return path.join(home, 'Desktop');
};
const desktopDir = getDesktopPath();
const desktopShortcutPath = path.join(
  desktopDir,
  'EduLens Hybrid.lnk'
);
if (fs.pathExistsSync(desktopShortcutPath)) {
  SUCCESS(`Desktop shortcut found: ${desktopShortcutPath}`);
  checks.desktopShortcut = true;
} else {
  WARN(
    `Desktop shortcut not created yet (run: npm run create-shortcut)\n    Expected: ${desktopShortcutPath}`
  );
}

// ============================================
// 5. CHECK PACKAGE.JSON SCRIPTS
// ============================================
INFO('Checking package.json scripts...');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = fs.readJsonSync(packageJsonPath);

const requiredScripts = [
  'start',
  'dev:backend',
  'dev:frontend',
  'dev:electron',
  'verify:demo',
  'create-shortcut',
];
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts[script]);

if (missingScripts.length === 0) {
  SUCCESS('All required npm scripts found');
  checks.packageJsonScripts = true;
} else {
  ERROR(`Missing npm scripts: ${missingScripts.join(', ')}`);
  errors.push(`Missing npm scripts: ${missingScripts.join(', ')}`);
}

// ============================================
// 6. CHECK PROJECT STRUCTURE
// ============================================
INFO('Checking project structure...');
const requiredDirs = [
  { path: 'scripts', name: 'scripts directory' },
  { path: 'server', name: 'server directory' },
  { path: 'src', name: 'src directory' },
];

const missingDirs = requiredDirs.filter((dir) => !fs.pathExistsSync(path.join(projectRoot, dir.path)));

if (missingDirs.length === 0) {
  SUCCESS('Project structure is complete');
} else {
  ERROR(`Missing directories: ${missingDirs.map((d) => d.name).join(', ')}`);
  errors.push(`Missing directories: ${missingDirs.map((d) => d.name).join(', ')}`);
}

// ============================================
// 7. CHECK .ENV FILE
// ============================================
INFO('Checking .env file...');
const envPath = path.join(projectRoot, '.env');
const envExamplePath = path.join(projectRoot, '.env.example');

if (fs.pathExistsSync(envPath)) {
  SUCCESS('.env file found');
} else {
  WARN('.env file not found (check .env.example for template)');
}

if (!fs.pathExistsSync(envExamplePath)) {
  WARN('.env.example not found (optional reference file)');
}

// ============================================
// 8. CHECK PORT AVAILABILITY
// ============================================
INFO('Checking port availability...');
const checkPort = (port) =>
  new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, 'localhost', () => {
      server.close();
      resolve(true);
    });
    server.on('error', (err) => {
      resolve(err.code !== 'EADDRINUSE');
    });
  });

const port5000 = await checkPort(5000);
const port5173 = await checkPort(5173);

if (port5000) {
  SUCCESS('Port 5000 (backend) is available');
} else {
  WARN(
    'Port 5000 (backend) is in use. Kill process: Get-NetTCPConnection -LocalPort 5000 | Stop-Process'
  );
}

if (port5173) {
  SUCCESS('Port 5173 (frontend) is available');
} else {
  WARN('Port 5173 (frontend) is in use. Kill process before launching.');
}

// ============================================
// 9. LOG DIRECTORY
// ============================================
INFO('Checking log directory...');
const logsPath = path.join(projectRoot, 'logs');
if (!fs.pathExistsSync(logsPath)) {
  fs.ensureDirSync(logsPath);
  SUCCESS('Created logs directory');
} else {
  SUCCESS('Logs directory exists');
}

// ============================================
// SUMMARY
// ============================================
console.log(chalk.bold.cyan('\n📊 Verification Summary\n'));

const passedChecks = Object.values(checks).filter((v) => v).length;
const totalChecks = Object.keys(checks).length;

if (errors.length === 0) {
  console.log(chalk.green.bold(`✅ Demo Launcher is READY TO USE!\n`));
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.cyan('  1. npm run create-shortcut (create desktop shortcut)'));
  console.log(chalk.cyan('  2. npm run start (launch via npm)'));
  console.log(chalk.cyan('  3. OR double-click launch-edulens.bat'));
  console.log(chalk.cyan('  4. OR double-click EduLens Hybrid shortcut on Desktop\n'));
} else {
  console.log(chalk.red.bold(`❌ ${errors.length} issue(s) found:\n`));
  errors.forEach((err, i) => {
    console.log(chalk.red(`  ${i + 1}. ${err}`));
  });
  console.log('');
}

console.log(chalk.bold('Component Checks:'));
Object.entries(checks).forEach(([key, value]) => {
  const label = key.replace(/([A-Z])/g, ' $1').trim();
  console.log(
    chalk.dim(`  ${value ? '✅' : '❌'} ${label}`)
  );
});

console.log(`\nLog file: ${path.join(logsPath, 'launcher.log')}\n`);

// Exit with appropriate code
process.exit(errors.length > 0 ? 1 : 0);
