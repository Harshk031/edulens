const ollama = require('./ollamaProvider');
const groq = require('./groqProvider');

async function health() {
  const [oh, gh] = await Promise.all([ollama.health(), groq.health()]);
  return { ollama: oh, groq: gh };
}

function chooseProvider({ estimatedTokens = 1000, preferOffline = process.env.PREFER_OFFLINE_ONLY === 'true' }) {
  if (preferOffline) return 'ollama';
  const budget = parseInt(process.env.GROQ_CREDIT_BUDGET || '0', 10);
  if (budget < estimatedTokens) return 'ollama';
  return 'groq';
}

async function generate(params) {
  const provider = chooseProvider({ estimatedTokens: (params.maxTokens || 800) + 500 });
  try {
    if (provider === 'groq') return { provider, ...(await groq.generate(params)) };
    return { provider: 'ollama', ...(await ollama.generate(params)) };
  } catch (e) {
    // Fallback
    if (provider === 'groq') return { provider: 'ollama', ...(await ollama.generate(params)) };
    return { provider: 'groq', ...(await groq.generate(params)) };
  }
}

async function embed(text) {
  // Prefer Ollama for embeddings; fallback no-op vector
  try {
    const v = await ollama.embed({ input: text });
    if (Array.isArray(v) && v.length) return v;
  } catch {}
  // Return simple bag-of-words hash vector as last resort
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const freq = new Map();
  words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
  const unique = Array.from(freq.keys()).slice(0, 512);
  return unique.map((w) => freq.get(w) / words.length);
}

module.exports = { health, generate, embed };
