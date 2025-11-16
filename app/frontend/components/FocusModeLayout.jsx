import React from 'react';
import YouTubeEmbed from './YouTubeEmbed.jsx';
import AIControlDock from './AIControlDock.jsx';
import './FocusModeLayout.css';

export default function FocusModeLayout({ videoId }){
  return (
    <div className="focus-layout">
      <div className="video-area">
        <YouTubeEmbed videoId={videoId} />
      </div>
      <AIControlDock />
    </div>
  );
}
