// src/services/transcript.js
// Fetch YouTube transcript with fallbacks. Returns [{text, start, dur}] or []
export async function fetchTranscript(videoId) {
  const tryEndpoints = [
    // Phase-4 backend transcript
    `/api/video/transcript?videoId=${videoId}`,
    // Public fallback (may be rate-limited/unstable)
    `https://youtubetranscript.iamthehuman.com/api/transcript/${videoId}`,
  ];
  for (const url of tryEndpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data.map(d => ({ text: d.text || d.tx || '', start: d.start || d.s || 0, dur: d.dur || d.d || 0 }));
      if (Array.isArray(data?.segments)) return data.segments.map(d => ({ text: d.text, start: d.start, dur: d.dur }));
    } catch {}
  }
  return [];
}

export function chunkTranscript(segments, maxChars = 800) {
  const chunks = [];
  let cur = '';
  for (const s of segments) {
    const t = (s.text || '').trim();
    if (!t) continue;
    if ((cur + ' ' + t).length > maxChars) {
      if (cur) chunks.push(cur.trim());
      cur = t;
    } else {
      cur = cur ? cur + ' ' + t : t;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}
