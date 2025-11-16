const { v4: uuidv4 } = require('uuid');
const { startWorker } = require('../workers/ttsWorker.js');

const jobs = new Map();

function getJob(jobId){ return jobs.get(jobId); }

async function enqueueTTSJob(payload){
  const jobId = uuidv4();
  jobs.set(jobId, { status:'queued', progress:0, ...payload, jobId });
  startWorker({ jobId, jobs, updateJob });
  return jobId;
}

function updateJob(jobId, patch){
  const cur = jobs.get(jobId) || {};
  jobs.set(jobId, { ...cur, ...patch });
}

function watchJob(jobId, callback){
  const job = jobs.get(jobId);
  if (!job) return callback(null);
  const interval = setInterval(() => {
    const updated = jobs.get(jobId);
    if (updated?.status === 'done' || updated?.error) {
      clearInterval(interval);
      callback(updated);
    } else {
      callback(updated);
    }
  }, 500);
}

module.exports = {
  getJob,
  enqueueTTSJob,
  updateJob,
  watchJob
};
