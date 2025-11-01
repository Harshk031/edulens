/**
 * Focus Mode & Analytics Integration
 * Connects FocusLock events to analytics tracking
 */

/**
 * Create analytics middleware for focus mode
 * Tracks all focus session lifecycle events
 */
export function createFocusAnalyticsMiddleware(analytics) {
  return {
    /**
     * When focus mode starts
     */
    onFocusStart: async (session) => {
      try {
        await analytics.startSession(
          session.id,
          session.aiMode || 'offline',
          session.provider || 'groq'
        );
        console.log('[Analytics] Focus session started:', session.id);
      } catch (error) {
        console.error('[Analytics] Failed to log focus start:', error);
      }
    },

    /**
     * When focus mode ends (timer complete or manual exit)
     */
    onFocusEnd: async (session, exitMethod = 'timer') => {
      try {
        const completed = exitMethod === 'timer';
        const score = calculateSessionScore(session);

        await analytics.endSession(session.id, completed, score);

        // Award points
        const pointsEarned = completed ? 10 : 5;
        await analytics.updateGamification(pointsEarned, completed);

        console.log('[Analytics] Focus session ended:', {
          sessionId: session.id,
          method: exitMethod,
          score,
          pointsEarned,
        });

        return { completed, score, pointsEarned };
      } catch (error) {
        console.error('[Analytics] Failed to log focus end:', error);
      }
    },

    /**
     * When focus mode is paused (e.g., for payment)
     */
    onFocusPause: async (session, reason = '') => {
      try {
        await analytics.pauseSession(session.id, reason);
        console.log('[Analytics] Focus session paused:', {
          sessionId: session.id,
          reason,
        });
      } catch (error) {
        console.error('[Analytics] Failed to log focus pause:', error);
      }
    },

    /**
     * When focus mode resumes
     */
    onFocusResume: async (session) => {
      try {
        await analytics.resumeSession(session.id);
        console.log('[Analytics] Focus session resumed:', session.id);
      } catch (error) {
        console.error('[Analytics] Failed to log focus resume:', error);
      }
    },

    /**
     * When early exit payment is initiated
     */
    onPaymentInitiate: async (session, provider) => {
      try {
        await analytics.pauseSession(session.id, `payment_${provider}`);
        console.log('[Analytics] Payment initiated:', {
          sessionId: session.id,
          provider,
        });
      } catch (error) {
        console.error('[Analytics] Failed to log payment:', error);
      }
    },

    /**
     * When early exit payment succeeds
     */
    onPaymentSuccess: async (session, provider) => {
      try {
        await analytics.recordPayment(session.id, provider);
        await analytics.endSession(session.id, false, 50); // Early exit score

        // Award fewer points for early exit
        await analytics.updateGamification(5, false);

        console.log('[Analytics] Early exit via payment:', {
          sessionId: session.id,
          provider,
        });
      } catch (error) {
        console.error('[Analytics] Failed to log payment success:', error);
      }
    },

    /**
     * When distraction is detected
     */
    onDistraction: async (session) => {
      try {
        await analytics.recordDistraction(session.id);
        console.log('[Analytics] Distraction recorded:', session.id);
      } catch (error) {
        console.error('[Analytics] Failed to log distraction:', error);
      }
    },

    /**
     * Check if badge should be awarded based on session
     */
    checkBadgeAward: async (analytics) => {
      try {
        const recommendations = analytics.calculateBadgeRecommendations();
        const newBadges = recommendations.filter(
          (badge) =>
            !analytics.gamification.badges.some((b) => b.id === badge.id)
        );

        if (newBadges.length > 0) {
          await analytics.awardBadges(newBadges);
          console.log('[Analytics] New badges awarded:', newBadges);
          return newBadges;
        }
      } catch (error) {
        console.error('[Analytics] Failed to check badges:', error);
      }
    },
  };
}

/**
 * Calculate session score based on performance
 */
export function calculateSessionScore(session) {
  let score = 50; // Base score

  if (!session) return score;

  // Duration bonus (1 point per minute, max 30)
  const durationMinutes = Math.floor((session.duration || 0) / 60000);
  score += Math.min(durationMinutes, 30);

  // Distraction penalty
  if (session.distractions) {
    score -= session.distractions * 2;
  }

  // Mode bonus
  if (session.aiMode === 'online') {
    score += 10; // Online mode is harder
  }

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Hook into focus mode lifecycle
 * Usage: integrateAnalytics(useFocusMode, useAnalytics)
 */
export function integrateAnalytics(focusHook, analyticsHook) {
  const focusMode = focusHook();
  const analytics = analyticsHook();
  const middleware = createFocusAnalyticsMiddleware(analytics);

  return {
    focus: focusMode,
    analytics,
    middleware,

    /**
     * Start focus mode with analytics
     */
    startFocusWithAnalytics: async (timerDuration, options = {}) => {
      const result = await focusMode.actions.startFocusMode(
        timerDuration,
        options
      );

      if (result.success) {
        await middleware.onFocusStart(result.session);
      }

      return result;
    },

    /**
     * End focus mode with analytics
     */
    endFocusWithAnalytics: async (method = 'timer') => {
      const result = await focusMode.actions.exitFocusMode(method);

      if (result.success) {
        const endResult = await middleware.onFocusEnd(result.session, method);
        const badges = await middleware.checkBadgeAward(analytics);
        return { ...endResult, badges };
      }

      return result;
    },

    /**
     * Pause focus mode with analytics
     */
    pauseFocusWithAnalytics: async (reason = '') => {
      const result = await focusMode.actions.pauseFocusMode();

      if (result.success) {
        await middleware.onFocusPause(focusMode.session, reason);
      }

      return result;
    },

    /**
     * Resume focus mode with analytics
     */
    resumeFocusWithAnalytics: async () => {
      const result = await focusMode.actions.resumeFocusMode();

      if (result.success) {
        await middleware.onFocusResume(focusMode.session);
      }

      return result;
    },

    /**
     * Initiate payment with analytics
     */
    initiatePaymentWithAnalytics: async (provider = 'stripe') => {
      await middleware.onPaymentInitiate(focusMode.session, provider);
      return focusMode.actions.initiatePayment(provider);
    },

    /**
     * Complete payment with analytics
     */
    completePaymentWithAnalytics: async (paymentId, transactionId) => {
      await middleware.onPaymentSuccess(
        focusMode.session,
        focusMode.session?.paymentMethod
      );
      return focusMode.actions.processPaymentSuccess(paymentId, transactionId);
    },
  };
}

/**
 * Helper to format analytics data for display
 */
export function formatAnalyticsForDisplay(analytics) {
  return {
    totalSessions: analytics.summary?.totalSessions || 0,
    focusTime: Math.round((analytics.summary?.totalFocusTime || 0) / 60000),
    completionRate: analytics.summary?.completionRate || 0,
    currentStreak: analytics.gamification?.streak || 0,
    totalPoints: analytics.gamification?.points || 0,
    badges: analytics.gamification?.badges || [],
    nextBadge: getNextBadgeHint(analytics.gamification),
  };
}

/**
 * Get hint about next badge to unlock
 */
export function getNextBadgeHint(gamification) {
  const allBadges = [
    { threshold: 5, name: '🌱 Focus Starter', field: 'totalSessions' },
    { threshold: 20, name: '🧠 Deep Focus Master', field: 'totalSessions' },
    { threshold: 7, name: '⭐ Consistency Hero', field: 'streak' },
    { threshold: 30, name: '👑 Focus Legend', field: 'streak' },
    { threshold: 500, name: '💎 Point Master', field: 'points' },
  ];

  for (const badge of allBadges) {
    const current = gamification[badge.field] || 0;
    if (current < badge.threshold) {
      const remaining = badge.threshold - current;
      return {
        name: badge.name,
        progress: current,
        threshold: badge.threshold,
        remaining,
      };
    }
  }

  return null;
}
