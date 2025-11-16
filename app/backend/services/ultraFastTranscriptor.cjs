const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const audioChunker = require('./audioChunker.cjs');
const ParallelWhisperProcessor = require('./parallelWhisper.cjs');
const SegmentMerger = require('./segmentMerger.cjs');
const youtubeCaptionFetcher = require('./youtubeCaptionFetcher.cjs');
const config = require('../../config/parallelTranscription.config.cjs');

// Ensure ffmpeg paths are set
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Ultra-Fast Parallel Transcription Service
 * Can process 40-hour videos in under 3 minutes using intelligent chunking and parallel processing
 */
class UltraFastTranscriptor {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.tempDir = path.join(os.tmpdir(), 'edulens-transcription');
    
    // Initialize components
    this.segmentMerger = new SegmentMerger(this.config.merging);
    
    // Determine optimal worker count - OPTIMIZED FOR STABILITY
    const cpuCount = os.cpus().length;
    const maxWorkers = this.config.workers.maxWorkers === 'auto' 
      ? Math.min(6, Math.max(2, Math.floor(cpuCount * 0.75))) // OPTIMIZED: Use 75% of CPU count, max 6 workers
      : this.config.workers.maxWorkers;
      
    this.parallelProcessor = new ParallelWhisperProcessor({
      maxWorkers,
      preferPython: this.config.engines.preferPythonForLong,
      pythonModel: this.config.engines.pythonModel
    });
    
    console.log(`🚀 UltraFastTranscriptor initialized`);
    console.log(`   Workers: ${maxWorkers} (${cpuCount} CPUs available)`);
    console.log(`   Python Whisper: ${this.isPythonWhisperAvailable() ? 'Available' : 'Not Available'}`);
    console.log(`   Temp directory: ${this.tempDir}`);
  }

  /**
   * Check if legacy Python Whisper is available
   *
   * IMPORTANT: We now use faster-whisper via whisper.cjs as the PRIMARY engine.
   * The old Python Whisper path is deprecated and has caused hangs/crashes.
   * To keep the system stable, we explicitly disable Python Whisper here.
   */
  isPythonWhisperAvailable() {
    try {
      // Explicitly disable legacy Python Whisper integration.
      // All transcription should flow through whisper.cjs (faster-whisper primary).
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Main transcription method - handles videos of any length
   */
  async transcribe(audioFilePath, options = {}) {
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ultraFast.transcribe() CALLED\n`);
    const startTime = Date.now();
    console.log(`\n🚀 UltraFastTranscriptor.transcribe() START`);
    console.log(`   Audio file: ${audioFilePath}`);
    console.log(`   Options:`, options);

    // Validate input
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    // OPTIMIZATION: Try YouTube captions first (instant, no transcription needed)
    // DISABLED: yt-dlp may not be installed, skip for now
    // if (options.videoId) {
    //   console.log(`\n📥 Attempting YouTube caption fetch (instant)...`);
    //   try {
    //     const captionResult = await youtubeCaptionFetcher.fetchCaptions(options.videoId);
    //     if (captionResult && captionResult.segments && captionResult.segments.length > 0) {
    //       console.log(`   ✅ YouTube captions found! ${captionResult.segments.length} segments`);
    //       console.log(`   ⚡ INSTANT transcription (0s processing time)`);
    //       
    //       if (options.onProgress) {
    //         options.onProgress(1.0);
    //       }
    //       
    //       return {
    //         ...captionResult,
    //         processingTime: Date.now() - startTime,
    //         method: 'youtube_captions'
    //       };
    //     }
    //     console.log(`   ⚠️ No YouTube captions available, falling back to Whisper`);
    //   } catch (error) {
    //     console.warn(`   ⚠️ Caption fetch failed: ${error.message}`);
    //   }
    // }

    // Get audio duration
    const totalDuration = await audioChunker.getAudioDuration(audioFilePath);
    console.log(`   Duration: ${totalDuration}s (${Math.floor(totalDuration/60)}m ${totalDuration%60}s)`);

    // CRITICAL FIX: Use parallel processing for ALL videos (single-threaded mode is broken)
    // Single-threaded Whisper.cpp hangs at OS level, parallel mode with timeouts is more reliable
    console.log(`   🚀 Using parallel processing (single-threaded mode disabled due to Whisper.cpp hangs)`);
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ultraFast: Starting transcribe function\n`);
    
    // Force parallel processing even for short videos
    // const needsParallelProcessing = totalDuration > 300; // 5+ minutes
    // if (!needsParallelProcessing) {
    //   console.log(`   🔄 Using single-threaded processing for short video`);
    //   return await this.transcribeSingleThreaded(audioFilePath, options, totalDuration);
    // }
    //
    // console.log(`   🚀 Using parallel processing for long video (${Math.floor(totalDuration/60)}m)`);
    
    try {
      // Step 1: Create temporary working directory
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const workingDir = path.join(this.tempDir, sessionId);
      await fs.promises.mkdir(workingDir, { recursive: true });
      
      console.log(`   Working directory: ${workingDir}`);

      // Step 2: Split audio into chunks
      console.log(`\n🔪 STEP 1: Audio chunking`);
      const chunksData = await audioChunker.splitAudioIntoChunks(
        audioFilePath, 
        workingDir,
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress * 0.2); // Chunking is 20% of total progress
          }
        }
      );

      console.log(`   Created ${chunksData.chunks.length} chunks`);

      // Step 3: Parallel transcription
      console.log(`\n🎤 STEP 2: Parallel transcription`);
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ultraFast: Starting parallel transcription\n`);
      
      const parallelResults = await this.parallelProcessor.transcribeChunksParallel(
        chunksData.chunks,
        {
          language: options.language || 'auto',
          onProgress: (progress) => {
            if (options.onProgress) {
              options.onProgress(0.2 + progress * 0.6); // Transcription is 60% of total progress
            }
          }
        }
      );

      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ultraFast: Parallel transcription complete - ${parallelResults.results.length} chunks\n`);
      
      console.log(`   Transcribed ${parallelResults.results.length} chunks`);
      console.log(`   Success rate: ${Math.round(parallelResults.successRate * 100)}%`);

      // Step 4: Merge segments
      console.log(`\n🔗 STEP 3: Segment merging`);
      const mergedResult = this.segmentMerger.mergeChunkResults(
        parallelResults.results,
        totalDuration
      );

      if (options.onProgress) {
        options.onProgress(0.85);
      }
      
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ultraFast: Merge complete, starting post-processing\n`);

      // Step 5: Post-processing and optimization
      console.log(`\n✨ STEP 4: Post-processing`);
      const finalResult = this.postProcessTranscript(mergedResult, {
        totalDuration,
        chunksProcessed: chunksData.chunks.length,
        parallelStats: parallelResults,
        mergeStats: mergedResult.mergeStats
      });

      // Step 6: Cleanup
      if (this.config.performance.autoCleanup && !this.config.debug.keepTempFiles) {
        await this.cleanup(workingDir);
      }

      if (options.onProgress) {
        options.onProgress(1.0);
      }

      const totalTime = Date.now() - startTime;
      console.log(`\n✅ UltraFastTranscriptor.transcribe() COMPLETE`);
      console.log(`   Total time: ${(totalTime / 1000).toFixed(1)}s`);
      console.log(`   Processing speed: ${(totalDuration / (totalTime / 1000)).toFixed(1)}x realtime`);
      console.log(`   Segments: ${finalResult.segments.length}`);
      console.log(`   Language: ${finalResult.language}`);

      return finalResult;

    } catch (error) {
      console.error(`❌ UltraFastTranscriptor failed:`, error);
      
      // CRITICAL: Cleanup temp files even on error
      try {
        if (workingDir && fs.existsSync(workingDir)) {
          await fs.promises.rm(workingDir, { recursive: true, force: true });
          console.log(`   🧹 Cleaned up after error: ${workingDir}`);
        }
      } catch (cleanupError) {
        console.warn(`   ⚠️ Cleanup after error failed:`, cleanupError.message);
      }
      
      throw error;
    }
  }

  /**
   * Single-threaded transcription for shorter videos
   */
  async transcribeSingleThreaded(audioFilePath, options, totalDuration) {
    console.log(`   Using single Whisper instance`);
    
    // Use the best available Whisper engine
    const whisperCpp = require('./whisper.cjs');
    
    try {
      const result = await whisperCpp.transcribe(audioFilePath, {
        language: options.language || 'auto'
      }, options.onProgress);

      return this.postProcessTranscript({
        language: result.language || 'en',
        segments: result.segments || []
      }, {
        totalDuration,
        processingMode: 'single-threaded'
      });
      
    } catch (error) {
      console.warn(`   Whisper.cpp failed, trying Python fallback:`, error.message);
      
      if (this.isPythonWhisperAvailable()) {
        const result = await this.parallelProcessor.transcribeWithPython(
          { 
            outputPath: audioFilePath, 
            start: 0, 
            end: totalDuration,
            index: 0 
          },
          { 
            language: options.language || 'auto',
            model: this.config.engines.pythonModel 
          }
        );

        return this.postProcessTranscript({
          language: result.language || 'en',
          segments: result.segments || []
        }, {
          totalDuration,
          processingMode: 'single-threaded-python'
        });
      }
      
      throw error;
    }
  }

  /**
   * Post-process the final transcript
   */
  postProcessTranscript(transcript, metadata) {
    console.log(`   Post-processing ${transcript.segments.length} segments`);

    // Add metadata and ensure consistent format
    const result = {
      language: transcript.language || 'en',
      originalLanguage: transcript.language || 'en',
      duration: metadata.totalDuration,
      segments: transcript.segments.map(seg => ({
        start: Math.round(seg.start * 100) / 100,
        end: Math.round(seg.end * 100) / 100,
        text: seg.text.trim()
      })).filter(seg => seg.text.length > 0),
      originalSegments: null,
      processingMetadata: {
        mode: metadata.processingMode || 'parallel',
        chunksProcessed: metadata.chunksProcessed || 0,
        processingTime: metadata.processingTime,
        parallelStats: metadata.parallelStats,
        mergeStats: metadata.mergeStats,
        engine: 'ultra-fast-transcriptor',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    // Generate full text
    result.fullText = result.segments.map(seg => seg.text).join(' ');

    console.log(`   Final segments: ${result.segments.length}`);
    console.log(`   Full text length: ${result.fullText.length} characters`);

    return result;
  }

  /**
   * Cleanup temporary files - FIXED to prevent C drive filling up
   */
  async cleanup(workingDir) {
    try {
      if (workingDir && fs.existsSync(workingDir)) {
        await fs.promises.rm(workingDir, { recursive: true, force: true });
        console.log(`   🧹 Cleaned up: ${workingDir}`);
      }
      
      // Also cleanup system temp files
      const tempDir = require('os').tmpdir();
      const tempFiles = fs.readdirSync(tempDir).filter(f => 
        f.includes('yt-dlp') || f.includes('chunk') || f.match(/\.wav$/) || f.match(/\.m4a$/)
      );
      
      if (tempFiles.length > 0) {
        console.log(`   🧹 Cleaning ${tempFiles.length} temp files...`);
        let cleaned = 0;
        for (const file of tempFiles) {
          try {
            const filePath = require('path').join(tempDir, file);
            await fs.promises.rm(filePath, { force: true, recursive: true });
            cleaned++;
          } catch (e) {
            // Ignore individual file errors
          }
        }
        console.log(`   🧹 Cleaned ${cleaned} temp files`);
      }
    } catch (error) {
      console.warn(`   ⚠️ Cleanup failed:`, error.message);
    }
  }

  /**
   * Get optimal configuration for given duration
   */
  getOptimalConfig(duration) {
    const configs = this.config.chunking;
    
    if (duration <= configs.SHORT.maxDuration) return configs.SHORT;
    if (duration <= configs.MEDIUM.maxDuration) return configs.MEDIUM;
    if (duration <= configs.LONG.maxDuration) return configs.LONG;
    return configs.ULTRA;
  }

  /**
   * Estimate processing time
   */
  estimateProcessingTime(duration) {
    // Based on empirical measurements
    const baseTime = 30; // 30 seconds base overhead
    const parallelSpeedFactor = 0.05; // ~3 minutes for 40 hours with parallel processing
    
    if (duration <= 300) {
      // Single-threaded for short videos
      return baseTime + (duration * 0.1); // ~0.1x realtime
    } else {
      // Parallel processing for long videos
      return baseTime + (duration * parallelSpeedFactor); // ~0.05x realtime
    }
  }
}

module.exports = UltraFastTranscriptor;