import { useEffect, useMemo, useState, useCallback } from 'react';

const API_BASE = 'http://localhost:5000';

export default function useHybridAI() {
  const [mode, setMode] = useState('offline'); // 'offline' | 'online'
  const [provider, setProvider] = useState('groq'); // for online mode
  const [status, setStatus] = useState({ offline: 'unknown', online: 'unknown' });
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const basePath = useMemo(() => `${API_BASE}/api/ai/${mode}`, [mode]);

  const checkStatus = useCallback(async () => {
    try {
      // offline health
      const off = await fetch(`${API_BASE}/api/ai/offline/health`).then(r => r.json());
      // online providers
      const on = await fetch(`${API_BASE}/api/ai/online/providers`).then(r => r.json());
      setStatus({ offline: off.status || 'unknown', online: 'ready' });
    } catch {
      setStatus({ offline: 'unknown', online: 'unknown' });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const sendChat = useCallback(async (content) => {
    setLoading(true);
    setError(null);
    try {
      const body = mode === 'offline'
        ? { messages: [...messages, { role: 'user', content }] }
        : { provider, messages: [...messages, { role: 'user', content }] };

      const res = await fetch(`${basePath}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'AI request failed');
      }

      setMessages(prev => [...prev, { role: 'user', content }]);

      if (mode === 'offline') {
        const aiMsg = data.message?.content || data.message?.text || data.response || '';
        setMessages(prev => [...prev, { role: 'assistant', content: aiMsg }]);
        setResult(aiMsg);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        setResult(data.content);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mode, basePath, provider, messages]);

  const summarize = useCallback(async (text) => {
    setLoading(true);
    setError(null);
    try {
      const body = mode === 'offline'
        ? { text }
        : { provider, text };

      const res = await fetch(`${basePath}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Summarization failed');
      setResult(data.summary || data.response);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mode, basePath, provider]);

  const quiz = useCallback(async (topic) => {
    setLoading(true);
    setError(null);
    try {
      const body = mode === 'offline' ? { topic } : { provider, topic };
      const res = await fetch(`${basePath}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Quiz failed');
      setResult(data.quiz || data.response);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mode, basePath, provider]);

  const mindmap = useCallback(async (topic) => {
    setLoading(true);
    setError(null);
    try {
      const body = mode === 'offline' ? { topic } : { provider, topic };
      const res = await fetch(`${basePath}/mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Mindmap failed');
      setResult(data.mindmap || data.response);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mode, basePath, provider]);

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
    actions: { sendChat, summarize, quiz, mindmap, checkStatus },
  };
}
