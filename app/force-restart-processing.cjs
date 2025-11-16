// Force restart video processing with fresh start
const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';
const VIDEO_ID = 'a-wVHL0lpb0';
const VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

function log(msg, color = '') {
  const colors = { green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m', gray: '\x1b[90m', bright: '\x1b[1m', reset: '\x1b[0m' };
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function main() {
  log('\n═══════════════════════════════════════════════════════════════', 'bright');
  log('🔄 FORCE RESTART VIDEO PROCESSING', 'bright');
  log('═══════════════════════════════════════════════════════════════', 'bright');
  log(`Video ID: ${VIDEO_ID}`, 'yellow');
  
  // Delete existing transcript to force regeneration
  const transcriptPath = path.join(process.cwd(), 'data', 'storage', 'transcripts', `${VIDEO_ID}.json`);
  if (fs.existsSync(transcriptPath)) {
    log('🗑️  Deleting existing transcript to force regeneration...', 'yellow');
    try {
      fs.unlinkSync(transcriptPath);
      log('✅ Transcript deleted', 'green');
    } catch (err) {
      log(`⚠️  Could not delete transcript: ${err.message}`, 'yellow');
    }
  }
  
  // Delete stuck job files
  const jobsDir = path.join(process.cwd(), 'data', 'storage', 'sessions', 'jobs');
  if (fs.existsSync(jobsDir)) {
    const jobFiles = fs.readdirSync(jobsDir).filter(f => f.includes(VIDEO_ID) && f.endsWith('.json'));
    if (jobFiles.length > 0) {
      log(`🗑️  Deleting ${jobFiles.length} stuck job file(s)...`, 'yellow');
      jobFiles.forEach(file => {
        try {
          fs.unlinkSync(path.join(jobsDir, file));
          log(`   ✅ Deleted: ${file}`, 'gray');
        } catch (err) {
          log(`   ⚠️  Could not delete ${file}: ${err.message}`, 'yellow');
        }
      });
    }
  }
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  // Start fresh processing with force flag
  log('\n🚀 Starting fresh video processing (force=true)...', 'cyan');
  try {
    const res = await fetch(`${API_BASE}/video/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: VIDEO_URL, force: true })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      log(`❌ Processing failed: ${res.status} - ${errorText}`, 'red');
      process.exit(1);
    }
    
    const data = await res.json();
    log(`✅ Processing started: ${data.jobId || 'N/A'}`, 'green');
    log(`\n⏳ Processing will now start fresh with timeout protection...`, 'cyan');
    log(`   Monitor progress at: ${API_BASE}/video/status?videoId=${VIDEO_ID}`, 'gray');
    
  } catch (err) {
    log(`❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

main().catch(err => { log(`Fatal: ${err.message}`, 'red'); console.error(err); process.exit(1); });

