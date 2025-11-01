const ytdl = require('ytdl-core');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

async function getVideoMeta(url) {
  const info = await ytdl.getInfo(url);
  const videoId = info.videoDetails.videoId;
  const title = info.videoDetails.title;
  const duration = parseInt(info.videoDetails.lengthSeconds, 10);
  const languageHint = 'en';
  return { videoId, title, duration, languageHint, url };
}

async function tryGetEnglishCaptions(videoId) {
  try {
    const mod = await import('youtube-transcript');
    const langPrefs = ['en', 'en-US', 'en-GB', 'hi'];
    let items = null;
    let used = null;
    for (const lang of langPrefs) {
      try {
        items = await mod.YoutubeTranscript.fetchTranscript(videoId, { lang });
        if (items?.length) { used = lang; break; }
      } catch {}
    }
    if (!items || !items.length) return null;
    const segments = items.map(it => ({
      start: (it.offset ?? it.start ?? 0),
      end: (it.offset ?? it.start ?? 0) + (it.duration ?? 0),
      text: it.text || ''
    }));
    const language = used && used.startsWith('hi') ? 'hi' : 'en';
    return { language, segments };
  } catch (e) {
    return null;
  }
}

async function downloadAudio(videoId, onProgress = () => {}) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const out = path.join(process.cwd(), `tmp-${videoId}.mp3`);
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { quality: 'highestaudio' });
    const total = 1000; // unknown size, simulate progress
    let count = 0;
    ffmpeg(stream)
      .audioBitrate(128)
      .save(out)
      .on('progress', p => { count++; if (count % 5 === 0) onProgress(Math.min(0.99, p.percent ? p.percent / 100 : count / total)); })
      .on('end', () => resolve(out))
      .on('error', reject);
  });
}

module.exports = { getVideoMeta, tryGetEnglishCaptions, downloadAudio };
