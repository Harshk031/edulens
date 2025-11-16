const cfg = require('../../../config/embeddings.config.cjs');

function makeChunks(transcript, opts = {}) {
  console.log('[chunker] makeChunks called');
  console.log(`  Transcript videoId: ${transcript?.videoId}`);
  console.log(`  Transcript duration: ${transcript?.duration}`);
  console.log(`  Transcript segments: ${transcript?.segments?.length || 0}`);
  
  // Validate transcript
  if (!transcript || !transcript.segments || transcript.segments.length === 0) {
    console.error('[chunker] Empty transcript - returning empty chunks');
    return [];
  }
  
  const seconds = opts.seconds || cfg.chunk.seconds;
  const overlap = opts.overlapSeconds || cfg.chunk.overlapSeconds;
  const maxChars = opts.maxChars || cfg.chunk.maxChars;
  
  // If duration is 0, infer from segments
  let duration = transcript.duration || 0;
  if (duration === 0 && transcript.segments.length > 0) {
    duration = Math.max(...transcript.segments.map(s => s.end || 0));
    console.log(`[chunker] Inferred duration from segments: ${duration}s`);
  }
  
  if (duration === 0) {
    console.error('[chunker] No valid duration - cannot create chunks');
    return [];
  }

  const chunks = [];
  let windowStart = 0;

  while (windowStart < duration) {
    const windowEnd = Math.min(duration, windowStart + seconds);
    const segs = transcript.segments.filter(s => s.start < windowEnd && s.end > windowStart);
    const text = segs.map(s => s.text).join(' ').slice(0, maxChars);
    const chunkId = `${transcript.videoId}-${Math.floor(windowStart)}-${Math.floor(windowEnd)}`;
    chunks.push({ chunkId, start: windowStart, end: windowEnd, text, meta: {}, summaryPreview: null });
    windowStart = windowEnd - overlap;
    if (windowStart < 0) windowStart = 0;
    if (windowEnd === duration) break;
  }

  console.log(`[chunker] Created ${chunks.length} chunks from ${duration}s transcript`);
  return chunks;
}

module.exports = { makeChunks };
