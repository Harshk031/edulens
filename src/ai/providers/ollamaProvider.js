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
  const useModel = model || process.env.OLLAMA_MODEL || 'llama3.1';
  const body = { model: useModel, prompt, options: { temperature, num_predict: maxTokens } };
  const r = await axios.post(`${OLLAMA_HOST}/api/generate`, body, { timeout: 60_000 });
  // streaming responses come line-by-line; when not streaming, we get full object
  const text = r.data?.response || '';
  return { text, tokensUsed: { in: 0, out: 0 }, raw: r.data };
}

async function embed({ input, model }) {
  const useModel = model || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  const r = await axios.post(`${OLLAMA_HOST}/api/embeddings`, { model: useModel, prompt: input }, { timeout: 60_000 });
  return r.data?.embedding || [];
}

module.exports = { health, generate, embed };
