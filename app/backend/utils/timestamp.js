function toTimestamp(sec) {
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const m = Math.floor((sec / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(sec / 3600).toString();
  return h !== '0' ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function toSrtTimestamp(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2,'0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2,'0');
  const s = Math.floor(sec % 60).toString().padStart(2,'0');
  const ms = Math.floor((sec - Math.floor(sec)) * 1000).toString().padStart(3,'0');
  return `${h}:${m}:${s},${ms}`;
}

module.exports = { toTimestamp, toSrtTimestamp };
