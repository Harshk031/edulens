const providerManager = require('../providers/providerManager.cjs');
const retriever = require('./retriever.cjs');
const parallelx = require('./parallelx.cjs');

const SYSTEM = "You are EduLens Assistant. Use ONLY the provided transcript chunks and timestamps to answer. If the answer requires outside knowledge, say 'Out of scope'. Give bullets, timestamps and mark important lines with 🔥. Provide ✓ for actionables and a short TL;DR at top.";

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

async function qa({ videoId, query, timeRange, provider = 'ollama' }) {
  try {
    console.log(`🍺 QA query - videoId: ${videoId}, provider: ${provider}`);
    const detected = timeRange || parseTimeRangeFromQuery(query);
    let hits;
    try {
      if (detected) {
        console.log(`  📋 Time-range search: ${detected.start}s to ${detected.end}s`);
        hits = retriever.timeRangeSearch(videoId, Math.max(0, detected.start), Math.max(detected.start+1, detected.end), 12);
        console.log(`  ✅ Got ${hits.length} hits from time-range search`);
      } else {
        console.log(`  🔍 Semantic search for: ${query.slice(0, 60)}...`);
        hits = await retriever.semanticSearch(videoId, query, 8);
        console.log(`  ✅ Got ${hits.length} hits from semantic search`);
      }
    } catch (retrievalErr) {
      console.error('[QA] Retrieval error:', retrievalErr?.message || retrievalErr);
      throw retrievalErr;
    }
    
    if (detected && process.env.PARALLELX_AUTO_FOR_TIMELINE === 'true') {
      try {
        const px = await parallelx.fastSliceSummary(videoId, detected.start, detected.end);
        return { text: px.text, sourceChunks: px.sourceChunks, creditUseEstimate: px.creditUseEstimate, mode: 'parallelx' };
      } catch (pxErr) {
        console.error('[QA] Parallelx error:', pxErr?.message || pxErr);
        throw pxErr;
      }
    }
    
    const context = buildContext(hits);
    const prompt = formatPrompt(context, query + (detected ? `\n\nFocus ONLY on ${Math.floor(detected.start)}-${Math.floor(detected.end)} seconds.` : ''));
    console.log(`�\udcbe Calling generator with provider: ${provider}`);
    
    let resp;
    try {
      resp = await providerManager.generate({ prompt, maxTokens: 900, temperature: 0.2, provider });
      console.log('[QA] Provider response received:', resp ? '✅' : '❌');
    } catch (provErr) {
      console.error('[QA] Provider error:', provErr?.message || provErr);
      throw provErr;
    }
    
    if (!resp || resp.provider === 'none' || !resp.text) {
      console.log('[QA] Using heuristic fallback (no provider response)');
      const bullets = hits.slice(0, 8).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}-${Math.floor(h.end/60)}:${String(Math.floor(h.end%60)).padStart(2,'0')}] ${h.excerpt}`);
      const text = `TL;DR: Heuristic summary (${resp?.provider || 'none'} unavailable).\n\nKey points:\n${bullets.join('\n')}`;
      return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
    }
    console.log(`✅ QA response from ${resp.provider}`);
    return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
  } catch (err) {
    console.error('[QA] Unhandled error in qa():', err?.message || err);
    throw err;
  }
}

async function summary({ videoId, level = 'short', provider = 'ollama' }) {
  try {
    console.log(`[Summary] Starting summary generation for ${videoId}, level=${level}`);
    let hits;
    try {
      hits = await retriever.semanticSearch(videoId, 'overall summary of the video', 12);
      console.log(`[Summary] Retrieved ${hits.length} chunks`);
    } catch (retrieverr) {
      console.error('[Summary] Retrieval error:', retrieverr?.message || retrieverr);
      throw retrieverr;
    }
    
    const context = buildContext(hits);
    const prompt = `${SYSTEM}\n\nProvide a ${level} summary of the content using only the context. Include bullets with timestamps and a TL;DR.`;
    let resp;
    try {
      resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: level === 'short' ? 600 : 1200, temperature: 0.3, provider });
      console.log(`[Summary] Provider response: ${resp ? '✅' : '❌'}`);
    } catch (provErr) {
      console.error('[Summary] Provider error:', provErr?.message || provErr);
      throw provErr;
    }
    
    if (!resp || resp.provider === 'none' || !resp.text) {
      console.log('[Summary] Using heuristic fallback');
      const bullets = hits.slice(0, 12).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
      const text = `TL;DR: Heuristic summary (${resp?.provider || 'none'} unavailable).\n\n${bullets.join('\n')}`;
      return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
    }
    return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
  } catch (err) {
    console.error('[Summary] Unhandled error:', err?.message || err);
    throw err;
  }
}

async function notes({ videoId, provider = 'ollama' }) {
  try {
    console.log(`[Notes] Starting notes generation for ${videoId}`);
    let hits;
    try {
      hits = await retriever.semanticSearch(videoId, 'chapters and notes', 12);
      console.log(`[Notes] Retrieved ${hits.length} chunks`);
    } catch (err) {
      console.error('[Notes] Retrieval error:', err?.message || err);
      throw err;
    }
    
    const context = buildContext(hits);
    const prompt = `${SYSTEM}\n\nGenerate organized notes (chapters -> bullets) with timestamps.`;
    let resp;
    try {
      resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 900, temperature: 0.2, provider });
      console.log(`[Notes] Provider response: ${resp ? '✅' : '❌'}`);
    } catch (err) {
      console.error('[Notes] Provider error:', err?.message || err);
      throw err;
    }
    
    if (!resp || resp.provider === 'none' || !resp.text) {
      console.log('[Notes] Using heuristic fallback');
      const bullets = hits.slice(0, 10).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
      const text = `Heuristic notes (${resp?.provider || 'none'} unavailable):\n${bullets.join('\n')}`;
      return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
    }
    return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
  } catch (err) {
    console.error('[Notes] Unhandled error:', err?.message || err);
    throw err;
  }
}

async function flashcards({ videoId, provider = 'ollama' }) {
  try {
    console.log(`[Flashcards] Starting flashcards generation for ${videoId}`);
    let hits;
    try {
      hits = await retriever.semanticSearch(videoId, 'key terms and definitions', 12);
      console.log(`[Flashcards] Retrieved ${hits.length} chunks`);
    } catch (err) {
      console.error('[Flashcards] Retrieval error:', err?.message || err);
      throw err;
    }
    
    const context = buildContext(hits);
    const prompt = `${SYSTEM}\n\nProduce flashcards as a list {term, question, answer, timestamp}.`;
    let resp;
    try {
      resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 800, temperature: 0.3, provider });
      console.log(`[Flashcards] Provider response: ${resp ? '✅' : '❌'}`);
    } catch (err) {
      console.error('[Flashcards] Provider error:', err?.message || err);
      throw err;
    }
    
    if (!resp || resp.provider === 'none' || !resp.text) {
      console.log('[Flashcards] Using heuristic fallback');
      const bullets = hits.slice(0, 10).map(h => `- [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
      const text = `Heuristic flashcards (${resp?.provider || 'none'} unavailable) — key excerpts:\n${bullets.join('\n')}`;
      return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
    }
    return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
  } catch (err) {
    console.error('[Flashcards] Unhandled error:', err?.message || err);
    throw err;
  }
}

async function quiz({ videoId, provider = 'ollama' }) {
  try {
    console.log(`[Quiz] Starting quiz generation for ${videoId}`);
    let hits;
    try {
      hits = await retriever.semanticSearch(videoId, 'create quiz questions', 12);
      console.log(`[Quiz] Retrieved ${hits.length} chunks`);
    } catch (err) {
      console.error('[Quiz] Retrieval error:', err?.message || err);
      throw err;
    }
    
    const context = buildContext(hits);
    const prompt = `${SYSTEM}\n\nGenerate a mixed quiz (MCQ/TF/Short) with answers and difficulty tags.`;
    let resp;
    try {
      resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 900, temperature: 0.4, provider });
      console.log(`[Quiz] Provider response: ${resp ? '✅' : '❌'}`);
    } catch (err) {
      console.error('[Quiz] Provider error:', err?.message || err);
      throw err;
    }
    
    if (!resp || resp.provider === 'none' || !resp.text) {
      console.log('[Quiz] Using heuristic fallback');
      const bullets = hits.slice(0, 8).map((h,i)=> `${i+1}. [${Math.floor(h.start/60)}:${String(Math.floor(h.start%60)).padStart(2,'0')}] ${h.excerpt}`);
      const text = `Heuristic quiz (${resp?.provider || 'none'} unavailable). Use these moments to craft questions:\n${bullets.join('\n')}`;
      return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
    }
    return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
  } catch (err) {
    console.error('[Quiz] Unhandled error:', err?.message || err);
    throw err;
  }
}

async function mindmap({ videoId, provider = 'ollama' }) {
  try {
    console.log(`[Mindmap] Starting mindmap generation for ${videoId}`);
    let hits;
    try {
      hits = await retriever.semanticSearch(videoId, 'mindmap structure', 12);
      console.log(`[Mindmap] Retrieved ${hits.length} chunks`);
    } catch (err) {
      console.error('[Mindmap] Retrieval error:', err?.message || err);
      throw err;
    }
    
    const context = buildContext(hits);
    const prompt = `${SYSTEM}\n\nReturn a JSON mindmap: nodes [{title, depth, timestamp}] only.`;
    let resp;
    try {
      resp = await providerManager.generate({ prompt: `${prompt}\n\n[CONTEXT]\n${context}`, maxTokens: 700, temperature: 0.2, provider });
      console.log(`[Mindmap] Provider response: ${resp ? '✅' : '❌'}`);
    } catch (err) {
      console.error('[Mindmap] Provider error:', err?.message || err);
      throw err;
    }
    
    if (!resp || resp.provider === 'none' || !resp.text) {
      console.log('[Mindmap] Using heuristic fallback');
      const nodes = hits.slice(0, 12).map((h,i)=> ({ title: h.excerpt.slice(0,60), depth: (i%3)+1, timestamp: Math.floor(h.start) }));
      const text = JSON.stringify({ nodes }, null, 2);
      return { text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: { in:0, out:0 }, mode: 'heuristic' };
    }
    return { text: resp.text, sourceChunks: hits.map(h => ({ chunkId: h.chunkId, score: h.score, start: h.start, end: h.end, excerpt: h.excerpt })), creditUseEstimate: resp.tokensUsed };
  } catch (err) {
    console.error('[Mindmap] Unhandled error:', err?.message || err);
    throw err;
  }
}

module.exports = { qa, summary, notes, flashcards, quiz, mindmap };
