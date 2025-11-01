import React, { useEffect, useMemo, useState } from 'react';
import './TranscriptTools.css';

const API = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path, options){
  // Prefer relative first, then explicit base
  const bases = ['', import.meta.env.VITE_API_BASE || ''];
  let lastErr=null; for(const b of bases){ try{ const r = await fetch(`${b}${path}`, options); if(r.ok || r.status<500) return r; }catch(e){ lastErr=e; } }
  if (lastErr) throw lastErr; throw new Error('fetch failed');
}

function extractVideoId(input) {
  try {
    if (!input) return '';
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
    const u = new URL(input);
    const host = (u.hostname || '').replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') {
      id = (u.pathname || '').split('/').filter(Boolean)[0] || '';
    } else if (host.endsWith('youtube.com')) {
      id = u.searchParams.get('v') || '';
      if (!id) {
        const parts = (u.pathname || '').split('/').filter(Boolean);
        const embedIdx = parts.indexOf('embed');
        if (embedIdx >= 0 && parts[embedIdx + 1]) id = parts[embedIdx + 1];
        else if (parts[0] === 'shorts' && parts[1]) id = parts[1];
        else if (parts[0] === 'live' && parts[1]) id = parts[1];
      }
    }
    id = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 11);
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch {}
  return '';
}

export default function TranscriptTools() {
  const [url, setUrl] = useState('');
  const [fast, setFast] = useState(true);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const vid = useMemo(() => extractVideoId(url), [url]);

  useEffect(() => {
    const handler = (e) => {
      const id = e?.detail?.videoId || window.__edulensCurrentVideoId;
      if (id) setUrl((prev) => prev || `https://youtu.be/${id}`);
    };
    window.addEventListener('video:loaded', handler);
    // also try initial existing id
    handler();
    return () => window.removeEventListener('video:loaded', handler);
  }, []);

  const processVideo = async () => {
    if (!vid) return;
    setLoading(true);
    try {
      await apiFetch(`/api/video/process`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url: `https://youtu.be/${vid}` }) });
    } finally { setLoading(false); }
  };

  const ask = async () => {
    if (!vid || !question.trim()) return;
    setLoading(true); setAnswer('');
    try {
      const res = await apiFetch(`/api/ai/query`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId: vid, query: question, mode: fast ? 'fast' : undefined }) });
      const data = await res.json();
      setAnswer(data.text || data.response || JSON.stringify(data));
    } catch (e) { setAnswer('Error: '+e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:12, marginBottom:12}}>
      <div className="tt-row">
        <input className="tt-input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste YouTube URL or ID" />
        <button className="tt-btn" onClick={processVideo} disabled={!vid || loading}>Process</button>
        <button className="tt-btn secondary" onClick={() => { const id = window.__edulensCurrentVideoId; if (id) setUrl(`https://youtu.be/${id}`); }}>
          Use current
        </button>
      </div>
      {vid && (
        <div className="tt-row wrap">
          <span className="tt-badge">Current: {vid}</span>
          <a className="tt-link" href={`${API}/api/video/subtitles?videoId=${vid}&format=srt`} target="_blank" rel="noreferrer">Download SRT</a>
          <a className="tt-link" href={`${API}/api/video/subtitles?videoId=${vid}&format=vtt`} target="_blank" rel="noreferrer">Download VTT</a>
          <label className="tt-toggle">
            <input type="checkbox" checked={fast} onChange={e=>setFast(e.target.checked)} /> Quick timeline answers
          </label>
        </div>
      )}
      <div className="tt-row">
        <input className="tt-input" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask: what in first 10 minutes?" />
        <button className="tt-btn" onClick={ask} disabled={!vid || !question.trim() || loading}>Ask</button>
        <button className="tt-btn secondary" onClick={()=> setQuestion('what happens in the first 10 minutes?')}>First 10 min</button>
      </div>
      {answer && (
        <pre className="tt-answer">{answer}</pre>
      )}
    </div>
  );
}