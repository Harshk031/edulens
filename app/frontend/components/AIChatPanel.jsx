import { useRef, useEffect, useState } from 'react';
import useHybridAI from '../hooks/useHybridAI';
import ToolPanel from './tools/ToolPanel.jsx';
import './AIChatPanel.css';
import TranscriptProgress from './TranscriptProgress.jsx';
import TTSControls from './TTSControls.jsx';

function tsToSec(m){const [mm,ss]=m.split(':').map(x=>parseInt(x,10));return (mm||0)*60+(ss||0)}

function RichResult({ text }){
  const formatText = (rawText) => {
    if (!rawText) return '';
    
    // Split into sections by double newlines
    const sections = rawText.split('\n\n');
    
    return sections.map((section, sIdx) => {
      const lines = section.split('\n').filter(l => l.trim());
      if (lines.length === 0) return null;
      
      // Check if it's a heading (all caps, short, or ends with :)
      const firstLine = lines[0].trim();
      const isHeading = /^[A-Z\s]{3,}:?$/.test(firstLine) || 
                       (firstLine.length < 50 && firstLine.endsWith(':')) ||
                       /^#{1,3}\s/.test(firstLine);
      
      if (isHeading && lines.length === 1) {
        // Standalone heading
        const cleanHeading = firstLine.replace(/^#{1,3}\s*/, '').replace(/:$/, '');
        return (
          <div key={sIdx} className="ai-heading" style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#00e08a',
            marginTop: '16px',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '2px solid rgba(0, 224, 138, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {cleanHeading}
          </div>
        );
      }
      
      // Check if section is a list
      const isList = lines.some(line => /^[\d\-•*➤→]/.test(line.trim()));
      
      if (isList) {
        return (
          <ul key={sIdx} className="ai-list" style={{
            marginLeft: '0',
            marginBottom: '16px',
            lineHeight: '1.8',
            listStyle: 'none',
            padding: '0'
          }}>
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              
              // Extract and clean the content
              const cleaned = trimmed.replace(/^[\d\-•*➤→]+[\.\):]?\s*/, '').trim();
              if (!cleaned) return null;
              
              // Check for bold markers **text**
              const hasBold = /\*\*(.+?)\*\*/.test(cleaned);
              
              // Convert [mm:ss] to clickable links
              const parts = cleaned.split(/(\[\d{1,2}:\d{2}\]|\*\*[^*]+\*\*)/g);
              
              return (
                <li key={lIdx} style={{
                  marginBottom: '10px',
                  paddingLeft: '24px',
                  position: 'relative',
                  color: '#d0e8df'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '0',
                    color: '#00e08a',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                  }}>•</span>
                  {parts.map((p, i) => {
                    // Timestamp link
                    const tsMatch = p.match(/^\[(\d{1,2}:\d{2})\]$/);
                    if (tsMatch) {
                      const sec = tsToSec(tsMatch[1]);
                      return (
                        <a key={i} 
                           className="timestamp-link"
                           style={{
                             color: '#7b61ff',
                             cursor: 'pointer',
                             fontWeight: '700',
                             textDecoration: 'none',
                             padding: '2px 6px',
                             background: 'rgba(123, 97, 255, 0.15)',
                             borderRadius: '4px',
                             border: '1px solid rgba(123, 97, 255, 0.3)',
                             transition: 'all 0.2s'
                           }}
                           onMouseEnter={(e) => {
                             e.target.style.background = 'rgba(123, 97, 255, 0.25)';
                             e.target.style.transform = 'scale(1.05)';
                           }}
                           onMouseLeave={(e) => {
                             e.target.style.background = 'rgba(123, 97, 255, 0.15)';
                             e.target.style.transform = 'scale(1)';
                           }}
                           onClick={()=>window.dispatchEvent(new CustomEvent('video:seek',{detail:{seconds:sec}}))}>
                          ⏱️ {p}
                        </a>
                      );
                    }
                    
                    // Bold text **text**
                    const boldMatch = p.match(/^\*\*(.+?)\*\*$/);
                    if (boldMatch) {
                      return <strong key={i} style={{color: '#00e08a', fontWeight: '700'}}>{boldMatch[1]}</strong>;
                    }
                    
                    return <span key={i}>{p}</span>;
                  })}
                </li>
              );
            }).filter(Boolean)}
          </ul>
        );
      } else {
        // Regular paragraph
        const parts = section.split(/(\[\d{1,2}:\d{2}\]|\*\*[^*]+\*\*)/g);
        return (
          <p key={sIdx} className="ai-paragraph" style={{
            marginBottom: '14px',
            lineHeight: '1.8',
            color: '#d0e8df',
            fontSize: '0.95rem'
          }}>
            {parts.map((p, i) => {
              // Timestamp
              const tsMatch = p.match(/^\[(\d{1,2}:\d{2})\]$/);
              if (tsMatch) {
                const sec = tsToSec(tsMatch[1]);
                return (
                  <a key={i}
                     className="timestamp-link"
                     style={{
                       color: '#7b61ff',
                       cursor: 'pointer',
                       fontWeight: '700',
                       textDecoration: 'none',
                       padding: '2px 6px',
                       background: 'rgba(123, 97, 255, 0.15)',
                       borderRadius: '4px',
                       border: '1px solid rgba(123, 97, 255, 0.3)'
                     }}
                     onClick={()=>window.dispatchEvent(new CustomEvent('video:seek',{detail:{seconds:sec}}))}>
                    ⏱️ {p}
                  </a>
                );
              }
              
              // Bold
              const boldMatch = p.match(/^\*\*(.+?)\*\*$/);
              if (boldMatch) {
                return <strong key={i} style={{color: '#00e08a', fontWeight: '700'}}>{boldMatch[1]}</strong>;
              }
              
              return <span key={i}>{p}</span>;
            })}
          </p>
        );
      }
    }).filter(Boolean);
  };
  
  return (
    <div className="ai-result-container" style={{
      maxHeight: '500px',
      overflowY: 'auto',
      padding: '16px',
      background: 'rgba(7, 16, 20, 0.6)',
      borderRadius: '12px',
      border: '1px solid rgba(0, 224, 138, 0.2)',
      backdropFilter: 'blur(8px)'
    }}>
      {formatText(text)}
    </div>
  );
}

export default function AIChatPanel() {
  const { provider, loading, messages, result, error, actions } = useHybridAI();
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
    
    // Check if user is asking about a specific time range
    const timeRangeMatch = input.match(/(?:from|at|between)?\s*(\d{1,2}:\d{2})\s*(?:to|-)?\s*(\d{1,2}:\d{2})?/i);
    
    if (timeRangeMatch) {
      const startTime = timeRangeMatch[1];
      const endTime = timeRangeMatch[2] || startTime;
      console.log(`🕒 Time-based query detected: ${startTime} to ${endTime}`);
      
      // Enhance the query with time context
      const enhancedQuery = `${input} [Focusing on video content between ${startTime} and ${endTime}]`;
      await actions.sendChat(enhancedQuery);
    } else {
      await actions.sendChat(input);
    }
    
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
        <div style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
          <span className="mode-badge">
            Provider: {provider === 'lmstudio' ? 'LM Studio' : provider.toUpperCase()}
          </span>
          <span className="mode-badge" style={{background:'rgba(0,224,138,0.1)', fontSize:'0.7rem'}} title="Using video transcript">
            📄 Transcript
          </span>
        </div>
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
              <TTSControls text={result || ''} videoId={typeof window !== 'undefined' ? window.__edulensCurrentVideoId : ''} />
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
