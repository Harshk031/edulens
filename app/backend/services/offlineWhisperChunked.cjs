/**
 * Offline Whisper Chunked Processor
 * Handles long videos by processing in small chunks
 * Works completely offline, no API needed
 * Optimized to avoid memory issues
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const audioChunkerCLI = require('./audioChunkerCLI.cjs');
const whisper = require('./whisper.cjs');

/**
 * Process long video completely offline using chunked approach
 * @param {string} audioPath - Path to audio file
 * @param {object} options - Processing options
 * @returns {Promise<object>} - Complete transcript
 */
async function processLongVideoOffline(audioPath, options = {}) {
  const {
    language = 'auto',
    onProgress = () => {},
    maxChunkSize = 600 // 10 minutes per chunk (safe for memory)
  } = options;
  
  console.log('\n🔌 [OFFLINE] Processing long video with chunked approach');
  console.log('   This works completely offline, no API needed');
  console.log('   Processing in small chunks to avoid memory issues\n');
  
  // Get audio duration
  const duration = await audioChunkerCLI.getAudioDuration(audioPath);
  const durationMin = Math.floor(duration / 60);
  
  console.log(`   📊 Video duration: ${Math.floor(durationMin/60)}h ${durationMin%60}m`);
  
  // Estimate time
  const estimatedMinutes = Math.ceil(duration / 60); // ~1 minute processing per minute of video
  console.log(`   ⏱️  Estimated time: ~${estimatedMinutes} minutes`);
  console.log(`   💡 First chunk will be slower (model loading)\n`);
  
  // Create temp directory
  const tempDir = path.join(os.tmpdir(), `offline-whisper-${Date.now()}`);
  await fs.promises.mkdir(tempDir, { recursive: true });
  
  try {
    // Split audio into chunks
    console.log('🔪 Step 1: Splitting audio into chunks...');
    const chunksData = await audioChunkerCLI.splitAudioIntoChunks(
      audioPath,
      tempDir,
      (progress) => {
        onProgress(progress * 0.1); // 10% for splitting
        if (Math.floor(progress * 100) % 20 === 0) {
          console.log(`   Splitting: ${Math.floor(progress * 100)}%`);
        }
      }
    );
    
    console.log(`   ✅ Created ${chunksData.chunks.length} chunks\n`);
    
    // Process each chunk with Whisper.cpp
    console.log('🎙️  Step 2: Transcribing chunks (offline)...');
    const allSegments = [];
    let processedChunks = 0;
    
    for (let i = 0; i < chunksData.chunks.length; i++) {
      const chunk = chunksData.chunks[i];
      console.log(`\n   📝 Chunk ${i + 1}/${chunksData.chunks.length}: ${chunk.start}s - ${chunk.end}s`);
      
      try {
        // Transcribe with Whisper.cpp
        const chunkTranscript = await whisper.transcribe(
          chunk.outputPath,
          { language: language === 'auto' ? 'hi' : language },
          (chunkProgress) => {
            const overallProgress = 0.1 + ((i + chunkProgress) / chunksData.chunks.length) * 0.85;
            onProgress(overallProgress);
          }
        );
        
        // Adjust timestamps to absolute video time
        if (chunkTranscript.segments && Array.isArray(chunkTranscript.segments)) {
          for (const seg of chunkTranscript.segments) {
            allSegments.push({
              start: chunk.start + (seg.start || 0),
              end: chunk.start + (seg.end || seg.start + 5),
              text: seg.text || ''
            });
          }
          
          console.log(`   ✅ Chunk ${i + 1}: ${chunkTranscript.segments.length} segments`);
        } else {
          console.warn(`   ⚠️  Chunk ${i + 1}: No segments returned`);
        }
        
        processedChunks++;
        
        // Force garbage collection after each chunk
        if (global.gc) {
          global.gc();
        }
        
      } catch (error) {
        console.error(`   ❌ Chunk ${i + 1} failed:`, error.message);
        // Continue with next chunk instead of failing completely
      }
    }
    
    // Cleanup chunks
    console.log(`\n🧹 Step 3: Cleaning up...`);
    await audioChunkerCLI.cleanupChunks(tempDir);
    
    // Build final transcript
    console.log(`\n✨ Step 4: Finalizing transcript...`);
    const fullText = allSegments.map(s => s.text).join(' ');
    
    onProgress(1.0);
    
    const result = {
      language: language || 'hi',
      duration: chunksData.totalDuration,
      segments: allSegments,
      fullText,
      source: 'offline-chunked',
      chunksProcessed: processedChunks,
      chunksTotal: chunksData.chunks.length
    };
    
    console.log(`\n✅ [OFFLINE] Transcription complete!`);
    console.log(`   Processed: ${processedChunks}/${chunksData.chunks.length} chunks`);
    console.log(`   Total segments: ${allSegments.length}`);
    console.log(`   Text length: ${fullText.length} characters\n`);
    
    return result;
    
  } catch (error) {
    // Cleanup on error
    try {
      await audioChunkerCLI.cleanupChunks(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Determine if video should be processed offline
 * @param {number} duration - Video duration in seconds
 * @param {boolean} hasAPI - Whether API key is available
 * @returns {boolean}
 */
function shouldProcessOffline(duration, hasAPI) {
  // Force offline mode
  if (process.env.PREFER_OFFLINE === 'true') {
    return true;
  }
  
  // No API available
  if (!hasAPI) {
    return true;
  }
  
  // For very short videos, local is fine
  if (duration < 600) { // < 10 minutes
    return true;
  }
  
  // For medium videos (10-30 min), prefer local if possible
  if (duration < 1800) { // < 30 minutes
    return true; // Local is fast enough
  }
  
  // For long videos, prefer API but can fall back to offline
  return false;
}

module.exports = {
  processLongVideoOffline,
  shouldProcessOffline
};

