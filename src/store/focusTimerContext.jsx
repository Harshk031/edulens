import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const FocusTimerCtx = createContext(null);

export function FocusTimerProvider({ children, defaultMinutes = 30 }) {
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const tickRef = useRef(null);

  // Restore from main (electron-store) if available
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await window?.electronAPI?.timerGet?.();
        if (mounted && state && typeof state.secondsLeft === 'number') {
          setSecondsLeft(state.secondsLeft);
          setRunning(!!state.running);
          setEnded(!!state.ended);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Persist to main every 5s
  useEffect(() => {
    const report = () => {
      try { window?.electronAPI?.timerSync?.({ secondsLeft, running, ended }); } catch {}
    };
    const iv = setInterval(report, 5000);
    return () => clearInterval(iv);
  }, [secondsLeft, running, ended]);

  // Countdown
  useEffect(() => {
    if (!running || ended) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    if (!tickRef.current) {
      tickRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(tickRef.current); tickRef.current = null;
            setRunning(false); setEnded(true);
            try { window?.electronAPI?.focusEnd?.(); } catch {}
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [running, ended]);

  const actions = useMemo(() => ({
    start: (minutes) => { setSecondsLeft((minutes ?? defaultMinutes) * 60); setEnded(false); setRunning(true); },
    pause: () => setRunning(false),
    resume: () => { if (!ended) setRunning(true); },
    reset: (minutes) => { setSecondsLeft((minutes ?? defaultMinutes) * 60); setEnded(false); setRunning(false); },
  }), [defaultMinutes, ended]);

  const value = useMemo(() => ({ secondsLeft, running, ended, actions }), [secondsLeft, running, ended, actions]);
  return <FocusTimerCtx.Provider value={value}>{children}</FocusTimerCtx.Provider>;
}

export function useFocusTimer() { return useContext(FocusTimerCtx); }
