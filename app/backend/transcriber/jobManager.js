const fs = require('fs');
const path = require('path');

// Get __dirname equivalent for CommonJS
const dirname = path.dirname(__filename);

// Simple in-memory job storage
const jobs = new Map();

// Path to store job files
const jobsDir = path.join(dirname, '../../../data/storage/sessions/jobs');

// Ensure jobs directory exists
if (!fs.existsSync(jobsDir)) {
  fs.mkdirSync(jobsDir, { recursive: true });
}

// Import the transcriptor for processing jobs
let transcriptor;
import('../ai/pipeline/transcriptor.cjs').then(module => {
  transcriptor = module;
}).catch(err => {
  console.error('Failed to load transcriptor:', err);
});

function createJob(videoUrl, videoId, languageHint = 'en') {
  const jobId = `job_${videoId}_${Date.now()}`;
  
  const jobData = {
    jobId,
    videoId,
    videoUrl,
    languageHint,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Save to memory
  jobs.set(jobId, jobData);
  
  // Save to file
  const jobFilePath = path.join(jobsDir, `${jobId}.json`);
  fs.writeFileSync(jobFilePath, JSON.stringify(jobData, null, 2));
  
  // Automatically start processing the job
  processJob(jobId).catch(err => {
    console.error(`Failed to start processing job ${jobId}:`, err);
  });
  
  return jobId;
}

async function processJob(jobId) {
  const jobData = getStatus(jobId);
  if (!jobData || jobData.status !== 'queued') {
    return;
  }
  
  // Update status to processing
  updateJobProgress(jobId, 'processing', 0);
  
  try {
    if (!transcriptor) {
      throw new Error('Transcriptor not available');
    }
    
    // Prepare video metadata
    const meta = await transcriptor.prepare(jobData.videoUrl, { forceRefresh: false });
    
    // Process transcription
    const transcript = await transcriptor.getOrCreateTranscript(meta, (progress) => {
      // Update job progress
      updateJobProgress(jobId, 'processing', Math.round(progress * 100));
    });
    
    // Mark job as completed
    jobData.result = transcript;
    jobData.status = 'completed';
    jobData.progress = 100;
    jobData.completedAt = new Date().toISOString();
    jobData.updatedAt = new Date().toISOString();
    
    // Save to memory
    jobs.set(jobId, jobData);
    
    // Save to file
    const jobFilePath = path.join(jobsDir, `${jobId}.json`);
    fs.writeFileSync(jobFilePath, JSON.stringify(jobData, null, 2));
    
    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Mark job as failed
    jobData.status = 'failed';
    jobData.error = error.message;
    jobData.completedAt = new Date().toISOString();
    jobData.updatedAt = new Date().toISOString();
    
    // Save to memory
    jobs.set(jobId, jobData);
    
    // Save to file
    const jobFilePath = path.join(jobsDir, `${jobId}.json`);
    fs.writeFileSync(jobFilePath, JSON.stringify(jobData, null, 2));
  }
}

function getStatus(jobId) {
  // Try to get from memory first
  if (jobs.has(jobId)) {
    return jobs.get(jobId);
  }
  
  // Try to load from file
  const jobFilePath = path.join(jobsDir, `${jobId}.json`);
  if (fs.existsSync(jobFilePath)) {
    const jobData = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
    jobs.set(jobId, jobData);
    return jobData;
  }
  
  return null;
}

function getResult(jobId) {
  // For now, just return the status
  return getStatus(jobId);
}

function updateJobProgress(jobId, status, progress) {
  const jobData = getStatus(jobId);
  if (jobData) {
    jobData.status = status;
    jobData.progress = progress;
    jobData.updatedAt = new Date().toISOString();
    
    // Update memory
    jobs.set(jobId, jobData);
    
    // Update file
    const jobFilePath = path.join(jobsDir, `${jobId}.json`);
    fs.writeFileSync(jobFilePath, JSON.stringify(jobData, null, 2));
  }
}

module.exports = {
  createJob,
  getStatus,
  getResult,
  updateJobProgress
};