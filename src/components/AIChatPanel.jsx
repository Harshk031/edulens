import { useRef, useEffect, useState } from 'react';
import useHybridAI from '../hooks/useHybridAI';
import './AIChatPanel.css';

export default function AIChatPanel() {
  const { mode, provider, loading, messages, result, error, actions } = useHybridAI();
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    await actions.sendChat(input);
    setInput('');
  };

  const handleSummarize = async () => {
    if (!input.trim()) return;
    await actions.summarize(input);
    setInput('');
  };

  const handleQuiz = async () => {
    if (!input.trim()) return;
    await actions.quiz(input);
    setInput('');
  };

  const handleMindmap = async () => {
    if (!input.trim()) return;
    await actions.mindmap(input);
    setInput('');
  };

  return (
    <div className="ai-chat-panel">
      <div className="panel-header">
        <h2>🤖 AI Chat Panel</h2>
        <span className="mode-badge">{mode.toUpperCase()} • {provider.toUpperCase()}</span>
      </div>

      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`tab ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          🛠️ Tools
        </button>
      </div>

      {activeTab === 'chat' && (
        <div className="chat-view">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>👋 Start a conversation...</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {result && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <div className="result-display">
                <p>{result}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask anything..."
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="tools-view">
          <div className="tools-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text for analysis..."
              disabled={loading}
              rows={6}
            />
          </div>

          <div className="tools-buttons">
            <button
              onClick={handleSummarize}
              disabled={loading || !input.trim()}
              className="tool-btn"
            >
              📄 Summarize
            </button>
            <button
              onClick={handleQuiz}
              disabled={loading || !input.trim()}
              className="tool-btn"
            >
              ❓ Quiz
            </button>
            <button
              onClick={handleMindmap}
              disabled={loading || !input.trim()}
              className="tool-btn"
            >
              🧠 Mind Map
            </button>
          </div>

          {result && (
            <div className="tool-result">
              <h4>Result</h4>
              <pre>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          Processing...
        </div>
      )}
    </div>
  );
}
