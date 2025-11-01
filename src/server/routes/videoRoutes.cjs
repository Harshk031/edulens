const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger.cjs');
const transcriptor = require('../../ai/pipeline/transcriptor.cjs');
const chunker = require('../../ai/pipeline/chunker.cjs');
const embeddings = require('../../ai/pipeline/embeddings.cjs');
const parallelx = require('../../ai/pipeline/parallelx.cjs');
const generator = require('../../ai/pipeline/generator.cjs');

// In-memory job store
const jobs = new Map();

router.post('/process', async (req, res) => {
  const { url, forceRefresh = false } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const jobId = uuidv4();
    const startTs = Date.now();
    jobs.set(jobId, { status: 'queued', stage: 'Queued', progress: 0, videoId: null, error: null, startTs });
    res.json({ jobId });

    // Async pipeline
    (async () => {
      const stageStart = (name) => { return { name, ts: Date.now() }; };
      const finishStage = (st) => { const ms = Date.now() - st.ts; console.log(`[Stage] ${st.name} ${ms}ms`); };
      try {
        jobs.set(jobId, { ...jobs.get(jobId), status: 'processing', stage: 'Initializing', progress: 5 });
        let st = stageStart('prepare');
        const meta = await transcriptor.prepare(url, { forceRefresh });
        finishStage(st);
        const { videoId } = meta;
        jobs.set(jobId, { ...jobs.get(jobId), videoId });

        st = stageStart('transcribe');
        const transcript = await transcriptor.getOrCreateTranscript(meta, (p) => jobs.set(jobId, { ...jobs.get(jobId), status: 'processing', stage: 'Transcribing', progress: 5 + Math.floor(p * 30) }));
        finishStage(st);

        st = stageStart('chunk');
        const chunks = await chunker.makeChunks(transcript);
        finishStage(st);
        jobs.set(jobId, { ...jobs.get(jobId), status: 'processing', stage: 'Structuring', progress: 40 });

        st = stageStart('embed');
        await embeddings.indexVideo(videoId, chunks, (p) => jobs.set(jobId, { ...jobs.get(jobId), status: 'processing', stage: 'Indexing', progress: 40 + Math.floor(p * 30) }));
        finishStage(st);

        st = stageStart('parallelx');
        await parallelx.precompute(videoId, chunks, (p) => jobs.set(jobId, { ...jobs.get(jobId), status: 'processing', stage: 'Context Building', progress: 70 + Math.floor(p * 10) }));
        finishStage(st);

        st = stageStart('summary');
        const summary = await generator.summary({ videoId, level: 'detailed' });
        finishStage(st);
        // store summary
        try {
          const out = path.join(__dirname, '..', '..', 'storage', 'sessions', `${videoId}-summary.json`);
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, JSON.stringify({ text: summary.text, at: Date.now() }, null, 2));
        } catch {}

        jobs.set(jobId, { ...jobs.get(jobId), status: 'done', stage: 'Ready', progress: 100, elapsed: Math.floor((Date.now()-startTs)/1000) });
        // persist index metadata
        try {
          const indexFile = path.join(__dirname, '..', '..', 'storage', 'index.json');
          const indexData = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf-8')) : { videos: [] };
          const existingIdx = indexData.videos.findIndex(v => v.videoId === videoId);
          const metaEntry = { videoId, processedAt: Date.now() };
          if (existingIdx >= 0) indexData.videos[existingIdx] = metaEntry; else indexData.videos.push(metaEntry);
          fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
        } catch (e) { logger.warn('index write failed', e.message); }
      } catch (err) {
        logger.error(err);
        jobs.set(jobId, { ...jobs.get(jobId), status: 'error', error: err.message });
      }
    })();
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ error: 'failed to enqueue job' });
  }
});

router.get('/status', (req, res) => {
  const { jobId, videoId } = req.query;
  const serialize = (j) => ({ status: j.status, stage: j.stage, progress: j.progress, videoId: j.videoId, error: j.error, elapsed: j.elapsed || (j.startTs ? Math.floor((Date.now()-j.startTs)/1000) : 0) });
  if (jobId && jobs.has(jobId)) return res.json(serialize(jobs.get(jobId)));
  if (videoId) {
    const last = Array.from(jobs.entries()).reverse().find(([, j]) => j.videoId === videoId);
    if (last) return res.json(serialize(last[1]));
  }
  return res.json({ status:'idle', stage:'Idle', progress:0, videoId: videoId || null, elapsed:0 });
});

router.get('/transcript', (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const file = path.join(__dirname, '..', '..', 'storage', 'transcripts', `${videoId}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  res.setHeader('Content-Type', 'application/json');
  fs.createReadStream(file).pipe(res);
});

router.get('/subtitles', (req, res) => {
  const { videoId, format = 'srt', lang = 'en' } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const file = path.join(__dirname, '..', '..', 'storage', 'transcripts', `${videoId}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  const t = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const segments = (lang === 'orig' && Array.isArray(t.originalSegments)) ? t.originalSegments : t.segments;
  const subs = require('../../utils/subtitles.cjs');
  const sub = format === 'vtt' ? subs.vttFromSegments(segments) : subs.srtFromSegments(segments);
  res.setHeader('Content-Type', format === 'vtt' ? 'text/vtt' : 'application/x-subrip');
  return res.send(sub);
});

// admin: purge a video's cached artifacts
router.post('/purge', (req, res) => {
  const { videoId } = req.body || {};
  if (!videoId) return res.status(400).json({ error: 'videoId required' });
  const base = path.join(__dirname, '..', '..', 'storage');
  const files = [
    path.join(base, 'transcripts', `${videoId}.json`),
    path.join(base, 'embeddings', `${videoId}.json`),
    path.join(base, 'sessions', `${videoId}-parallelx.json`),
  ];
  const removed = [];
  files.forEach(f => { if (fs.existsSync(f)) { fs.unlinkSync(f); removed.push(path.basename(f)); } });
  res.json({ ok: true, removed });
});

module.exports = router;
