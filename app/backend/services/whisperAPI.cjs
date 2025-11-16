/**
 * Whisper API Integration - Cloud-based transcription
 * This is how notegpt.io handles long videos without memory issues
 * Supports: Groq (FREE), OpenAI (PAID)
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// File size limits (in bytes)
const MAX_FILE_SIZE_GROQ = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE_OPENAI = 25 * 1024 * 1024; // 25MB

/**
 * Transcribe audio file using Whisper API
 * @param {string} audioPath - Path to audio file
 * @param {object} options - Transcription options
 * @returns {Promise<object>} - Transcript with segments
 */
async function transcribeWithAPI(audioPath, options = {}) {
  const {
    provider = 'groq', // 'groq' or 'openai'
    language = 'hi', // Language code (hi for Hindi, en for English, auto for detection)
    onProgress = () => {}
  } = options;
  
  console.log(`\n🌐 [WhisperAPI] Starting cloud transcription`);
  console.log(`   Provider: ${provider.toUpperCase()}`);
  console.log(`   Language: ${language}`);
  console.log(`   File: ${audioPath}`);
  
  // Check file size
  const stats = fs.statSync(audioPath);
  const fileSizeMB = stats.size / (1024 * 1024);
  console.log(`   File size: ${fileSizeMB.toFixed(2)}MB`);
  
  const maxSize = provider === 'groq' ? MAX_FILE_SIZE_GROQ : MAX_FILE_SIZE_OPENAI;
  if (stats.size > maxSize) {
    throw new Error(`File too large (${fileSizeMB.toFixed(2)}MB). Max: ${maxSize/(1024*1024)}MB. Split audio first.`);
  }
  
  // Get API key
  const apiKey = provider === 'groq' 
    ? process.env.GROQ_API_KEY 
    : process.env.OPENAI_API_KEY;
    
  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()}_API_KEY not set in environment variables`);
  }
  
  // Prepare form data
  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-large-v3'); // Groq model
  
  if (language !== 'auto') {
    form.append('language', language);
  }
  
  // For better timestamps
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities', 'segment');
  
  onProgress(0.1);
  
  try {
    const apiBase = provider === 'groq' ? GROQ_API_BASE : OPENAI_API_BASE;
    const url = `${apiBase}/audio/transcriptions`;
    
    console.log(`   📤 Uploading to ${provider.toUpperCase()}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    onProgress(0.5);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    onProgress(0.9);
    
    console.log(`   ✅ Transcription complete`);
    console.log(`   Language detected: ${result.language || language}`);
    console.log(`   Duration: ${result.duration ? Math.floor(result.duration) + 's' : 'N/A'}`);
    
    // Convert API response to our format
    const transcript = convertAPIResponse(result);
    
    onProgress(1.0);
    
    return transcript;
    
  } catch (error) {
    console.error(`   ❌ API transcription failed:`, error.message);
    throw error;
  }
}

/**
 * Convert API response to our transcript format
 */
function convertAPIResponse(apiResult) {
  const segments = [];
  
  if (apiResult.segments && Array.isArray(apiResult.segments)) {
    // verbose_json format with segments
    for (const seg of apiResult.segments) {
      segments.push({
        start: seg.start || 0,
        end: seg.end || seg.start + 5,
        text: seg.text || ''
      });
    }
  } else if (apiResult.text) {
    // Simple text format - create one segment
    segments.push({
      start: 0,
      end: apiResult.duration || 0,
      text: apiResult.text
    });
  }
  
  return {
    language: apiResult.language || 'auto',
    duration: apiResult.duration || 0,
    segments,
    fullText: apiResult.text || segments.map(s => s.text).join(' '),
    source: 'whisper-api'
  };
}

/**
 * Transcribe long video by splitting into chunks
 * @param {string} audioPath - Path to audio file  
 * @param {object} options - Options
 * @returns {Promise<object>} - Complete transcript
 */
async function transcribeLongVideo(audioPath, options = {}) {
  const {
    provider = 'groq',
    language = 'hi',
    onProgress = () => {}
  } = options;
  
  console.log(`\n🎬 [WhisperAPI] Processing long video`);
  
  // Check file size
  const stats = fs.statSync(audioPath);
  const fileSizeMB = stats.size / (1024 * 1024);
  const maxSize = provider === 'groq' ? 25 : 25;
  
  if (fileSizeMB <= maxSize) {
    // File is small enough, transcribe directly
    console.log(`   ✅ File small enough (${fileSizeMB.toFixed(2)}MB), direct transcription`);
    return await transcribeWithAPI(audioPath, options);
  }
  
  // File is too large, need to split
  console.log(`   ⚠️  File too large (${fileSizeMB.toFixed(2)}MB), splitting required`);
  console.log(`   💡 Using audio chunker to split into 10-minute segments...`);
  
  const audioChunker = require('./audioChunkerCLI.cjs');
  const path = require('path');
  const os = require('os');
  
  // Create temp directory for chunks
  const tempDir = path.join(os.tmpdir(), `whisper-api-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    // Split audio into chunks
    const chunksData = await audioChunker.splitAudioIntoChunks(
      audioPath,
      tempDir,
      (progress) => onProgress(progress * 0.3) // 30% for splitting
    );
    
    console.log(`   ✅ Split into ${chunksData.chunks.length} chunks`);
    
    // Transcribe each chunk
    const allSegments = [];
    let currentTime = 0;
    
    for (let i = 0; i < chunksData.chunks.length; i++) {
      const chunk = chunksData.chunks[i];
      console.log(`\n   📝 Transcribing chunk ${i + 1}/${chunksData.chunks.length}...`);
      
      try {
        const chunkTranscript = await transcribeWithAPI(chunk.outputPath, {
          provider,
          language,
          onProgress: (p) => {
            const overallProgress = 0.3 + ((i + p) / chunksData.chunks.length) * 0.7;
            onProgress(overallProgress);
          }
        });
        
        // Adjust timestamps based on chunk start time
        for (const seg of chunkTranscript.segments) {
          allSegments.push({
            start: chunk.start + seg.start,
            end: chunk.start + seg.end,
            text: seg.text
          });
        }
        
      } catch (error) {
        console.error(`   ❌ Chunk ${i + 1} failed:`, error.message);
        // Continue with next chunk
      }
    }
    
    // Cleanup chunks
    await audioChunker.cleanupChunks(tempDir);
    
    // Build final transcript
    const fullText = allSegments.map(s => s.text).join(' ');
    
    return {
      language: language || 'hi',
      duration: chunksData.totalDuration,
      segments: allSegments,
      fullText,
      source: 'whisper-api-chunked'
    };
    
  } catch (error) {
    // Cleanup on error
    try {
      await audioChunker.cleanupChunks(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

module.exports = {
  transcribeWithAPI,
  transcribeLongVideo
};

