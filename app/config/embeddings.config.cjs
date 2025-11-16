// Embeddings configuration for EduLens
module.exports = {
  // Chunk size for text processing
  chunkSize: 1000,
  chunkOverlap: 200,
  
  // Embedding settings
  embeddingDimensions: 384,
  maxTokens: 8192,
  
  // Similarity thresholds
  similarityThreshold: 0.7,
  maxResults: 10,
  
  // Processing settings
  batchSize: 10,
  timeout: 30000,
  
  // Cache settings
  cacheEnabled: true,
  cacheSize: 1000,
  
  // Storage paths (relative to project root)
  storagePath: '../../data/storage',
  embeddingsPath: '../../data/storage/embeddings',
  
  // Default provider settings
  defaultProvider: 'groq',
  fallbackProvider: 'local',
  
  // Text processing
  minChunkLength: 50,
  maxChunkLength: 2000,
  
  // Search settings
  searchResultLimit: 20,
  contextWindow: 3
};
