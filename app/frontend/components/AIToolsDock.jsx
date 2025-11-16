import { useState } from 'react';
import useHybridAI from '../hooks/useHybridAI';
import QuizViewer from './QuizViewer';
import FlashcardViewer from './FlashcardViewer';
import './AIToolsDock.css';

export default function AIToolsDock({ videoId, jobStatus }) {
  const { loading, result, actions } = useHybridAI();
  const [activeView, setActiveView] = useState(null); // 'quiz', 'flashcards', 'mindmap', 'notes', 'summary'
  const [toolResult, setToolResult] = useState(null);

  const executeTool = async (toolName) => {
    setActiveView(toolName);
    setToolResult(null);
    
    try {
      let res;
      switch(toolName) {
        case 'summary':
          res = await actions.summarize();
          break;
        case 'quiz':
          res = await actions.quiz();
          break;
        case 'flashcards':
          res = await actions.flashcards();
          break;
        case 'notes':
          res = await actions.notes();
          break;
        case 'mindmap':
          res = await actions.mindmap();
          break;
        default:
          return;
      }
      setToolResult(result); // useHybridAI updates result
    } catch (err) {
      console.error('Tool execution failed:', err);
    }
  };

  const downloadContent = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTool = () => {
    if (!result) return;
    const timestamp = new Date().toISOString().split('T')[0];
    downloadContent(result, `edulens-${activeView}-${videoId}-${timestamp}.txt`);
  };

  // Check if transcript is ready for AI tools
  // CRITICAL FIX: Check for completion status (done, completed, or progress 100)
  const isTranscriptReady = (jobStatus?.status === 'done' || jobStatus?.status === 'completed' || 
                             (jobStatus?.progress === 100 && jobStatus?.status !== 'processing'));
  const isProcessing = jobStatus?.status === 'processing' || jobStatus?.status === 'queued';
  
  const tools = [
    { id: 'summary', icon: '📄', label: 'Summary', color: '#667eea' },
    { id: 'quiz', icon: '❓', label: 'Quiz', color: '#764ba2' },
    { id: 'flashcards', icon: '🎴', label: 'Flashcards', color: '#4facfe' },
    { id: 'notes', icon: '📝', label: 'Notes', color: '#51cf66' },
    { id: 'mindmap', icon: '🧠', label: 'Mind Map', color: '#ff9800' },
  ];

  return (
    <div className="ai-tools-dock">
      <div className="tools-header">
        <h3>🛠️ AI Tools</h3>
        {isProcessing && (
          <div className="processing-status">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${jobStatus?.progress || 0}%` }}
              ></div>
            </div>
            <span className="processing-text">
              {jobStatus?.stage || 'Processing'}... {jobStatus?.progress || 0}%
            </span>
          </div>
        )}
        {isTranscriptReady && (
          <span className="tools-hint">✅ Ready! Generate learning materials instantly</span>
        )}
        {!isTranscriptReady && !isProcessing && (
          <span className="tools-hint">⏳ Load a video to enable AI tools</span>
        )}
      </div>

      <div className="tools-grid">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`tool-card ${activeView === tool.id ? 'active' : ''}`}
            onClick={() => executeTool(tool.id)}
            disabled={loading || !isTranscriptReady}
            style={{ '--tool-color': tool.color }}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
            {loading && activeView === tool.id && (
              <span className="tool-loading">⏳</span>
            )}
          </button>
        ))}
      </div>

      {result && activeView && (
        <div className="tool-result-overlay">
          <div className="tool-result-modal">
            <div className="result-header">
              <h4>{tools.find(t => t.id === activeView)?.icon} {activeView.toUpperCase()}</h4>
              <div className="result-actions">
                <button className="export-btn" onClick={exportTool} title="Export to file">
                  💾 Export
                </button>
                <button className="close-btn" onClick={() => { setActiveView(null); setToolResult(null); }}>
                  ✕
                </button>
              </div>
            </div>
            
            <div className="result-content">
              {activeView === 'quiz' ? (
                <button 
                  className="view-interactive-btn"
                  onClick={() => setActiveView('quiz-viewer')}
                >
                  📝 Open Interactive Quiz
                </button>
              ) : activeView === 'flashcards' ? (
                <button 
                  className="view-interactive-btn"
                  onClick={() => setActiveView('flashcards-viewer')}
                >
                  🎴 Open Flashcards
                </button>
              ) : (
                <pre className="result-text">{result}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === 'quiz-viewer' && result && (
        <QuizViewer 
          quizData={result} 
          onClose={() => setActiveView('quiz')} 
        />
      )}

      {activeView === 'flashcards-viewer' && result && (
        <FlashcardViewer 
          flashcardsData={result} 
          onClose={() => setActiveView('flashcards')} 
        />
      )}
    </div>
  );
}
