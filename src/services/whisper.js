const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

async function toWav16k(inputPath) {
  const out = inputPath.replace(/\.[^.]+$/, '') + '-16k.wav';
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .format('wav')
      .save(out)
      .on('end', resolve)
      .on('error', reject);
  });
  return out;
}

async function transcribe(audioFile, { language = 'auto' } = {}, onProgress = () => {}) {
  const bin = process.env.WHISPER_CPP_BIN; // e.g., C:\\whisper.cpp\\main.exe
  const model = process.env.WHISPER_MODEL; // e.g., ggml-base.en.bin
  // Prefer whisper.cpp if configured
  if (bin && model) {
    const wav = await toWav16k(audioFile);
    const outJson = wav + '.json';
    return new Promise((resolve, reject) => {
      const args = ['-f', wav, '-m', model, '-oj'];
      if (language && language !== 'auto') { args.push('-l', language); }
      const child = spawn(bin, args);
      child.on('error', reject);
      child.stderr.on('data', () => {});
      child.on('close', (code) => {
        try {
          if (!fs.existsSync(outJson)) return resolve({ language: 'en', segments: [] });
          const data = JSON.parse(fs.readFileSync(outJson, 'utf-8'));
          const segments = (data.segments || []).map(s => ({ start: s.t0 / 100.0, end: s.t1 / 100.0, text: s.text || '' }));
          onProgress(1);
          try { fs.unlinkSync(wav); } catch {}
          try { fs.unlinkSync(outJson); } catch {}
          resolve({ language: data.language || 'en', segments });
        } catch (e) { try { fs.unlinkSync(wav); } catch {}; try { fs.unlinkSync(outJson); } catch {}; resolve({ language: 'en', segments: [] }); }
      });
    });
  }

  // Fallback: OpenAI Whisper API if OPENAI_API_KEY set
  if (process.env.OPENAI_API_KEY) {
    const axios = require('axios');
    const FormData = require('form-data');
    const fd = new FormData();
    fd.append('file', fs.createReadStream(audioFile));
    fd.append('model', 'whisper-1');
    if (language && language !== 'auto') fd.append('language', language);
    const r = await axios.post('https://api.openai.com/v1/audio/transcriptions', fd, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...fd.getHeaders() },
      timeout: 300000
    });
    // r.data.text is the raw transcript without timestamps; not ideal. Return single segment
    onProgress(1);
    return { language: language === 'auto' ? 'en' : language, segments: [{ start: 0, end: 0, text: r.data.text || '' }] };
  }

  onProgress(1);
  return { language: 'en', segments: [] };
}

module.exports = { transcribe };
