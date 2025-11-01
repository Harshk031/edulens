import React from 'react';
import './ToolPanel.css';

export default function ToolPanel({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="toolpanel-root" role="dialog" aria-modal="true" aria-label={title}>
      <div className="toolpanel-scrim" onClick={onClose} />
      <div className="toolpanel-card" style={{ willChange: 'transform' }}>
        <div className="toolpanel-header">
          <div className="toolpanel-title">{title}</div>
          <button className="toolpanel-close" onClick={onClose}>✕</button>
        </div>
        <div className="toolpanel-body">
          {children}
        </div>
      </div>
    </div>
  );
}
