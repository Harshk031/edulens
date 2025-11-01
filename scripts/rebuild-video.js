#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const videoId = process.argv[2];
if (!videoId) {
  console.error('Usage: npm run rebuild-video VIDEOID');
  process.exit(1);
}

const base = path.join(__dirname, '..', 'src', 'storage');
['transcripts', 'embeddings', 'sessions'].forEach(dir => {
  const file = path.join(base, dir, `${videoId}${dir==='transcripts'?'.json': dir==='sessions'?'-parallelx.json':'.json'}`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  console.log('Deleted', file);
});

console.log('Rebuild requested for', videoId);
