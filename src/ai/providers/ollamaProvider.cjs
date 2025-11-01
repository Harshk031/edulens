const axios = require('axios');
const OLLAMA_HOST = process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

async function health() {
  try {
    const r = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 1500 });
    return { ok: true, models: (r.data?.models || []).map(m => m.name) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function generate({ prompt, maxTokens = 800, temperature = 0.3, model }) {
  let useModel = model || process.env.OLLAMA_MODEL || 'llama3.2:3b';
  let lastErr;
  for (const candidate of [useModel, 'llama3.2:3b', 'phi3:mini', 'mistral:7b-instruct-q4_K_M']){
    try {
      const body = { model: candidate, prompt, options: { temperature, num_predict: maxTokens }, stream: false };
      const r = await axios.post(`${OLLAMA_HOST}/api/generate`, body, { timeout: 60_000 });
      const text = r.data?.response || '';
      return { text, tokensUsed: { in: 0, out: 0 }, raw: r.data };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('ollama generate failed');
}

async function embed({ input, model }) {
  const useModel = model || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  const r = await axios.post(`${OLLAMA_HOST}/api/embeddings`, { model: useModel, prompt: input }, { timeout: 60_000 });
  return r.data?.embedding || [];
}

module.exports = { health, generate, embed };