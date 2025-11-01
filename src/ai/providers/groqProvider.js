const axios = require('axios');
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BASE = 'https://api.groq.com/openai/v1';

async function health() {
  if (!GROQ_API_KEY) return { ok: false, error: 'missing GROQ_API_KEY' };
  try {
    // No dedicated health; do a cheap models list
    const r = await axios.get(`${BASE}/models`, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, timeout: 2000 });
    return { ok: true, models: (r.data?.data || []).map(m => m.id) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function generate({ prompt, maxTokens = 800, temperature = 0.3, model }) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const useModel = model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
  const body = { model: useModel, messages: [ { role: 'user', content: prompt } ], temperature, max_tokens: maxTokens };
  const r = await axios.post(`${BASE}/chat/completions`, body, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } });
  const text = r.data?.choices?.[0]?.message?.content || '';
  const tokensIn = r.data?.usage?.prompt_tokens || 0;
  const tokensOut = r.data?.usage?.completion_tokens || 0;
  return { text, tokensUsed: { in: tokensIn, out: tokensOut }, raw: r.data };
}

async function embed() {
  // Groq does not provide embeddings; return null to force fallback
  return null;
}

module.exports = { health, generate, embed };
