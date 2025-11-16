import React from 'react';
import MainLayout from './MainLayout';
import RightPanel from './RightPanel';
import VideoContainer from '../Video/VideoContainer';
import useTranscriptPipeline from '../../hooks/useTranscriptPipeline';
import AIToolsDock from '../AIToolsDock';
import './ModernAppLayout.css';

/**
 * ModernAppLayout - Modernized UI with video-first layout
 * Uses MainLayout grid, VideoContainer, and unified RightPanel
 */
export default function ModernAppLayout({
  videoId,
  jobStatus,
  onVideoLoad,
  onVideoClear,
  focusTime = 1500,
  onTimerEnd,
  onProviderChange,
  onLanguageChange
}) {
  // Use single canonical transcript pipeline
  const { status, progress, transcript, start } = useTranscriptPipeline();

  // Auto-start pipeline when video loads
  React.useEffect(() => {
    if (videoId && status === 'idle') {
      start(videoId);
    }
  }, [videoId, status, start]);

  // Header component
  const header = (
    <div className="modern-header">
      <div className="modern-header-logo">
        <span className="logo-mark" />
        <span className="logo-text grad-text">EduLens</span>
      </div>
      <div className="modern-header-controls">
        {videoId && (
          <button
            className="modern-header-btn modern-header-clear"
            onClick={onVideoClear}
            aria-label="Clear video"
            title="Clear video"
          >
            🗑️ Clear Video
          </button>
        )}
        <button
          className="modern-header-btn modern-header-exit"
          onClick={() => {
            // Trigger exit animation directly without confirmation
            if (window.__edulensHandleExit) {
              window.__edulensHandleExit();
            } else if (window.electronAPI?.closeApp) {
              window.electronAPI.closeApp();
            } else {
              window.close();
            }
          }}
          aria-label="Exit application"
          title="Exit"
        >
          ✕ EXIT
        </button>
      </div>
    </div>
  );

  // Video section
  const videoSection = (
    <VideoContainer
      videoId={videoId}
      jobStatus={jobStatus}
      onClearVideo={onVideoClear}
      focusTime={focusTime}
      onTimerEnd={onTimerEnd}
    />
  );

  // Right panel
  const rightPanel = (
    <RightPanel
      videoId={videoId}
      transcript={transcript}
      jobStatus={jobStatus}
      onProviderChange={onProviderChange}
      onLanguageChange={onLanguageChange}
    />
  );

  return (
    <MainLayout
      header={header}
      videoSection={videoSection}
      rightPanel={rightPanel}
    />
  );
}

