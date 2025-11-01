import React, { useMemo, useState, useEffect } from 'react';
import './FocusHourglass.css';

export default function FocusHourglass({ duration, remaining, paused, onPause, onResume, onExtend }) {
  const progress = useMemo(() => {
    const d = duration || 1; return Math.max(0, Math.min(1, 1 - remaining / d));
  }, [duration, remaining]);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!showMenu) return; const t = setTimeout(()=>setShowMenu(false), 3000); return () => clearTimeout(t);
  }, [showMenu]);

  return (
    <div className="hourglass-container" style={{ ['--progress']: `${progress*100}%` }} onClick={() => setShowMenu(true)}>
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
          </defs>
          {/* Frame */}
          <path d="M5 5 H55 M5 95 H55 M5 5 Q30 50 5 95 M55 5 Q30 50 55 95" stroke="url(#hg)" strokeWidth="3" fill="none" />
          {/* Sand top fill */}
          <g clipPath="url(#topClip)">
            <rect x="5" y="5" width="50" height="40" fill="url(#hg)" opacity="0.25" />
            <rect className="sand-top" x="5" y="5" width="50" height="40" fill="url(#hg)" />
          </g>
          {/* Falling sand */}
          <rect className="sand-flow" x="29" y="46" width="2" height="8" fill="url(#hg)" />
          {/* Sand bottom fill */}
          <g clipPath="url(#botClip)">
            <rect className="sand-bottom" x="5" y="55" width="50" height="40" fill="url(#hg)" />
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