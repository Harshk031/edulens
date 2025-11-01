const providerManager = require('../providers/providerManager');
const embeddings = require('./embeddings');
const cfg = require('../../../config/embeddings.config');

async function semanticSearch(videoId, query, topK = cfg.topK) {
  const qv = await providerManager.embed(query);
  const results = embeddings.search(videoId, qv, topK);
  return results;
}

function timeRangeSearch(videoId, start, end, topK = cfg.topK) {
  const idx = embeddings.loadIndex(videoId);
  if (!idx) return [];
  const within = idx.vectors.filter(v => !(v.end <= start || v.start >= end));
  // rank by overlap amount then start time
  const scored = within.map(v => ({
    ...v,
    score: Math.min(v.end, end) - Math.max(v.start, start)
  })).sort((a,b) => b.score - a.score || a.start - b.start);
  return scored.slice(0, topK);
}

module.exports = { semanticSearch, timeRangeSearch };
