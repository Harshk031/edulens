import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`
═══════════════════════════════════════
🔍  EduLens Hybrid Base Verification
═══════════════════════════════════════
`);

const checks = [
  'src/main.jsx',
  'src/App.jsx',
  'electron.js',
  'server/server.js',
  'package.json',
];

let passed = 0;

for (const file of checks) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅  Found: ${file}`);
    passed++;
  } else {
    console.log(`❌  Missing: ${file}`);
  }
}

console.log(`\n📊 Status: ${passed}/${checks.length} core files present`);

if (passed === checks.length) {
  console.log('\n🎉  Base structure verified successfully.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some core files missing. Review setup.\n');
  process.exit(1);
}
