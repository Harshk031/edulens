const cfg = require('../../../config/embeddings.config.cjs');

function makeChunks(transcript, opts = {}) {
  const seconds = opts.seconds || cfg.chunk.seconds;
  const overlap = opts.overlapSeconds || cfg.chunk.overlapSeconds;
  const maxChars = opts.maxChars || cfg.chunk.maxChars;

  const chunks = [];
  let windowStart = 0;

  while (windowStart < transcript.duration) {
    const windowEnd = Math.min(transcript.duration, windowStart + seconds);
    const segs = transcript.segments.filter(s => s.start < windowEnd && s.end > windowStart);
    const text = segs.map(s => s.text).join(' ').slice(0, maxChars);
    const chunkId = `${transcript.videoId}-${Math.floor(windowStart)}-${Math.floor(windowEnd)}`;
    chunks.push({ chunkId, start: windowStart, end: windowEnd, text, meta: {}, summaryPreview: null });
    windowStart = windowEnd - overlap;
    if (windowStart < 0) windowStart = 0;
    if (windowEnd === transcript.duration) break;
  }

  return chunks;
}

module.exports = { makeChunks };