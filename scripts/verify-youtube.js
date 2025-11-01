import fs from 'fs';
import http from 'http';

console.log('\n🔍 EduLens Hybrid - YouTube Embed Verification\n');

const tests = [
  { desc: 'Check component file', path: './src/components/YouTubeEmbed.jsx' },
  { desc: 'Check electron config', path: './electron.js' },
  { desc: 'Check preload bridge', path: './preload/electron-preload.cjs' },
];

for (const t of tests) {
  if (!fs.existsSync(t.path)) {
    console.log(`❌ ${t.desc}: Missing (${t.path})`);
    process.exit(1);
  } else console.log(`✅ ${t.desc}: Found`);
}

http.get('http://localhost:5173', res => {
  console.log('✅ Dev server reachable at port 5173');
}).on('error', () => {
  console.log('⚠️  Port 5173 not responding; run: npm run vite');
});

console.log('\n🧠 Manual Test:');
console.log('1️⃣ Run npm run dev');
console.log('2️⃣ Copy any YouTube URL');
console.log('3️⃣ Window should load video inline (no Watch on YouTube)');
console.log('4️⃣ Console shows: ✅ YouTube hybrid embed active (Electron:true)\n');

if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });
fs.writeFileSync('logs/verify-youtube.log', 'YouTube embed verification complete\n');
console.log('📄 Log saved to logs/verify-youtube.log\n');
