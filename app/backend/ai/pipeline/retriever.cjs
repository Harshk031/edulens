const providerManager = require('../providers/providerManager.cjs');
const embeddings = require('./embeddings.cjs');
const cfg = require('../../../config/embeddings.config.cjs');

async function semanticSearch(videoId, query, topK = cfg.topK) {
  console.log(`  📡 Embeddings.search: videoId=${videoId}, topK=${topK}`);
  console.log(`  📝 Query: "${query}"`);
  
  try {
    const qv = await providerManager.embed(query);
    console.log(`  ✅ Query embedded successfully, dimension: ${qv.length}`);
    console.log(`  🔍 Searching index...`);
    
    const results = embeddings.search(videoId, qv, topK);
    console.log(`  ✅ Found ${results.length} results from search`);
    
    // Log top chunk similarities for debugging
    if (results.length > 0) {
      const topScores = results.slice(0, 3).map(r => r.score?.toFixed?.(4) || '0.0000');
      console.log(`  📊 Top similarity scores: ${topScores.join(', ')}`);
      
      // Log timestamp ranges of top results
      const topRanges = results.slice(0, 3).map(r => `[${r.start}s-${r.end}s]`);
      console.log(`  ⏰ Top timestamp ranges: ${topRanges.join(', ')}`);
    }
    
    return results;
  } catch (error) {
    console.error(`  ❌ Error in semantic search:`, error.message);
    return [];
  }
}

function timeRangeSearch(videoId, start, end, topK = cfg.topK) {
  console.log(`  🕐 Time range search: videoId=${videoId}, range=${start}s-${end}s, topK=${topK}`);
  
  const idx = embeddings.loadIndex(videoId);
  if (!idx) {
    console.log(`  ❌ No embeddings index found for videoId: ${videoId}`);
    return [];
  }
  
  console.log(`  📊 Found ${idx.vectors.length} total vectors in index`);
  
  const within = idx.vectors.filter(v => !(v.end <= start || v.start >= end));
  console.log(`  📏 ${within.length} vectors within time range`);
  
  const scored = within.map(v => ({
    ...v,
    score: Math.min(v.end, end) - Math.max(v.start, start)
  })).sort((a,b) => b.score - a.score || a.start - b.start);
  
  const results = scored.slice(0, topK);
  console.log(`  ✅ Returning ${results.length} results from time range search`);
  
  return results;
}

// New function to retrieve chunks with proper context formatting
async function retrieveContextWithSources(videoId, query, topK = 8) {
  console.log(`\n🚀 Starting retrieval process for videoId: ${videoId}`);
  console.log(`📝 Query: "${query}"`);
  console.log(`🎯 Requesting top-${topK} chunks`);
  
  // Get query embedding
  const queryEmbedding = await providerManager.embed(query);
  console.log(`✅ Query embedded successfully (dimension: ${queryEmbedding.length})`);
  
  // Search for relevant chunks
  const results = await embeddings.search(videoId, queryEmbedding, { topK });
  console.log(`🔍 Retrieved ${results.length} chunks from embeddings search`);
  
  // Log debug information
  if (results.length > 0) {
    const topScores = results.slice(0, 3).map(r => r.score?.toFixed?.(4) || '0.0000');
    console.log(`📊 Top similarity scores: ${topScores.join(', ')}`);
    
    const topRanges = results.slice(0, 3).map(r => `[${r.start}s-${r.end}s]`);
    console.log(`⏰ Top timestamp ranges: ${topRanges.join(', ')}`);
  } else {
    console.log(`⚠️ No results found - embeddings may be missing for this video`);
  }
  
  // Format context for LLM prompt
  const context = results.map(r => `---\n[${r.start}s-${r.end}s]\n${r.text || r.excerpt}\n`);
  
  // Prepare sources with all required fields
  const sources = results.map(r => ({
    chunkId: r.chunkId,
    text: r.text || r.excerpt,
    start: r.start,
    end: r.end,
    similarity: r.score || 0,
    timestampRange: `[${r.start}s-${r.end}s]`
  }));
  
  console.log(`📝 Formatted context with ${context.length} chunks`);
  console.log(`📋 Prepared ${sources.length} source citations`);
  
  return {
    context,
    sources,
    retrievalCount: results.length,
    topSimilarities: results.slice(0, 3).map(r => r.score || 0),
    hasEmbeddings: results.length > 0
  };
}

module.exports = {
  semanticSearch,
  timeRangeSearch,
  retrieveContextWithSources
};
