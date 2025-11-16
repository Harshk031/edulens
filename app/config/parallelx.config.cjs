// ParallelX Configuration
module.exports = {
  maxConcurrency: 4,
  chunkSize: 120, // seconds
  overlap: 5, // seconds
  timeout: 300000, // 5 minutes
  retries: 3
};
