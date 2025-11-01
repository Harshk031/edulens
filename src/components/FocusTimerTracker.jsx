import React, { useEffect, useMemo, useRef, useState } from 'react';
import './FocusTimerTracker.css';
import FocusHourglass from './FocusHourglass.jsx';

const LS_KEY = 'edulens.focusTimer.tracker.v1';

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s) return null;
    // If running, compensate time elapsed while app was closed
    if (s.running && !s.paused && s.remaining > 0 && s.lastTick) {
      const diff = Math.floor((Date.now() - s.lastTick) / 1000);
      s.remaining = Math.max(0, s.remaining - diff);
      s.lastTick = Date.now();
    }
    return s;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function FocusTimerTracker() {
  const [duration, setDuration] = useState(25 * 60); // seconds
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const tickRef = useRef(null);

  // restore
  useEffect(() => {
    const s = loadState();
    if (s && typeof s.remaining === 'number') {
      setDuration(s.duration || s.remaining);
      setRemaining(s.remaining);
      setRunning(!!s.running);
      setPaused(!!s.paused);
      setCompleted(!!s.completed);
    }
  }, []);

  // persist every 5s and on changes
  useEffect(() => {
    const snapshot = { duration, remaining, running, paused, completed, lastTick: Date.now() };
    saveState(snapshot);
    const iv = setInterval(() => saveState({ ...snapshot, lastTick: Date.now(), remaining }), 5000);
    return () => clearInterval(iv);
  }, [duration, remaining, running, paused, completed]);

  // ticking
  useEffect(() => {
    if (!running || paused || completed) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    if (!tickRef.current) {
      tickRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) { clearInterval(tickRef.current); tickRef.current = null; setCompleted(true); setRunning(false); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [running, paused, completed]);

  const progress = useMemo(() => {
    const d = duration || 1;
    return Math.max(0, 1 - remaining / d);
  }, [duration, remaining]);

  const startWith = (mins) => {
    const sec = Math.max(1, Math.round(mins * 60));
    setDuration(sec); setRemaining(sec); setRunning(true); setPaused(false); setCompleted(false);
  };

  const extend = (mins) => setRemaining((r) => r + Math.round(mins * 60));

  // UI states
  if (!running && !paused && !completed && remaining === duration) {
    // setup
    return (
      <div className="ftt-root" aria-live="polite">
        <div className="ftt-card">
          <div className="ftt-title">How long would you like to focus?</div>
          <div className="ftt-presets">
            {[15, 30, 45].map((m) => (
              <button key={m} className="ftt-btn" onClick={() => startWith(m)}>{m} min</button>
            ))}
            <div className="ftt-custom">
              <input type="number" min="1" placeholder="Custom" value={customMin} onChange={(e)=>setCustomMin(e.target.value)} />
              <button className="ftt-btn" onClick={() => startWith(Number(customMin||'0'))}>Start</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // completed
  if (completed) {
    return (
      <div className="ftt-root" aria-live="polite">
        <div className="ftt-chip completed">
          <div className="ftt-complete-text">Session Complete 🎯</div>
          <div className="ftt-actions">
            <button className="ftt-btn" onClick={() => startWith((duration/60) || 25)}>Restart</button>
            <button className="ftt-btn" onClick={() => { setCompleted(false); extend(10); setRunning(true); }}>Extend 10m</button>
          </div>
        </div>
      </div>
    );
  }

  // hourglass overlay view
  return (
    <div className="ftt-root" style={{pointerEvents:'none'}}>
      <div style={{position:'relative', pointerEvents:'auto'}}>
        <FocusHourglass
          duration={duration}
          remaining={remaining}
          paused={paused}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onExtend={(m) => extend(m)}
        />
      </div>
    </div>
  );
}