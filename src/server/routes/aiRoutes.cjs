const express = require('express');
const router = express.Router();
const generator = require('../../ai/pipeline/generator.cjs');
const parallelx = require('../../ai/pipeline/parallelx.cjs');
const embeddings = require('../../ai/pipeline/embeddings.cjs');
const transcriptor = require('../../ai/pipeline/transcriptor.cjs');
const chunker = require('../../ai/pipeline/chunker.cjs');

const respond = (res, payload) => res.json({ ...payload, creditUseEstimate: payload.creditUseEstimate || { tokensIn: 0, tokensOut: 0 }, sourceChunks: payload.sourceChunks || [] });

router.post('/query', async (req, res) => {
  try {
    const { videoId, query, timeRange, mode } = req.body || {};
    if (!videoId || !query) return res.status(400).json({ error: 'videoId and query required' });
    // Auto-bootstrap pipeline if embeddings missing
    const idx = embeddings.loadIndex(videoId);
    if (!idx) {
      // fire-and-forget processing using videoId as URL
      (async () => {
        try {
          const meta = await transcriptor.prepare(`https://youtu.be/${videoId}`);
          const transcript = await transcriptor.getOrCreateTranscript(meta, () => {});
          const chunks = await chunker.makeChunks(transcript);
          await embeddings.indexVideo(videoId, chunks, () => {});
          await parallelx.precompute(videoId, chunks, () => {});
        } catch (e) {
          // log only
          try { console.warn('auto-process failed:', e?.message || e); } catch {}
        }
      })();
      return respond(res, { text: 'Processing video in background. Try again in ~30s after initial transcript and indexing complete.', sourceChunks: [], creditUseEstimate: { tokensIn: 0, tokensOut: 0 } });
    }
    const result = await generator.qa({ videoId, query, timeRange, mode });
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'AI query failed' });
  }
});

router.post('/summary', async (req, res) => {
  try {
    const { videoId, level = 'short' } = req.body || {};
    if (!videoId) return res.status(400).json({ error: 'videoId required' });
    const result = await generator.summary({ videoId, level });
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Summary failed' });
  }
});

router.post('/notes', async (req, res) => {
  try {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ error: 'videoId required' });
    const result = await generator.notes({ videoId });
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Notes failed' });
  }
});

router.post('/flashcards', async (req, res) => {
  try {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ error: 'videoId required' });
    const result = await generator.flashcards({ videoId });
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Flashcards failed' });
  }
});

router.post('/quiz', async (req, res) => {
  try {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ error: 'videoId required' });
    const result = await generator.quiz({ videoId });
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Quiz failed' });
  }
});

router.post('/mindmap', async (req, res) => {
  try {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ error: 'videoId required' });
    const result = await generator.mindmap({ videoId });
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Mindmap failed' });
  }
});

router.post('/slice', async (req, res) => {
  try {
    const { videoId, start, end } = req.body || {};
    if (!videoId || typeof start !== 'number' || typeof end !== 'number') return res.status(400).json({ error: 'videoId, start, end required' });
    const result = await parallelx.fastSliceSummary(videoId, start, end);
    respond(res, result);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Slice failed' });
  }
});

// Provider health endpoint (for UI)
router.get('/health', async (_req, res) => {
  try {
    const h = await require('../../ai/providers/providerManager.cjs').health();
    res.json({ ok: true, ...h });
  } catch (e) { res.status(500).json({ ok: false, error: e?.message || 'health failed' }); }
});

module.exports = router;
