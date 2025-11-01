import { useState, useEffect } from 'react';
import useHybridAI from '../hooks/useHybridAI';
import './HybridAIToggle.css';

export default function HybridAIToggle({ onModeChange }) {
  const { mode, setMode, provider, setProvider, status, actions } = useHybridAI();
  const [providers, setProviders] = useState(['groq', 'claude', 'gemini']);

  useEffect(() => {
    actions.checkStatus();
    const interval = setInterval(actions.checkStatus, 5000);
    return () => clearInterval(interval);
  }, [actions]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const offlineStatus = status.offline === 'online' ? '🟢' : '🔴';
  const onlineStatus = status.online === 'ready' ? '🟢' : '🔴';

  return (
    <div className="hybrid-ai-toggle hover-animate accent-outline">
      <div className="toggle-section">
        <h3 className="section-title">Mode</h3>
        <div className="toggle-container">
          <button
            className={`toggle-btn ${mode === 'offline' ? 'active' : ''}`}
            onClick={() => handleModeChange('offline')}
            title={`Ollama Status: ${status.offline}`}
          >
            <span className="status-light">{offlineStatus}</span>
            Offline
          </button>
          <button
            className={`toggle-btn ${mode === 'online' ? 'active' : ''}`}
            onClick={() => handleModeChange('online')}
            title={`Online Status: ${status.online}`}
          >
            <span className="status-light">{onlineStatus}</span>
            Online
          </button>
        </div>
      </div>

      {mode === 'online' && (
        <div className="provider-section">
          <h3 className="section-title">Provider</h3>
          <div className="provider-buttons">
            {providers.map((p) => (
              <button
                key={p}
                className={`provider-btn ${provider === p ? 'active' : ''}`}
                onClick={() => setProvider(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="status-display">
        <p className="mode-info">
          <strong>Current:</strong> {mode.toUpperCase()} {mode === 'online' ? `• ${provider.toUpperCase()}` : ''}
        </p>
        <div className="status-indicators">
          <span className="status-item">
            <strong>Offline:</strong> {offlineStatus} {status.offline}
          </span>
          <span className="status-item">
            <strong>Online:</strong> {onlineStatus} {status.online}
          </span>
        </div>
      </div>
    </div>
  );
}
