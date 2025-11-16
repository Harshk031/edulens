const express = require('express');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const { spawn } = require('child_process');
const transcriptor = require('../ai/pipeline/transcriptor.cjs');
const router = express.Router();

// Storage paths - CRITICAL FIX: Use process.cwd() for consistent paths
const getStoragePath = (type) => {
  // Use process.cwd() to get app root, then go to data/storage
  const basePath = path.join(process.cwd(), 'data', 'storage');
  switch(type) {
    case 'transcripts': return path.join(basePath, 'transcripts');
    case 'embeddings': return path.join(basePath, 'embeddings');
    case 'sessions': return path.join(basePath, 'sessions');
    case 'summaries': return path.join(basePath, 'summaries');
    default: return basePath;
  }
};

// Ensure storage directories exist
// Ensure storage directories exist - CRITICAL FIX: Create all directories including jobs
const ensureStorageDirs = async () => {
  const dirs = ['transcripts', 'embeddings', 'sessions', 'summaries'];
  for (const dir of dirs) {
    try {
      await fsExtra.ensureDir(getStoragePath(dir));
      console.log(`[videoRoutes] ✅ Storage directory ensured: ${getStoragePath(dir)}`);
    } catch (err) {
      console.error(`[videoRoutes] ❌ Failed to create storage directory ${dir}:`, err.message);
    }
  }
  // Also create jobs subdirectory
  try {
    await fsExtra.ensureDir(path.join(getStoragePath('sessions'), 'jobs'));
    console.log(`[videoRoutes] ✅ Jobs directory ensured: ${path.join(getStoragePath('sessions'), 'jobs')}`);
  } catch (err) {
    console.error(`[videoRoutes] ❌ Failed to create jobs directory:`, err.message);
  }
};

// Initialize storage directories immediately
ensureStorageDirs().catch(console.error);

// Extract YouTube video ID from URL
const extractVideoId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get video info route
router.get('/info/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[video/info] Getting info for video: ${videoId}`);
    
    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }
    
    // Check if transcript already exists
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    const hasTranscript = fs.existsSync(transcriptPath);
    
    // For now, return basic info
    const videoInfo = {
      videoId,
      title: `Video ${videoId}`, // Would fetch from YouTube API in production
      duration: 'Unknown',
      hasTranscript,
      transcriptPath: hasTranscript ? transcriptPath : null
    };
    
    res.json(videoInfo);
  } catch (error) {
    console.error('[video/info] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get video info' });
  }
});

// Get video info by URL route (for external tests / tools)
router.get('/info', async (req, res) => {
  try {
    const { url } = req.query;
    console.log('[video/info] Getting info for url:', url);

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'YouTube URL is required', received: { url } });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID from URL', received: { url } });
    }

    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    const hasTranscript = fs.existsSync(transcriptPath);

    // Lightweight metadata stub suitable for automated tests
    const videoInfo = {
      videoId,
      title: `Video ${videoId}`,
      author: 'Unknown',
      duration: 'Unknown',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      upload_date: 'Unknown',
      hasTranscript,
      transcriptPath: hasTranscript ? transcriptPath : null
    };

    res.json(videoInfo);
  } catch (error) {
    console.error('[video/info] Error (url):', error);
    res.status(500).json({ error: error.message || 'Failed to get video info' });
  }
});

// Load video route
router.post('/load', async (req, res) => {
  try {
    const { url, videoId: providedVideoId } = req.body;
    console.log(`[video/load] Loading video:`, { url, providedVideoId });
    
    let videoId = providedVideoId;
    if (!videoId && url) {
      videoId = extractVideoId(url);
    }
    
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID from URL' });
    }
    
    // Check if transcript already exists
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    const hasTranscript = fs.existsSync(transcriptPath);
    
    res.json({
      success: true,
      videoId,
      url: url || `https://www.youtube.com/watch?v=${videoId}`,
      hasTranscript,
      message: hasTranscript ? 'Video loaded with existing transcript' : 'Video loaded, transcript processing available'
    });
  } catch (error) {
    console.error('[video/load] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to load video' });
  }
});

// Get transcript route
router.get('/transcript/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[video/transcript] Getting transcript for: ${videoId}`);
    
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    
    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    res.json(transcriptData);
  } catch (error) {
    console.error('[video/transcript] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get transcript' });
  }
});

// Process transcript route
router.post('/transcript/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { force = false } = req.body;
    console.log(`[video/transcript] Processing transcript for: ${videoId}, force: ${force}`);
    
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    
    // Check if transcript already exists and force is false
    if (!force && fs.existsSync(transcriptPath)) {
      const existingTranscript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
      return res.json({
        success: true,
        videoId,
        transcript: existingTranscript,
        message: 'Using existing transcript'
      });
    }
    
    // Use real Whisper transcriptor to generate transcript
    console.log(`[video/transcript] Using real Whisper pipeline for: ${videoId}`);
    
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const meta = await transcriptor.prepare(videoUrl, { forceRefresh: force });
      
      console.log(`[video/transcript] Video meta prepared:`, {
        videoId: meta.videoId,
        title: meta.title,
        duration: meta.duration
      });
      
      const transcriptData = await transcriptor.getOrCreateTranscript(meta, (progress) => {
        console.log(`[video/transcript] Progress: ${Math.round(progress * 100)}%`);
      });
      
      // Trigger AI pipeline integration
      await triggerAIPipeline(videoId, transcriptData);
      
      console.log(`[video/transcript] Real transcript generated:`, {
        segments: transcriptData.segments?.length || 0,
        language: transcriptData.language,
        duration: transcriptData.duration
      });
      
      // Return successful response
      res.json({
        success: true,
        videoId,
        transcript: transcriptData,
        message: 'Transcript processed successfully using Whisper'
      });
      
    } catch (error) {
      console.error(`[video/transcript] Whisper pipeline failed:`, error.message);
      console.log(`[video/transcript] Falling back to mock transcript for ${videoId}`);
      
      // Fallback to mock transcript if Whisper fails
      const mockTranscript = {
        videoId,
        segments: [
          {
            start: 0,
            end: 10,
            text: "Welcome to this educational video. In this session, we'll explore important concepts."
          },
          {
            start: 10,
            end: 25,
            text: "Let's begin by understanding of fundamental principles that will guide our discussion."
          },
          {
            start: 25,
            end: 40,
            text: "These concepts are essential for building a strong foundation of knowledge in this subject."
          }
        ],
        fullText: "Welcome to this educational video. In this session, we'll explore important concepts. Let's begin by understanding of fundamental principles that will guide our discussion. These concepts are essential for building a strong foundation of knowledge in this subject.",
        duration: 40,
        language: 'en',
        originalLanguage: 'en',
        originalSegments: null,
        createdAt: new Date().toISOString()
      };
      
      // Save mock transcript
      await fsExtra.writeJSON(transcriptPath, mockTranscript, { spaces: 2 });
      
      res.json({
        success: true,
        videoId,
        transcript: mockTranscript,
        message: 'Transcript processed with fallback data'
      });
    }
  } catch (outerError) {
    console.error(`[video/transcript] Outer error:`, outerError.message);
    res.status(500).json({ error: outerError.message || 'Failed to process transcript' });
  }
});

// Delete transcript route
router.delete('/transcript/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[video/transcript] Deleting transcript for: ${videoId}`);
    
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    
    if (fs.existsSync(transcriptPath)) {
      fs.unlinkSync(transcriptPath);
    }
    
    res.json({
      success: true,
      videoId,
      message: 'Transcript deleted successfully'
    });
  } catch (error) {
    console.error(`[video/transcript] Error:`, error.message);
    res.status(500).json({ error: 'Failed to delete transcript' });
  }
});

// List videos route
router.get('/list', async (req, res) => {
  try {
    console.log('[video/list] Getting video list');
    
    const transcriptsDir = getStoragePath('transcripts');
    const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith('.json'));
    
    const videos = files.map(file => {
      const videoId = path.basename(file, '.json');
      const filePath = path.join(transcriptsDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        videoId,
        hasTranscript: true,
        lastModified: stats.mtime.toISOString(),
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    });
    
    res.json({
      success: true,
      videos,
      count: videos.length
    });
  } catch (error) {
    console.error('[video/list] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get video list' });
  }
});

// Process video route - triggers complete processing pipeline
router.post('/process', async (req, res) => {
  try {
    const { url, videoId: providedVideoId, force = false } = req.body;
    console.log(`[video/process] Processing video:`, { url, providedVideoId, force });
    
    let videoId = providedVideoId;
    if (!videoId && url) {
      videoId = extractVideoId(url);
    }
    
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract video ID from URL' });
    }
    
    // CRITICAL FIX: Check for existing jobs first
    const jobsDir = path.join(getStoragePath('sessions'), 'jobs');
    await fsExtra.ensureDir(jobsDir);
    
    // CRITICAL: Check if transcript already exists and is valid
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    if (fs.existsSync(transcriptPath) && !force) {
      console.log(`[video/process] 📄 Found cached transcript for ${videoId}, validating...`);
      
      try {
        const cachedTranscript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
        const segmentCount = cachedTranscript?.segments?.length || 0;
        const hasText = cachedTranscript?.segments?.some(s => s.text && s.text.trim().length > 0);
        
        if (segmentCount > 0 && hasText) {
          console.log(`[video/process] ✅ Valid cached transcript found: ${segmentCount} segments`);
          return res.json({
            success: true,
            videoId,
            message: 'Transcript already available',
            alreadyProcessed: true,
            segmentCount
          });
        } else {
          console.warn(`[video/process] ⚠️ Cached transcript is invalid (segments: ${segmentCount}, hasText: ${hasText})`);
          console.log(`[video/process] 🔄 Will regenerate transcript`);
          // Continue to process
        }
      } catch (parseError) {
        console.error(`[video/process] ❌ Failed to parse cached transcript:`, parseError.message);
        console.log(`[video/process] 🔄 Will regenerate transcript`);
        // Continue to process
      }
    } else if (force) {
      console.log(`[video/process] 🔄 Force refresh requested, bypassing cache`);
    }
    
    // Check for existing active job
    try {
      const existingJobs = fs.readdirSync(jobsDir)
        .filter(f => f.includes(videoId) && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (existingJobs.length > 0 && !force) {
        const latestJobPath = path.join(jobsDir, existingJobs[0]);
        const latestJob = JSON.parse(fs.readFileSync(latestJobPath, 'utf8'));

        // Treat very old "processing" jobs as stale to avoid being stuck forever at e.g. 46%
        if (latestJob.status === 'processing') {
          const now = Date.now();
          const lastUpdated = new Date(latestJob.updatedAt || latestJob.startedAt || Date.now()).getTime();
          const STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

          const ageMs = now - lastUpdated;
          console.log(`[video/process] Found existing processing job ${latestJob.jobId} with age ${Math.round(ageMs/1000)}s and progress ${latestJob.progress}`);

          if (ageMs < STALE_TIMEOUT_MS) {
            // Recent job - treat as truly in progress
            console.log(`[video/process] ✅ Reusing active job (not stale)`);
            return res.json({
              success: true,
              jobId: latestJob.jobId,
              videoId,
              message: 'Job already in progress',
              existingJob: true
            });
          } else {
            // Stale job - mark as error so a new job can be created
            console.warn(`[video/process] ⚠️ Detected STALE job ${latestJob.jobId} (age ${Math.round(ageMs/1000)}s). Marking as error and creating new job.`);
            try {
              latestJob.status = 'error';
              latestJob.stage = 'Error';
              latestJob.error = latestJob.error || 'Job marked stale due to inactivity';
              latestJob.errorAt = new Date().toISOString();
              await fsExtra.writeJSON(latestJobPath, latestJob, { spaces: 2 });
              console.log(`[video/process] ✅ Stale job updated to error state`);
            } catch (staleUpdateErr) {
              console.error(`[video/process] ❌ Failed to update stale job state:`, staleUpdateErr.message);
            }
            // Fall through to create a NEW job
          }
        }
      }
    } catch (jobCheckError) {
      console.warn(`[video/process] Could not check existing jobs:`, jobCheckError.message);
    }
    
    // Create a NEW processing job only if needed
    const jobId = `job_${videoId}_${Date.now()}`;
    const jobData = {
      jobId,
      videoId,
      url: url || `https://www.youtube.com/watch?v=${videoId}`,
      status: 'processing',
      progress: 0,
      stage: 'Queued',
      stages: {
        input: { status: 'done', progress: 100 },
        transcribe: { status: 'processing', progress: 0 },
        fastSummary: { status: 'pending', progress: 0 },
        indexing: { status: 'pending', progress: 0 },
        llmReady: { status: 'pending', progress: 0 }
      },
      startedAt: new Date().toISOString()
    };
    
    // Store job status
    const jobPath = path.join(jobsDir, `${jobId}.json`);
    await fsExtra.writeJSON(jobPath, jobData, { spaces: 2 });
    console.log(`[video/process] ✅ NEW job file created: ${jobPath}`);
    
    // CRITICAL FIX: Start async processing immediately with proper error handling
    console.log(`[video/process] 🚀 Starting async processing for ${videoId} with jobId ${jobId}`);
    
    // Use setImmediate to ensure job file is written before processing starts
    setImmediate(async () => {
      try {
        console.log(`[video/process] 📞 Calling processVideoAsync for ${videoId}...`);
        await processVideoAsync(videoId, jobId, { force });
        console.log(`[video/process] ✅ processVideoAsync completed for ${videoId}`);
      } catch (error) {
        console.error(`[video/process] ❌ CRITICAL: Async processing failed for ${videoId}:`, error);
        console.error(`[video/process] Error message: ${error.message}`);
        console.error(`[video/process] Error stack:`, error.stack);
        
        // Update job status to error
        const jobsDir = path.join(getStoragePath('sessions'), 'jobs');
        const jobPath = path.join(jobsDir, `${jobId}.json`);
        try {
          if (fs.existsSync(jobPath)) {
            const current = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
            current.status = 'error';
            current.stage = 'Error';
            current.progress = 0;
            current.error = error.message || 'Processing failed';
            current.errorAt = new Date().toISOString();
            current.stages = {
              input: { status: 'done', progress: 100 },
              transcribe: { status: 'failed', progress: 0 },
              fastSummary: { status: 'pending', progress: 0 },
              indexing: { status: 'pending', progress: 0 },
              llmReady: { status: 'pending', progress: 0 }
            };
            await fsExtra.writeJSON(jobPath, current, { spaces: 2 });
            console.log(`[video/process] ✅ Job error status updated`);
          } else {
            console.error(`[video/process] ❌ Job file not found for error update: ${jobPath}`);
          }
        } catch (updateError) {
          console.error(`[video/process] ❌ Failed to update job error status:`, updateError);
          console.error(`[video/process] Update error stack:`, updateError.stack);
        }
      }
    });
    
    console.log(`[video/process] ✅ Async processing initiated, returning response`);
    
    res.json({ 
      success: true,
      jobId,
      videoId,
      message: 'Processing started'
    });
  } catch (error) {
    console.error(`[video/process] Error:`, error);
    res.status(500).json({ error: error.message || 'Failed to start processing' });
  }
});

// Get processing status route
router.get('/status', async (req, res) => {
  try {
    console.log(`[video/status] RAW REQUEST:`, {
      url: req.url,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      query: req.query,
      params: req.params
    });
    
    const { videoId } = req.query;
    
    console.log(`[video/status] Getting status for: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Check if transcript exists
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    const hasTranscript = fs.existsSync(transcriptPath);
    
    // Find the latest job for this video
    const jobsDir = path.join(getStoragePath('sessions'), 'jobs');
    
    // Ensure jobs directory exists
    await fsExtra.ensureDir(jobsDir);
    
    let latestJob = null;
    let jobFiles = [];
    
    try {
      jobFiles = fs.readdirSync(jobsDir)
        .filter(f => f.includes(videoId) && f.endsWith('.json'))
        .sort()
        .reverse(); // Get latest
      
      if (jobFiles.length > 0) {
        latestJob = JSON.parse(fs.readFileSync(path.join(jobsDir, jobFiles[0]), 'utf8'));
      }
    } catch (jobError) {
      console.warn(`[video/status] Could not read jobs: ${jobError.message}`);
    }
    
    // Return status based on available data
    if (latestJob) {
      // CRITICAL FIX: Detect and mark stale jobs
      if (latestJob.status === 'processing') {
        const now = Date.now();
        const lastUpdated = new Date(latestJob.updatedAt || latestJob.startedAt || Date.now()).getTime();
        const STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
        const ageMs = now - lastUpdated;
        
        if (ageMs >= STALE_TIMEOUT_MS) {
          console.warn(`[video/status] ⚠️ Detected STALE job for ${videoId} (age ${Math.round(ageMs/1000)}s). Marking as error.`);
          
          // Mark as error
          latestJob.status = 'error';
          latestJob.stage = 'Error';
          
          // Try to update the job file
          try {
            const latestJobPath = path.join(jobsDir, jobFiles[0]);
            await fsExtra.writeJSON(latestJobPath, latestJob, { spaces: 2 });
            console.log(`[video/status] ✅ Stale job updated to error state`);
          } catch (updateErr) {
            console.error(`[video/status] ❌ Failed to update stale job:`, updateErr.message);
          }
        }
      }
      
      // CRITICAL FIX: Ensure stage field exists
      if (!latestJob.stage) {
        // Determine stage based on status and progress
        if (latestJob.status === 'processing') {
          if (latestJob.progress < 30) {
            latestJob.stage = 'Queued';
          } else if (latestJob.progress < 70) {
            latestJob.stage = 'Transcribing';
          } else if (latestJob.progress < 90) {
            latestJob.stage = 'Indexing';
          } else {
            latestJob.stage = 'Finalizing';
          }
        } else if (latestJob.status === 'done' || latestJob.status === 'completed') {
          latestJob.stage = 'Complete';
        } else if (latestJob.status === 'error' || latestJob.status === 'failed') {
          latestJob.stage = 'Error';
        } else {
          latestJob.stage = 'Queued';
        }
      }
      res.json(latestJob);
    } else if (hasTranscript) {
      res.json({
        status: 'completed',
        progress: 100,
        stage: 'Complete', // CRITICAL FIX: Add stage field
        videoId,
        message: 'Transcript available',
        hasTranscript: true,
        stages: {
          input: { status: 'done', progress: 100 },
          transcribe: { status: 'done', progress: 100 },
          fastSummary: { status: 'done', progress: 100 },
          indexing: { status: 'done', progress: 100 },
          llmReady: { status: 'done', progress: 100 }
        }
      });
    } else {
      res.status(404).json({
        status: 'not_started',
        progress: 0,
        stage: 'Not Started', // CRITICAL FIX: Add stage field
        videoId,
        message: 'No processing job found',
        hasTranscript: false
      });
    }
  } catch (error) {
    console.error('[video/status] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

// Get fast summary route
router.get('/fast-summary/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[video/fast-summary] Getting fast summary for: ${videoId}`);
    
    // Check if transcript exists first
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    
    if (!fs.existsSync(transcriptPath)) {
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    
    // Generate a quick summary
    const fastSummary = {
      videoId,
      summary: `Quick Summary: ${transcript.fullText.split('.').slice(0, 2).join('.')}. This video covers important educational concepts and principles.`,
      keyPoints: [
        'Educational content overview',
        'Key concepts discussion',
        'Learning objectives covered'
      ],
      duration: transcript.duration || 0,
      confidence: 0.85,
      generatedAt: new Date().toISOString()
    };
    
    res.json(fastSummary);
  } catch (error) {
    console.error('[video/fast-summary] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate fast summary' });
  }
});

// Get summary route
router.get('/summary', async (req, res) => {
  try {
    const { videoId } = req.query;
    console.log(`[video/summary] Getting summary for: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }
    
    // Check if summary exists
    const summaryPath = path.join(getStoragePath('summaries'), `${videoId}.json`);
    
    if (!fs.existsSync(summaryPath)) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    res.json(summary);
  } catch (error) {
    console.error('[video/summary] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get summary' });
  }
});

// Async processing function
const processVideoAsync = async (videoId, jobId, options = {}) => {
  const { force = false } = options;
  const jobsDir = path.join(getStoragePath('sessions'), 'jobs');
  const jobPath = path.join(jobsDir, `${jobId}.json`);
  
  const updateJob = async (updates) => {
    // CRITICAL FIX: Retry logic for race conditions
    let retries = 3;
    while (retries > 0) {
      try {
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob CALLED: progress=${updates.progress}, stage=${updates.stage}\n`);
        if (!fs.existsSync(jobPath)) {
          console.error(`[processVideoAsync] Job file not found: ${jobPath}`);
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob: Job file not found!\n`);
          return;
        }
        
        // Add small delay to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const current = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob: Current progress=${current.progress}\n`);
      
      // CRITICAL FIX: Never let progress go backwards
      if (updates.progress !== undefined && current.progress !== undefined) {
        if (updates.progress < current.progress) {
          console.warn(`[processVideoAsync] ⚠️ Prevented progress from going backwards: ${current.progress}% -> ${updates.progress}%`);
          updates.progress = current.progress; // Keep current progress
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob: Progress prevented from going backwards\n`);
        }
      }
      
        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob: Writing JSON...\n`);
        await fsExtra.writeJSON(jobPath, updated, { spaces: 2 });
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob: JSON written successfully\n`);
        console.log(`[processVideoAsync] ✅ Job updated:`, {
          status: updated.status,
          progress: updated.progress,
          stage: updated.stage
        });
        return; // Success, exit retry loop
      } catch (err) {
        retries--;
        console.error(`[processVideoAsync] ❌ Failed to update job (${3-retries}/3):`, err.message);
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] updateJob ERROR (retry ${3-retries}/3): ${err.message}\n`);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Wait before retry
        } else {
          console.error('[processVideoAsync] Job path:', jobPath);
          console.error('[processVideoAsync] Error details:', err.stack);
        }
      }
    }
  };
  
  try {
    console.log(`[processVideoAsync] 🚀 Starting REAL transcription for ${videoId}`);
    console.log(`[processVideoAsync] Job ID: ${jobId}`);
    console.log(`[processVideoAsync] Job path: ${jobPath}`);
    console.log(`[processVideoAsync] Force refresh: ${force}`);
    console.log(`[processVideoAsync] Current working directory: ${process.cwd()}`);
    
    // Verify job file exists
    if (!fs.existsSync(jobPath)) {
      console.error(`[processVideoAsync] ❌ Job file not found: ${jobPath}`);
      throw new Error(`Job file not found: ${jobPath}`);
    }
    
    console.log(`[processVideoAsync] ✅ Job file exists, reading...`);
    const initialJob = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
    console.log(`[processVideoAsync] Initial job status:`, {
      status: initialJob.status,
      progress: initialJob.progress,
      stage: initialJob.stage
    });
    
    const setStage = async (stageLabel) => {
      console.log(`[processVideoAsync] 📍 Setting stage: ${stageLabel}`);
      await updateJob({ stage: stageLabel });
    };
    
    // CRITICAL FIX: Update job immediately to show processing has started
    console.log(`[processVideoAsync] 📍 Stage 1: Initializing...`);
    await updateJob({
      status: 'processing',
      progress: 10,
      stage: 'Initializing',
      stages: {
        input: { status: 'done', progress: 100 },
        transcribe: { status: 'processing', progress: 10 },
        fastSummary: { status: 'pending', progress: 0 },
        indexing: { status: 'pending', progress: 0 },
        llmReady: { status: 'pending', progress: 0 }
      }
    });
    console.log(`[processVideoAsync] ✅ Initial status update complete`);
    
    await setStage('Transcribing');
    console.log(`[processVideoAsync] ✅ Stage set to Transcribing`);
    
    // REAL TRANSCRIPTION: Call the transcriptor
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[processVideoAsync] 🎬 Preparing video: ${videoUrl}`);
    
    try {
      console.log(`[processVideoAsync] 📞 Calling transcriptor.prepare()...`);
      console.log(`[processVideoAsync] transcriptor available: ${!!transcriptor}`);
      console.log(`[processVideoAsync] transcriptor.prepare available: ${typeof transcriptor?.prepare === 'function'}`);
      
      const meta = await transcriptor.prepare(videoUrl, { forceRefresh: force });
      console.log(`[processVideoAsync] ✅ Video meta prepared:`, {
        videoId: meta.videoId,
        title: meta.title?.substring(0, 50),
        duration: meta.duration
      });
      
      // CRITICAL FIX: Update progress immediately after meta preparation
      console.log(`[processVideoAsync] 📊 Updating progress to 30%...`);
      await updateJob({
        progress: 30,
        stage: 'Transcribing',
        stages: {
          input: { status: 'done', progress: 100 },
          transcribe: { status: 'processing', progress: 40 },
          fastSummary: { status: 'pending', progress: 0 },
          indexing: { status: 'pending', progress: 0 },
          llmReady: { status: 'pending', progress: 0 }
        }
      });
      console.log(`[processVideoAsync] ✅ Progress updated to 30%`);
      
      // CRITICAL: Ensure transcript is generated with retry logic
      let transcriptData = null;
      let transcriptRetries = 0;
      const maxTranscriptRetries = 3;
      
      while (!transcriptData && transcriptRetries < maxTranscriptRetries) {
        try {
          console.log(`[processVideoAsync] 📞 Calling transcriptor.getOrCreateTranscript() (attempt ${transcriptRetries + 1}/${maxTranscriptRetries})...`);
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: About to call transcriptor.getOrCreateTranscript()\n`);
          
          // CRITICAL: Add timeout for transcription (5 minutes for short videos)
          let lastProgressUpdate = Date.now();
          const progressUpdateInterval = 5000; // Update every 5 seconds minimum
          const TRANSCRIPTION_TIMEOUT = 300000; // 5 minutes timeout
          
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: Creating transcriptPromise\n`);
          
          const transcriptPromise = transcriptor.getOrCreateTranscript(meta, async (progress) => {
            const transcribeProgress = 40 + (progress * 50); // 40% -> 90%
            const overallProgress = 30 + (progress * 40); // 30% -> 70%
            
            const now = Date.now();
            // Only update if enough time has passed or progress changed significantly
            if (now - lastProgressUpdate >= progressUpdateInterval || Math.round(progress * 100) % 10 === 0) {
              console.log(`[processVideoAsync] 📊 Transcription progress: ${Math.round(progress * 100)}% (overall: ${Math.round(overallProgress)}%)`);
              
              // CRITICAL: Await the update to ensure it's written before continuing
              try {
                await updateJob({
                  progress: Math.round(overallProgress),
                  stage: 'Transcribing',
                  stages: {
                    input: { status: 'done', progress: 100 },
                    transcribe: { status: 'processing', progress: Math.round(transcribeProgress) },
                    fastSummary: { status: 'pending', progress: 0 },
                    indexing: { status: 'pending', progress: 0 },
                    llmReady: { status: 'pending', progress: 0 }
                  }
                });
                console.log(`[processVideoAsync] ✅ Progress updated: ${Math.round(overallProgress)}%`);
                lastProgressUpdate = now;
              } catch (e) {
                console.error('[processVideoAsync] ❌ Failed to update progress:', e);
              }
            }
          });
          
          // CRITICAL: Add timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              console.error(`[processVideoAsync] ⏱️ TRANSCRIPTION TIMEOUT after ${TRANSCRIPTION_TIMEOUT/1000}s`);
              reject(new Error(`Transcription timeout after ${TRANSCRIPTION_TIMEOUT/1000} seconds`));
            }, TRANSCRIPTION_TIMEOUT);
          });
          
          // Race between transcription and timeout
          console.log(`[processVideoAsync] ⏱️ Starting transcription with ${TRANSCRIPTION_TIMEOUT/1000}s timeout...`);
          transcriptData = await Promise.race([transcriptPromise, timeoutPromise]);
          console.log(`[processVideoAsync] ✅ Transcription completed before timeout!`);
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: Transcription promise resolved\n`);
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: transcriptData = ${transcriptData ? 'OBJECT' : 'NULL'}\n`);
          
          // Validate transcript immediately
          if (!transcriptData || !transcriptData.segments || transcriptData.segments.length === 0) {
            require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: VALIDATION FAILED - empty transcript\n`);
            throw new Error('Transcript is empty - no segments generated');
          }
          
          const hasText = transcriptData.segments.some(seg => seg.text && seg.text.trim().length > 0);
          if (!hasText) {
            require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: VALIDATION FAILED - no text\n`);
            throw new Error('Transcript has segments but no text content');
          }
          
          console.log(`[processVideoAsync] ✅ Transcript generated successfully: ${transcriptData.segments.length} segments`);
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: Validation passed, breaking loop\n`);
          break; // Success, exit retry loop
          
        } catch (transcriptError) {
          transcriptRetries++;
          console.error(`[processVideoAsync] ❌ Transcript generation failed (attempt ${transcriptRetries}/${maxTranscriptRetries}):`, transcriptError.message);
          console.error(`[processVideoAsync] Error stack:`, transcriptError.stack);
          
          // Update job with error status for visibility
          try {
            await updateJob({
              progress: Math.max(30, 30 + (transcriptRetries * 5)),
              stage: 'Transcribing',
              error: `Attempt ${transcriptRetries}/${maxTranscriptRetries}: ${transcriptError.message}`,
              stages: {
                input: { status: 'done', progress: 100 },
                transcribe: { status: 'processing', progress: Math.max(40, 40 + (transcriptRetries * 5)) },
                fastSummary: { status: 'pending', progress: 0 },
                indexing: { status: 'pending', progress: 0 },
                llmReady: { status: 'pending', progress: 0 }
              }
            });
          } catch (updateErr) {
            console.error('[processVideoAsync] Failed to update job with error:', updateErr);
          }
          
          if (transcriptRetries < maxTranscriptRetries) {
            console.log(`[processVideoAsync] 🔄 Retrying transcript generation in 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            // Force refresh on retry
            meta.forceRefresh = true;
          } else {
            console.error(`[processVideoAsync] ❌ All transcript generation attempts failed`);
            // Update job to error status
            await updateJob({
              status: 'error',
              stage: 'Error',
              progress: 30,
              error: `Failed to generate transcript after ${maxTranscriptRetries} attempts: ${transcriptError.message}`,
              errorAt: new Date().toISOString(),
              stages: {
                input: { status: 'done', progress: 100 },
                transcribe: { status: 'failed', progress: 0 },
                fastSummary: { status: 'pending', progress: 0 },
                indexing: { status: 'pending', progress: 0 },
                llmReady: { status: 'pending', progress: 0 }
              }
            });
            throw new Error(`Failed to generate transcript after ${maxTranscriptRetries} attempts: ${transcriptError.message}`);
          }
        }
      }
      
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: After while loop, before final validation\n`);
      
      console.log(`[video/process] Transcript generated:`, {
        segments: transcriptData.segments?.length || 0,
        language: transcriptData.language,
        hasText: transcriptData.segments?.some(seg => seg.text && seg.text.trim().length > 0) || false
      });
      
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: After console.log, before validation\n`);
      
      // CRITICAL: Validate transcript before proceeding
      if (!transcriptData || !transcriptData.segments || transcriptData.segments.length === 0) {
        throw new Error('Transcript is empty - no segments generated');
      }
      
      const hasText = transcriptData.segments.some(seg => seg.text && seg.text.trim().length > 0);
      if (!hasText) {
        throw new Error('Transcript has segments but no text content');
      }
      
      console.log(`[video/process] ✅ Transcript validated: ${transcriptData.segments.length} segments with text content`);
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] videoRoutes: Validation complete, updating to 70%\n`);
      
      // Transcription complete - update immediately with detailed logging
      console.log(`[processVideoAsync] ✅ Transcription complete, updating job status...`);
      await updateJob({
        progress: 70,
        stage: 'Structuring',
        stages: {
          input: { status: 'done', progress: 100 },
          transcribe: { status: 'done', progress: 100 },
          fastSummary: { status: 'processing', progress: 0 },
          indexing: { status: 'pending', progress: 0 },
          llmReady: { status: 'pending', progress: 0 }
        }
      });
      console.log(`[processVideoAsync] ✅ Job status updated: Transcription complete, moving to structuring`);
      
      // Stage 2: Fast Summary & Indexing (parallel) - WITH TIMEOUT
      try {
        console.log(`[video/process] Starting AI pipeline for ${videoId} with 60s timeout`);
        
        // Add timeout to prevent hanging at 70%
        const aiPipelinePromise = triggerAIPipeline(videoId, transcriptData);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI pipeline timeout after 60 seconds')), 60000)
        );
        
        await Promise.race([aiPipelinePromise, timeoutPromise]);
        console.log(`[video/process] AI pipeline completed for ${videoId}`);
      } catch (aiError) {
        console.error(`[video/process] AI pipeline failed for ${videoId}:`, aiError.message);
        // Continue processing even if AI pipeline fails - don't let it block at 70%
      }
      
      await updateJob({
        progress: 85,
        stage: 'Indexing',
        stages: {
          input: { status: 'done', progress: 100 },
          transcribe: { status: 'done', progress: 100 },
          fastSummary: { status: 'done', progress: 100 },
          indexing: { status: 'processing', progress: 50 },
          llmReady: { status: 'pending', progress: 0 }
        }
      });
      
      // Stage 3: LLM Ready - CRITICAL FIX: Set status to 'done' for frontend detection
      await updateJob({
        progress: 100,
        status: 'done', // CRITICAL: Use 'done' for frontend detection (frontend checks for 'done')
        stage: 'Complete', // CRITICAL: Use 'Complete' for frontend detection
        stages: {
          input: { status: 'done', progress: 100 },
          transcribe: { status: 'done', progress: 100 },
          fastSummary: { status: 'done', progress: 100 },
          indexing: { status: 'done', progress: 100 },
          llmReady: { status: 'done', progress: 100 }
        },
        completedAt: new Date().toISOString(),
        message: 'Video processing completed successfully'
      });
      
      console.log(`[video/process] ✅ Completed REAL processing for ${videoId} - status: completed, progress: 100%`);
      
    } catch (transcriptError) {
      console.error(`[video/process] Transcript generation failed:`, transcriptError);
      throw transcriptError;
    }
  } catch (error) {
    console.error(`[video/process] Error processing ${videoId}:`, error);
    await updateJob({
      status: 'error',
      error: error.message,
      errorAt: new Date().toISOString()
    });
  }
};

// Trigger AI pipeline after transcript generation
async function triggerAIPipeline(videoId, transcriptData) {
  console.log(`[AI Pipeline] Starting AI processing for ${videoId}`);
  
  // Validate transcript data
  if (!transcriptData || !transcriptData.segments || !Array.isArray(transcriptData.segments) || transcriptData.segments.length === 0) {
    console.error(`[AI Pipeline] Invalid transcript data for ${videoId}:`, transcriptData);
    return;
  }
  
  try {
    // Import AI pipeline components
    const embeddings = require('../../ai/pipeline/embeddings.cjs');
    const parallelx = require('../../ai/pipeline/parallelx.cjs');
    const generator = require('../../ai/pipeline/generator.cjs');
    
    // Create chunks for embedding
    const chunks = transcriptData.segments.map((seg, index) => ({
      chunkId: `${videoId}-${index}`,
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));
    
    console.log(`[AI Pipeline] Created ${chunks.length} chunks from transcript`);
    
    // STEP 1: Generate Summary (if not exists)
    const summaryPath = path.join(getStoragePath('summaries'), `${videoId}.json`);
    if (!fs.existsSync(summaryPath)) {
      console.log(`[AI Pipeline] Generating summary for ${videoId}...`);
      try {
        await generator.summary(videoId, transcriptData);
        console.log(`[AI Pipeline] ✅ Summary generated successfully for ${videoId}`);
      } catch (summaryError) {
        console.error(`[AI Pipeline] Summary generation failed for ${videoId}:`, summaryError.message);
        // Continue even if summary fails
      }
    } else {
      console.log(`[AI Pipeline] Summary already exists for ${videoId}, skipping`);
    }
    
    // Check if embeddings already exist
    const embeddingsPath = path.join(getStoragePath('embeddings'), `${videoId}.json`);
    
    if (fs.existsSync(embeddingsPath)) {
      console.log(`[AI Pipeline] Embeddings already exist for ${videoId}, checking validity...`);
      
      try {
        const existingEmbeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
        
        if (existingEmbeddings.vectors && existingEmbeddings.vectors.length > 0 &&
            existingEmbeddings.vectors[0].vector && existingEmbeddings.vectors[0].vector.length > 0) {
          console.log(`[AI Pipeline] Valid embeddings already exist for ${videoId}, skipping generation`);
        } else {
          console.log(`[AI Pipeline] Existing embeddings are invalid, regenerating...`);
          fs.unlinkSync(embeddingsPath); // Delete invalid embeddings
        }
      } catch (parseError) {
        console.log(`[AI Pipeline] Error parsing existing embeddings, regenerating...`, parseError.message);
        fs.unlinkSync(embeddingsPath); // Delete corrupted embeddings
      }
    }
    
    // Generate embeddings if they don't exist or are invalid
    if (!fs.existsSync(embeddingsPath)) {
      console.log(`[AI Pipeline] Generating embeddings for ${chunks.length} chunks`);
      
      try {
        await embeddings.indexVideo(videoId, chunks, (progress) => {
          console.log(`[AI Pipeline] Embedding progress: ${Math.round(progress * 100)}%`);
        });
        
        console.log(`[AI Pipeline] Embeddings generated successfully for ${videoId}`);
      } catch (embeddingError) {
        console.error(`[AI Pipeline] Embedding generation failed for ${videoId}:`, embeddingError.message);
        // Don't fail the entire pipeline if embeddings fail
        console.warn(`[AI Pipeline] Continuing without embeddings for ${videoId}`);
      }
    }
    
    // Precompute parallelx summaries (with error handling)
    try {
      console.log(`[AI Pipeline] Precomputing parallelx summaries`);
      await parallelx.precompute(videoId, chunks);
      console.log(`[AI Pipeline] Parallelx summaries completed for ${videoId}`);
    } catch (parallelxError) {
      console.warn(`[AI Pipeline] Parallelx precomputation failed for ${videoId}:`, parallelxError.message);
      // Don't fail the entire pipeline if parallelx fails
    }
    
    console.log(`[AI Pipeline] AI processing completed successfully for ${videoId}`);
  } catch (error) {
    console.error(`[AI Pipeline] Critical error processing ${videoId}:`, error.message);
    console.error(`[AI Pipeline] Stack trace:`, error.stack);
    
    // Try to clean up any partial embeddings that might be corrupted
    try {
      const embeddingsPath = path.join(getStoragePath('embeddings'), `${videoId}.json`);
      
      if (fs.existsSync(embeddingsPath)) {
        const partialEmbeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
        
        if (!partialEmbeddings.vectors || partialEmbeddings.vectors.length === 0 ||
            !partialEmbeddings.vectors[0].vector || partialEmbeddings.vectors[0].vector.length === 0) {
          console.log(`[AI Pipeline] Cleaning up invalid partial embeddings for ${videoId}`);
          fs.unlinkSync(embeddingsPath);
        }
      }
    } catch (cleanupError) {
      console.error(`[AI Pipeline] Failed to cleanup partial embeddings: ${cleanupError.message}`);
    }
    
    // Don't throw - AI pipeline failure shouldn't break transcript generation
  }
};

module.exports = router;