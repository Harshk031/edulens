const express = require('express');
const router = express.Router();
const generator = require('../../ai/pipeline/generator');
const retriever = require('../../ai/pipeline/retriever');
const parallelx = require('../../ai/pipeline/parallelx');

const respond = (res, payload) => res.json({ ...payload, creditUseEstimate: payload.creditUseEstimate || { tokensIn: 0, tokensOut: 0 }, sourceChunks: payload.sourceChunks || [] });

router.post('/query', async (req, res) => {
  const { videoId, query, timeRange, mode } = req.body || {};
  if (!videoId || !query) return res.status(400).json({ error: 'videoId and query required' });
  const result = await generator.qa({ videoId, query, timeRange, mode });
  respond(res, result);
});

router.post('/summary', async (req, res) => {
  const { videoId, level = 'short' } = req.body || {};
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const result = await generator.summary({ videoId, level });
  respond(res, result);
});

router.post('/notes', async (req, res) => {
  const { videoId } = req.body || {};
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const result = await generator.notes({ videoId });
  respond(res, result);
});

router.post('/flashcards', async (req, res) => {
  const { videoId } = req.body || {};
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const result = await generator.flashcards({ videoId });
  respond(res, result);
});

router.post('/quiz', async (req, res) => {
  const { videoId } = req.body || {};
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const result = await generator.quiz({ videoId });
  respond(res, result);
});

router.post('/mindmap', async (req, res) => {
  const { videoId } = req.body || {};
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const result = await generator.mindmap({ videoId });
  respond(res, result);
});

router.post('/slice', async (req, res) => {
  const { videoId, start, end } = req.body || {};
  if (!videoId || typeof start !== 'number' || typeof end !== 'number') return res.status(400).json({ error: 'videoId, start, end required' });
  const result = await parallelx.fastSliceSummary(videoId, start, end);
  respond(res, result);
});

module.exports = router;
