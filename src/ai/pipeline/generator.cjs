const providerManager = require('../providers/providerManager.cjs');
const retriever = require('./retriever.cjs');
const parallelx = require('./parallelx.cjs');

const SYSTEM = "You are EduLens Assistant. Use ONLY the provided transcript chunks and timestamps to answer. Always respond in English, even if the transcript language is not English. If the answer requires outside knowledge, say 'Out of scope'. Give bullets, timestamps and mark important lines with 🔥. Provide ✓ for actionables and a short TL;DR at top.";

function buildContext(chunks) {
  return chunks.map(c => `chunk(${c.start.toFixed(0)}-${c.end.toFixed(0)} @ ${c.score?.toFixed?.(3) ?? 'n/a'}): ${c.excerpt || ''}`).join('\n');
}

function formatPrompt(context, userQ) {
  return `${SYSTEM}\n\n[CONTEXT CHUNKS]\n${context}\n\nUser question: ${userQ}\n\nFormat required:\n- TL;DR (1-2 lines)\n- Answer (detailed, with inline timestamps like [12:32])\n- Key takeaways (3-8 bullets)\n- Suggested flashcards (term -> Q/A)`;
}

function parseTimeRangeFromQuery(q) {
  const s = q.toLowerCase();
  const m1 = s.match(/first\s+(\d{1,3})\s*(?:min|minutes)/);
  if (m1) return { start: 0, end: parseInt(m1[1], 10) * 60 };
  const m2 = s.match(/(\d{1,2}):(\d{2})\s*(?:-|to|–|—)\s*(\d{1,2}):(\d{2})/);
  if (m2) { const a = parseInt(m2[1],10)*60+parseInt(m2[2],10); const b = parseInt(m2[3],10)*60+parseInt(m2[4],10); return { start: a, end: b }; }
  const m3 = s.match(/between\s+(\d{1,3})\s*(?:min|minutes)\s*(?:and|to)\s*(\d{1,3})/);
  if (m3) return { start: parseInt(m3[1],10)*60, end: parseInt(m3[2],10)*60 };
  const m4 = s.match(/(\d{1,3})\s*(?:min|minutes)\s*(?:-|to|–|—)\s*(\d{1,3})/);
  if (m4) return { start: parseInt(m4[1],10)*60, end: parseInt(m4[2],10)*60 };
  return null;
}

async function qa({ videoId, query, timeRange, mode }) {
  const detected = timeRange || parseTimeRangeFromQuery(query);
  let hits;
  if (detected) {
    hits = retriever.timeRangeSearch(videoId, Math.max(0, detected.start), Math.max(detected.start+1, detected.end), 12);
  } else {
    hits = await retriever.semanticSearch(videoId, query, 8);
  }
  if (detected && (mode === 'fast' || process.env.PARALLELX_AUTO_FOR_TIMELINE === 'true')) {
    const px = await parallelx.fastSliceSummary(videoId, detected.start, detected.end);
    return { text: px.text, sourceChunks: px.sourceChunks, creditUseEstimate: px.creditUseEstimate, mode: 'parallelx' };
  }
  const context = buildContext(hits);
  const prompt = formatPrompt(context, query + (detected ? `\n\nFocus ONLY on ${Math.floor(detected.start)}-${Math.floor(detected.end)} seconds.` : ''));
  const resp = await providerManager.generate({ prompt, maxTokens: 900, temperature: 0.2, mode });
  if (!resp || resp.provider === 'none' || !resp.text) {
    const bullets = hits.slice(0, 8).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}-${Math.floor(h.end/60)}:${String(Math.floor(h.end%60)).padStart(2,'0')}] ${h.excerpt}`);
    const text = `TL;DR: Offline heuristic summary (LLM unavailable).\n\nKey points:\n${bullets.join('\n')}`;
    return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
  }
  return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
}

async function summary({ videoId, level = 'short' }) {
  const hits = await retriever.semanticSearch(videoId, 'overall summary of the video', 12);
  const context = buildContext(hits);
  const prompt = `${SYSTEM}\n\nProvide a ${level} summary of the content using only the context. Include bullets with timestamps and a TL;DR.`;
  const resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: level === 'short' ? 600 : 1200, temperature: 0.3, mode: undefined });
  if (!resp || resp.provider === 'none' || !resp.text) {
    const bullets = hits.slice(0, 12).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
    const text = `TL;DR: Offline heuristic summary (LLM unavailable).\n\n${bullets.join('\n')}`;
    return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
  }
  return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
}

async function notes({ videoId }) {
  const hits = await retriever.semanticSearch(videoId, 'chapters and notes', 12);
  const context = buildContext(hits);
  const prompt = `${SYSTEM}\n\nGenerate organized notes (chapters -> bullets) with timestamps.`;
  const resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 900, temperature: 0.2, mode: undefined });
  if (!resp || resp.provider === 'none' || !resp.text) {
    const bullets = hits.slice(0, 10).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
    const text = `Heuristic notes (LLM unavailable):\n${bullets.join('\n')}`;
    return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
  }
  return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
}

async function flashcards({ videoId }) {
  const hits = await retriever.semanticSearch(videoId, 'key terms and definitions', 12);
  const context = buildContext(hits);
  const prompt = `${SYSTEM}\n\nProduce flashcards as a list {term, question, answer, timestamp}.`;
  const resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 800, temperature: 0.3, mode: undefined });
  if (!resp || resp.provider === 'none' || !resp.text) {
    const bullets = hits.slice(0, 10).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
    const text = `Heuristic flashcards (LLM unavailable) — key excerpts:\n${bullets.join('\n')}`;
    return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
  }
  return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
}

async function quiz({ videoId }) {
  const hits = await retriever.semanticSearch(videoId, 'create quiz questions', 12);
  const context = buildContext(hits);
  const prompt = `${SYSTEM}\n\nGenerate a mixed quiz (MCQ/TF/Short) with answers and difficulty tags.`;
  const resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 900, temperature: 0.4, mode: undefined });
  if (!resp || resp.provider === 'none' || !resp.text) {
    const bullets = hits.slice(0, 8).map((h,i)=> `${i+1}. [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
    const text = `Heuristic quiz (LLM unavailable). Use these moments to craft questions:\n${bullets.join('\n')}`;
    return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
  }
  return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
}

async function mindmap({ videoId }) {
  const hits = await retriever.semanticSearch(videoId, 'mindmap structure', 12);
  const context = buildContext(hits);
  const prompt = `${SYSTEM}\n\nReturn a JSON mindmap: nodes [{title, depth, timestamp}] only.`;
  const resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 700, temperature: 0.2, mode: undefined });
  if (!resp || resp.provider === 'none' || !resp.text) {
    const nodes = hits.slice(0, 12).map((h,i)=> ({ title: h.excerpt.slice(0,60), depth: (i%3)+1, timestamp: Math.floor(h.start) }));
    const text = JSON.stringify({ nodes }, null, 2);
    return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
  }
  return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
}

module.exports = { qa, summary, notes, flashcards, quiz, mindmap };
