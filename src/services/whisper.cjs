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
  const bin = process.env.WHISPER_CPP_BIN; // path to whisper.cpp main.exe
  const model = process.env.WHISPER_MODEL;  // ggml-base.en.bin
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
          // Whisper.cpp uses 'transcription' array with 'offsets' (in milliseconds)
          const segments = (data.transcription || []).map(s => ({
            start: (s.offsets?.from || 0) / 1000.0,
            end: (s.offsets?.to || 0) / 1000.0,
            text: (s.text || '').trim()
          }));
          onProgress(1);
          const detectedLang = data.params?.language || 'en';
          try { fs.unlinkSync(wav); } catch {}
          try { fs.unlinkSync(outJson); } catch {}
          resolve({ language: detectedLang, segments });
        } catch (e) {
          console.error('Whisper parse error:', e);
          try { fs.unlinkSync(wav); } catch {}
          try { fs.unlinkSync(outJson); } catch {}
          resolve({ language: 'en', segments: [] });
        }
      });
    });
  }

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
    onProgress(1);
    return { language: language === 'auto' ? 'en' : language, segments: [{ start: 0, end: 0, text: r.data.text || '' }] };
  }

  onProgress(1);
  return { language: 'en', segments: [] };
}

module.exports = { transcribe };