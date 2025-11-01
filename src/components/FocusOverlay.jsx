import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './FocusOverlay.css';

export default function FocusOverlay({
  timerDuration = 1800000, // 30 min default
  onExit,
  onPaymentClick,
  aiMode = 'offline',
  provider = 'groq',
  startNow = false,
}) {
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isActive, setIsActive] = useState(false); // start when UI is ready
  const [distractionsBlocked, setDistractionsBlocked] = useState(0);
  const hourglassRef = useRef(null);
  const timerRef = useRef(null);
  const messageRef = useRef(null);
  const interactionRef = useRef(0);

  // Format time
  const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Hourglass animation
  useEffect(() => {
    if (!hourglassRef.current) return;

    const tl = gsap.timeline({ repeat: -1 });

    // Flip animation
    tl.to(hourglassRef.current, {
      rotationZ: 180,
      duration: 0.5,
      ease: 'back.inOut',
    })
      .to(
        hourglassRef.current,
        {
          rotationZ: 360,
          duration: 0.5,
          ease: 'back.inOut',
        },
        0.5
      )
      .to(hourglassRef.current, {
        rotationZ: 360,
        duration: 2,
      });

    return () => tl.kill();
  }, []);

// Start when startNow becomes true (from App once UI settled)
useEffect(() => {
  if (startNow && !isActive) {
    setIsActive(true);
  }
}, [startNow]);

// Timer countdown
useEffect(() => {
  if (!isActive || timeLeft <= 0) {
    if (timeLeft <= 0 && isActive) {
      handleTimerExpired();
    }
    return;
  }

  const interval = setInterval(() => {
    setTimeLeft((prev) => {
      const newTime = prev - 1000;
      if (newTime <= 0) {
        setIsActive(false);
      }
      return Math.max(0, newTime);
    });
  }, 1000);

  return () => clearInterval(interval);
}, [isActive, timeLeft]);

  // Timer countdown animation
  useEffect(() => {
    if (!timerRef.current) return;

    gsap.to(timerRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.1,
      repeat: 0,
    });
  }, [timeLeft]);

  // Motivational messages on distraction attempts
  const showMotivationalMessage = () => {
    interactionRef.current += 1;
    setDistractionsBlocked((prev) => prev + 1);

    const messages = [
      '🔒 Stay focused! Timer is running.',
      '💪 You\'ve got this! Keep going.',
      '⏱️ Time is precious – don\'t break now.',
      '🎯 Focus mode: Exit only via timer or payment.',
      '✨ Your progress matters – stay locked in.',
      '🚀 Almost there! Don\'t quit now.',
    ];

    const msg = messages[interactionRef.current % messages.length];

    if (messageRef.current) {
      gsap.to(messageRef.current, {
        opacity: 0,
        duration: 0.1,
        onComplete: () => {
          messageRef.current.textContent = msg;
          gsap.to(messageRef.current, {
            opacity: 1,
            duration: 0.5,
          });

          // Fade out after 3 seconds
          gsap.to(messageRef.current, {
            opacity: 0,
            duration: 1,
            delay: 3,
          });
        },
      });
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Alt' || (e.ctrlKey && e.key === 'w')) {
        e.preventDefault();
        showMotivationalMessage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle timer expiry
  const handleTimerExpired = () => {
    gsap.to('.focus-overlay', {
      opacity: 0,
      duration: 1,
      onComplete: () => {
        if (onExit) onExit('timer', 'Timer naturally expired');
      },
    });
  };

  // Calculate progress percentage
  const progressPercent = ((timerDuration - timeLeft) / timerDuration) * 100;

  useEffect(() => {
    gsap.fromTo('.focus-overlay', { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' });
  }, []);

  return (
    <div className="focus-overlay" aria-live="polite">
      <div className="focus-container">
        {/* Header */}
        <div className="focus-header">
          <h1><span className="lock" aria-hidden="true">🔒</span> FOCUS MODE ACTIVE</h1>
          <p className="focus-subtitle">
            Fully Immersive AI Learning Environment
          </p>
        </div>

        {/* Main Content */}
        <div className="focus-content">
          {/* Hourglass Animation */}
          <div className="hourglass-section">
            <div className="hourglass" ref={hourglassRef}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 10 L20 35 Q20 40 25 40 Q30 40 30 35 L30 10 M50 10 L50 35 Q50 40 55 40 Q60 40 60 35 L60 10 M20 10 L60 10 M20 70 L60 70 M25 40 L55 40 M30 65 Q30 70 35 70 L45 70 Q50 70 50 65 L30 65 Z"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="hourglass-text">Time Flowing...</p>
          </div>

          {/* Timer Display */}
          <div className="timer-section focus-timer-container" ref={timerRef}>
            <div className="timer-display">{formatTime(timeLeft)}</div>
            <p className="timer-label">Time Remaining</p>

            {/* Lock badge & disabled exit */}
            <div className="lock-badge">🔒 Exit disabled until timer ends</div>
            
            {/* Progress Bar */}
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stats Panel */}
          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">AI Mode</span>
              <span className="stat-value">{aiMode.toUpperCase()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Provider</span>
              <span className="stat-value">{provider.toUpperCase()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Blocked</span>
              <span className="stat-value">{distractionsBlocked}</span>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="message-area" ref={messageRef}>
            💡 Welcome to Focus Mode
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="focus-controls">
          <button
            className="btn btn-payment"
            onClick={() => {
              if (onPaymentClick) onPaymentClick('stripe');
            }}
          >
            💳 Unlock Early ($0.99)
          </button>

          <button
            className="btn btn-stats"
            onClick={() => {
              // Show extended stats
              const stats = {
                elapsed: timerDuration - timeLeft,
                distractionsBlocked,
                aiMode,
                provider,
              };
              console.log('Session Stats:', stats);
            }}
          >
            📊 Stats
          </button>
        </div>

        {/* Global Exit button (bottom-right) */}
        <button
          className="overlay-exit"
          onClick={() => onExit && onExit('button', 'User requested exit')}
          title="Exit Focus Mode"
        >
          Exit Focus Mode
        </button>

        {/* Fullscreen Indicator */}
        <div className="fullscreen-indicator">
          🖥️ Fullscreen | Keyboard Shortcuts Disabled | Exit via Timer or Payment Only
        </div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
