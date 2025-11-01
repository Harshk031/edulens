#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const detect = require('detect-port');

(async () => {
  const root = path.join(__dirname, '..');
  const envPath = path.join(root, '.env');
  const envLocalPath = path.join(root, '.env.local');
  const basePort = parseInt(process.env.PORT || '5000', 10);
  const free = await detect(basePort);
  const apiBase = `http://localhost:${free}`;

  function writeEnv(p) {
    let lines = '';
    if (fs.existsSync(p)) lines = fs.readFileSync(p, 'utf-8');
    const map = Object.fromEntries(lines.split(/\r?\n/).filter(Boolean).map(l => l.split('=')).map(([k, ...v]) => [k, v.join('=')]));
    map.PORT = String(free);
    map.VITE_API_BASE = apiBase;
    const out = Object.entries(map).map(([k,v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(p, out + '\n');
  }

  writeEnv(envPath);
  writeEnv(envLocalPath);

  // Ensure logs dir
  const logsDir = path.join(root, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

  console.log(`SETUP_OK PORT=${free} VITE_API_BASE=${apiBase}`);
})();