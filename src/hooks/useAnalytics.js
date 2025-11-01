import { useState, useCallback, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';
const DEFAULT_USER_ID = 'default-user';

/**
 * Hook to manage analytics, gamification, and session tracking
 */
export default function useAnalytics(userId = DEFAULT_USER_ID) {
  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [gamification, setGamification] = useState({
    points: 0,
    streak: 0,
    badges: [],
    totalSessions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentEvent, setRecentEvent] = useState(null);

  /**
   * Fetch analytics summary
   */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/analytics/summary/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch summary');

      const data = await response.json();
      setSummary(data.summary);
      return data.summary;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Fetch all sessions
   */
  const fetchSessions = useCallback(
    async (limit = 50, offset = 0) => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/analytics/sessions/${userId}?limit=${limit}&offset=${offset}`
        );
        if (!response.ok) throw new Error('Failed to fetch sessions');

        const data = await response.json();
        setSessions(data.sessions);
        return data;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Log a session event
   */
  const logEvent = useCallback(
    async (sessionId, eventType, eventData = {}) => {
      try {
        const response = await fetch(`${API_BASE}/api/analytics/log-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            sessionId,
            eventType,
            eventData,
          }),
        });

        if (!response.ok) throw new Error('Failed to log event');

        const data = await response.json();
        setRecentEvent({
          type: eventType,
          timestamp: Date.now(),
        });

        // Refresh summary after event
        await fetchSummary();

        return data;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [userId, fetchSummary]
  );

  /**
   * Start a focus session
   */
  const startSession = useCallback(
    async (sessionId, aiMode, provider) => {
      return logEvent(sessionId, 'start', {
        aiMode,
        provider,
        timestamp: Date.now(),
      });
    },
    [logEvent]
  );

  /**
   * End a focus session
   */
  const endSession = useCallback(
    async (sessionId, completed, score) => {
      return logEvent(sessionId, 'end', {
        completed,
        score,
        timestamp: Date.now(),
      });
    },
    [logEvent]
  );

  /**
   * Log a distraction event
   */
  const recordDistraction = useCallback(
    async (sessionId) => {
      return logEvent(sessionId, 'distraction', {
        timestamp: Date.now(),
      });
    },
    [logEvent]
  );

  /**
   * Log a pause event
   */
  const pauseSession = useCallback(
    async (sessionId, reason = '') => {
      return logEvent(sessionId, 'pause', {
        reason,
        timestamp: Date.now(),
      });
    },
    [logEvent]
  );

  /**
   * Log a resume event
   */
  const resumeSession = useCallback(
    async (sessionId) => {
      return logEvent(sessionId, 'resume', {
        timestamp: Date.now(),
      });
    },
    [logEvent]
  );

  /**
   * Log a payment/early exit event
   */
  const recordPayment = useCallback(
    async (sessionId, provider) => {
      return logEvent(sessionId, 'payment', {
        provider,
        timestamp: Date.now(),
      });
    },
    [logEvent]
  );

  /**
   * Fetch gamification state
   */
  const fetchGamification = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/gamification/${userId}`
      );
      if (!response.ok) throw new Error('Failed to fetch gamification');

      const data = await response.json();
      setGamification(data.gamification);
      return data.gamification;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Update gamification (points, streaks, badges)
   */
  const updateGamification = useCallback(
    async (pointsEarned = 0, sessionCompleted = false, badges = []) => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/analytics/gamification/${userId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pointsEarned,
              sessionCompleted,
              badges,
            }),
          }
        );

        if (!response.ok) throw new Error('Failed to update gamification');

        const data = await response.json();
        setGamification(data.gamification);
        return data.gamification;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Award badges
   */
  const awardBadges = useCallback(
    async (badgesToAward) => {
      return updateGamification(0, false, badgesToAward);
    },
    [updateGamification]
  );

  /**
   * Export sessions to CSV
   */
  const exportToCSV = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/export/csv/${userId}`
      );
      if (!response.ok) throw new Error('Failed to export CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [userId]);

  /**
   * Get analytics for date range
   */
  const getDateRangeAnalytics = useCallback(
    async (startDate, endDate) => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/analytics/range/${userId}?startDate=${startDate}&endDate=${endDate}`
        );
        if (!response.ok) throw new Error('Failed to fetch date range analytics');

        const data = await response.json();
        return data.stats;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  /**
   * Delete all analytics history
   */
  const deleteHistory = useCallback(async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) {
      return { success: false };
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/analytics/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete history');

      setSessions([]);
      setSummary(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Calculate badge recommendations based on current stats
   */
  const calculateBadgeRecommendations = useCallback(() => {
    const recommendations = [];

    if (gamification.totalSessions >= 5) {
      recommendations.push({
        id: 'starter',
        name: '🌱 Focus Starter',
        description: '5 completed sessions',
      });
    }

    if (gamification.totalSessions >= 20) {
      recommendations.push({
        id: 'deep-focus',
        name: '🧠 Deep Focus Master',
        description: '20 completed sessions',
      });
    }

    if (gamification.streak >= 7) {
      recommendations.push({
        id: 'consistency-hero',
        name: '⭐ Consistency Hero',
        description: '7-day streak',
      });
    }

    if (gamification.streak >= 30) {
      recommendations.push({
        id: 'legend',
        name: '👑 Focus Legend',
        description: '30-day streak',
      });
    }

    if (gamification.points >= 500) {
      recommendations.push({
        id: 'point-master',
        name: '💎 Point Master',
        description: '500 points earned',
      });
    }

    return recommendations;
  }, [gamification]);

  /**
   * Initialize analytics on mount
   */
  useEffect(() => {
    fetchSummary();
    fetchGamification();
    fetchSessions();
  }, []);

  return {
    // State
    summary,
    sessions,
    gamification,
    loading,
    error,
    recentEvent,

    // Session logging
    logEvent,
    startSession,
    endSession,
    recordDistraction,
    pauseSession,
    resumeSession,
    recordPayment,

    // Gamification
    fetchGamification,
    updateGamification,
    awardBadges,
    calculateBadgeRecommendations,

    // Data fetching
    fetchSummary,
    fetchSessions,
    getDateRangeAnalytics,

    // Export & deletion
    exportToCSV,
    deleteHistory,
  };
}
