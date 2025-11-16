import React, { useState } from 'react';
import YouTubeEmbed from '../YouTubeEmbed';
import TopTimer from '../TopTimer';
import FocusHourglass from '../FocusHourglass';
import PipelineFlow from '../PipelineFlow';
import TranscriptProgress from '../TranscriptProgress';
import VideoCaptureButton from '../VideoCaptureButton';
import './VideoContainer.css';

/**
 * VideoContainer - YouTube-like video player with controls above
 * Contains: Timer, Sandglass, Pipeline, Video Player
 */
export default function VideoContainer({ 
  videoId, 
  jobStatus,
  onClearVideo,
  focusTime = 1500,
  onTimerEnd 
}) {
  const [remainingTime, setRemainingTime] = useState(focusTime);
  const [isPaused, setIsPaused] = useState(false);

  // DEBUG: Log rendering
  React.useEffect(() => {
    console.log('🎬 VideoContainer RENDERED');
    console.log('  - focusTime:', focusTime);
    console.log('  - videoId:', videoId);
    console.log('  - Timer section should be visible');
  }, []);

  // Update remaining time when focusTime changes
  React.useEffect(() => {
    setRemainingTime(focusTime);
    console.log('⏱️ Focus time updated:', focusTime);
  }, [focusTime]);

  return (
    <div className="video-container" role="region" aria-label="Video player">
      {/* Timer and Hourglass - Integrated with theme */}
      <div className="video-controls-above" role="group" aria-label="Focus timer and sandglass">
        <div className="video-timer-section">
          <TopTimer 
            duration={focusTime} 
            onEnd={onTimerEnd}
            onTimeUpdate={(remaining) => setRemainingTime(remaining)}
            onPauseChange={(paused) => setIsPaused(paused)}
            aria-label="Focus timer"
            hideSandglass={true}
          />
          <FocusHourglass 
            duration={focusTime}
            remaining={remainingTime}
            paused={isPaused}
            aria-label="Focus hourglass animation"
          />
        </div>
      </div>

      {/* Pipeline Status */}
      {videoId && (
        <div className="video-pipeline-section" role="status" aria-live="polite">
          <PipelineFlow 
            jobStatus={jobStatus} 
            onNodeClick={(node) => {
              if (node?.stage) {
                // Handle node click
              }
            }} 
          />
          <TranscriptProgress videoId={videoId} />
        </div>
      )}

      {/* Video Player - YouTube-like size */}
      <div className="video-player-wrapper">
        {videoId && (
          <button
            className="video-close-btn"
            onClick={onClearVideo}
            aria-label="Clear video"
            title="Clear video"
          >
            ✕
          </button>
        )}
        
        {videoId ? (
          <div className="video-player-container">
            <YouTubeEmbed videoId={videoId} />
            <div className="video-capture-controls">
              <VideoCaptureButton videoId={videoId} />
            </div>
          </div>
        ) : (
          <div className="video-placeholder" role="img" aria-label="Video placeholder">
            <p>Paste a YouTube URL to load a video</p>
          </div>
        )}
      </div>
    </div>
  );
}

