module.exports = {
  slice: {
    maxRangeSeconds: 900, // cap single slice
    splitParts: 10,
    smallModelPreference: true,
  },
  tldr: {
    perChunkMaxSentences: 2,
  }
};
