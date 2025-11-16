const express = require('express');
const router = express.Router();

// Focus session endpoint
router.post('/session', async (req, res) => {
  try {
    const { duration, videoId } = req.body;
    console.log(`[Focus/session] Creating session: duration=${duration}, videoId=${videoId}`);
    console.log(`[Focus/session] Request body:`, JSON.stringify(req.body, null, 2));
    
    // Enhanced parameter validation
    if (!duration) {
      console.error('[Focus/session] Missing duration in request body');
      return res.status(400).json({
        error: 'Missing duration',
        received: { duration, videoId },
        hint: 'Please provide a duration in minutes'
      });
    }
    
    if (typeof duration !== 'number' || duration <= 0) {
      console.error('[Focus/session] Invalid duration:', duration);
      return res.status(400).json({
        error: 'Invalid duration',
        received: { duration, videoId },
        hint: 'Duration must be a positive number'
      });
    }
    
    const sessionId = `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sessionData = {
      sessionId,
      startTime: new Date().toISOString(),
      duration,
      videoId: videoId || null,
      status: 'active'
    };
    
    console.log(`[Focus/session] Session created successfully: ${sessionId}`);
    res.json(sessionData);
    
  } catch (error) {
    console.error('[Focus/session] Error:', error);
    console.error('[Focus/session] Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to create focus session',
      timestamp: new Date().toISOString()
    });
  }
});

// Focus stats endpoint
router.get('/stats', async (req, res) => {
  try {
    console.log(`[Focus/stats] Retrieving focus stats`);
    
    // Mock focus stats with enhanced structure
    const mockStats = {
      totalTime: 3600,
      sessions: 5,
      averageSessionTime: 720,
      streak: 3,
      lastSession: new Date().toISOString(),
      achievements: ['First Session', '3-Day Streak'],
      weeklyGoal: 1500,
      weeklyProgress: 3600
    };
    
    console.log(`[Focus/stats] Stats retrieved successfully`);
    res.json(mockStats);
    
  } catch (error) {
    console.error('[Focus/stats] Error:', error);
    console.error('[Focus/stats] Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to retrieve focus stats',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;