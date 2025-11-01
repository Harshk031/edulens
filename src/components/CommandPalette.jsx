import { useEffect, useState } from 'react';
import './CommandPalette.css';

const OPTIONS = [
  { key: 'summary', label: '📝 Generate Summary of Video', icon: '📝' },
  { key: 'notes', label: '📝 Generate Study Notes', icon: '📝' },
  { key: 'quiz', label: '❓ Generate Quiz Questions', icon: '❓' },
  { key: 'flashcards', label: '🎴 Generate Flashcards', icon: '🎴' },
  { key: 'mindmap', label: '🧠 Generate Mind Map', icon: '🧠' },
];

export default function CommandPalette({ open, onClose }){
  const [query, setQuery] = useState('');
  const [i, setI] = useState(0);
  const filtered = OPTIONS.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
  const list = filtered.length ? filtered : OPTIONS;

  const select = (opt) => {
    window.dispatchEvent(new CustomEvent('tool:execute', { detail: { tool: opt.key } }));
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { setI(v => Math.min(v + 1, list.length - 1)); e.preventDefault(); }
      if (e.key === 'ArrowUp') { setI(v => Math.max(v - 1, 0)); e.preventDefault(); }
      if (e.key === 'Enter') { select(list[i]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, i, list, onClose]);

  if (!open) return null;
  return (
    <div className="cp-root" role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="cp-scrim" onClick={onClose} />
      <div className="cp-card">
        <input className="cp-input" autoFocus placeholder="Type a command…" value={query} onChange={e=>{setQuery(e.target.value); setI(0);}} />
        <div className="cp-list">
          {list.map((o, idx) => (
            <div 
              key={o.key} 
              className={`cp-item ${idx===i?'active':''}`}
              onClick={() => select(o)}
              onMouseEnter={() => setI(idx)}
            >
              {o.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
