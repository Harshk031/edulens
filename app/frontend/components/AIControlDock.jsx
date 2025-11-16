import React, { useState } from 'react';
import AIChatPanel from './AIChatPanel';
import './AIControlDock.css';
import TranscriptTools from './TranscriptTools';

export default function AIControlDock() {
  const [open, setOpen] = useState(true);
  return (
    <aside className={`ai-dock ${open ? 'open' : 'closed'}`}>
      <div className="dock-header">
        <span>🤖 AI Assistant</span>
        <button onClick={() => setOpen(!open)}>{open ? '→' : '←'}</button>
      </div>
      {open && (
        <div className="dock-body">
          <TranscriptTools />
          <AIChatPanel />
        </div>
      )}
    </aside>
  );
}