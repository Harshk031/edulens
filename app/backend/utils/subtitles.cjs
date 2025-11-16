const { toSrtTimestamp } = require('./timestamp.cjs');

function srtFromSegments(segments) {
  return segments.map((s, i) => {
    const start = toSrtTimestamp(s.start || 0);
    const end = toSrtTimestamp(s.end || (s.start || 0) + 2);
    const text = (s.text || '').replace(/\r/g,'').trim();
    return `${i+1}\n${start} --> ${end}\n${text}\n`;
  }).join('\n');
}

function vttFromSegments(segments) {
  const toVtt = (sec) => {
    const h = Math.floor(sec / 3600).toString().padStart(2,'0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2,'0');
    const s = Math.floor(sec % 60).toString().padStart(2,'0');
    const ms = Math.floor((sec - Math.floor(sec)) * 1000).toString().padStart(3,'0');
    return `${h}:${m}:${s}.${ms}`;
  };
  const body = segments.map((s) => `${toVtt(s.start||0)} --> ${toVtt(s.end || (s.start||0)+2)}\n${(s.text||'').replace(/\r/g,'').trim()}\n`).join('\n');
  return `WEBVTT\n\n${body}`;
}

module.exports = { srtFromSegments, vttFromSegments };