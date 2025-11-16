import React from 'react';
import { useFocusTimer } from '../store/focusTimerContext.jsx';
import './FocusTimerOverlay.css';

function fmt(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function FocusTimerOverlay() {
  const { secondsLeft, running, ended, actions } = useFocusTimer();

  return (
    <div className={`focus-timer-overlay ${ended ? 'ended' : ''}`}>
      <div className="timer-chip" title="Click to pause/resume" onClick={() => (running ? actions.pause() : actions.resume())}>
        <span className="digits">{fmt(secondsLeft)}</span>
        <span className="status">{ended ? 'Done' : running ? 'Running' : 'Paused'}</span>
      </div>
      {ended && (
        <div className="ended-banner">
          <div className="ended-title">Session Complete</div>
          <button className="ended-btn" onClick={() => actions.reset()}>Reset</button>
        </div>
      )}
    </div>
  );
}