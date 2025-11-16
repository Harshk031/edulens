const http = require('http');

const tests = [
  { name: 'Health Check', path: '/health', method: 'GET' },
  { name: 'AI Status', path: '/api/ai/status', method: 'GET' },
  { name: 'Video Info (test)', path: '/api/video/info/test12345678', method: 'GET' }
];

console.log('🧪 Testing Backend Routes\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

function testRoute(name, path, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log(`  ✅ ${name}: ${res.statusCode}`);
          passed++;
          resolve(true);
        } else {
          console.log(`  ❌ ${name}: ${res.statusCode}`);
          failed++;
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`  ❌ ${name}: ${err.message}`);
      failed++;
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`  ⏱️  ${name}: Timeout`);
      failed++;
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  for (const test of tests) {
    await testRoute(test.name, test.path, test.method);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All route tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some route tests failed.\n');
    process.exit(1);
  }
}

runTests();

