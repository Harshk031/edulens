import { useEffect, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

/**
 * Hook to manage focus mode with Electron integration
 */
export default function useFocusMode() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timerStarted, setTimerStarted] = useState(false);

  // Check if we have Electron IPC available
  const hasIPC = () => {
    return typeof window !== 'undefined' && window.electronAPI;
  };

  /**
   * Start focus mode
   */
  const startFocusMode = useCallback(
    async (timerDuration = 1800000, options = {}) => {
      setLoading(true);
      setError(null);

      try {
        const sessionData = {
          id: Date.now(),
          startTime: Date.now(),
          timerDuration,
          elapsedTime: 0,
          status: 'active',
          aiMode: options.aiMode || 'offline',
          provider: options.provider || 'groq',
          transcript: options.transcript || '',
          aiContext: options.aiContext || {},
          metadata: options.metadata || {},
        };

        // Call backend to save and start focus mode
        const response = await fetch(`${API_BASE}/api/focus/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData),
        });

        if (!response.ok) {
          throw new Error('Failed to start focus mode');
        }

        const result = await response.json();
        setSession(result.session);
        setTimeLeft(timerDuration);
        setIsFocusMode(true);

        // If Electron available, send IPC signal
        if (hasIPC() && window.electronAPI.startFocusMode) {
          window.electronAPI.startFocusMode(result.session);
        }

        // Verify AI bridge health on start
        try {
          const hc = await fetch(`${API_BASE}/health`).then(r=>r.ok);
          if (hc) console.log('💬 AI Bridge Restored (Groq/Ollama)');
        } catch {}

        console.log('⏱️ Focus Mode Overlay Engaged');
        return { success: true, session: result.session };
      } catch (err) {
        const msg = err.message || 'Failed to start focus mode';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Exit focus mode
   */
  const exitFocusMode = useCallback(
    async (method = 'focusButton', reason = '') => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/focus/exit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, reason, sessionId: session?.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to exit focus mode');
        }

        const result = await response.json();
        setIsFocusMode(false);
        setSession(null);

        // If Electron available, send IPC signal
        if (hasIPC() && window.electronAPI.exitFocusMode) {
          window.electronAPI.exitFocusMode(method);
        }

        return { success: true, session: result.session };
      } catch (err) {
        const msg = err.message || 'Failed to exit focus mode';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  /**
   * Pause focus mode (for payment screen)
   */
  const pauseFocusMode = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/focus/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session?.id }),
      });

      if (!response.ok) throw new Error('Failed to pause');

      if (hasIPC() && window.electronAPI.pauseFocusMode) {
        window.electronAPI.pauseFocusMode();
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Resume focus mode
   */
  const resumeFocusMode = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/focus/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session?.id }),
      });

      if (!response.ok) throw new Error('Failed to resume');

      if (hasIPC() && window.electronAPI.resumeFocusMode) {
        window.electronAPI.resumeFocusMode();
      }

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [session]);

  /**
   * Initiate early exit payment
   */
  const initiatePayment = useCallback(
    async (provider = 'stripe') => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/payment/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session?.id,
            provider,
          }),
        });

        if (!response.ok) throw new Error('Failed to initiate payment');

        const result = await response.json();

        // Pause focus mode for payment
        await pauseFocusMode();

        return { success: true, payment: result };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [session, pauseFocusMode]
  );

  /**
   * Process payment success
   */
  const processPaymentSuccess = useCallback(
    async (paymentId, transactionId) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/api/payment/success`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            transactionId,
            sessionId: session?.id,
          }),
        });

        if (!response.ok) throw new Error('Failed to process payment');

        // Allow exit after payment
        await exitFocusMode('payment', 'Early exit via payment');

        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [session, exitFocusMode]
  );

  /**
   * Get focus status from backend
   */
  const getFocusStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/focus/status`);
      if (!response.ok) throw new Error('Failed to get status');
      const result = await response.json();
      setSession(result.session);
      setIsFocusMode(result.isFocusMode);
      return result;
    } catch (err) {
      console.error('Error getting focus status:', err);
      return null;
    }
  }, []);

  // Listen for IPC events from Electron
  useEffect(() => {
    if (!hasIPC()) return;

    const handleFocusStarted = (event, data) => {
      setSession(data);
      setIsFocusMode(true);
      setTimeLeft(data.timerDuration);
    };

    const handleFocusEnded = (event, data) => {
      setIsFocusMode(false);
      setSession(null);
    };

    const handleExitBlocked = (event, data) => {
      console.log('Exit blocked:', data);
    };

    if (window.electronAPI?.onFocusModeStarted) {
      window.electronAPI.onFocusModeStarted(handleFocusStarted);
    }
    if (window.electronAPI?.onFocusModeEnded) {
      window.electronAPI.onFocusModeEnded(handleFocusEnded);
    }
    if (window.electronAPI?.onExitBlocked) {
      window.electronAPI.onExitBlocked(handleExitBlocked);
    }

    return () => {
      // Cleanup listeners
    };
  }, []);

  // Delay timer start until UI is ready
  useEffect(() => {
    if (isFocusMode && !timerStarted) {
      const t = setTimeout(() => setTimerStarted(true), 3000);
      return () => clearTimeout(t);
    }
    if (!isFocusMode && timerStarted) {
      setTimerStarted(false);
    }
  }, [isFocusMode, timerStarted]);

  // Safe ESC handling
  useEffect(() => {
    const onKey = (e) => {
      if (!isFocusMode) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        exitFocusMode('escape', 'User pressed ESC');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFocusMode, exitFocusMode]);

  // Check for pending focus session on mount
  useEffect(() => {
    getFocusStatus();
  }, []);

  return {
    isFocusMode,
    session,
    timeLeft,
    loading,
    error,
    timerStarted,
    actions: {
      startFocusMode,
      exitFocusMode,
      pauseFocusMode,
      resumeFocusMode,
      initiatePayment,
      processPaymentSuccess,
      getFocusStatus,
    },
  };
}
