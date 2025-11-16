/**
 * Frontend Analytics Routes
 * Handles analytics data collection and reporting
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Analytics data storage path
const getAnalyticsPath = () => {
  return path.join(__dirname, '..', '..', '..', 'data', 'storage', 'analytics.json');
};

/**
 * Ensure analytics file exists
 */
function ensureAnalyticsFile() {
  const analyticsPath = getAnalyticsPath();
  
  if (!fs.existsSync(analyticsPath)) {
    const initialData = {
      sessions: [],
      events: [],
      videos: {},
      users: {},
      summary: {
        totalSessions: 0,
        totalEvents: 0,
        totalVideos: 0,
        totalUsers: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    fs.writeFileSync(analyticsPath, JSON.stringify(initialData, null, 2));
  }
}

/**
 * Load analytics data
 */
function loadAnalytics() {
  try {
    ensureAnalyticsFile();
    const analyticsPath = getAnalyticsPath();
    const data = fs.readFileSync(analyticsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Analytics] Error loading data:', error);
    return {
      sessions: [],
      events: [],
      videos: {},
      users: {},
      summary: {
        totalSessions: 0,
        totalEvents: 0,
        totalVideos: 0,
        totalUsers: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Save analytics data
 */
function saveAnalytics(data) {
  try {
    const analyticsPath = getAnalyticsPath();
    data.summary.lastUpdated = new Date().toISOString();
    fs.writeFileSync(analyticsPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[Analytics] Error saving data:', error);
    return false;
  }
}

// GET /api/analytics - Get analytics summary
router.get('/', (req, res) => {
  try {
    console.log('[Analytics] Getting analytics summary');
    const analytics = loadAnalytics();
    
    res.json({
      success: true,
      summary: analytics.summary,
      recentSessions: analytics.sessions.slice(-10),
      recentEvents: analytics.events.slice(-20),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Analytics] Error getting summary:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

// POST /api/analytics/session - Track session
router.post('/session', (req, res) => {
  try {
    const { sessionId, videoId, startTime, endTime, duration, events } = req.body;
    console.log(`[Analytics] Tracking session: ${sessionId}`);
    
    const analytics = loadAnalytics();
    
    const session = {
      sessionId: sessionId || `session_${Date.now()}`,
      videoId: videoId || 'unknown',
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date().toISOString(),
      duration: duration || 0,
      events: events || [],
      timestamp: new Date().toISOString()
    };
    
    analytics.sessions.push(session);
    analytics.summary.totalSessions++;
    
    // Update video stats
    if (videoId) {
      if (!analytics.videos[videoId]) {
        analytics.videos[videoId] = {
          videoId: videoId,
          sessions: 0,
          totalDuration: 0,
          events: []
        };
        analytics.summary.totalVideos++;
      }
      
      analytics.videos[videoId].sessions++;
      analytics.videos[videoId].totalDuration += duration || 0;
    }
    
    saveAnalytics(analytics);
    
    res.json({
      success: true,
      sessionId: session.sessionId,
      message: 'Session tracked successfully'
    });
    
  } catch (error) {
    console.error('[Analytics] Error tracking session:', error);
    res.status(500).json({
      error: 'Failed to track session',
      message: error.message
    });
  }
});

// POST /api/analytics/event - Track event
router.post('/event', (req, res) => {
  try {
    const { eventType, eventData, sessionId, videoId, timestamp } = req.body;
    console.log(`[Analytics] Tracking event: ${eventType}`);
    
    const analytics = loadAnalytics();
    
    const event = {
      eventType: eventType || 'unknown',
      eventData: eventData || {},
      sessionId: sessionId || 'unknown',
      videoId: videoId || 'unknown',
      timestamp: timestamp || new Date().toISOString()
    };
    
    analytics.events.push(event);
    analytics.summary.totalEvents++;
    
    // Update video events
    if (videoId && analytics.videos[videoId]) {
      analytics.videos[videoId].events.push(event);
    }
    
    saveAnalytics(analytics);
    
    res.json({
      success: true,
      eventType: event.eventType,
      message: 'Event tracked successfully'
    });
    
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
    res.status(500).json({
      error: 'Failed to track event',
      message: error.message
    });
  }
});

// GET /api/analytics/video/:videoId - Get video analytics
router.get('/video/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[Analytics] Getting analytics for video: ${videoId}`);
    
    const analytics = loadAnalytics();
    const videoData = analytics.videos[videoId];
    
    if (!videoData) {
      return res.json({
        success: true,
        videoId: videoId,
        sessions: 0,
        totalDuration: 0,
        events: [],
        message: 'No analytics data for this video'
      });
    }
    
    res.json({
      success: true,
      videoId: videoId,
      ...videoData,
      recentSessions: analytics.sessions
        .filter(s => s.videoId === videoId)
        .slice(-5)
    });
    
  } catch (error) {
    console.error('[Analytics] Error getting video analytics:', error);
    res.status(500).json({
      error: 'Failed to get video analytics',
      message: error.message
    });
  }
});

// DELETE /api/analytics/clear - Clear analytics data
router.delete('/clear', (req, res) => {
  try {
    console.log('[Analytics] Clearing analytics data');
    
    const initialData = {
      sessions: [],
      events: [],
      videos: {},
      users: {},
      summary: {
        totalSessions: 0,
        totalEvents: 0,
        totalVideos: 0,
        totalUsers: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    saveAnalytics(initialData);
    
    res.json({
      success: true,
      message: 'Analytics data cleared successfully'
    });
    
  } catch (error) {
    console.error('[Analytics] Error clearing data:', error);
    res.status(500).json({
      error: 'Failed to clear analytics data',
      message: error.message
    });
  }
});

module.exports = router;
