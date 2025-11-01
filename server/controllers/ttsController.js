import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { enqueueTTSJob, getJob, watchJob } from '../jobs/ttsQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = process.env.TTS_CACHE_DIR || path.join(__dirname, '..', 'cache', 'tts');
const JOB_DIR = path.join(CACHE_DIR, 'jobs');

function sha256(s){ return crypto.createHash('sha256').update(s).digest('hex'); }

export async function generateTTS(req, res){
  try{
    const { videoId='', text='', lang='en', voice='', speed=1.0, format='mp3' } = req.body || {};
    if (!videoId || !text) return res.status(400).json({ error: 'videoId and text required' });
    if (text.length > 3000) return res.status(400).json({ error: 'text too long (max 3000 chars)' });
    const hash = sha256([videoId, text, lang, voice, speed, format].join('|'));
    const dir = path.join(CACHE_DIR, videoId);
    const filePath = path.join(dir, `${hash}.${format}`);
    await fse.ensureDir(dir);
    await fse.ensureDir(JOB_DIR);

    if (fs.existsSync(filePath)){
      return res.json({ status:'ready', url:`/api/tts/stream?path=${encodeURIComponent(filePath)}`, filePath });
    }

    const jobId = await enqueueTTSJob({ videoId, text, lang, voice, speed, format, filePath });
    return res.json({ status:'queued', jobId });
  }catch(e){
    return res.status(500).json({ error: e.message });
  }
}

export async function jobStatus(req, res){
  try{
    const { jobId } = req.params;
    const j = getJob(jobId);
    if (!j) return res.status(404).json({ error: 'job not found' });
    return res.json({ jobId, status: j.status, progress: j.progress||0, filePath: j.filePath, error: j.error||null });
  }catch(e){ return res.status(500).json({ error: e.message }); }
}

export async function streamTTS(req, res){
  try{
    const p = req.query.path;
    if (!p) return res.status(400).send('path required');
    const filePath = path.resolve(p);
    if (!fs.existsSync(filePath)) return res.status(404).send('not found');
    const stat = fs.statSync(filePath);
    const range = req.headers.range;
    const contentType = filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
    if (range){
      const [startStr, endStr] = range.replace(/bytes=/,'').split('-');
      const start = parseInt(startStr,10);
      const end = endStr ? parseInt(endStr,10) : stat.size - 1;
      const chunkSize = (end - start) + 1;
      res.writeHead(206, { 'Content-Range':`bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges':'bytes', 'Content-Length':chunkSize, 'Content-Type':contentType });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    }
  }catch(e){ res.status(500).send(e.message); }
}