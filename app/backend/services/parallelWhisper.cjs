const { Worker } = require('worker_threads');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Enhanced Whisper service with both C++ and Python options
const whisperCpp = require('./whisper.cjs');

class ParallelWhisperProcessor {
  constructor(options = {}) {
    this.maxWorkers = options.maxWorkers || Math.min(8, Math.max(2, os.cpus().length));
    this.preferPython = options.preferPython || false;
    this.pythonModel = options.pythonModel || 'base';
    this.activeWorkers = new Set();
    this.queue = [];
    this.results = new Map();
    
    console.log(`🚀 ParallelWhisperProcessor initialized with ${this.maxWorkers} max workers`);
    console.log(`   Python preference: ${this.preferPython ? 'YES' : 'NO'}`);
    console.log(`   Python model: ${this.pythonModel}`);
  }

  async transcribeChunksParallel(chunks, options = {}) {
    console.log(`\n🎯 Starting parallel transcription of ${chunks.length} chunks`);
    
    const startTime = Date.now();
    const results = [];
    const errors = [];
    
    // Create job queue
    const jobs = chunks.map((chunk, index) => ({
      id: `chunk_${chunk.index}`,
      chunk,
      index,
      retries: 0,
      maxRetries: 2
    }));
    
    // Process jobs in parallel
    const activeJobs = new Map();
    const maxConcurrent = Math.min(this.maxWorkers, chunks.length);
    
    console.log(`   Processing with ${maxConcurrent} concurrent workers`);
    
    let completedJobs = 0;
    let nextJobIndex = 0;
    
    const processNextJob = async () => {
      if (nextJobIndex >= jobs.length) return null;
      
      const job = jobs[nextJobIndex++];
      activeJobs.set(job.id, job);
      
      try {
        console.log(`   🎤 Transcribing chunk ${job.chunk.index}/${chunks.length} (${job.chunk.start}s-${job.chunk.end}s, ${job.chunk.duration}s)`);
        
        // CRITICAL: Adaptive timeout based on chunk duration
        // Formula: 60s base + 2x chunk duration (allows 2x realtime processing)
        const adaptiveTimeout = Math.min(120000, 60000 + (job.chunk.duration * 2000));
        console.log(`   ⏱️ Timeout: ${adaptiveTimeout/1000}s for ${job.chunk.duration}s chunk`);
        
        const chunkPromise = this.transcribeChunk(job.chunk, {
          language: options.language,
          preferPython: this.preferPython && job.chunk.duration > 300,
          pythonModel: this.pythonModel
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error(`   ❌ TIMEOUT: Chunk ${job.chunk.index} exceeded ${adaptiveTimeout/1000}s`);
            reject(new Error(`Chunk ${job.chunk.index} timeout after ${adaptiveTimeout/1000}s`));
          }, adaptiveTimeout);
        });
        
        const result = await Promise.race([chunkPromise, timeoutPromise]);
        
        if (result && result.segments && result.segments.length > 0) {
          results[job.index] = {
            chunkIndex: job.chunk.index,
            chunkStart: job.chunk.start,
            chunkEnd: job.chunk.end,
            ...result
          };
          console.log(`   ✅ Chunk ${job.chunk.index}: ${result.segments.length} segments (${result.language})`);
        } else {
          console.warn(`   ⚠️ Chunk ${job.chunk.index}: No segments returned`);
          results[job.index] = {
            chunkIndex: job.chunk.index,
            chunkStart: job.chunk.start,
            chunkEnd: job.chunk.end,
            language: 'en',
            segments: []
          };
        }
        
        completedJobs++;
        const progress = completedJobs / jobs.length;
        console.log(`   ✅ Progress: ${completedJobs}/${jobs.length} chunks (${Math.round(progress * 100)}%)`);
        if (options.onProgress) {
          options.onProgress(progress);
        }
        
      } catch (error) {
        console.error(`   ❌ Chunk ${job.chunk.index} failed:`, error.message);
        
        // CRITICAL: Don't retry timeout errors - they will just hang again
        const isTimeout = error.message.includes('timeout') || error.message.includes('stalled');
        
        if (!isTimeout && job.retries < job.maxRetries) {
          job.retries++;
          console.log(`   🔄 Retrying chunk ${job.chunk.index} (attempt ${job.retries + 1}/${job.maxRetries + 1})`);
          jobs.push(job); // Add back to queue for retry
        } else {
          if (isTimeout) {
            console.warn(`   ⚠️ Skipping chunk ${job.chunk.index} - timeout error, no retry`);
          } else {
            console.warn(`   ⚠️ Skipping chunk ${job.chunk.index} - max retries reached`);
          }
          errors.push({ chunk: job.chunk, error: error.message });
          results[job.index] = {
            chunkIndex: job.chunk.index,
            chunkStart: job.chunk.start,
            chunkEnd: job.chunk.end,
            language: 'en',
            segments: [],
            error: error.message,
            skipped: true
          };
          completedJobs++;
          const progress = completedJobs / jobs.length;
          console.log(`   ⏭️ Skipped: ${completedJobs}/${jobs.length} chunks (${Math.round(progress * 100)}%)`);
          if (options.onProgress) {
            options.onProgress(progress);
          }
        }
      } finally {
        activeJobs.delete(job.id);
      }
      
      // CRITICAL: Return the job so worker knows we processed something
      return job;
    };
    
    // Start initial batch of jobs
    const workerPromises = [];
    for (let i = 0; i < maxConcurrent; i++) {
      workerPromises.push(this.runWorker(processNextJob));
    }
    
    // Wait for all workers to complete
    await Promise.all(workerPromises);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Parallel transcription complete in ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`   Processed: ${chunks.length} chunks`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Success rate: ${Math.round(((chunks.length - errors.length) / chunks.length) * 100)}%`);
    
    return {
      results: results.filter(r => r), // Remove any undefined entries
      errors,
      totalTime,
      chunksProcessed: chunks.length,
      successRate: (chunks.length - errors.length) / chunks.length
    };
  }
  
  async runWorker(processNextJob) {
    let job;
    // CRITICAL FIX: Process jobs until queue is empty
    while ((job = await processNextJob()) !== null) {
      // processNextJob handles the actual work
      // If it hangs, the timeout in processNextJob will handle it
    }
    // Worker exits when no more jobs available
    console.log(`   ✅ Worker finished`);
  }
  
  async transcribeChunk(chunk, options = {}) {
    const { language = 'auto' } = options;
    
    // Check if chunk file exists
    if (!fs.existsSync(chunk.outputPath)) {
      throw new Error(`Chunk file not found: ${chunk.outputPath}`);
    }
    
    // FIXED: Use whisper.cjs which now uses faster-whisper as primary
    const whisperService = require('./whisper.cjs');
    
    try {
      console.log(`   📡 Using whisper.cjs (faster-whisper PRIMARY) for chunk ${chunk.index}`);
      const result = await whisperService.transcribe(chunk.outputPath, { 
        language: language === 'auto' ? null : language 
      });
      return result;
    } catch (error) {
      console.error(`   ❌ Chunk ${chunk.index} transcription failed:`, error.message);
      throw error;
    }
  }
  
  async transcribeWithPython(chunk, options = {}) {
    const { language = 'auto', model = 'base' } = options;
    
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '..', '..', 'scripts', 'python_whisper.py');
      const outputPath = chunk.outputPath + '.json';
      
      const args = [
        pythonScript,
        chunk.outputPath,
        '--output', outputPath,
        '--model', model
      ];
      
      if (language !== 'auto') {
        args.push('--language', language);
      }
      
      const pythonProcess = spawn('python', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        setTimeout(() => pythonProcess.kill('SIGKILL'), 5000);
        reject(new Error(`Python Whisper timeout for chunk ${chunk.index}`));
      }, 600000); // 10 minute timeout
      
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            // Read result from output file
            if (fs.existsSync(outputPath)) {
              const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
              // Cleanup output file
              fs.unlinkSync(outputPath);
              
              // Adjust timestamps to be relative to chunk start
              const adjustedSegments = result.segments.map(seg => ({
                start: seg.start + chunk.start,
                end: seg.end + chunk.start,
                text: seg.text
              }));
              
              resolve({
                language: result.language || 'en',
                segments: adjustedSegments
              });
            } else {
              resolve({ language: 'en', segments: [] });
            }
          } catch (error) {
            reject(new Error(`Failed to parse Python Whisper result: ${error.message}`));
          }
        } else {
          reject(new Error(`Python Whisper failed with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Python Whisper process error: ${error.message}`));
      });
    });
  }
  
  async transcribeWithCpp(chunk, options = {}) {
    // CRITICAL FIX: Whisper.cjs now has internal 90s timeout + 30s silence detection
    // This is a safety net in case whisper.cjs timeout fails
    const CHUNK_TIMEOUT = 110000; // 110 seconds safety net (whisper.cjs has 90s)
    
    const transcribePromise = whisperCpp.transcribe(chunk.outputPath, options);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Chunk ${chunk.index} safety timeout after 110 seconds`)), CHUNK_TIMEOUT)
    );
    
    try {
      const result = await Promise.race([transcribePromise, timeoutPromise]);
      
      // Check if result is valid
      if (!result || !result.segments) {
        console.warn(`⚠️ Chunk ${chunk.index} returned invalid result, skipping`);
        return {
          language: 'en',
          segments: [],
          skipped: true
        };
      }
      
      // Adjust timestamps to be relative to original audio start time
      const adjustedSegments = result.segments.map(seg => ({
        start: seg.start + chunk.start,
        end: seg.end + chunk.start, 
        text: seg.text
      }));
      
      return {
        language: result.language || 'en',
        segments: adjustedSegments
      };
    } catch (error) {
      console.error(`❌ Chunk ${chunk.index} failed/timeout:`, error.message);
      // CRITICAL: Return empty result instead of throwing to prevent entire job failure
      return {
        language: 'en',
        segments: [],
        error: error.message,
        skipped: true
      };
    }
  }
  
  isPythonWhisperAvailable() {
    try {
      // Check if python and whisper are available
      const { execSync } = require('child_process');
      execSync('python -c "import whisper"', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ParallelWhisperProcessor;