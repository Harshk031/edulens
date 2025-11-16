import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../utils/env.js';

const API_BASE = API_BASE_URL;

async function apiFetch(path, options) {
  // Use relative URL - Vite dev server will proxy to backend
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  let bodyLog = 'no body';
  if (options?.body) {
    try {
      bodyLog = JSON.parse(options.body);
    } catch {
      bodyLog = options.body.substring(0, 100);
    }
  }
  console.log(`[useHybridAI] API Call: ${url}`, bodyLog);
  
  const res = await fetch(url, options);
  
  // Log response for debugging
  console.log(`[useHybridAI] API Response: ${res.status} ${res.statusText}`);
  
  return res;
}

export default function useHybridAI() {
  const [provider, setProvider] = useState('groq'); // 'groq' or 'lmstudio' - Groq is default for best quality
  const [status, setStatus] = useState({ lmstudio: 'unknown', groq: 'unknown', lmstudioModel: 'gemma-2-9b' });
  const [language, setLanguage] = useState('english'); // 'english' or 'hindi' - user's preferred output language
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
      console.log('[useHybridAI] Checking AI provider status...');
      const response = await apiFetch('/api/ai/status');
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('[useHybridAI] Status API returned non-JSON response, using fallback');
        setStatus({ lmstudio: 'ready', groq: 'unavailable', lmstudioModel: 'gemma-2-9b' });
        return;
      }
      
      if (!response.ok) {
        console.warn(`[useHybridAI] Status API returned ${response.status}, using fallback`);
        setStatus({ lmstudio: 'ready', groq: 'unavailable', lmstudioModel: 'gemma-2-9b' });
        return;
      }
      
      const h = await response.json();
      if (h && (h.lmstudio || h.groq)) {
        const newStatus = {
          lmstudio: h.lmstudio === 'ready' ? 'ready' : 'unavailable',
          groq: h.groq === 'ready' ? 'ready' : 'unavailable',
          lmstudioModel: h.lmstudioModel || 'gemma-2-9b'
        };
        console.log('[useHybridAI] Provider status:', {
          lmstudio: newStatus.lmstudio,
          groq: newStatus.groq,
          model: newStatus.lmstudioModel
        });
        setStatus(newStatus);
        
        // ENHANCED FIX: Auto-switch if current provider is unavailable
        if (provider === 'groq' && newStatus.groq === 'unavailable' && newStatus.lmstudio === 'ready') {
          console.log('[useHybridAI] Auto-switching to LM Studio since Groq is unavailable');
          setProvider('lmstudio');
        } else if (provider === 'lmstudio' && newStatus.lmstudio === 'unavailable' && newStatus.groq === 'ready') {
          console.log('[useHybridAI] Auto-switching to Groq since LM Studio is unavailable');
          setProvider('groq');
        }
        
        return;
      }
      setStatus({ lmstudio: 'unknown', groq: 'unknown', lmstudioModel: 'gemma-2-9b' });
    } catch (error) {
      console.error('[useHybridAI] Status check failed:', error);
      setStatus({ lmstudio: 'unknown', groq: 'unknown', lmstudioModel: 'gemma-2-9b' });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Soft health monitor with state-change logging
    let lastOk = null;
    let timeoutId = null;
    const monitor = async () => {
      let ok = false;
      try { 
        const r = await apiFetch('/api/ai/health'); 
        ok = r.ok; 
      } catch (e) { 
        // Silently ignore - backend might be starting
        ok = false;
      }
      if (lastOk !== ok) {
        if (ok) 
          console.log('Backend is now available');
        else 
          console.warn('Backend temporarily unavailable');
        lastOk = ok;
      }
      timeoutId = setTimeout(monitor, ok ? 10000 : 5000);
    };
    monitor();
    return () => { 
      lastOk = null;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkStatus]);

  const sendChat = useCallback(async (content) => {
    console.log(`[useHybridAI] sendChat called with content: "${content}", videoId: "${videoId}", provider: "${provider}"`);
    setLoading(true);
    setError(null);
    try {
      if (!videoId) {
        console.error('[useHybridAI] No video loaded, videoId is:', videoId);
        throw new Error('No video loaded');
      }
      
      console.log(`[useHybridAI] Sending chat with provider: ${provider}, language: ${language}`);
      const res = await apiFetch(`/api/ai/query`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, query: content, provider, outputLanguage: language })
      });
      
      // CRITICAL FIX: Check status and content-type BEFORE parsing JSON
      const contentType = res.headers.get('content-type') || '';
      
      if (!res.ok) {
        let errorText = '';
        try {
          const text = await res.text();
          if (contentType.includes('application/json') && text) {
            const errorData = JSON.parse(text);
            errorText = errorData.error || `API error (${res.status}): ${res.statusText}`;
          } else {
            errorText = text || `API error (${res.status}): ${res.statusText}`;
          }
        } catch (e) {
          errorText = `API error (${res.status}): ${res.statusText}`;
        }
        throw new Error(errorText);
      }
      
      // CRITICAL FIX: Check content-type before parsing JSON
      let data;
      if (contentType.includes('application/json')) {
        try {
          const text = await res.text();
          if (!text || text.trim().length === 0) {
            throw new Error('Empty response from backend');
          }
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error('[useHybridAI] JSON parse error:', parseErr);
          throw new Error(`Invalid JSON response from backend: ${parseErr.message}. Backend server may be down.`);
        }
      } else {
        const text = await res.text();
        console.error('[useHybridAI] Non-JSON response:', text.substring(0, 200));
        throw new Error(`Backend returned non-JSON response (${contentType}). Backend server may be down.`);
      }
      
      // ENHANCED FIX: Check if provider was switched and inform user
      const actualProvider = data.provider || provider;
      if (actualProvider !== provider) {
        console.log(`[useHybridAI] ⚠️ Provider switched: requested ${provider}, got ${actualProvider}`);
        // Add system message about provider switch
        const switchMessage = `Note: Due to ${provider} being unavailable, I've switched to ${actualProvider} for this response.`;
        setMessages(prev => [...prev,
          { role:'user', content },
          { role:'system', content: switchMessage },
          { role:'assistant', content: data.text || '' }
        ]);
      } else {
        setMessages(prev => [...prev, { role:'user', content }, { role:'assistant', content: data.text || '' }]);
      }
      
      setResult(data.text || '');
      console.log(`[useHybridAI] Chat completed successfully, result length: ${(data.text || '').length}`);
    } catch(e){
      console.error('[useHybridAI] Chat error:', e);
      setError(e.message);
    } finally { 
      console.log('[useHybridAI] Setting loading to false');
      setLoading(false); 
    }
  }, [videoId, provider, language]);

  const summarize = useCallback(async (level='short') => {
    setLoading(true);
    setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      
      console.log(`[useHybridAI] Generating summary with provider: ${provider}, language: ${language}`);
      const res = await apiFetch(`/api/ai/summary`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, level, provider, outputLanguage: language }) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||'Summarization failed');
      
      // ENHANCED FIX: Check if provider was switched
      const actualProvider = data.provider || provider;
      if (actualProvider !== provider) {
        console.log(`[useHybridAI] ⚠️ Provider switched in summary: requested ${provider}, got ${actualProvider}`);
        setResult(`Note: Used ${actualProvider} instead of ${provider} due to availability.\n\n${data.text || ''}`);
      } else {
        setResult(data.text || '');
      }
    } catch(e){
      console.error('Summary error:', e);
      setError(e.message);
    } finally { setLoading(false); }
  }, [videoId, provider]);

  const quiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      
      const res = await apiFetch(`/api/ai/quiz`, { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ videoId, provider, outputLanguage: language }) 
      });
      const data = await res.json(); 
      
      if(!res.ok) {
        console.error('Quiz API error:', data);
        throw new Error(data.error||'Quiz generation failed');
      }
      
      setResult(data.text || data.quiz || 'Quiz generated');
    } catch(e){ 
      console.error('Quiz error:', e);
      setError(e.message); 
    } finally { setLoading(false); }
  }, [videoId, provider]);

  const mindmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/mindmap`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, provider, outputLanguage: language }) });
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Mindmap failed');
      setResult(data.text || '');
    } catch(e){ 
      setError(e.message); 
    } finally { setLoading(false); }
  }, [videoId, provider]);

  const notes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      const res = await apiFetch(`/api/ai/notes`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ videoId, provider, outputLanguage: language }) });
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Notes failed');
      setResult(data.text || '');
    } catch(e){ 
      setError(e.message); 
    } finally { setLoading(false); }
  }, [videoId, provider]);

  const flashcards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!videoId) throw new Error('No video loaded');
      
      const res = await apiFetch(`/api/ai/flashcards`, { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ videoId, provider, outputLanguage: language }) 
      });
      const data = await res.json(); 
      
      if(!res.ok) {
        console.error('Flashcards API error:', data);
        throw new Error(data.error||'Flashcards generation failed');
      }
      
      setResult(data.text || data.flashcards || 'Flashcards generated');
    } catch(e){ 
      console.error('Flashcards error:', e);
      setError(e.message); 
    } finally { setLoading(false); }
  }, [videoId, provider, language]);

  const actions = { sendChat, summarize, quiz, mindmap, notes, flashcards, checkStatus };
  
  console.log('[useHybridAI] Returning hook with actions:', Object.keys(actions), 'videoId:', videoId);

  return {
    provider,
    setProvider,
    language,
    setLanguage,
    status,
    loading,
    messages,
    result,
    error,
    videoId,
    actions
  };
}