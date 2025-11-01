// src/services/embeddings.js
// Minimal client-side embedding using term-frequency vectors with cosine similarity.
// This is a lightweight stand-in for production embedding models; cached per video in localStorage.

const LS_PREFIX = 'edulens.rag.v1.';

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function tfVector(text) {
  const toks = tokenize(text);
  const freq = new Map();
  toks.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  // L2 normalize
  const norm = Math.sqrt(Array.from(freq.values()).reduce((s, v) => s + v * v, 0)) || 1;
  const vec = new Map();
  for (const [k, v] of freq) vec.set(k, v / norm);
  return vec;
}

function cosine(a, b) {
  let sum = 0;
  const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];
  for (const [k, va] of smaller) {
    const vb = larger.get(k);
    if (vb) sum += va * vb;
  }
  return sum;
}

export function buildIndex(videoId, chunks) {
  const index = chunks.map((text, i) => ({ i, text, vec: tfVector(text) }));
  localStorage.setItem(LS_PREFIX + videoId, JSON.stringify(chunks));
  return index;
}

export function loadIndex(videoId) {
  const raw = localStorage.getItem(LS_PREFIX + videoId);
  if (!raw) return null;
  try {
    const chunks = JSON.parse(raw);
    return chunks.map((text, i) => ({ i, text, vec: tfVector(text) }));
  } catch { return null; }
}

export function topK(index, query, k = 5) {
  const qv = tfVector(query);
  return index
    .map(e => ({ ...e, score: cosine(e.vec, qv) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
