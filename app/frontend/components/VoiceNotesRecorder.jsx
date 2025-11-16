import { useState, useRef, useEffect } from 'react';
import './VoiceNotesRecorder.css';

export default function VoiceNotesRecorder({ onNoteAdded }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [notes, setNotes] = useState([]);
  const [language, setLanguage] = useState('en-US');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      
      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
            console.log('🎤 Final transcript:', finalText);
          } else {
            interimText += transcript;
          }
        }
        
        if (finalText) {
          setTranscript(prev => {
            const newTranscript = prev + finalText;
            console.log('📝 Updated transcript:', newTranscript);
            return newTranscript;
          });
        }
        setInterimTranscript(interimText);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        if (isRecording) {
          // Restart if still in recording mode
          recognition.start();
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, isRecording]);

  const startRecording = async () => {
    if (!recognitionRef.current) {
      console.warn('⚠️ Speech recognition not available in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsRecording(true);
      console.log('✅ Voice recording started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        console.warn('🎤 Microphone access denied. Please allow microphone permissions in your browser settings.');
      } else {
        console.error(`🎤 Recording failed: ${err.message}. Please check microphone permissions.`);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      console.log('🛑 Recording stopped. Transcript:', transcript);
      
      // Save the note
      if (transcript.trim()) {
        const note = {
          id: Date.now(),
          text: transcript.trim(),
          timestamp: new Date().toLocaleString(),
          language,
        };
        console.log('💾 Saving note:', note);
        setNotes(prev => [...prev, note]);
        if (onNoteAdded) onNoteAdded(note);
        setTranscript('');
        setInterimTranscript('');
      } else {
        console.warn('⚠️ No transcript to save');
        console.warn('No speech detected. Please speak clearly and try again.');
      }
    }
  };

  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const exportNotes = () => {
    const content = notes.map(n => `[${n.timestamp}]\n${n.text}\n\n`).join('---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-notes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Note copied to clipboard!');
    });
  };

  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    return (
      <div className="voice-notes-error">
        <p>❌ Voice recognition is not supported in your browser.</p>
        <p>Please use Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  return (
    <div className="voice-notes-recorder">
      <div className="recorder-header">
        <h3>🎤 Voice Notes</h3>
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isRecording}
          className="language-select"
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="hi-IN">Hindi</option>
          <option value="es-ES">Spanish</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="ja-JP">Japanese</option>
          <option value="zh-CN">Chinese</option>
        </select>
      </div>

      <div className="recorder-controls">
        {!isRecording ? (
          <button className="record-btn start" onClick={startRecording}>
            <span className="mic-icon">🎤</span>
            Start Recording
          </button>
        ) : (
          <button className="record-btn stop" onClick={stopRecording}>
            <span className="stop-icon">⏹</span>
            Stop Recording
          </button>
        )}
      </div>

      {isRecording && (
        <div className="recording-indicator">
          <span className="pulse-dot"></span>
          Recording...
        </div>
      )}

      {(transcript || interimTranscript) && (
        <div className="transcript-display">
          <h4>Live Transcript:</h4>
          <p>
            {transcript}
            {interimTranscript && (
              <span className="interim-text">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {notes.length > 0 && (
        <div className="notes-list">
          <div className="notes-header">
            <h4>📝 Saved Notes ({notes.length})</h4>
            <button className="export-notes-btn" onClick={exportNotes}>
              💾 Export All
            </button>
          </div>
          
          {notes.map(note => (
            <div key={note.id} className="note-item">
              <div className="note-meta">
                <span className="note-time">{note.timestamp}</span>
                <span className="note-lang">{note.language}</span>
              </div>
              <p className="note-text">{note.text}</p>
              <div className="note-actions">
                <button onClick={() => copyToClipboard(note.text)} className="note-action-btn">
                  📋 Copy
                </button>
                <button onClick={() => deleteNote(note.id)} className="note-action-btn delete">
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
