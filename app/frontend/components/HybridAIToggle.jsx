import { useState, useEffect } from 'react';
import useHybridAI from '../hooks/useHybridAI';
import './HybridAIToggle.css';

export default function HybridAIToggle({ onModeChange }) {
  const { provider, setProvider, language, setLanguage, status, actions } = useHybridAI();

  useEffect(() => {
    actions.checkStatus();
    const interval = setInterval(actions.checkStatus, 5000);
    return () => clearInterval(interval);
  }, [actions]);

  const lmstudioStatus = status.lmstudio === 'ready' ? '🟢' : '🔴';
  const groqStatus = status.groq === 'ready' ? '🟢' : '🔴';
  
  // Get model name from status
  const lmstudioModel = status.lmstudioModel || 'gemma-2-9b';

  return (
    <div className="hybrid-ai-toggle hover-animate accent-outline">
      <div className="toggle-section">
        <h3 className="section-title">AI Provider</h3>
        <div className="toggle-container">
          <button
            className={`toggle-btn ${provider === 'lmstudio' ? 'active' : ''}`}
            onClick={() => setProvider('lmstudio')}
            title={`LM Studio (Offline): ${status.lmstudio} - ${lmstudioModel}`}
          >
            <span className="status-light">{lmstudioStatus}</span>
            LM Studio
            <span style={{fontSize: '0.7em', opacity: 0.7, display: 'block'}}>{lmstudioModel}</span>
          </button>
          <button
            className={`toggle-btn ${provider === 'groq' ? 'active' : ''}`}
            onClick={() => setProvider('groq')}
            title={`Groq (Online): ${status.groq}`}
          >
            <span className="status-light">{groqStatus}</span>
            Groq
          </button>
        </div>
      </div>

      <div className="toggle-section" style={{marginTop: '16px'}}>
        <h3 className="section-title">🌐 Output Language</h3>
        <div className="toggle-container">
          <button
            className={`toggle-btn ${language === 'english' ? 'active' : ''}`}
            onClick={() => setLanguage('english')}
            title="Get AI responses in English"
          >
            🇬🇧 English
          </button>
          <button
            className={`toggle-btn ${language === 'hindi' ? 'active' : ''}`}
            onClick={() => setLanguage('hindi')}
            title="AI के जवाब हिंदी में पाएं"
          >
            🇮🇳 हिंदी
          </button>
        </div>
      </div>

      <div className="status-display">
        <p className="mode-info">
          <strong>Current:</strong> {provider === 'lmstudio' ? 'LM Studio' : provider.toUpperCase()} | {language === 'hindi' ? 'हिंदी' : 'English'}
        </p>
        <div className="status-indicators">
          <span className="status-item">
            <strong>LM Studio:</strong> {lmstudioStatus} {status.lmstudio} ({lmstudioModel})
          </span>
          <span className="status-item">
            <strong>Groq:</strong> {groqStatus} {status.groq}
          </span>
        </div>
      </div>
    </div>
  );
}
