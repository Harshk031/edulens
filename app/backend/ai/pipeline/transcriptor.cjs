const path = require('path');
const fs = require('fs');
const ytApi = require('../../services/ytApi.cjs');
const whisper = require('../../services/whisper.cjs');
const translator = require('../../services/translator.cjs');
const UltraFastTranscriptor = require('../../services/ultraFastTranscriptor.cjs');
const transcriptValidator = require('../../utils/transcriptValidator.cjs');

// Force UTF-8 encoding GLOBALLY
process.env.LANG = 'en_US.UTF-8';
process.env.LC_ALL = 'en_US.UTF-8';

// Ensure Node.js uses UTF-8 (safely handle ES module context)
try {
  if (process.stdout && typeof process.stdout.setEncoding === 'function' && !process.stdout.isTTY) {
    process.stdout.setEncoding('utf8');
  }
  if (process.stderr && typeof process.stderr.setEncoding === 'function' && !process.stderr.isTTY) {
    process.stderr.setEncoding('utf8');
  }
} catch (e) {
  // Silently ignore if we're in an ES module context where streams may not be writable
  console.debug('[transcriptor] UTF-8 encoding setup skipped (ES module context)');
}

async function prepare(url, { forceRefresh = false } = {}) {
  console.log('\n🔄 transcriptor.prepare() START');
  console.log(`   URL: ${url}`);
  console.log(`   ForceRefresh: ${forceRefresh}`);
  console.log(`   ytApi available: ${!!ytApi}`);
  console.log(`   ytApi.getVideoMeta available: ${typeof ytApi?.getVideoMeta === 'function'}`);
  try {
    if (!ytApi || typeof ytApi.getVideoMeta !== 'function') {
      throw new Error('ytApi.getVideoMeta not available');
    }
    const meta = await ytApi.getVideoMeta(url);
    if (!meta) {
      throw new Error('getVideoMeta returned null/undefined');
    }
    console.log(`✅ transcriptor.prepare() SUCCESS:`);
    console.log(`   VideoId: ${meta.videoId}`);
    console.log(`   Title: ${meta.title}`);
    console.log(`   Duration: ${meta.duration}s`);
    console.log(`   Language: ${meta.languageHint}`);
    return { ...meta, forceRefresh };
  } catch (e) {
    console.error('❌ transcriptor.prepare() FAILED:');
    console.error(`   Error: ${e?.message}`);
    console.error(`   Stack: ${e?.stack?.substring?.(0, 500)}`);
    throw e;
  }
}

async function getOrCreateTranscript(meta, onProgress = () => {}) {
  require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] getOrCreateTranscript() CALLED\n`);
  const { videoId, duration } = meta;
  
  // CRITICAL FIX: Use process.cwd() for consistent paths
  const transcriptsDir = path.join(process.cwd(), 'data', 'storage', 'transcripts');
  const outFile = path.join(transcriptsDir, `${videoId}.json`);
  
  // Ensure directory exists
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
    console.log(`[transcriptor] Created transcripts directory: ${transcriptsDir}`);
  }
  
  console.log('\n🔄 getOrCreateTranscript() START');
  console.log(`   VideoId: ${videoId}`);
  console.log(`   OutFile: ${outFile}`);
  console.log(`   TranscriptsDir: ${transcriptsDir}`);
  console.log(`   Cached: ${fs.existsSync(outFile) ? 'YES' : 'NO'}`);
  console.log(`   ForceRefresh: ${meta.forceRefresh ? 'YES' : 'NO'}`);
  
  if (fs.existsSync(outFile) && !meta.forceRefresh) {
    console.log(`✅ Using cached transcript: ${outFile}`);
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Found cached transcript, reading...\n`);
    const cachedTranscript = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Cached transcript loaded: ${cachedTranscript.segments?.length || 0} segments\n`);
    
    // CRITICAL: Check if cached transcript is empty
    if (!cachedTranscript || !cachedTranscript.segments || cachedTranscript.segments.length === 0) {
      console.error(`❌ CRITICAL: Cached transcript is empty for video ${videoId}`);
      console.log(`🔄 ACTION: Forcing transcript regeneration due to empty cached transcript`);
      meta.forceRefresh = true;
    } else {
      // Check if cached transcript has text content
      const hasText = cachedTranscript.segments.some(seg => seg.text && seg.text.trim().length > 0);
      if (!hasText) {
        console.error(`❌ CRITICAL: Cached transcript has no text content for video ${videoId}`);
        console.log(`🔄 ACTION: Forcing transcript regeneration due to empty text content`);
        meta.forceRefresh = true;
      } else {
        // ENHANCED FIX: Use comprehensive transcript validator
        const validation = transcriptValidator.validateTranscript(cachedTranscript, videoId);
        
        if (validation.isValid) {
          console.log(`✅ Cached transcript validated: ${validation.metadata.validSegmentCount} valid segments, ${validation.metadata.totalTextLength} chars`);
          return cachedTranscript;
        } else {
          console.error(`❌ CRITICAL: Cached transcript validation FAILED for video ${videoId}`);
          console.error(`   Errors: ${validation.errors.join(', ')}`);
          if (validation.warnings.length > 0) {
            console.warn(`   Warnings: ${validation.warnings.join(', ')}`);
          }
          
          // Check if we should regenerate
          if (transcriptValidator.shouldRegenerateTranscript(validation)) {
            console.log(`🔄 ACTION: Forcing transcript regeneration due to validation failure`);
            meta.forceRefresh = true;
          } else {
            console.log(`⚠️ WARNING: Using invalid cached transcript (regeneration not recommended)`);
            return cachedTranscript;
          }
        }
      }
    }
  }

  console.log('\n🎯 STEP 1: Try YouTube captions...');
  require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Calling ytApi.tryGetEnglishCaptions()\n`);
  
  let transcript = await ytApi.tryGetEnglishCaptions(videoId);
  
  require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ytApi.tryGetEnglishCaptions() returned: ${transcript ? 'OBJECT' : 'NULL'}\n`);
  require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Has error: ${!!transcript?.error}, Has segments: ${!!transcript?.segments}\n`);
  
  // CRITICAL FIX: Check for error responses first
  if (transcript && transcript.error) {
    console.error(`[transcriptor] ❌ YouTube captions failed: ${transcript.error}`);
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Captions returned error: ${transcript.error}\n`);
    transcript = null; // Force fallback to audio transcription
  } else if (transcript && transcript.segments && transcript.segments.length > 0) {
    // Validate caption transcript
    const captionValidation = transcriptValidator.validateTranscript(transcript, videoId);
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Caption validation: isValid=${captionValidation.isValid}, errors=${captionValidation.errors.join(', ')}\n`);
    
    if (captionValidation.isValid) {
      console.log(`✅ Got VALID YouTube captions: ${captionValidation.metadata.validSegmentCount} segments`);
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Using YouTube captions - RETURNING\n`);
    } else {
      console.warn(`⚠️ YouTube captions validation FAILED: ${captionValidation.errors.join(', ')}`);
      console.log(`🔄 Will proceed with audio transcription as fallback`);
      require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Captions invalid, falling back to audio\n`);
      transcript = null; // Force fallback to audio transcription
    }
  } else {
    console.log(`❌ No YouTube captions available. Trying Whisper...`);
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] No captions, falling back to audio\n`);
    transcript = null;
  }
  
  // CRITICAL FIX: Always attempt audio transcription if no valid captions
  if (!transcript || !transcript.segments || transcript.segments.length === 0) {
    // HYBRID APPROACH: Try Whisper API for long videos, but fallback to local
    const hasWhisperAPI = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const preferOffline = process.env.PREFER_OFFLINE === 'true';
    
    // Decide whether to use API based on video length and settings
    const shouldUseAPI = hasWhisperAPI && !preferOffline && duration > 1800; // > 30 minutes
    
    if (shouldUseAPI) {
      console.log('\n🌐 STEP 2: Cloud transcription with Whisper API (for long video)...');
      
      try {
        const whisperAPI = require('../../services/whisperAPI.cjs');
        
        onProgress(0.1);
        console.log(`   📄 Download audio...`);
        
        const audioFile = await ytApi.downloadAudio(videoId, (p) => {
          console.log(`   📄 Download progress: ${Math.round(p * 100)}%`);
          onProgress(0.1 + p * 0.2); // 20% for download
        });
        
        console.log(`✅ Audio downloaded: ${audioFile}`);
        
        // Determine language
        const language = meta.languageHint === 'hi' ? 'hi' : 'en';
        
        // Transcribe using API
        transcript = await whisperAPI.transcribeLongVideo(audioFile, {
          provider: process.env.GROQ_API_KEY ? 'groq' : 'openai',
          language,
          onProgress: (p) => {
            onProgress(0.3 + p * 0.6); // 60% for transcription
          }
        });
        
        // Cleanup audio file
        try {
          fs.unlinkSync(audioFile);
          console.log(`🧹 Cleaned up: ${audioFile}`);
        } catch (e) {
          console.warn(`⚠️  Could not delete ${audioFile}`);
        }
        
        console.log(`✅ Cloud transcription complete: ${transcript.segments.length} segments`);
        
      } catch (apiError) {
        console.error(`❌ Whisper API failed: ${apiError.message}`);
        console.log(`🔄 Falling back to offline transcription...`);
        transcript = null; // Will fall through to local processing
      }
    }
    
    // OFFLINE PROCESSING: Use chunked approach for long videos
    if (!transcript || !transcript.segments || transcript.segments.length === 0) {
      
      // For long videos (>30min), use chunked offline processing
      if (duration > 1800) {
        console.log('\n🔌 STEP 2B: Offline chunked transcription (for long video)...');
        console.log('   This will take longer but works completely offline\n');
        
        try {
          const offlineWhisper = require('../../services/offlineWhisperChunked.cjs');
          
          onProgress(0.1);
          console.log(`   📄 Download audio...`);
          
          const audioFile = await ytApi.downloadAudio(videoId, (p) => {
            console.log(`   📄 Download progress: ${Math.round(p * 100)}%`);
            onProgress(0.1 + p * 0.15); // 15% for download
          });
          
          console.log(`✅ Audio downloaded: ${audioFile}`);
          
          // Process offline with chunked approach
          transcript = await offlineWhisper.processLongVideoOffline(audioFile, {
            language: meta.languageHint || 'hi',
            onProgress: (p) => {
              onProgress(0.25 + p * 0.7); // 70% for transcription
            }
          });
          
          // Cleanup audio file
          try {
            fs.unlinkSync(audioFile);
            console.log(`🧹 Cleaned up: ${audioFile}`);
          } catch (e) {
            console.warn(`⚠️  Could not delete ${audioFile}`);
          }
          
          console.log(`✅ Offline transcription complete: ${transcript.segments.length} segments`);
          
        } catch (offlineError) {
          console.error(`❌ Offline transcription failed: ${offlineError.message}`);
          transcript = null; // Will fall through to ultra-fast transcription
        }
      }
      
      // Fall back to original parallel transcription for shorter videos
      if (!transcript || !transcript.segments || transcript.segments.length === 0) {
        console.log('\n🎯 STEP 2: Ultra-fast parallel transcription with retry logic...');
    
    let retryCount = 0;
    const maxRetries = 5; // Increased retries to prevent empty transcripts
    let lastError = null;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`   🔄 Transcription attempt ${retryCount + 1}/${maxRetries}`);
        onProgress(0.1);
        console.log(`   📄 Download audio...`);
        console.log(`   ytApi.downloadAudio available: ${typeof ytApi?.downloadAudio === 'function'}`);
        if (typeof ytApi?.downloadAudio !== 'function') {
          throw new Error('ytApi.downloadAudio not available');
        }
        
        const audioFile = await ytApi.downloadAudio(videoId, (p) => {
          const downloadProgress = Math.round(p * 100);
          const overallProgress = 0.1 + p * 0.3; // 10% -> 40%
          console.log(`   📄 Download progress: ${downloadProgress}% (overall: ${Math.round(overallProgress * 100)}%)`);
          onProgress(overallProgress);
        });
        
        if (!audioFile || typeof audioFile !== 'string') {
          throw new Error(`Invalid audio file returned: ${audioFile}`);
        }
        
        console.log(`✅ Audio downloaded: ${audioFile}`);
        console.log(`   File exists: ${fs.existsSync(audioFile) ? '✅' : '❌'}`);
        
        // Use ultra-fast parallel transcription system
        console.log(`   🚀 Starting Ultra-Fast Parallel Transcription...`);
        console.log(`   Duration: ${duration}s - ${duration > 300 ? 'PARALLEL mode' : 'SINGLE mode'}`);
        
        const ultraFastTranscriptor = new UltraFastTranscriptor();
        
        let transcriptionProgress = 0;
        const transcriptionResult = await ultraFastTranscriptor.transcribe(audioFile, {
          language: 'auto',
          videoId: videoId, // Pass videoId for YouTube caption fallback
          onProgress: (p) => {
            transcriptionProgress = Math.round(p * 100);
            const overallProgress = 0.4 + p * 0.5; // 40% -> 90%
            console.log(`   🎤 Transcription progress: ${transcriptionProgress}% (overall: ${Math.round(overallProgress * 100)}%)`);
            onProgress(overallProgress);
          }
        });
        
        console.log(`✅ Ultra-Fast Transcription complete`);
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Transcription complete\n`);
        
        console.log(`   Language: ${transcriptionResult.language}`);
        console.log(`   Segments: ${transcriptionResult.segments ? transcriptionResult.segments.length : 0}`);
        console.log(`   Mode: ${transcriptionResult.processingMetadata?.mode || 'unknown'}`);
        console.log(`   Progress: ${transcriptionProgress}%`);
        
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Segments: ${transcriptionResult.segments ? transcriptionResult.segments.length : 0}\n`);
        
        if (transcriptionResult.processingMetadata?.parallelStats) {
          const stats = transcriptionResult.processingMetadata.parallelStats;
          console.log(`   Chunks processed: ${stats.chunksProcessed}`);
          console.log(`   Success rate: ${Math.round(stats.successRate * 100)}%`);
          console.log(`   Processing time: ${(stats.totalTime / 1000).toFixed(1)}s`);
        }
        
        // Validate transcription result
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Validating result...\n`);
        
        if (transcriptionResult && transcriptionResult.segments && transcriptionResult.segments.length > 0) {
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Validation passed, breaking loop\n`);
          transcript = transcriptionResult;
          break; // Success, exit retry loop
        } else {
          require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Validation failed - no segments\n`);
          console.warn(`⚠️ Transcription attempt ${retryCount + 1} failed: No segments generated`);
          lastError = new Error('No segments generated from transcription');
          retryCount++;
          
          // Cleanup audio file before retry
          try {
            if (fs.existsSync(audioFile)) {
              fs.unlinkSync(audioFile);
              console.log(`   🧹 Cleaned up audio file: ${audioFile}`);
            }
          } catch (cleanupError) {
            console.warn(`   ⚠️  Could not cleanup audio file:`, cleanupError.message);
          }
          
          // Add delay before retry
          if (retryCount < maxRetries) {
            console.log(`   ⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
      } catch (e) {
        console.error(`❌ Transcription attempt ${retryCount + 1} error:`, e);
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] EXCEPTION in attempt ${retryCount + 1}: ${e.message}\n`);
        require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Stack: ${e.stack?.substring(0, 500)}\n`);
        lastError = e;
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log(`   ⏳ Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // If all retries failed, try multiple fallback methods
    if (!transcript || !transcript.segments || transcript.segments.length === 0) {
      console.error(`❌ All transcription attempts failed after ${maxRetries} retries`);
      console.log(`   🔄 Trying multiple fallback methods...`);
      
      // Fallback 1: Basic Whisper.cpp
      try {
        console.log(`   🔄 Fallback 1: Basic Whisper.cpp...`);
        const audioFile = await ytApi.downloadAudio(videoId, () => {});
        const fallbackResult = await whisper.transcribe(audioFile, { language: 'auto' });
        
        // Validate fallback result
        if (fallbackResult && fallbackResult.segments && fallbackResult.segments.length > 0) {
          transcript = fallbackResult;
          console.log(`✅ Fallback 1 transcription complete: ${transcript.segments?.length || 0} segments`);
        } else {
          console.warn(`⚠️ Fallback 1 produced no segments, trying fallback 2...`);
        }
      } catch (fallbackError) {
        console.warn(`⚠️ Fallback 1 failed: ${fallbackError.message}, trying fallback 2...`);
      }
      
      // Fallback 2: Try with different language settings
      if (!transcript || !transcript.segments || transcript.segments.length === 0) {
        try {
          console.log(`   🔄 Fallback 2: Whisper with explicit English...`);
          const audioFile = await ytApi.downloadAudio(videoId, () => {});
          const fallbackResult2 = await whisper.transcribe(audioFile, { language: 'en' });
          
          if (fallbackResult2 && fallbackResult2.segments && fallbackResult2.segments.length > 0) {
            transcript = fallbackResult2;
            console.log(`✅ Fallback 2 transcription complete: ${transcript.segments?.length || 0} segments`);
          } else {
            console.warn(`⚠️ Fallback 2 produced no segments`);
          }
        } catch (fallbackError2) {
          console.warn(`⚠️ Fallback 2 failed: ${fallbackError2.message}`);
        }
      }
      
      // If still no transcript, set to null (will throw error later)
      if (!transcript || !transcript.segments || transcript.segments.length === 0) {
        console.error(`❌ All fallback methods failed - no transcript generated`);
        transcript = null;
      }
    }
    
    // ENHANCED FIX: Use comprehensive transcript validator for final validation
    // CRITICAL: Only validate if transcript exists and has segments
    if (transcript && transcript.segments && transcript.segments.length > 0) {
      const finalValidation = transcriptValidator.validateTranscript(transcript, videoId);
      
      if (!finalValidation.isValid) {
        console.error(`❌ CRITICAL: Transcription validation FAILED for video ${videoId}`);
        console.error(`   Errors: ${finalValidation.errors.join(', ')}`);
        console.error(`   Last error: ${lastError?.message || 'Unknown error'}`);
        
        // If validation failed but we have segments, check if we can fix it
        const hasText = transcript.segments.some(seg => seg.text && seg.text.trim().length > 0);
        if (hasText) {
          console.warn(`⚠️ Validation failed but transcript has text - will use it with warnings`);
          // Continue with transcript even if validation has warnings
        } else {
          console.error(`❌ Transcript has no text content - will throw error`);
          transcript = null; // Will throw error later
        }
      } else {
        console.log(`✅ Transcription validation PASSED: ${finalValidation.metadata.validSegmentCount} valid segments`);
        
        if (finalValidation.warnings.length > 0) {
          console.warn(`⚠️ Transcription warnings: ${finalValidation.warnings.join(', ')}`);
        }
      }
    }
  }

  // CRITICAL FIX: Handle null transcript case after caption/audio processing
  if (!transcript) {
    const errorMsg = `Failed to generate transcript for video ${videoId}. All transcription methods failed. Please check audio download and transcription services.`;
    console.error('❌ CRITICAL: transcript is null after all processing attempts');
    require('fs').appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] ERROR: ${errorMsg}\n`);
    throw new Error(errorMsg);
  }
  
  // CRITICAL: Validate transcript has segments with text
  if (!transcript.segments || transcript.segments.length === 0) {
    console.error('❌ CRITICAL: transcript has no segments after processing');
    throw new Error(`Transcript generated but contains no segments for video ${videoId}. Please check transcription quality.`);
  }
  
  // Validate that segments have text content
  const hasText = transcript.segments.some(seg => seg.text && seg.text.trim().length > 0);
  if (!hasText) {
    console.error('❌ CRITICAL: transcript has segments but no text content');
    throw new Error(`Transcript generated but contains no text content for video ${videoId}. Please check transcription quality.`);
  }

  console.log(`[transcriptor] 🔍 POST-TRANSCRIPTION: Starting post-processing...`);
  console.log(`[transcriptor] 🔍 Transcript has ${transcript.segments?.length || 0} segments`);
  
  // DEBUG: Write to file to track execution
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] POST-TRANSCRIPTION: ${transcript.segments?.length || 0} segments\n`);
  
  let language = transcript.language || 'en';
  let originalLanguage = language;
  let originalSegments = null;
  
  console.log(`[transcriptor] 🔍 Detected language: ${language}`);
  
  // CRITICAL FIX: Translation with timeout to prevent hanging
  if (language !== 'en') {
    console.log(`[transcriptor] 🌐 Non-English transcript detected (${language})`);
    console.log(`[transcriptor] 🔄 Translating to English with timeout protection...`);
    
    try {
      const before = transcript;
      
      // Add overall timeout for entire translation process
      const TOTAL_TRANSLATION_TIMEOUT = 120000; // 2 minutes total
      const translationPromise = translator.toEnglish(transcript);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Translation timeout - exceeded 2 minutes')), TOTAL_TRANSLATION_TIMEOUT)
      );
      
      const eng = await Promise.race([translationPromise, timeoutPromise]);
      
      transcript = eng.transcript;
      language = 'en';
      originalSegments = before.segments || null;
      
      console.log(`[transcriptor] ✅ Translation complete`);
      onProgress(0.95); // Update progress after translation
      
    } catch (translationError) {
      console.error(`[transcriptor] ❌ Translation failed: ${translationError.message}`);
      console.log(`[transcriptor] ⚠️  Keeping original language transcript`);
      originalSegments = transcript.segments;
      // Keep original language if translation fails
    }
  }

  // Determine duration from segments if needed
  const segs = transcript.segments || [];
  const inferredDuration = segs.length ? Math.max(...segs.map(s => s.end || 0)) : (duration || 0);

  // ENHANCED FIX: Add comprehensive validation metadata to track transcript quality
  const canonical = {
    videoId,
    language,
    originalLanguage,
    duration: inferredDuration || duration || 0,
    segments: segs,
    originalSegments,
    encodingInfo: {
      charset: 'utf-8',
      timestamp: new Date().toISOString()
    },
    validation: {
      segmentCount: segs.length,
      hasValidContent: segs.length > 0 && segs.some(seg => seg.text && seg.text.trim().length > 0),
      totalTextLength: segs.reduce((sum, seg) => sum + (seg.text || '').length, 0),
      processingFailed: transcript.processingFailed || false,
      validatedAt: new Date().toISOString(),
      // Include full validation results
      validationErrors: transcript.validation?.errors || [],
      validationWarnings: transcript.validation?.warnings || [],
      isValid: transcript.validation?.isValid || (segs.length > 0)
    }
  };

  // Write with explicit UTF-8 encoding
  console.log(`[transcriptor] 💾 STEP 1: Preparing to save transcript to: ${outFile}`);
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] STEP 1: Preparing to save\n`);
  
  console.log(`[transcriptor] 💾 STEP 2: Stringifying JSON (${segs.length} segments)...`);
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] STEP 2: Stringifying ${segs.length} segments\n`);
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Canonical keys: ${Object.keys(canonical).join(', ')}\n`);
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] Starting JSON.stringify...\n`);
  
  let jsonContent;
  try {
    jsonContent = JSON.stringify(canonical, null, 2);
    console.log(`[transcriptor] 💾 STEP 3: JSON stringified (${jsonContent.length} bytes)`);
    fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] STEP 3: Stringified ${jsonContent.length} bytes\n`);
  } catch (e) {
    console.error(`[transcriptor] ❌ STEP 3 FAILED: JSON.stringify error:`, e.message);
    fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] STEP 3 ERROR: ${e.message}\n`);
    throw e;
  }
  
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] After STEP 3, before dirname\n`);
  
  // Ensure directory exists before writing
  const dir = path.dirname(outFile);
  fs.appendFileSync('debug-transcriptor.log', `[${new Date().toISOString()}] After dirname: ${dir}\n`);
  console.log(`[transcriptor] 💾 STEP 4: Checking directory: ${dir}`);
  
  if (!fs.existsSync(dir)) {
    console.log(`[transcriptor] 💾 STEP 5: Creating directory...`);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[transcriptor] ✅ Directory created: ${dir}`);
  } else {
    console.log(`[transcriptor] ✅ Directory exists: ${dir}`);
  }
  
  console.log(`[transcriptor] 💾 STEP 6: Writing file...`);
  fs.writeFileSync(outFile, jsonContent, { encoding: 'utf8' });
  console.log(`[transcriptor] ✅ STEP 7: File written successfully!`);
  
  console.log(`[transcriptor] 💾 STEP 8: Verifying file...`);
  try {
    const verification = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    console.log(`[transcriptor] ✅ STEP 9: Verification complete (${verification.segments.length} segments, ${language})`);
  } catch (e) {
    console.warn(`[transcriptor] ⚠️  STEP 9: Verification failed:`, e.message);
  }
  
  console.log(`[transcriptor] ✅ STEP 10: Returning canonical transcript`);
  onProgress(1.0); // Final progress update
  
  return canonical;
  }
  }
}

module.exports = { prepare, getOrCreateTranscript };