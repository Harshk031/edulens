import React, { useEffect, useState } from 'react';

export default function TranscriptProgress({ videoId }) {
  const [status, setStatus] = useState({ status: 'idle', stage: 'Idle', progress: 0, elapsed: 0 });

  useEffect(() => {
    let timer;
    let lastStatus = 'idle';
    const fetchStatus = async () => {
      if (!videoId) return;
      try {
        const r = await fetch(`/api/video/status?videoId=${encodeURIComponent(videoId)}`);
        if (r.ok) {
          const j = await r.json();
          setStatus(j);
          // If idle, check whether transcript exists; if not, start processing automatically
          if (j.status === 'idle') {
            try {
              const t = await fetch(`/api/video/transcript?videoId=${encodeURIComponent(videoId)}`);
              if (t.status === 404) {
                await fetch('/api/video/process', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url: `https://youtu.be/${videoId}` }) });
              }
            } catch {}
          }
          // Fire event when processing completes the first time
          if ((lastStatus === 'processing' || lastStatus === 'queued') && j.status === 'done') {
            try { window.dispatchEvent(new CustomEvent('transcript:ready', { detail: { videoId } })); } catch {}
          }
          lastStatus = j.status;
          const interval = (j.status==='processing' || j.status==='queued') ? 2000 : 8000;
          timer = setTimeout(fetchStatus, interval);
          return;
        }
      } catch {}
      timer = setTimeout(fetchStatus, 5000);
    };
    fetchStatus();
    return () => timer && clearTimeout(timer);
  }, [videoId]);

  if (!videoId || (status.status !== 'processing' && status.status !== 'queued')) return null;

  const pct = Math.min(100, Math.max(0, status.progress || 0));
  return (
    <div style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', padding:12, borderRadius:12, marginBottom:12}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
        <strong>Transcript Processing</strong>
        <span>{pct}% · {status.stage} · {status.elapsed ? `${status.elapsed}s` : ''}</span>
      </div>
      <div style={{height:8, background:'rgba(255,255,255,0.1)', borderRadius:6, overflow:'hidden'}}>
        <div style={{width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#7b61ff,#4ce2ff)', transition:'width 0.6s ease'}} />
      </div>
      <div style={{fontSize:12, opacity:0.8, marginTop:6}}>
        Stage 1: Transcribe · Stage 2: Structure · Stage 3: Index · Stage 4: Context · Stage 5: Summary
      </div>
    </div>
  );
}
