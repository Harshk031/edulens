const path = require('path');
const fs = require('fs');
const ytApi = require('../../services/ytApi.cjs');
const whisper = require('../../services/whisper.cjs');
const translator = require('../../services/translator.cjs');

async function prepare(url, { forceRefresh = false } = {}) {
  const meta = await ytApi.getVideoMeta(url);
  return { ...meta, forceRefresh };
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
      const audioFile = await ytApi.downloadAudio(videoId, (p) => onProgress(0.1 + p * 0.6));
      const stt = await whisper.transcribe(audioFile, { language: 'auto' }, (p) => onProgress(0.7 + p * 0.2));
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