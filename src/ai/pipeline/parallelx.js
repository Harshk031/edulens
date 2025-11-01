const path = require('path');
const fs = require('fs');
const cfg = require('../../../config/parallelx.config');
const providerManager = require('../providers/providerManager');
const embeddings = require('./embeddings');

async function precompute(videoId, chunks, onProgress = () => {}) {
  // Precompute per-chunk TL;DR using small model for long videos
  const outFile = path.join(__dirname, '..', '..', 'storage', 'sessions', `${videoId}-parallelx.json`);
  const out = { videoId, chunkTlDr: {} };
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const prompt = `Summarize in 1-2 sentences with a timestamp hint: [${Math.floor(c.start)}-${Math.floor(c.end)}]\n\n${c.text.slice(0, 1500)}`;
    const resp = await providerManager.generate({ prompt, maxTokens: 120, temperature: 0.2, model: process.env.OLLAMA_SMALL_MODEL });
    out.chunkTlDr[c.chunkId] = resp.text.trim();
    onProgress((i + 1) / chunks.length);
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
}

function loadPx(videoId) {
  const f = path.join(__dirname, '..', '..', 'storage', 'sessions', `${videoId}-parallelx.json`);
  if (!fs.existsSync(f)) return { videoId, chunkTlDr: {} };
  return JSON.parse(fs.readFileSync(f, 'utf-8'));
}

async function fastSliceSummary(videoId, start, end) {
  const px = loadPx(videoId);
  // Select intersecting chunks by reading embedding index metadata
  const idx = embeddings.loadIndex(videoId);
  if (!idx) return { text: 'Index missing', sourceChunks: [], creditUseEstimate: { tokensIn: 0, tokensOut: 0 } };
  const within = idx.vectors.filter(v => !(v.end <= start || v.start >= end));
  const parts = within.slice(0, cfg.slice.splitParts);
  const tldrs = parts.map(p => px.chunkTlDr[p.chunkId] || `Time ${Math.floor(p.start)}-${Math.floor(p.end)}: ${p.excerpt}`);

  const aggregate = tldrs.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const refinePrompt = `Combine the following mini-summaries into: (1) Concise Answer (<= 60s read) (2) Key Points (6–12 bullets with timestamps).\n\n${aggregate}`;
  const resp = await providerManager.generate({ prompt: refinePrompt, maxTokens: 400, temperature: 0.2, model: process.env.OLLAMA_SMALL_MODEL });

  return {
    text: resp.text,
    sourceChunks: parts.map(p => ({ chunkId: p.chunkId, score: null, start: p.start, end: p.end, excerpt: p.excerpt })),
    creditUseEstimate: resp.tokensUsed
  };
}

module.exports = { precompute, fastSliceSummary };
