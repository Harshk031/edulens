const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
// Note: updateJob is passed as parameter to avoid circular dependency

ffmpeg.setFfmpegPath(ffmpegPath);

async function googleTTS({ text, lang, voice, speed, outPath }){
  const keyPath = process.env.GOOGLE_TTS_KEY_PATH;
  if (!keyPath) throw new Error('GOOGLE_TTS_KEY_PATH not set');
  const { TextToSpeechClient } = await import('@google-cloud/text-to-speech');
  const client = new TextToSpeechClient({ keyFilename: keyPath });
  const request = {
    input: { text },
    voice: { languageCode: lang==='hi'?'hi-IN':'en-US', name: voice || undefined },
    audioConfig: { audioEncoding: 'MP3', speakingRate: Math.max(0.25, Math.min(4, Number(speed)||1)) }
  };
  const [response] = await client.synthesizeSpeech(request);
  await fse.writeFile(outPath, response.audioContent, { encoding: 'binary' });
  return outPath;
}

async function powershellTTS({ text, lang, speed, tmpWav }){
  // Windows offline fallback using System.Speech
  const rate = Math.round(((Number(speed)||1)-1)*5);
  const escaped = text.replace(/`/g,'``').replace(/"/g,'\"');
  const ps = `Add-Type -AssemblyName System.Speech; $s=new-object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=${rate}; $s.Volume=100; $s.SetOutputToWaveFile(\"${tmpWav}\"); $s.Speak(\"${escaped}\"); $s.Dispose();`;
  const { spawn } = await import('child_process');
  await new Promise((resolve, reject)=>{
    const p = spawn('powershell.exe',['-NoProfile','-Command',ps]);
    p.on('error', reject); p.on('exit', (c)=> c===0?resolve():reject(new Error('ps tts failed')));
  });
  return tmpWav;
}

async function convertWavToMp3(wavPath, outPath){
  await new Promise((resolve, reject)=>{
    ffmpeg(wavPath).toFormat('mp3').on('end', resolve).on('error', reject).save(outPath);
  });
}

async function startWorker({ jobId, jobs, updateJob }){
  const job = jobs.get(jobId);
  if (!job) return;
  try{
    updateJob(jobId, { status:'in-progress', progress:5 });
    await fse.ensureDir(path.dirname(job.filePath));
    const useGoogle = !!process.env.GOOGLE_TTS_KEY_PATH && process.env.TTS_OFFLINE !== 'true';
    if (useGoogle){
      await googleTTS({ text: job.text, lang: job.lang, voice: job.voice, speed: job.speed, outPath: job.filePath });
      updateJob(jobId, { status:'done', progress:100 });
      return;
    }
    // Offline fallback via System.Speech -> wav -> mp3
    const tmpWav = job.filePath.replace(/\.[^.]+$/, '') + '.wav';
    await powershellTTS({ text: job.text, lang: job.lang, speed: job.speed, tmpWav });
    if (job.filePath.endsWith('.mp3')){
      await convertWavToMp3(tmpWav, job.filePath);
      try{ fs.unlinkSync(tmpWav); }catch{}
    } else {
      fs.renameSync(tmpWav, job.filePath);
    }
    updateJob(jobId, { status:'done', progress:100 });
  }catch(e){
    updateJob(jobId, { status:'failed', error: e.message, progress:100 });
  }
}

module.exports = {
  startWorker
};