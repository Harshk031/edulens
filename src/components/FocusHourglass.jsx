import React, { useMemo, useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './FocusHourglass.css';

export default function FocusHourglass({ duration, remaining, paused, onPause, onResume, onExtend }) {
  const progress = useMemo(() => {
    const d = duration || 1; return Math.max(0, Math.min(1, 1 - remaining / d));
  }, [duration, remaining]);
  const [showMenu, setShowMenu] = useState(false);
  const topRef = useRef(null);
  const botRef = useRef(null);
  const flowRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return; const t = setTimeout(()=>setShowMenu(false), 3000); return () => clearTimeout(t);
  }, [showMenu]);

  // Realistic sand transfer using GSAP; update every change in remaining/duration
  useEffect(() => {
    const topH = 40 * (1 - progress);
    const botH = 40 * progress;
    gsap.to(topRef.current, { height: topH, duration: 0.35, ease: 'power2.out' });
    gsap.to(botRef.current, { height: botH, duration: 0.35, ease: 'power2.out' });
    gsap.to(flowRef.current, { opacity: remaining > 0 && !paused ? 1 : 0, duration: 0.25, ease: 'power2.out' });
  }, [progress, remaining, paused]);

  return (
    <div className="hourglass-container" onClick={() => setShowMenu(true)}>
      <div className={`hourglass ${paused ? 'paused':''}`}> 
        <svg viewBox="0 0 60 100" width="44" height="72" aria-label="Focus hourglass">
          <defs>
            <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e9d5ff"/>
              <stop offset="100%" stopColor="#a78bfa"/>
            </linearGradient>
            <clipPath id="topClip">
              <polygon points="5,5 55,5 30,48" />
            </clipPath>
            <clipPath id="botClip">
              <polygon points="5,95 55,95 30,52" />
            </clipPath>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Frame */}
          <path d="M5 5 H55 M5 95 H55 M5 5 Q30 50 5 95 M55 5 Q30 50 55 95" stroke="url(#hg)" strokeWidth="3" fill="none" filter="url(#glow)" />
          {/* Sand top fill */}
          <g clipPath="url(#topClip)">
            <rect x="5" y="5" width="50" height="40" fill="url(#hg)" opacity="0.18" />
            <rect ref={topRef} className="sand-top" x="5" y="5" width="50" height="40" fill="url(#hg)" />
          </g>
          {/* Falling sand */}
          <rect ref={flowRef} className="sand-flow" x="29" y="46" width="2" height="8" fill="url(#hg)" />
          {/* Sand bottom fill */}
          <g clipPath="url(#botClip)">
            <rect ref={botRef} className="sand-bottom" x="5" y="95" width="50" height="0" fill="url(#hg)" transform="translate(0,-40)" />
          </g>
        </svg>
      </div>
      <span className="timer-label">
        {Math.floor(remaining/60)}:{String(Math.floor(remaining%60)).padStart(2,'0')}
      </span>
      {showMenu && (
        <div className="hourglass-menu">
          {paused ? (
            <button onClick={(e)=>{e.stopPropagation(); onResume && onResume();}}>Resume</button>
          ) : (
            <button onClick={(e)=>{e.stopPropagation(); onPause && onPause();}}>Pause</button>
          )}
          <button onClick={(e)=>{e.stopPropagation(); onExtend && onExtend(5);}}>+5m</button>
        </div>
      )}
    </div>
  );
}
