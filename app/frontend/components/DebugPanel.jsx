import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/env.js';

export default function DebugPanel() {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    async function checkHealth() {
      if (!isMounted) return;
      
      try {
        console.log('[DebugPanel] Checking API health...');
        
        // Direct backend call (bypasses Vite proxy in Electron)
        const apiBase = API_BASE_URL;
        const statusUrl = `${apiBase}/api/ai/status`;
        console.log('[DebugPanel] Fetching from:', statusUrl);
        
        // Create abort controller for timeout (increased to 10 seconds)
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          console.warn('[DebugPanel] Request timeout, aborting...');
          controller.abort();
        }, 10000); // Increased timeout to 10 seconds
        
        const res = await fetch(statusUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!isMounted) return;
        
        console.log('[DebugPanel] Response status:', res.status, res.statusText);
        
        // Check if response is actually JSON
        const contentType = res.headers.get('content-type') || '';
        console.log('[DebugPanel] Content-Type:', contentType);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[DebugPanel] Non-OK response:', errorText);
          if (!isMounted) return;
          throw new Error(`Health check failed: ${res.status} ${res.statusText} - ${errorText.substring(0, 100)}`);
        }
        
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          console.error('[DebugPanel] Non-JSON response:', text.substring(0, 200));
          if (!isMounted) return;
          throw new Error(`API returned non-JSON response: ${contentType}. Response: ${text.substring(0, 100)}`);
        }
        
        const data = await res.json();
        console.log('[DebugPanel] Health response:', data);
        
        if (!isMounted) return;
        
        setStatus({
          api: '✅ Connected',
          backend: '✅ Connected',
          groq: data.groq === 'ready' ? '✅ Ready' : data.groq === 'unavailable' ? '❌ Unavailable' : '❓ Unknown',
          lmstudio: data.lmstudio === 'ready' ? `✅ Ready (${data.lmstudioModel || 'connected'})` : data.lmstudio === 'unavailable' ? '❌ Unavailable' : '❓ Unknown',
        });
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        
        console.error('[DebugPanel] Health check failed:', err);
        const errorMessage = err.message || 'Unknown error';
        
        // Check if it's an abort error
        if (err.name === 'AbortError') {
          setStatus({
            api: '❌ Failed: Request timeout',
            backend: '❌ Cannot connect',
            groq: '❓ Unknown',
            lmstudio: '❓ Unknown',
          });
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setStatus({
            api: '❌ Failed: Backend not running',
            backend: '❌ Cannot connect',
            groq: '❓ Unknown',
            lmstudio: '❓ Unknown',
          });
        } else {
          setStatus({
            api: `❌ Failed: ${errorMessage.substring(0, 50)}`,
            backend: '❌ Cannot connect',
            groq: '❓ Unknown',
            lmstudio: '❓ Unknown',
          });
        }
        setLoading(false);
      }
    }
    
    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds instead of 5
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);
  
  const testVideoProcessing = async () => {
    try {
      console.log('[DebugPanel] Testing video processing...');
      const apiBase = API_BASE_URL;
      const res = await fetch(`${apiBase}/api/video/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://youtu.be/jNQXAC9IVRw', force: false }),
      });
      if (!res.ok) {
        throw new Error(`Processing failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log('[DebugPanel] Process response:', data);
      console.log('✅ Video processing started!');
    } catch (err) {
      console.error('[DebugPanel] Process failed:', err);
      console.error('❌ Video processing failed:', err.message);
    }
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'rgba(0,0,0,0.9)',
      color: '#0f0',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      minWidth: '300px',
      boxShadow: '0 4px 12px rgba(0,255,0,0.3)',
    }}>
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
        🔍 DEBUG PANEL
      </div>
      
      {loading ? (
        <div>⏳ Checking...</div>
      ) : (
        <>
          <div>API: {status.api}</div>
          <div>Backend: {status.backend}</div>
          <div>Groq: {status.groq}</div>
          <div>LM Studio: {status.lmstudio}</div>
          
          <button
            onClick={testVideoProcessing}
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: '#0f0',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            🧪 Test Video Processing
          </button>
        </>
      )}
    </div>
  );
}

