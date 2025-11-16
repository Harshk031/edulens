import React, { useState } from 'react';
import HybridAIToggle from '../HybridAIToggle';
import AIChatPanel from '../AIChatPanel';
import AIToolsDock from '../AIToolsDock';
import VoiceNotesRecorder from '../VoiceNotesRecorder';
import PlaylistManager from '../PlaylistManager';
import CodingNotesPanel from '../CodingNotesPanel';
import './RightPanel.css';

/**
 * RightPanel - Unified right-side control panel
 * Contains: AI Provider, Tools, Transcript, Chat
 * Single source of truth for all controls
 */
export default function RightPanel({ 
  videoId, 
  transcript,
  jobStatus,
  onProviderChange,
  onLanguageChange 
}) {
  const [activeSection, setActiveSection] = useState('chat'); // chat, tools, transcript

  return (
    <aside 
      className="right-panel"
      role="complementary"
      aria-label="AI controls and tools"
    >
      {/* AI Provider Card */}
      <div className="right-panel-card" role="region" aria-labelledby="provider-heading">
        <h2 id="provider-heading" className="right-panel-heading">
          🤖 AI Provider
        </h2>
        <HybridAIToggle 
          onProviderChange={onProviderChange}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Section Tabs */}
      <div className="right-panel-tabs" role="tablist" aria-label="Panel sections">
        <button
          className={`right-panel-tab ${activeSection === 'tools' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeSection === 'tools'}
          aria-controls="tools-panel"
          onClick={() => setActiveSection('tools')}
        >
          🛠️ Tools
        </button>
        <button
          className={`right-panel-tab ${activeSection === 'transcript' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeSection === 'transcript'}
          aria-controls="transcript-panel"
          onClick={() => setActiveSection('transcript')}
        >
          📄 Transcript
        </button>
        <button
          className={`right-panel-tab ${activeSection === 'chat' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeSection === 'chat'}
          aria-controls="chat-panel"
          onClick={() => setActiveSection('chat')}
        >
          💬 Chat
        </button>
      </div>

      {/* Tools Panel */}
      {activeSection === 'tools' && (
        <div 
          id="tools-panel"
          className="right-panel-card"
          role="tabpanel"
          aria-labelledby="tools-tab"
        >
          <h3 className="right-panel-subheading">AI Tools</h3>
          {videoId ? (
            <AIToolsDock videoId={videoId} jobStatus={jobStatus} />
          ) : (
            <p className="right-panel-empty">Load a video to access AI tools</p>
          )}
        </div>
      )}

      {/* Transcript Panel */}
      {activeSection === 'transcript' && (
        <div 
          id="transcript-panel"
          className="right-panel-card"
          role="tabpanel"
          aria-labelledby="transcript-tab"
        >
          <h3 className="right-panel-subheading">Video Transcript</h3>
          {transcript ? (
            <div className="transcript-content">
              {transcript.segments?.map((seg, idx) => (
                <div key={idx} className="transcript-segment">
                  <span className="transcript-timestamp">
                    [{Math.floor(seg.start / 60)}:{(Math.floor(seg.start % 60)).toString().padStart(2, '0')}]
                  </span>
                  <span className="transcript-text">{seg.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="right-panel-empty">Transcript will appear here after processing</p>
          )}
        </div>
      )}

      {/* Chat Panel */}
      {activeSection === 'chat' && (
        <div 
          id="chat-panel"
          className="right-panel-card right-panel-chat"
          role="tabpanel"
          aria-labelledby="chat-tab"
        >
          <AIChatPanel />
        </div>
      )}

      {/* Additional Tools - Always visible */}
      <div className="right-panel-card">
        <h3 className="right-panel-subheading">Additional Tools</h3>
        <div className="right-panel-additional-tools">
          <VoiceNotesRecorder onNoteAdded={(note) => {
            // Note saved
          }} />
          <PlaylistManager onVideoSelect={(vid) => {
            // Video selected - trigger video load
            window.__edulensCurrentVideoId = vid;
            window.dispatchEvent(new CustomEvent('video:loaded', { detail: { videoId: vid } }));
            if (window.__edulensOnVideoSelect) {
              window.__edulensOnVideoSelect(vid);
            }
          }} />
        </div>
      </div>

      {/* Coding Notes - Conditional */}
      {videoId && (
        <div className="right-panel-card">
          <CodingNotesPanel videoId={videoId} transcript={transcript} />
        </div>
      )}
    </aside>
  );
}

