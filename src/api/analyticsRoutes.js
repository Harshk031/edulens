import express from 'express';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { Parser } from 'json2csv';

const router = express.Router();

// Compute a writable app data directory without depending on Electron
const getUserDataPath = () => {
  try {
    const localApp = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(process.env.USERPROFILE || os.homedir(), 'AppData', 'Local');
    return path.join(localApp, 'EduLensHybrid');
  } catch {
    return path.join(process.cwd(), '.data');
  }
};

/**
 * Get user analytics summary
 */
router.get('/analytics/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const analyticsData = await loadUserAnalytics(userId);

    const summary = {
      totalSessions: analyticsData.sessions?.length || 0,
      totalFocusTime: calculateTotalTime(analyticsData.sessions),
      completionRate:
        calculateCompletionRate(analyticsData.sessions) || 0,
      currentStreak: analyticsData.gamification?.streak || 0,
      totalPoints: analyticsData.gamification?.points || 0,
      badges: analyticsData.gamification?.badges || [],
      averageSessionDuration:
        calculateAverageSessionDuration(analyticsData.sessions) || 0,
    };

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all sessions for a user
 */
router.get('/analytics/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const analyticsData = await loadUserAnalytics(userId);
    const sessions = analyticsData.sessions || [];

    // Sort by date descending
    sessions.sort((a, b) => b.startTime - a.startTime);

    const paginated = sessions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      sessions: paginated,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Log session event (start, end, pause, resume, payment)
 */
router.post('/analytics/log-event', async (req, res) => {
  try {
    const { userId, sessionId, eventType, eventData } = req.body;

    // Validate required fields
    if (!userId || !sessionId || !eventType) {
      return res
        .status(400)
        .json({ error: 'Missing required fields' });
    }

    const analyticsData = await loadUserAnalytics(userId);

    // Find or create session record
    let sessionRecord = analyticsData.sessions?.find(
      (s) => s.id === sessionId
    );

    if (!sessionRecord && eventType === 'start') {
      sessionRecord = {
        id: sessionId,
        startTime: Date.now(),
        events: [],
        duration: 0,
        completed: false,
        distractions: 0,
        aiMode: eventData?.aiMode || 'offline',
        provider: eventData?.provider || 'groq',
        score: 0,
      };
      analyticsData.sessions = analyticsData.sessions || [];
      analyticsData.sessions.push(sessionRecord);
    }

    if (sessionRecord) {
      // Add event to timeline
      sessionRecord.events.push({
        type: eventType,
        timestamp: Date.now(),
        data: eventData || {},
      });

      // Update session based on event type
      if (eventType === 'end') {
        sessionRecord.endTime = Date.now();
        sessionRecord.duration =
          sessionRecord.endTime - sessionRecord.startTime;
        sessionRecord.completed =
          eventData?.completed !== false;
        sessionRecord.score = eventData?.score || 0;
      } else if (eventType === 'distraction') {
        sessionRecord.distractions =
          (sessionRecord.distractions || 0) + 1;
      } else if (eventType === 'payment') {
        sessionRecord.earlyExit = true;
        sessionRecord.paymentMethod =
          eventData?.provider || 'unknown';
      }
    }

    // Save analytics
    await saveUserAnalytics(userId, analyticsData);

    res.json({ success: true, session: sessionRecord });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get or update gamification state
 */
router.get('/analytics/gamification/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const analyticsData = await loadUserAnalytics(userId);

    const gamification = analyticsData.gamification || {
      points: 0,
      streak: 0,
      badges: [],
      lastSessionDate: null,
      totalSessions: 0,
    };

    res.json({ success: true, gamification });
  } catch (error) {
    console.error('Error getting gamification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update gamification state (points, streaks, badges)
 */
router.post('/analytics/gamification/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { pointsEarned, sessionCompleted, badges } = req.body;

    const analyticsData = await loadUserAnalytics(userId);
    const gamification = analyticsData.gamification || {
      points: 0,
      streak: 0,
      badges: [],
      lastSessionDate: null,
      totalSessions: 0,
    };

    // Update points
    if (pointsEarned) {
      gamification.points = (gamification.points || 0) + pointsEarned;
    }

    // Update streak
    if (sessionCompleted) {
      const today = new Date().toDateString();
      const lastSession = gamification.lastSessionDate;

      if (lastSession !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastSession === yesterday.toDateString()) {
          // Streak continues
          gamification.streak = (gamification.streak || 0) + 1;
        } else {
          // Streak resets
          gamification.streak = 1;
        }

        gamification.lastSessionDate = today;
        gamification.totalSessions = (gamification.totalSessions || 0) + 1;
      }
    }

    // Add badges
    if (badges && Array.isArray(badges)) {
      gamification.badges = gamification.badges || [];
      badges.forEach((badge) => {
        if (!gamification.badges.find((b) => b.id === badge.id)) {
          gamification.badges.push({
            id: badge.id,
            name: badge.name,
            earnedAt: Date.now(),
          });
        }
      });
    }

    analyticsData.gamification = gamification;
    await saveUserAnalytics(userId, analyticsData);

    res.json({ success: true, gamification });
  } catch (error) {
    console.error('Error updating gamification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export sessions to CSV
 */
router.get('/analytics/export/csv/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const analyticsData = await loadUserAnalytics(userId);

    if (!analyticsData.sessions || analyticsData.sessions.length === 0) {
      return res.status(404).json({ error: 'No sessions found' });
    }

    // Format sessions for CSV
    const sessions = analyticsData.sessions.map((s) => ({
      'Session ID': s.id,
      'Start Time': new Date(s.startTime).toISOString(),
      'Duration (minutes)': Math.round(s.duration / 60000),
      'Completed': s.completed ? 'Yes' : 'No',
      'AI Mode': s.aiMode,
      'Provider': s.provider,
      'Score': s.score,
      'Distractions': s.distractions || 0,
      'Early Exit': s.earlyExit ? 'Yes' : 'No',
    }));

    const opts = { fields: Object.keys(sessions[0]) };
    const parser = new Parser(opts);
    const csv = parser.parse(sessions);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=sessions.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete user analytics history
 */
router.delete('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const appDataPath = getUserDataPath();
    const analyticsPath = path.join(
      appDataPath,
      'insights',
      userId,
      'analytics.enc'
    );

    if (await fs.pathExists(analyticsPath)) {
      await fs.remove(analyticsPath);
    }

    res.json({ success: true, message: 'Analytics history deleted' });
  } catch (error) {
    console.error('Error deleting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get analytics for date range
 */
router.get('/analytics/range/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const analyticsData = await loadUserAnalytics(userId);
    const sessions = analyticsData.sessions || [];

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const filtered = sessions.filter(
      (s) => s.startTime >= start && s.startTime <= end
    );

    const stats = {
      sessionCount: filtered.length,
      totalFocusTime: calculateTotalTime(filtered),
      completionRate: calculateCompletionRate(filtered),
      averageDuration:
        calculateAverageSessionDuration(filtered),
      sessions: filtered,
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting analytics range:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= Helper Functions =============

/**
 * Load encrypted user analytics
 */
async function loadUserAnalytics(userId) {
  try {
    const appDataPath = getUserDataPath();
    const userDir = path.join(appDataPath, 'insights', userId);
    const analyticsPath = path.join(userDir, 'analytics.enc');

    if (await fs.pathExists(analyticsPath)) {
      const encrypted = await fs.readFile(analyticsPath, 'utf-8');
      return decryptData(encrypted);
    }

    return {
      userId,
      sessions: [],
      gamification: {
        points: 0,
        streak: 0,
        badges: [],
        lastSessionDate: null,
        totalSessions: 0,
      },
    };
  } catch (error) {
    console.error('Error loading analytics:', error);
    return {
      userId,
      sessions: [],
      gamification: {
        points: 0,
        streak: 0,
        badges: [],
      },
    };
  }
}

/**
 * Save encrypted user analytics
 */
async function saveUserAnalytics(userId, analyticsData) {
  try {
    const appDataPath = getUserDataPath();
    const userDir = path.join(appDataPath, 'insights', userId);
    await fs.ensureDir(userDir);

    const analyticsPath = path.join(userDir, 'analytics.enc');
    const encrypted = encryptData(analyticsData);
    await fs.writeFile(analyticsPath, encrypted, 'utf-8');
  } catch (error) {
    console.error('Error saving analytics:', error);
  }
}

/**
 * Encrypt data
 */
function encryptData(data) {
  const secretKey =
    process.env.FOCUS_SECRET_KEY || 'dev-secret-key-32-chars-min-req';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(secretKey.padEnd(32, '0').slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
  });
}

/**
 * Decrypt data
 */
function decryptData(encrypted) {
  try {
    const secretKey =
      process.env.FOCUS_SECRET_KEY || 'dev-secret-key-32-chars-min-req';
    const { iv, data } = JSON.parse(encrypted);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(secretKey.padEnd(32, '0').slice(0, 32)),
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
}

/**
 * Calculate total focus time in milliseconds
 */
function calculateTotalTime(sessions) {
  return (sessions || []).reduce((sum, s) => sum + (s.duration || 0), 0);
}

/**
 * Calculate completion rate percentage
 */
function calculateCompletionRate(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const completed = sessions.filter((s) => s.completed).length;
  return Math.round((completed / sessions.length) * 100);
}

/**
 * Calculate average session duration in milliseconds
 */
function calculateAverageSessionDuration(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const total = calculateTotalTime(sessions);
  return Math.round(total / sessions.length);
}

export default router;
