import React, { useMemo } from 'react';
import './MindmapModal.css';

function parseMindmap(text){
  try { const j = typeof text === 'string' ? JSON.parse(text) : text; if (j && (j.nodes || j.root)) return j; } catch {}
  // Fallback: parse simple bullet lines
  const lines = String(text||'').split(/\r?\n/).filter(Boolean);
  const nodes = lines.map((l,i)=>({ title: l.replace(/^[-*]\s*/, '').slice(0,80), depth: (i%3)+1 }));
  return { root: 'Mindmap', nodes };
}

export default function MindmapModal({ open, onClose, text }){
  const data = useMemo(()=>parseMindmap(text),[text]);
  if (!open) return null;
  return (
    <div className="mmodal-root" role="dialog" aria-modal="true" aria-label="Mindmap">
      <div className="mmodal-scrim" onClick={onClose} />
      <div className="mmodal-stage">
        <div className="mmodal-toolbar">
          <div className="mmodal-title">🧠 Mindmap</div>
          <button className="mmodal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mmodal-canvas">
          {(data.nodes||[]).map((n,idx)=> (
            <div key={idx} className={`mm-node depth-${n.depth||1}`} style={{ left: 40 + (n.depth||1)*40, top: 40 + idx*44 }}>
              <div className="mm-dot" />
              <div className="mm-text">{n.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
