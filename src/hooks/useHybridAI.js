import { useEffect, useMemo, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || (typeof process !== 'undefined' ? process.env?.VITE_API_BASE : '') || '';

async function apiFetch(path, options) {
  // Prefer relative first (Vite proxy/Electron), then explicit API_BASE
  const bases = ['', API_BASE];
  let lastErr = null;
  for (const b of bases) {
    try {
      const res = await fetch(`${b}${path}`, options);
      if (res.ok || (res.status && res.status < 500)) return res;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  throw new Error('fetch failed');
}

export default function useHybridAI() {
  const [mode, setMode] = useState('offline'); // visual only; pipeline is unified
  const [provider, setProvider] = useState('ollama');
  const [status, setStatus] = useState({ offline: 'unknown', online: 'unknown' });
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [videoId, setVideoId] = useState('');

  useEffect(() => {
    const h = (e) => { const id = e?.detail?.videoId || window.__edulensCurrentVideoId; if (id) setVideoId(id); };
    window.addEventListener('video:loaded', h);
    h();
    return () => window.removeEventListener('video:loaded', h);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      // Prefer relative health to avoid stale ports; fall back to API_BASE
      let h;
      try { h = await fetch(`/health`).then(r=>r.json()); } catch {}
      if (!h) { h = await fetch(`${API_BASE}/health`).then(r=>r.json()); }
      if (h && (h.status === 'ok' || h.ok)) {
        setStatus({ offline: 'ready', online: 'ready' });
        return;
      }
      setStatus({ offline: 'unknown', online: 'unknown' });
    } catch { setStatus({ offline: 'unknown', online: 'unknown' }); }
  }, [API_BASE]);

  useEffect(() => {
    checkStatus();
    // soft health monitor with state-change logging
    let lastOk = null;
    const monitor = async () => {
      let ok = false;
      try { const r = await fetch(`/health`); ok = r.ok; } catch {}
      if (!ok && API_BASE) { try { const r2 = await fetch(`${API_BASE}/health`); ok = r2.ok; } catch {} }
      if (lastOk !== ok) {
        if (ok) console.log('✅ Backend healthy');
        else console.warn('⚠️ Backend temporarily unavailable');
        lastOk = ok;
      }
      setTimeout(monitor, ok ? 10000 : 5000);
    };
    monitor();
    return () => { lastOk = null; };
  }, [checkStatus]);

  const sendChat = useCallback(async (content) => {
    setLoading(true); setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/query`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, query: content, mode })
      });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'AI request failed');
      setMessages(prev => [...prev, { role:'user', content }, { role:'assistant', content: data.text || '' }]);
      setResult(data.text || '');
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }, [videoId, messages, mode]);

  const summarize = useCallback(async (level='short') => {
    setLoading(true); setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/summary`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, level, mode }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Summarization failed');
      setResult(data.text || '');
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }, [videoId]);

  const quiz = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/quiz`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, mode }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Quiz failed');
      setResult(data.text || '');
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }, [videoId]);

  const mindmap = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/mindmap`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, mode }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Mindmap failed');
      setResult(data.text || '');
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }, [videoId]);

  const notes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/notes`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, mode }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Notes failed');
      setResult(data.text || '');
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }, [videoId]);

  const flashcards = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/flashcards`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, mode }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Flashcards failed');
      setResult(data.text || '');
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  }, [videoId]);

  return {
    mode,
    setMode,
    provider,
    setProvider,
    status,
    loading,
    messages,
    result,
    error,
    actions: { sendChat, summarize, quiz, mindmap, notes, flashcards, checkStatus },
  };
}
