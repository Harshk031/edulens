const path = require('path');
const fs = require('fs');
const ytApi = require('../../services/ytApi');
const whisper = require('../../services/whisper');
const translator = require('../../services/translator');

async function prepare(url, { forceRefresh = false } = {}) {
  const meta = await ytApi.getVideoMeta(url);
  return { ...meta, forceRefresh };
}

async function getOrCreateTranscript(meta, onProgress = () => {}) {
  const { videoId, duration, languageHint } = meta;
  const outFile = path.join(__dirname, '..', '..', 'storage', 'transcripts', `${videoId}.json`);
  if (fs.existsSync(outFile) && !meta.forceRefresh) {
    return JSON.parse(fs.readFileSync(outFile, 'utf-8'));
  }

  // Try YouTube captions first (English)
  let transcript = await ytApi.tryGetEnglishCaptions(videoId);

  if (!transcript) {
    onProgress(0.1);
    const audioFile = await ytApi.downloadAudio(videoId, (p) => onProgress(0.1 + p * 0.6));
    const stt = await whisper.transcribe(audioFile, { language: 'auto' }, (p) => onProgress(0.7 + p * 0.2));
    transcript = stt;
  }

  // Normalize and translate to English if needed
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

  const canonical = {
    videoId,
    language,
    originalLanguage,
    duration,
    segments: transcript.segments || [],
    originalSegments
  };

  fs.writeFileSync(outFile, JSON.stringify(canonical, null, 2));
  return canonical;
}

module.exports = { prepare, getOrCreateTranscript };
