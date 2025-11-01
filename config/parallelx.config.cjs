module.exports = {
  slice: {
    maxRangeSeconds: 900,
    splitParts: 10,
    smallModelPreference: true,
  },
  tldr: {
    perChunkMaxSentences: 2,
  },
  transcription: {
    // Parallel Whisper settings
    segmentSec: 180,         // split audio into 3-minute chunks
    overlapSec: 2,           // small overlap to avoid word cuts
    concurrency: 4           // parallel whisper.cpp processes
  }
};
