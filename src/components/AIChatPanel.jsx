import { useRef, useEffect, useState } from 'react';
import useHybridAI from '../hooks/useHybridAI';
import ToolPanel from './tools/ToolPanel.jsx';
import './AIChatPanel.css';
import TranscriptProgress from './TranscriptProgress.jsx';
import TTSControls from './TTSControls.jsx';

function tsToSec(m){const [mm,ss]=m.split(':').map(x=>parseInt(x,10));return (mm||0)*60+(ss||0)}
function RichResult({ text }){
  // Convert [mm:ss] to clickable spans
  const parts = (text||'').split(/(\[\d{1,2}:\d{2}\])/g);
  return (
    <div style={{whiteSpace:'pre-wrap'}}>
      {parts.map((p,i)=>{
        const m = p.match(/^\[(\d{1,2}:\d{2})\]$/);
        if (m){
          const sec = tsToSec(m[1]);
          return <a key={i} style={{color:'var(--accent-primary)', cursor:'pointer'}} onClick={()=>window.dispatchEvent(new CustomEvent('video:seek',{detail:{seconds:sec}}))}>{p}</a>;
        }
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}

export default function AIChatPanel() {
  const { mode, provider, loading, messages, result, error, actions } = useHybridAI();
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [panel, setPanel] = useState({ open: false, title: '', content: '' });
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
    setPanel({ open: true, title: 'Summary', content: '' });
  };

  const handleQuiz = async () => {
    if (!input.trim()) return;
    await actions.quiz(input);
    setInput('');
    setPanel({ open: true, title: 'Quiz', content: '' });
  };

  const handleMindmap = async () => {
    if (!input.trim()) return;
    await actions.mindmap(input);
    setInput('');
    setPanel({ open: true, title: 'Mindmap', content: '' });
  };

  // Listen to command palette events to execute tools directly
  useEffect(() => {
    const onExecute = async (e) => {
      const tool = e.detail?.tool;
      if (!tool) return;
      
      // Switch to tools tab and show loading
      setActiveTab('tools');
      const toolTitle = tool.charAt(0).toUpperCase() + tool.slice(1);
      setPanel({ open: true, title: toolTitle, content: '' });
      
      // Execute the tool directly (no input needed - uses whole video)
      try {
        console.log(`⏳ Generating ${toolTitle}...`);
        if (tool === 'summary') await actions.summarize('short');
        else if (tool === 'quiz') await actions.quiz();
        else if (tool === 'mindmap') await actions.mindmap();
        else if (tool === 'notes') await actions.notes();
        else if (tool === 'flashcards') await actions.flashcards();
        console.log(`✅ ${toolTitle} generated successfully!`);
      } catch (err) {
        console.error(`❌ ${toolTitle} failed:`, err);
      }
    };
    window.addEventListener('tool:execute', onExecute);
    return () => window.removeEventListener('tool:execute', onExecute);
  }, [actions]);

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
          <TranscriptProgress videoId={typeof window !== 'undefined' ? window.__edulensCurrentVideoId : ''} />
          <div className="messages-container">
            {/* Quick TTS controls for the latest AI result */}
            <div style={{margin:'6px 0'}}>
              <TTSControls text={result || ''} videoId={typeof window!== 'undefined' ? window.__edulensCurrentVideoId : ''} />
            </div>
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
                    <div>
                      <h4 style={{margin:'6px 0'}}>Summary</h4>
                      <RichResult text={result} />
                    </div>
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
            className="send-btn hover-animate ripple"
          >
            {loading ? <span className="loading-morph" /> : '➤'}
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
            <button onClick={handleSummarize} disabled={loading || !input.trim()} className="tool-btn">📄 Summary</button>
            <button onClick={handleQuiz} disabled={loading || !input.trim()} className="tool-btn">❓ Quiz</button>
            <button onClick={handleMindmap} disabled={loading || !input.trim()} className="tool-btn">🧠 Mind Map</button>
            <button onClick={async()=>{ if(!input.trim()) return; await actions.notes(input); setPanel({open:true,title:'Notes',content:''}); setInput(''); }} disabled={loading || !input.trim()} className="tool-btn">📝 Notes</button>
            <button onClick={async()=>{ if(!input.trim()) return; await actions.flashcards(input); setPanel({open:true,title:'Flashcards',content:''}); setInput(''); }} disabled={loading || !input.trim()} className="tool-btn">🎴 Flashcards</button>
          </div>

          {result && (
            <div className="tool-result">
              <h4>Result</h4>
              <pre>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <ToolPanel
            open={panel.open}
            title={panel.title}
            onClose={() => setPanel({ open: false, title: '', content: '' })}
          >
            {loading ? (
              <div style={{display:'flex',alignItems:'center',gap:10}}><div className="loading-morph"/> Generating…</div>
            ) : (
              <pre style={{whiteSpace:'pre-wrap'}}>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            )}
          </ToolPanel>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="loading-indicator">
          <div className="loading-morph"></div>
          Processing...
        </div>
      )}
    </div>
  );
}
