const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const transcriptor = require('../../ai/pipeline/transcriptor');
const chunker = require('../../ai/pipeline/chunker');
const embeddings = require('../../ai/pipeline/embeddings');
const parallelx = require('../../ai/pipeline/parallelx');

// In-memory job store
const jobs = new Map();

router.post('/process', async (req, res) => {
  const { url, forceRefresh = false } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const jobId = uuidv4();
    jobs.set(jobId, { status: 'queued', progress: 0, videoId: null, error: null });
    res.json({ jobId });

    // Async pipeline
    (async () => {
      try {
        jobs.set(jobId, { ...jobs.get(jobId), status: 'initializing', progress: 5 });
        const meta = await transcriptor.prepare(url, { forceRefresh });
        const { videoId } = meta;
        jobs.set(jobId, { ...jobs.get(jobId), videoId });

        const transcript = await transcriptor.getOrCreateTranscript(meta, (p) => jobs.set(jobId, { ...jobs.get(jobId), status: 'transcribing', progress: 5 + Math.floor(p * 30) }));

        const chunks = await chunker.makeChunks(transcript);
        jobs.set(jobId, { ...jobs.get(jobId), status: 'chunking', progress: 40 });

        await embeddings.indexVideo(videoId, chunks, (p) => jobs.set(jobId, { ...jobs.get(jobId), status: 'embedding', progress: 40 + Math.floor(p * 30) }));

        await parallelx.precompute(videoId, chunks, (p) => jobs.set(jobId, { ...jobs.get(jobId), status: 'parallelx', progress: 70 + Math.floor(p * 20) }));

        jobs.set(jobId, { ...jobs.get(jobId), status: 'completed', progress: 100 });
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
  if (jobId && jobs.has(jobId)) return res.json(jobs.get(jobId));
  if (videoId) {
    // find latest job with this videoId
    const last = Array.from(jobs.entries()).reverse().find(([, j]) => j.videoId === videoId);
    if (last) return res.json(last[1]);
  }
  return res.status(404).json({ error: 'job not found' });
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
  const sub = format === 'vtt' ? require('../../utils/subtitles').vttFromSegments(segments) : require('../../utils/subtitles').srtFromSegments(segments);
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
