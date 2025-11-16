const path = require('path');
const fs = require('fs');
const cfg = require('../../../config/parallelx.config.cjs');
const providerManager = require('../providers/providerManager.cjs');
const embeddings = require('./embeddings.cjs');

async function precompute(videoId, chunks, onProgress = () => {}) {
  console.log(`[parallelx] Starting precompute for ${videoId} with ${chunks.length} chunks`);
  
  try {
    // CRITICAL FIX: Use process.cwd() for consistent paths
    const outFile = path.join(process.cwd(), 'data', 'storage', 'sessions', `${videoId}-parallelx.json`);
    const out = { videoId, chunkTlDr: {} };
    
    // Validate inputs
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      console.warn(`[parallelx] Invalid chunks for ${videoId}, creating empty output`);
      fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
      return;
    }
    
    // Speed cap: sample up to 20 chunks evenly to avoid long-running precompute
    const MAX_CHUNKS = parseInt(process.env.PX_MAX_CHUNKS || '20', 10);
    const step = Math.max(1, Math.ceil(chunks.length / MAX_CHUNKS));
    const startTs = Date.now();
    let processed = 0;
    let lastProgressUpdate = Date.now();
    const TIMEOUT_MS = 30000; // 30 second timeout
    
    console.log(`[parallelx] Processing ${Math.min(chunks.length, MAX_CHUNKS)} chunks with step ${step}`);
    
    for (let i = 0; i < chunks.length; i += step) {
      const c = chunks[i];
      
      // Validate chunk
      if (!c || typeof c.start !== 'number' || typeof c.end !== 'number' || !c.text) {
        console.warn(`[parallelx] Invalid chunk at index ${i}, skipping`);
        continue;
      }
      
      const prompt = `Summarize in 1-2 sentences with a timestamp hint: [${Math.floor(c.start)}-${Math.floor(c.end)}]\n\n${c.text.slice(0, 1500)}`;
      let resp;
      
      try {
        // Add timeout to individual generate calls
        const generatePromise = providerManager.generate({ 
          prompt, 
          maxTokens: 120, 
          temperature: 0.2, 
          model: process.env.OLLAMA_SMALL_MODEL, 
          mode: 'offline' 
        });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Generate timeout')), 5000)
        );
        
        resp = await Promise.race([generatePromise, timeoutPromise]);
      } catch (genError) {
        console.warn(`[parallelx] Generate failed for chunk ${i}: ${genError.message}`);
      }
      
      const fallback = `Time ${Math.floor(c.start)}-${Math.floor(c.end)}: ${c.excerpt || c.text?.slice(0, 100) || 'No content'}`;
      out.chunkTlDr[c.chunkId] = (resp && resp.text ? resp.text : fallback).trim();
      processed++;
      
      const totalToProcess = Math.min(chunks.length, MAX_CHUNKS);
      const pct = Math.min(1, processed / totalToProcess);
      
      // Update progress every 2 seconds or every 5 chunks
      const now = Date.now();
      if (now - lastProgressUpdate > 2000 || processed % 5 === 0) {
        onProgress(pct);
        lastProgressUpdate = now;
        console.log(`[parallelx] Progress: ${Math.round(pct * 100)}% (${processed}/${totalToProcess})`);
      }
      
      // Hard timeout reduced to 30s to prevent hanging at 70%
      if (Date.now() - startTs > TIMEOUT_MS) {
        console.warn(`[parallelx] Timeout after ${TIMEOUT_MS}ms, stopping at chunk ${processed}/${totalToProcess}`);
        break;
      }
    }
    
    console.log(`[parallelx] Completed precompute for ${videoId}: ${processed} chunks processed`);
    
    // Ensure directory exists before writing
    const outDir = path.dirname(outFile);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
    console.log(`[parallelx] Output written to ${outFile}`);
    
  } catch (error) {
    console.error(`[parallelx] Critical error in precompute for ${videoId}:`, error.message);
    console.error(`[parallelx] Stack trace:`, error.stack);
    
    // Create minimal output to prevent crashes
    try {
      // CRITICAL FIX: Use process.cwd() for consistent paths
    const outFile = path.join(process.cwd(), 'data', 'storage', 'sessions', `${videoId}-parallelx.json`);
      const fallbackOut = { videoId, chunkTlDr: {}, error: error.message };
      fs.writeFileSync(outFile, JSON.stringify(fallbackOut, null, 2));
      console.log(`[parallelx] Fallback output created for ${videoId}`);
    } catch (fallbackError) {
      console.error(`[parallelx] Failed to create fallback output:`, fallbackError.message);
    }
    
    // Don't throw - let the pipeline continue
  }
}

function loadPx(videoId) {
  try {
    // CRITICAL FIX: Use process.cwd() for consistent paths
    const f = path.join(process.cwd(), 'data', 'storage', 'sessions', `${videoId}-parallelx.json`);
    if (!fs.existsSync(f)) {
      console.log(`[parallelx] No parallelx file found for ${videoId}, returning empty`);
      return { videoId, chunkTlDr: {} };
    }
    
    const content = fs.readFileSync(f, 'utf-8');
    const parsed = JSON.parse(content);
    console.log(`[parallelx] Loaded parallelx data for ${videoId}: ${Object.keys(parsed.chunkTlDr || {}).length} chunks`);
    return parsed;
  } catch (error) {
    console.error(`[parallelx] Error loading parallelx data for ${videoId}:`, error.message);
    return { videoId, chunkTlDr: {}, error: error.message };
  }
}

async function fastSliceSummary(videoId, start, end) {
  try {
    console.log(`[parallelx] fastSliceSummary for ${videoId}: ${start}-${end}`);
    
    const px = loadPx(videoId);
    const idx = embeddings.loadIndex(videoId);
    
    if (!idx || !idx.vectors) {
      console.warn(`[parallelx] Index missing or invalid for ${videoId}`);
      return { 
        text: 'Index missing or invalid. Please wait for video processing to complete.', 
        sourceChunks: [], 
        creditUseEstimate: { tokensIn: 0, tokensOut: 0 } 
      };
    }
    
    const within = idx.vectors.filter(v => !(v.end <= start || v.start >= end));
    const maxParts = cfg?.slice?.splitParts || 5;
    const parts = within.slice(0, maxParts);
    
    if (parts.length === 0) {
      console.warn(`[parallelx] No chunks found in time range ${start}-${end} for ${videoId}`);
      return {
        text: `No content found in the specified time range (${start}-${end} seconds).`,
        sourceChunks: [],
        creditUseEstimate: { tokensIn: 0, tokensOut: 0 }
      };
    }
    
    const tldrs = parts.map(p => 
      px.chunkTlDr[p.chunkId] || 
      `Time ${Math.floor(p.start)}-${Math.floor(p.end)}: ${p.excerpt || 'No summary available'}`
    );

    const aggregate = tldrs.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const refinePrompt = `Combine the following mini-summaries into: (1) Concise Answer (<= 60s read) (2) Key Points (6–12 bullets with timestamps).\n\n${aggregate}`;
    
    let resp;
    try {
      resp = await providerManager.generate({ 
        prompt: refinePrompt, 
        maxTokens: 400, 
        temperature: 0.2, 
        model: process.env.OLLAMA_SMALL_MODEL, 
        mode: 'offline' 
      });
    } catch (genError) {
      console.warn(`[parallelx] Generate failed for fastSliceSummary: ${genError.message}`);
      resp = { text: aggregate, tokensUsed: { tokensIn: 0, tokensOut: 0 } };
    }

    return {
      text: resp.text || aggregate,
      sourceChunks: parts.map(p => ({ 
        chunkId: p.chunkId, 
        score: null, 
        start: p.start, 
        end: p.end, 
        excerpt: p.excerpt || 'No excerpt' 
      })),
      creditUseEstimate: resp.tokensUsed || { tokensIn: 0, tokensOut: 0 }
    };
  } catch (error) {
    console.error(`[parallelx] Error in fastSliceSummary for ${videoId}:`, error.message);
    return {
      text: `Error generating summary: ${error.message}`,
      sourceChunks: [],
      creditUseEstimate: { tokensIn: 0, tokensOut: 0 },
      error: error.message
    };
  }
}

module.exports = { precompute, fastSliceSummary };