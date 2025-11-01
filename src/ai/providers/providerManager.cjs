const ollama = require('./ollamaProvider.cjs');
const groq = require('./groqProvider.cjs');

async function health() {
  const [oh, gh] = await Promise.all([ollama.health(), groq.health()]);
  return { ollama: oh, groq: gh };
}

function chooseProvider({ estimatedTokens = 1000, mode, preferOffline = process.env.PREFER_OFFLINE_ONLY === 'true' }) {
  // front-end may send mode: 'online' | 'offline'
  if (mode === 'offline') return 'ollama';
  if (mode === 'online') {
    const hasGroqKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
    return hasGroqKey ? 'groq' : 'ollama';
  }
  // Default selection using env + budget
  if (preferOffline) return 'ollama';
  const hasGroqKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here');
  if (!hasGroqKey) return 'ollama';
  const budget = parseInt(process.env.GROQ_CREDIT_BUDGET || '0', 10);
  if (budget < estimatedTokens) return 'ollama';
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
  const provider = chooseProvider({ estimatedTokens: (params.maxTokens || 800) + 500, mode: params.mode });
  try {
    if (provider === 'groq') {
      return { provider, ...(await withRetry(() => groq.generate(params))) };
    }
    return { provider: 'ollama', ...(await withRetry(() => ollama.generate(params))) };
  } catch (e) {
    try {
      if (provider === 'groq') return { provider: 'ollama', ...(await withRetry(() => ollama.generate(params))) };
      return { provider: 'groq', ...(await withRetry(() => groq.generate(params))) };
    } catch (e2) {
      return { provider: 'none', text: 'AI provider unavailable', tokensUsed: { in: 0, out: 0 }, error: e2?.message || String(e2) };
    }
  }
}

async function embed(text) {
  try {
    const v = await withRetry(() => ollama.embed({ input: text }));
    if (Array.isArray(v) && v.length) return v;
  } catch {}
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const freq = new Map();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const unique = Array.from(freq.keys()).slice(0, 512);
  return unique.map((w) => freq.get(w) / words.length);
}

module.exports = { health, generate, embed };
