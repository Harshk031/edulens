import { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import VideoSnapshotTool from './VideoSnapshotTool';
import RichTextEditor from './RichTextEditor';
import './CodingNotesPanel.css';

export default function CodingNotesPanel({ videoId, transcript }) {
  const [timestamp, setTimestamp] = useState('');
  const [codeSnippets, setCodeSnippets] = useState([]);
  const [richNotes, setRichNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [showVideoTools, setShowVideoTools] = useState(false);
  const [activeTab, setActiveTab] = useState('code'); // 'code' or 'notes'
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Parse timestamp (supports formats: 3:40, 03:40, 220, etc.)
  const parseTimestamp = (input) => {
    if (!input) return null;
    
    // If it's just a number (seconds)
    if (/^\d+$/.test(input)) {
      return parseInt(input, 10);
    }
    
    // If it's MM:SS or HH:MM:SS format
    const parts = input.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return null;
  };

  // Extract code from transcript at specific timestamp
  const extractCodeAtTimestamp = async () => {
    setLoading(true);
    setError(null);

    try {
      const seconds = parseTimestamp(timestamp);
      if (seconds === null) {
        throw new Error('Invalid timestamp format. Use 3:40 or 220');
      }

      if (!transcript || !transcript.segments) {
        throw new Error('No transcript available. Please process the video first.');
      }

      // Find segment at timestamp
      const segment = transcript.segments.find(
        seg => seg.start <= seconds && seg.end >= seconds
      );

      if (!segment) {
        throw new Error(`No content found at timestamp ${timestamp}`);
      }

      // Get context (surrounding segments)
      const segmentIndex = transcript.segments.indexOf(segment);
      const contextBefore = transcript.segments.slice(Math.max(0, segmentIndex - 2), segmentIndex);
      const contextAfter = transcript.segments.slice(segmentIndex + 1, Math.min(transcript.segments.length, segmentIndex + 3));
      
      const fullContext = [
        ...contextBefore.map(s => s.text),
        segment.text,
        ...contextAfter.map(s => s.text)
      ].join(' ');

      console.log('[CodingNotes] Extracting code from context:', fullContext);

      // Call backend API to extract code using AI
      const response = await fetch('/api/ai/extract-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          timestamp: seconds,
          context: fullContext,
          segmentText: segment.text
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract code');
      }

      const data = await response.json();
      
      // Check if code was actually found
      if (!data.success || data.error) {
        throw new Error(data.message || data.error || 'No code found at this timestamp');
      }
      
      // Add new code snippet to list
      const newSnippet = {
        id: Date.now(),
        timestamp: seconds,
        timestampFormatted: timestamp,
        code: data.code,
        language: data.language,
        description: data.description,
        comments: [],
        createdAt: new Date().toISOString()
      };

      setCodeSnippets(prev => [newSnippet, ...prev]);
      setTimestamp(''); // Clear input
      setError(null); // Clear any previous errors
      
      console.log('[CodingNotes] Code snippet extracted:', newSnippet);

    } catch (err) {
      console.error('[CodingNotes] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load saved snippets from storage
  useEffect(() => {
    if (!videoId) return;
    
    const loadSavedSnippets = () => {
      try {
        const saved = localStorage.getItem(`coding-notes-${videoId}`);
        if (saved) {
          const snippets = JSON.parse(saved);
          setCodeSnippets(snippets);
          console.log('[CodingNotes] Loaded', snippets.length, 'saved snippets');
        }
      } catch (err) {
        console.error('[CodingNotes] Error loading snippets:', err);
      }
    };
    
    loadSavedSnippets();
  }, [videoId]);

  // Save snippets to storage whenever they change
  useEffect(() => {
    if (!videoId || codeSnippets.length === 0) return;
    
    try {
      localStorage.setItem(`coding-notes-${videoId}`, JSON.stringify(codeSnippets));
      console.log('[CodingNotes] Saved', codeSnippets.length, 'snippets');
    } catch (err) {
      console.error('[CodingNotes] Error saving snippets:', err);
    }
  }, [codeSnippets, videoId]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      extractCodeAtTimestamp();
    }
  };

  const handleUpdateSnippet = (updatedSnippet) => {
    setCodeSnippets(prev => 
      prev.map(s => s.id === updatedSnippet.id ? updatedSnippet : s)
    );
  };

  const handleDeleteSnippet = (snippetId) => {
    // Auto-delete without confirmation
    {
      setCodeSnippets(prev => prev.filter(s => s.id !== snippetId));
    }
  };

  const handleRunSnippet = (snippet) => {
    // Modal is now handled within CodeEditor component
    console.log('[CodingNotes] Running snippet:', snippet);
  };

  // Update current video time
  useEffect(() => {
    const updateVideoTime = () => {
      try {
        const iframe = document.querySelector('iframe[src*="youtube.com"]');
        if (iframe && iframe.contentWindow) {
          setCurrentVideoTime(prev => prev + 1);
        }
      } catch (e) {
        // CORS restriction
      }
    };

    const interval = setInterval(updateVideoTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVideoInsert = (item) => {
    // For coding notes, we can add screenshots/text as comments to a snippet
    if (item.type === 'timestamp') {
      setTimestamp(item.timestampFormatted);
    } else {
      console.log(`${item.type} captured! Create a code snippet to attach this.`);
    }
  };

  // Rich Notes Functions
  const handleSaveRichNote = (content) => {
    const newNote = {
      id: Date.now(),
      content,
      timestamp: new Date().toISOString(),
      videoId,
      videoTimestamp: currentVideoTime
    };
    setRichNotes(prev => [...prev, newNote]);
    
    // Save to localStorage
    const savedNotes = JSON.parse(localStorage.getItem('edulens_rich_notes') || '[]');
    savedNotes.push(newNote);
    localStorage.setItem('edulens_rich_notes', JSON.stringify(savedNotes));
  };

  const handleDeleteRichNote = (noteId) => {
    setRichNotes(prev => prev.filter(note => note.id !== noteId));
    
    // Update localStorage
    const savedNotes = JSON.parse(localStorage.getItem('edulens_rich_notes') || '[]');
    const updatedNotes = savedNotes.filter(note => note.id !== noteId);
    localStorage.setItem('edulens_rich_notes', JSON.stringify(updatedNotes));
  };

  // Import/Export Functions
  const handleImportNotes = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.richNotes) {
            setRichNotes(prev => [...prev, ...importedData.richNotes]);
            // Update localStorage
            const savedNotes = JSON.parse(localStorage.getItem('edulens_rich_notes') || '[]');
            const updatedNotes = [...savedNotes, ...importedData.richNotes];
            localStorage.setItem('edulens_rich_notes', JSON.stringify(updatedNotes));
          }
          if (importedData.codeSnippets) {
            setCodeSnippets(prev => [...prev, ...importedData.codeSnippets]);
          }
          console.log('Notes imported successfully!');
        } catch (error) {
          console.error('Error importing notes: Invalid file format');
        }
      };
      reader.readAsText(file);
    }
    setShowImportDialog(false);
  };

  const handleExportNotes = () => {
    const exportData = {
      richNotes,
      codeSnippets,
      exportDate: new Date().toISOString(),
      videoId
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `edulens-notes-${videoId || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Load rich notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('edulens_rich_notes') || '[]');
    const videoNotes = videoId ? savedNotes.filter(note => note.videoId === videoId) : savedNotes;
    setRichNotes(videoNotes);
  }, [videoId]);

  return (
    <div className="coding-notes-panel glass">
      <div className="panel-header">
        <h2>📝 Smart Notes</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn-icon"
            onClick={() => setShowVideoTools(!showVideoTools)}
            title="Toggle video tools"
          >
            {showVideoTools ? '🎬' : '📹'}
          </button>
          <button 
            className="btn-icon"
            onClick={() => setShowImportDialog(!showImportDialog)}
            title="Import/Export notes"
          >
            📁
          </button>
          <span className="badge">{codeSnippets.length + richNotes.length} notes</span>
        </div>
      </div>

      {/* Import/Export Dialog */}
      {showImportDialog && (
        <div className="import-export-dialog">
          <div className="dialog-content">
            <h3>📁 Import/Export Notes</h3>
            <div className="dialog-buttons">
              <label className="import-btn">
                📥 Import Notes
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportNotes}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="export-btn" onClick={handleExportNotes}>
                📤 Export Notes
              </button>
              <button 
                className="close-btn" 
                onClick={() => setShowImportDialog(false)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="notes-tabs">
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Rich Notes ({richNotes.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          💻 Code Snippets ({codeSnippets.length})
        </button>
      </div>

      {/* Video Tools */}
      {showVideoTools && (
        <VideoSnapshotTool
          onInsert={handleVideoInsert}
          currentTime={currentVideoTime}
        />
      )}

      <div className="timestamp-input-section">
        <div className="input-group">
          <input
            type="text"
            className="timestamp-input"
            placeholder="Enter timestamp (e.g., 3:40 or 220)"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || !transcript}
          />
          <button
            className="btn btn-primary"
            onClick={extractCodeAtTimestamp}
            disabled={loading || !timestamp || !transcript}
          >
            {loading ? '⏳ Extracting...' : '📋 Extract Code'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}
        
        {!transcript && (
          <div className="info-message">
            ℹ️ Process a video first to extract code snippets
          </div>
        )}
      </div>

      {/* Rich Notes Tab */}
      {activeTab === 'notes' && (
        <div className="rich-notes-section">
          <RichTextEditor
            placeholder="Start writing your rich notes... Use the toolbar for formatting, images, theory boxes, and more!"
            onSave={handleSaveRichNote}
            showToolbar={true}
          />
          
          {/* Saved Rich Notes */}
          <div className="saved-notes-list">
            <h3>💾 Saved Notes ({richNotes.length})</h3>
            {richNotes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>No rich notes yet</p>
                <p className="empty-hint">Use the editor above to create formatted notes with images, theory boxes, and more!</p>
              </div>
            ) : (
              richNotes.map(note => (
                <div key={note.id} className="saved-note-item">
                  <div className="note-header">
                    <span className="note-timestamp">
                      📅 {new Date(note.timestamp).toLocaleString()}
                      {note.videoTimestamp && ` | 🎬 ${Math.floor(note.videoTimestamp / 60)}:${String(note.videoTimestamp % 60).padStart(2, '0')}`}
                    </span>
                    <button 
                      className="delete-note-btn"
                      onClick={() => handleDeleteRichNote(note.id)}
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  </div>
                  <div 
                    className="note-content"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Code Snippets Tab */}
      {activeTab === 'code' && (
        <div className="code-snippets-section">
          <div className="timestamp-input-section">
            <div className="input-group">
              <input
                type="text"
                className="timestamp-input"
                placeholder="Enter timestamp (e.g., 3:40 or 220)"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || !transcript}
              />
              <button
                className="btn btn-primary"
                onClick={extractCodeAtTimestamp}
                disabled={loading || !timestamp || !transcript}
              >
                {loading ? '⏳ Extracting...' : '📋 Extract Code'}
              </button>
            </div>
            
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
            
            {!transcript && (
              <div className="info-message">
                ℹ️ Process a video first to extract code snippets
              </div>
            )}
          </div>

          <div className="snippets-list">
            {codeSnippets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💻</div>
                <p>No code snippets yet</p>
                <p className="empty-hint">Enter a timestamp above to extract code from the video</p>
              </div>
            ) : (
              codeSnippets.map(snippet => (
                <CodeEditor
                  key={snippet.id}
                  snippet={snippet}
                  onUpdate={handleUpdateSnippet}
                  onDelete={handleDeleteSnippet}
                  onRun={handleRunSnippet}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

