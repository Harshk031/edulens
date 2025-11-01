import { v4 as uuidv4 } from 'uuid';
import { startWorker } from '../workers/ttsWorker.js';

const jobs = new Map();

export function getJob(jobId){ return jobs.get(jobId); }

export async function enqueueTTSJob(payload){
  const jobId = uuidv4();
  jobs.set(jobId, { status:'queued', progress:0, ...payload, jobId });
  startWorker({ jobId, jobs });
  return jobId;
}

export function updateJob(jobId, patch){
  const cur = jobs.get(jobId) || {};
  jobs.set(jobId, { ...cur, ...patch });
}