# Phase 5 — AI Integration (Ollama + Groq)

## Goal
Provide AI assistance both offline and online, with automatic fallback and health checks.

## Problems Faced
1) Missing/invalid API keys (401s)
- Groq requests failed when keys were misconfigured.

2) Ollama unresponsive
- Local service not running or wrong base URL.

3) Provider selection at runtime
- The UI needed to reflect provider health and pick the right path.

## How We Solved
- Added runtime health checks and a simple "auto" mode.
- Backend routes wrap providers; errors bubble with clear messages.
- UI reflects status and allows manual override.

## Snippets
```js
// server/routes/onlineAI.js (pseudo)
router.post('/chat', async (req, res) => {
  try {
    const key = process.env.GROQ_API_KEY;
    if (!key) return res.status(400).json({ error: 'Missing GROQ_API_KEY' });
    const out = await callGroq(key, req.body.message);
    res.json({ response: out });
  } catch (e) {
    res.status(502).json({ error: 'Groq unavailable', details: e.message });
  }
});

// server/routes/offlineAI.js (pseudo)
router.post('/chat', async (req, res) => {
  try {
    const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const out = await callOllama(base, req.body.message);
    res.json({ response: out });
  } catch (e) {
    res.status(502).json({ error: 'Ollama unavailable', details: e.message });
  }
});
```