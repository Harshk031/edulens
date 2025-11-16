// Parallel transcription configuration - OPTIMIZED FOR STABILITY AND SPEED
module.exports = {
  workers: {
    maxWorkers: 6,  // OPTIMIZED: 6 workers for best stability/speed balance
    minWorkers: 2,  // Lower minimum to reduce resource usage
    preferPython: false
  },
  chunking: {
    SHORT: { maxDuration: 1800, size: 600, overlap: 5 },      // OPTIMIZED: Moderate chunks
    MEDIUM: { maxDuration: 7200, size: 900, overlap: 10 },    // OPTIMIZED: Balanced chunks
    LONG: { maxDuration: 36000, size: 1200, overlap: 15 },    // OPTIMIZED: Larger chunks for long videos
    ULTRA: { maxDuration: Infinity, size: 1800, overlap: 30 } // OPTIMIZED: Very large chunks for ultra-long videos
  },
  engines: {
    preferPythonForLong: false,
    pythonModel: 'base',
    whisperCpp: {
      autoDownloadModel: false,
      model: 'ggml-base.en.bin'
    }
  },
  merging: {
    overlapTolerance: 5,
    duplicateThreshold: 0.8,
    maxGapFill: 2,
    minSegmentLength: 1
  },
  performance: {
    autoCleanup: true,
    debugProgressIntervalSeconds: 30,
    maxMemoryUsageMB: 2048,        // OPTIMIZED: Limit memory to 2GB for stability
    batchSize: 4,                   // OPTIMIZED: Process 4 chunks at a time
    enableGarbageCollection: true   // Force GC between batches
  },
  debug: {
    keepTempFiles: false,
    logLevel: 'info'
  }
};
