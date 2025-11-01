#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  const port = process.env.PORT || 5000;
  const server = spawn('node', ['server/server.js'], { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
  const start = Date.now();
  let ok = false; let tries = 0;
  async function ping() {
    tries++;
    try {
      const r = await axios.get(`http://localhost:${port}/health`, { timeout: 1500 });
      if (r.status === 200) ok = true;
    } catch {}
  }
  while (!ok && tries < 5) { await new Promise(r => setTimeout(r, 1000)); await ping(); }
  const ms = Date.now() - start;
  if (ok) console.log(`HEALTH_OK ${ms}ms on :${port}`); else console.log('HEALTH_FAIL');
  // log
  const logPath = path.join(__dirname, '..', 'logs', 'system-check.log');
  const line = `[${new Date().toISOString()}] health=${ok} ms=${ms} port=${port}\n`;
  try { fs.appendFileSync(logPath, line); } catch {}
  // stop
  server.kill('SIGTERM');
})();