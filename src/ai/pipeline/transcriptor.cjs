const path = require('path');
const fs = require('fs');
const ytApi = require('../../services/ytApi.cjs');
const whisper = require('../../services/whisper.cjs');
const translator = require('../../services/translator.cjs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const os = require('os');
const cfg = require('../../../config/parallelx.config.cjs');

async function prepare(url, { forceRefresh = false } = {}) {
  const meta = await ytApi.getVideoMeta(url);
  return { ...meta, forceRefresh };
}

async function parallelWhisper(audioFile, meta, onProgress = () => {}) {
  const { videoId, duration } = meta;
  const seg = Math.max(60, Math.min(cfg.transcription?.segmentSec || 180, Math.ceil((duration || 1800) / 8)));
  const overlap = cfg.transcription?.overlapSec || 2;
  const dir = process.cwd();
  const pattern = path.join(dir, `tmp-${videoId}-part-%03d.mp3`);
  // split
  await new Promise((resolve, reject) => {
    ffmpeg(audioFile)
      .outputOptions([
        '-f', 'segment',
        '-segment_time', String(seg),
        '-reset_timestamps', '1',
        '-map', '0:a'
      ])
      .on('error', reject)
      .on('end', resolve)
      .save(pattern);
  });
  // collect parts
  const parts = fs.readdirSync(dir)
    .filter(f => f.startsWith(`tmp-${videoId}-part-`) && f.endsWith('.mp3'))
    .sort();
  const whisper = require('../../services/whisper.cjs');
  const conc = Math.max(1, cfg.transcription?.concurrency || 4);
  let done = 0;
  const results = [];
  async function worker(file, idx) {
    const offset = idx * seg;
    const r = await whisper.transcribe(path.join(dir, file), { language: 'auto' }, (p) => {
      onProgress(0.7 + ((done + p) / parts.length) * 0.2);
    });
    // adjust
    const segs = (r.segments || []).map(s => ({ start: s.start + Math.max(0, offset - overlap), end: s.end + Math.max(0, offset - overlap), text: s.text }));
    results.push(...segs);
    done += 1; onProgress(0.7 + (done / parts.length) * 0.2);
    try { fs.unlinkSync(path.join(dir, file)); } catch {}
  }
  // run with limited concurrency
  let i = 0; const running = [];
  while (i < parts.length || running.length) {
    while (i < parts.length && running.length < conc) {
      running.push(worker(parts[i], i)); i++;
    }
    await Promise.race(running).catch(()=>{});
    // remove settled
    for (let k = running.length - 1; k >= 0; k--) {
      if (running[k].settled || running[k].status === 'fulfilled' || running[k].status === 'rejected') running.splice(k,1);
      else if (typeof running[k].finally === 'function') {
        running[k] = running[k].finally(() => { running[k].settled = true; });
      }
    }
  }
  results.sort((a,b)=>a.start-b.start);
  return { language: 'en', segments: results };
}

async function getOrCreateTranscript(meta, onProgress = () => {}) {
  const { videoId, duration } = meta;
  const outFile = path.join(__dirname, '..', '..', 'storage', 'transcripts', `${videoId}.json`);
  if (fs.existsSync(outFile) && !meta.forceRefresh) {
    return JSON.parse(fs.readFileSync(outFile, 'utf-8'));
  }

  let transcript = await ytApi.tryGetEnglishCaptions(videoId);

  if (!transcript) {
    try {
      onProgress(0.1);
      const audioFile = await ytApi.downloadAudio(videoId, (p) => onProgress(0.1 + p * 0.5));
      // Parallel Whisper
      const stt = await parallelWhisper(audioFile, meta, (p) => onProgress(p));
      transcript = stt;
    } catch (e) {
      // could not download/stt; keep empty transcript
      transcript = { language: 'en', segments: [] };
    }
  }

  let language = transcript.language || 'en';
  let originalLanguage = language;
  let originalSegments = null;
  if (language !== 'en') {
    const before = transcript;
    const eng = await translator.toEnglish(transcript);
    transcript = eng.transcript;
    language = 'en';
    originalSegments = before.segments || null;
  }

  // Determine duration from segments if needed
  const segs = transcript.segments || [];
  const inferredDuration = segs.length ? Math.max(...segs.map(s => s.end || 0)) : (duration || 0);

  const canonical = {
    videoId,
    language,
    originalLanguage,
    duration: inferredDuration || duration || 0,
    segments: segs,
    originalSegments
  };

  fs.writeFileSync(outFile, JSON.stringify(canonical, null, 2));
  return canonical;
}

module.exports = { prepare, getOrCreateTranscript };