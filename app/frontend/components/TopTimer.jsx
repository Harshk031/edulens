import { useState, useEffect, useRef } from 'react';
import './TopTimer.css';

export default function TopTimer({ duration: initialDuration = 1500, onEnd, autoStart = false, onTimeUpdate, onPauseChange, hideSandglass = false }) {
  // DEBUG
  console.log('⏱️ TopTimer RENDERED', { initialDuration, autoStart, hideSandglass });
  
  // Get saved duration from localStorage or use initial
  const getSavedDuration = () => {
    try {
      const saved = localStorage.getItem('edulens-timer-duration');
      return saved ? parseInt(saved, 10) : initialDuration;
    } catch {
      return initialDuration;
    }
  };

  const [duration, setDuration] = useState(getSavedDuration());
  const [customMinutes, setCustomMinutes] = useState(Math.floor(duration / 60));
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const sandRootRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const tick = () => {
    if (!startTimeRef.current) return;
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const remaining = Math.max(0, duration - elapsed);
    const progress = Math.min(1, elapsed / duration);

    setTimeLeft(remaining);

    // Notify parent of time update
    if (onTimeUpdate) {
      onTimeUpdate(remaining);
    }

    // Update sandglass CSS variable
    if (sandRootRef.current) {
      sandRootRef.current.style.setProperty('--sand-level', String(progress));
    }

    if (remaining > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setIsRunning(false);
      if (onEnd) onEnd();
    }
  };

  const startTimer = () => {
    if (isRunning) return;
    startTimeRef.current = Date.now() - (duration - timeLeft) * 1000;
    setIsRunning(true);
    setIsPaused(false);
    if (onPauseChange) {
      onPauseChange(false);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const pauseTimer = () => {
    if (!isRunning) return;
    setIsPaused(true);
    setIsRunning(false);
    if (onPauseChange) {
      onPauseChange(true);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration);
    if (onTimeUpdate) {
      onTimeUpdate(duration);
    }
    if (onPauseChange) {
      onPauseChange(false);
    }
    startTimeRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sandRootRef.current) {
      sandRootRef.current.style.setProperty('--sand-level', '0');
    }
  };

  const handleCustomDuration = () => {
    const minutes = parseInt(customMinutes, 10);
    if (isNaN(minutes) || minutes < 1) {
      console.warn('Please enter a valid number of minutes (minimum 1)');
      return;
    }
    const newDuration = minutes * 60;
    setDuration(newDuration);
    setTimeLeft(newDuration);
    try {
      localStorage.setItem('edulens-timer-duration', String(newDuration));
    } catch {}
    setShowCustomInput(false);
    resetTimer();
  };

  useEffect(() => {
    if (autoStart) {
      startTimer();
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="top-timer-container">
      <div className="timer-display" aria-live="polite" aria-atomic="true">
        <span className="time-text">{formatTime(timeLeft)}</span>
        <span className="time-label">Focus Time</span>
      </div>

      {!hideSandglass && (
      <div className="sandglass-container" ref={sandRootRef} aria-label="Timer progress visualizer">
        <svg
          className="sandglass-svg"
          viewBox="0 0 120 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Wood gradient for frame */}
            <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#8B4513', stopOpacity: 1}} />
              <stop offset="50%" style={{stopColor: '#A0522D', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#6B3410', stopOpacity: 1}} />
            </linearGradient>
            
            {/* Sand texture gradient */}
            <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{stopColor: '#F4E4C1', stopOpacity: 1}} />
              <stop offset="50%" style={{stopColor: '#E8D4A0', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#D4B896', stopOpacity: 1}} />
            </linearGradient>

            {/* Glass shine effect */}
            <radialGradient id="glassShine" cx="50%" cy="30%">
              <stop offset="0%" style={{stopColor: '#ffffff', stopOpacity: 0.4}} />
              <stop offset="100%" style={{stopColor: '#ffffff', stopOpacity: 0}} />
            </radialGradient>
          </defs>

          {/* Wooden frame - top */}
          <rect x="10" y="5" width="100" height="12" fill="url(#woodGradient)" rx="2" />
          <rect x="10" y="5" width="100" height="3" fill="#A0522D" opacity="0.6" rx="2" />
          
          {/* Wooden frame - bottom */}
          <rect x="10" y="183" width="100" height="12" fill="url(#woodGradient)" rx="2" />
          <rect x="10" y="192" width="100" height="3" fill="#6B3410" opacity="0.8" rx="2" />

          {/* Wooden posts - left and right */}
          <rect x="10" y="17" width="8" height="166" fill="url(#woodGradient)" />
          <rect x="102" y="17" width="8" height="166" fill="url(#woodGradient)" />
          
          {/* Wood grain details */}
          <line x1="14" y1="20" x2="14" y2="180" stroke="#6B3410" strokeWidth="0.5" opacity="0.3" />
          <line x1="106" y1="20" x2="106" y2="180" stroke="#6B3410" strokeWidth="0.5" opacity="0.3" />

          {/* Glass bulbs outline */}
          <path
            d="M35 20 L85 20 L85 35 L60 95 L85 155 L85 180 L35 180 L35 155 L60 95 L35 35 Z"
            fill="rgba(200, 220, 255, 0.15)"
            stroke="#B8D4E8"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Glass shine overlay */}
          <ellipse cx="50" cy="50" rx="20" ry="25" fill="url(#glassShine)" />
          
          {/* Top sand chamber clip */}
          <clipPath id="topSandClip">
            <path d="M37 22 L83 22 L83 35 L60 93 L37 35 Z" />
          </clipPath>
          
          {/* Top sand with granular texture */}
          <g clipPath="url(#topSandClip)">
            <rect
              className="sand-top"
              x="37"
              y="22"
              width="46"
              height="71"
              fill="url(#sandGradient)"
            />
            {/* Sand granules (small circles for texture) */}
            {[...Array(20)].map((_, i) => (
              <circle
                key={`top-grain-${i}`}
                cx={37 + (i % 5) * 9 + 4}
                cy={25 + Math.floor(i / 5) * 8}
                r="1"
                fill="#C9A86A"
                opacity="0.4"
              />
            ))}
          </g>

          {/* Bottom sand chamber clip */}
          <clipPath id="bottomSandClip">
            <path d="M37 155 L60 97 L83 155 L83 178 L37 178 Z" />
          </clipPath>
          
          {/* Bottom sand with granular texture */}
          <g clipPath="url(#bottomSandClip)">
            <rect
              className="sand-bottom"
              x="37"
              y="97"
              width="46"
              height="81"
              fill="url(#sandGradient)"
            />
            {/* Sand granules */}
            {[...Array(20)].map((_, i) => (
              <circle
                key={`bottom-grain-${i}`}
                cx={37 + (i % 5) * 9 + 4}
                cy={160 + Math.floor(i / 5) * 4}
                r="1"
                fill="#C9A86A"
                opacity="0.4"
              />
            ))}
          </g>

          {/* Neck/center pinch point */}
          <path
            d="M55 95 L65 95"
            stroke="#B8D4E8"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Sand flow particles */}
          {isRunning && (
            <>
              <circle className="sand-flow" cx="60" cy="90" r="1.5" fill="#E8D4A0" opacity="0.9" />
              <circle className="sand-flow" cx="60" cy="93" r="1" fill="#D4B896" opacity="0.7" />
              <circle className="sand-flow" cx="60" cy="88" r="1" fill="#F4E4C1" opacity="0.8" />
            </>
          )}
        </svg>
      </div>
      )}

      <div className="timer-controls">
        {!isRunning && !isPaused && (
          <button
            className="timer-btn start-btn"
            onClick={startTimer}
            aria-label="Start timer"
            tabIndex={0}
          >
            ▶ Start
          </button>
        )}
        {isRunning && (
          <button
            className="timer-btn pause-btn"
            onClick={pauseTimer}
            aria-label="Pause timer"
            tabIndex={0}
          >
            ⏸ Pause
          </button>
        )}
        {isPaused && (
          <button
            className="timer-btn resume-btn"
            onClick={startTimer}
            aria-label="Resume timer"
            tabIndex={0}
          >
            ▶ Resume
          </button>
        )}
        <button
          className="timer-btn reset-btn"
          onClick={resetTimer}
          aria-label="Reset timer"
          tabIndex={0}
        >
          ↻ Reset
        </button>
        <button
          className="timer-btn custom-btn"
          onClick={() => setShowCustomInput(!showCustomInput)}
          aria-label="Set custom duration"
          tabIndex={0}
        >
          ⚙ Custom
        </button>
      </div>

      {showCustomInput && (
        <div className="custom-duration-input">
          <input
            type="number"
            min="1"
            max="240"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            placeholder="Minutes"
            aria-label="Custom duration in minutes"
          />
          <button className="timer-btn apply-btn" onClick={handleCustomDuration}>
            Apply
          </button>
          <button className="timer-btn cancel-btn" onClick={() => setShowCustomInput(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
