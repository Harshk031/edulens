const groq = require('./groqProvider.cjs');
const lmstudio = require('./lmstudioProvider.cjs');

async function health() {
  try {
    console.log('[ProviderManager] Starting health check...');
    
    // Check LM Studio health with timeout
    let lmstudioHealth;
    try {
      const lmstudioPromise = lmstudio.health();
      const lmstudioTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LM Studio health check timeout')), 2000)
      );
      lmstudioHealth = await Promise.race([lmstudioPromise, lmstudioTimeout]);
      console.log('[ProviderManager] ✅ LM Studio health:', lmstudioHealth.ok ? 'OK' : 'FAILED');
    } catch (lmstudioError) {
      console.warn('[ProviderManager] ⚠️ LM Studio health check failed:', lmstudioError.message);
      lmstudioHealth = { ok: false, error: lmstudioError.message, status: 'error' };
    }
    
    // Check Groq health with timeout
    let groqHealth;
    try {
      const groqPromise = groq.health();
      const groqTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Groq health check timeout')), 2000)
      );
      groqHealth = await Promise.race([groqPromise, groqTimeout]);
      console.log('[ProviderManager] ✅ Groq health:', groqHealth.ok ? 'OK' : 'FAILED');
    } catch (groqError) {
      console.warn('[ProviderManager] ⚠️ Groq health check failed:', groqError.message);
      groqHealth = { ok: false, error: groqError.message, status: 'error' };
    }
    
    const result = { 
      lmstudio: lmstudioHealth,
      groq: groqHealth
    };
    
    console.log('[ProviderManager] ✅ Health check complete:', {
      lmstudio: result.lmstudio.ok ? 'OK' : 'FAILED',
      groq: result.groq.ok ? 'OK' : 'FAILED'
    });
    
    return result;
  } catch (err) {
    console.error('[ProviderManager] ❌ Health check failed:', err.message);
    console.error('[ProviderManager] Error stack:', err.stack);
    return { 
      lmstudio: { ok: false, error: err.message, status: 'error' },
      groq: { ok: false, error: err.message, status: 'error' }
    };
  }
}

function chooseProvider({ estimatedTokens = 1000, provider, preferOffline = process.env.PREFER_OFFLINE_AI === 'true' }) {
  // If provider is explicitly specified, use it
  if (provider === 'groq' || provider === 'lmstudio') return provider;
  
  // Check default provider from environment
  const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'groq';
  
  // If prefer offline, use LM Studio
  if (preferOffline && process.env.LMSTUDIO_BASE_URL) {
    return 'lmstudio';
  }
  
  // Use default provider if available
  if (defaultProvider === 'groq') {
    const hasGroqKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
    if (hasGroqKey) {
      const budget = parseInt(process.env.GROQ_CREDIT_BUDGET || '999999', 10);
      if (budget >= estimatedTokens) return 'groq';
    }
  } else if (defaultProvider === 'lmstudio' && process.env.LMSTUDIO_BASE_URL) {
    return 'lmstudio';
  }
  
  // Fall back: try Groq first, then LM Studio
  const hasGroqKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
  if (hasGroqKey) return 'groq';
  if (process.env.LMSTUDIO_BASE_URL) return 'lmstudio';
  return 'groq';
}

async function withRetry(fn, { tries = 3, baseDelay = 300 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i))); }
  }
  throw last;
}

async function generate(params) {
  const provider = chooseProvider({ estimatedTokens: (params.maxTokens || 800) + 500, provider: params.provider });
  console.log(`🤖 Using provider: ${provider} (requested: ${params.provider || 'auto'})`);
  
  try {
    if (provider === 'groq') {
      console.log('🔄 Calling Groq API...');
      const result = await withRetry(() => groq.generate(params));
      // Groq returns plain text string
      return { provider: 'groq', text: result };
    } else if (provider === 'lmstudio') {
      console.log('🔄 Calling LM Studio (offline)...');
      const result = await withRetry(() => lmstudio.generate(params));
      // LM Studio returns plain text string
      return { provider: 'lmstudio', text: result };
    } else {
      console.log('🔄 Calling LM Studio (offline)...');
      const result = await withRetry(() => lmstudio.generate(params));
      return { provider: 'lmstudio', text: result };
    }
  } catch (e) {
    console.error(`Error with ${provider}:`, e.message);
    
    // Try fallbacks in order: lmstudio -> groq
    const fallbacks = ['lmstudio', 'groq'].filter(p => p !== provider);
    
    for (const fallback of fallbacks) {
      try {
        console.log(`⚠️ Falling back to ${fallback}...`);
        
        if (fallback === 'groq' && !process.env.GROQ_API_KEY) {
          continue; // Skip if no key
        }
        
        if (fallback === 'lmstudio') {
          const result = await withRetry(() => lmstudio.generate(params));
          return { provider: 'lmstudio', text: result };
        } else if (fallback === 'groq') {
          const result = await withRetry(() => groq.generate(params));
          return { provider: 'groq', text: result };
        }
      } catch (e2) {
        console.error(`${fallback} also failed:`, e2.message);
      }
    }
    
    console.error('All providers failed');
    return { 
      provider: 'none', 
      text: 'All AI providers unavailable. Please check your configuration.', 
      tokensUsed: { in: 0, out: 0 }, 
      error: e?.message || String(e) 
    };
  }
}

async function embed(params) {
  const text = typeof params === 'string' ? params : params.input;
  console.log(`[providerManager] Generating embedding for text: "${text.substring(0, 100)}..."`);
  
  try {
    // LM Studio doesn't support embeddings, skip to fallback
    console.log('[providerManager] LM Studio embeddings not available, using TF-IDF fallback');
  } catch (error) {
    console.error(`[providerManager] Embedding error:`, error.message);
  }
  
  console.log(`[providerManager] Falling back to TF-IDF embedding for text: "${text.substring(0, 50)}..."`);
  // Fallback to TF-IDF based embedding
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  if (words.length === 0) {
    console.warn(`[providerManager] No words found in text, returning zero vector`);
    return new Array(512).fill(0);
  }
  
  const freq = new Map();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const unique = Array.from(freq.keys()).slice(0, 512);
  const tfidfVector = unique.map((w) => freq.get(w) / words.length);
  
  // Pad or truncate to 512 dimensions
  const finalVector = new Array(512).fill(0);
  for (let i = 0; i < Math.min(tfidfVector.length, 512); i++) {
    finalVector[i] = tfidfVector[i];
  }
  
  console.log(`[providerManager] Generated TF-IDF fallback vector of length ${finalVector.length}`);
  return finalVector;
}

module.exports = { health, generate, embed };
