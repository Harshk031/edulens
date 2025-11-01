#!/usr/bin/env node
const axios = require('axios');

(async () => {
  try {
    const health = await axios.get('http://localhost:5000/health');
    console.log('Health:', health.data);
    console.log('OK');
  } catch (e) {
    console.error('Verify failed:', e.message);
    process.exit(1);
  }
})();
