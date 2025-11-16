const express = require('express');
const router = express.Router();

// Use dynamic import for ES module
let jobManager;
import('../transcriber/jobManager.js').then(module => {
  jobManager = module;
}).catch(err => {
  console.error('Failed to load jobManager:', err);
});

/**
 * POST /api/transcriber/start
 * Start a transcription job for a video URL
 */
router.post('/start', (req, res) => {
  // Check if jobManager is loaded
  if (!jobManager) {
    return res.status(503).json({ 
      error: 'Transcriber service not available' 
    });
  }
  
  const { videoUrl, videoId, languageHint } = req.body;
  
  if (!videoUrl || !videoId) {
    return res.status(400).json({ 
      error: 'videoUrl and videoId required' 
    });
  }
  
  try {
    const jobId = jobManager.createJob(videoUrl, videoId, languageHint);
    return res.json({ 
      jobId,
      status: 'queued'
    });
  } catch (e) {
    return res.status(500).json({ 
      error: e.message 
    });
  }
});

/**
 * GET /api/transcriber/status?jobId=...
 * Get status of a transcription job
 */
router.get('/status', (req, res) => {
  // Check if jobManager is loaded
  if (!jobManager) {
    return res.status(503).json({ 
      error: 'Transcriber service not available' 
    });
  }
  
  const { jobId } = req.query;
  
  if (!jobId) {
    return res.status(400).json({ 
      error: 'jobId required' 
    });
  }
  
  const status = jobManager.getStatus(jobId);
  
  if (!status) {
    return res.status(404).json({ 
      error: 'Job not found' 
    });
  }
  
  return res.json(status);
});

/**
 * GET /api/transcriber/result?jobId=...
 * Get final transcript result
 */
router.get('/result', (req, res) => {
  // Check if jobManager is loaded
  if (!jobManager) {
    return res.status(503).json({ 
      error: 'Transcriber service not available' 
    });
  }
  
  const { jobId } = req.query;
  
  if (!jobId) {
    return res.status(400).json({ 
      error: 'jobId required' 
    });
  }
  
  const result = jobManager.getResult(jobId);
  
  if (!result) {
    return res.status(404).json({ 
      error: 'Job not found' 
    });
  }
  
  if (!result.success) {
    return res.status(400).json(result);
  }
  
  return res.json(result);
});

module.exports = router;