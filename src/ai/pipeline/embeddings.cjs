const fs = require('fs');
const path = require('path');
const providerManager = require('../providers/providerManager.cjs');
const cfg = require('../../../config/embeddings.config.cjs');

const EMB_DIR = path.join(__dirname, '..', '..', 'storage', 'embeddings');

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

async function indexVideo(videoId, chunks, onProgress = () => {}) {
  const out = { videoId, createdAt: Date.now(), vectors: [] };
  for (let i = 0; i < chunks.length; i++) {
    const v = await providerManager.embed(chunks[i].text);
    out.vectors.push({ chunkId: chunks[i].chunkId, start: chunks[i].start, end: chunks[i].end, vector: v, excerpt: chunks[i].text.slice(0, 200) });
    onProgress((i + 1) / chunks.length);
  }
  const file = path.join(EMB_DIR, `${videoId}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
}

function loadIndex(videoId) {
  const file = path.join(EMB_DIR, `${videoId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function search(videoId, queryVector, topK = cfg.topK) {
  const idx = loadIndex(videoId);
  if (!idx) return [];
  return idx.vectors
    .map((row) => ({ ...row, score: cosineSim(row.vector, queryVector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { indexVideo, loadIndex, search };