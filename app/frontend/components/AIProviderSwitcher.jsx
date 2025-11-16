import { useState, useEffect } from 'react';
import './AIProviderSwitcher.css';

function AIProviderSwitcher() {
  const [currentProvider, setCurrentProvider] = useState('groq');
  const [providerHealth, setProviderHealth] = useState({ groq: null, lmstudio: null });
  const [isLoading, setIsLoading] = useState(false);

  // Check provider health on mount
  useEffect(() => {
    checkProviderHealth();
  }, []);

  const checkProviderHealth = async () => {
    try {
      const response = await fetch('/api/ai/health');
      const health = await response.json();
      setProviderHealth({
        groq: health.groq,
        lmstudio: health.lmstudio
      });
      
      // Set current provider based on what's available
      if (health.groq?.ok) {
        setCurrentProvider('groq');
      } else if (health.lmstudio?.ok) {
        setCurrentProvider('lmstudio');
      }
    } catch (error) {
      console.error('Failed to check provider health:', error);
    }
  };

  const switchProvider = async (provider) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setCurrentProvider(provider);
    
    // Store preference in localStorage
    localStorage.setItem('preferredAIProvider', provider);
    
    // Notify user
    console.log(`Switched to ${provider === 'groq' ? 'Groq (LLaMA 3.3 70B)' : 'LM Studio (Gemma 2 9B)'}`);
    
    setTimeout(() => setIsLoading(false), 500);
  };

  const getProviderInfo = (provider) => {
    if (provider === 'groq') {
      return {
        name: 'Groq',
        model: 'LLaMA 3.3 70B',
        speed: 'Fast',
        quality: 'Highest',
        icon: '🟢',
        status: providerHealth.groq?.ok ? 'ready' : 'unavailable'
      };
    } else {
      return {
        name: 'LM Studio',
        model: 'Gemma 2 9B',
        speed: 'Medium',
        quality: 'Good',
        icon: '🔵',
        status: providerHealth.lmstudio?.ok ? 'ready' : 'unavailable'
      };
    }
  };

  const groqInfo = getProviderInfo('groq');
  const lmInfo = getProviderInfo('lmstudio');

  return (
    <div className="ai-provider-switcher">
      <div className="provider-label">AI Model:</div>
      
      <div className="provider-toggle">
        <button
          className={`provider-btn ${currentProvider === 'groq' ? 'active' : ''} ${groqInfo.status !== 'ready' ? 'disabled' : ''}`}
          onClick={() => switchProvider('groq')}
          disabled={groqInfo.status !== 'ready' || isLoading}
          title={`${groqInfo.name} - ${groqInfo.model}\nSpeed: ${groqInfo.speed} | Quality: ${groqInfo.quality}`}
        >
          <span className="provider-icon">{groqInfo.icon}</span>
          <span className="provider-name">{groqInfo.name}</span>
          <span className="provider-model">{groqInfo.model}</span>
          {groqInfo.status === 'ready' && currentProvider === 'groq' && (
            <span className="active-indicator">✓</span>
          )}
        </button>

        <button
          className={`provider-btn ${currentProvider === 'lmstudio' ? 'active' : ''} ${lmInfo.status !== 'ready' ? 'disabled' : ''}`}
          onClick={() => switchProvider('lmstudio')}
          disabled={lmInfo.status !== 'ready' || isLoading}
          title={`${lmInfo.name} - ${lmInfo.model}\nSpeed: ${lmInfo.speed} | Quality: ${lmInfo.quality}\nOffline & Private`}
        >
          <span className="provider-icon">{lmInfo.icon}</span>
          <span className="provider-name">{lmInfo.name}</span>
          <span className="provider-model">{lmInfo.model}</span>
          {lmInfo.status === 'ready' && currentProvider === 'lmstudio' && (
            <span className="active-indicator">✓</span>
          )}
        </button>
      </div>

      <div className="provider-info">
        {currentProvider === 'groq' ? (
          <span className="info-text">🚀 Fast & High Quality (Online)</span>
        ) : (
          <span className="info-text">🔒 Private & Offline</span>
        )}
      </div>
    </div>
  );
}

export default AIProviderSwitcher;
