/**
 * Memory-Efficient Audio Chunker using Direct CLI
 * This bypasses fluent-ffmpeg completely to avoid memory issues
 */

const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Get ffmpeg/ffprobe paths
const ffmpegPath = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const ffprobePath = ffprobeStatic.path;

console.log(`[audioChunkerCLI] Using ffmpeg: ${ffmpegPath}`);
console.log(`[audioChunkerCLI] Using ffprobe: ${ffprobePath}`);

// Chunk configurations
const CHUNK_CONFIGS = {
  SHORT: { size: 300, overlap: 30 },
  MEDIUM: { size: 600, overlap: 60 },
  LONG: { size: 900, overlap: 120 },
  ULTRA: { size: 1200, overlap: 180 }
};

function getOptimalConfig(totalDuration) {
  if (totalDuration <= 1800) return CHUNK_CONFIGS.SHORT;
  if (totalDuration <= 7200) return CHUNK_CONFIGS.MEDIUM;
  if (totalDuration <= 36000) return CHUNK_CONFIGS.LONG;
  return CHUNK_CONFIGS.ULTRA;
}

async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execAsync(
      `"${ffprobePath}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`Invalid duration: ${stdout}`);
    }
    
    return Math.floor(duration);
  } catch (error) {
    console.error(`[audioChunkerCLI] Error getting duration:`, error.message);
    throw error;
  }
}

async function splitAudioIntoChunks(audioPath, outputDir, onProgress = () => {}) {
  console.log(`🔪 [CLI] Starting memory-efficient audio chunking: ${path.basename(audioPath)}`);
  
  // Get duration using CLI
  const totalDuration = await getAudioDuration(audioPath);
  console.log(`   Duration: ${Math.floor(totalDuration/60)}m ${totalDuration%60}s`);
  
  // Choose config
  let config = getOptimalConfig(totalDuration);
  let expectedChunks = Math.ceil(totalDuration / (config.size - config.overlap));
  
  const MAX_CHUNKS = 200;
  if (expectedChunks > MAX_CHUNKS) {
    console.log(`   ⚠️  Very long video, adjusting chunk size...`);
    const minChunkSize = Math.ceil(totalDuration / MAX_CHUNKS);
    config = { size: minChunkSize + 60, overlap: 60 };
    expectedChunks = Math.ceil(totalDuration / (config.size - config.overlap));
  }
  
  console.log(`   Config: ${config.size}s chunks with ${config.overlap}s overlap`);
  console.log(`   Will create ${expectedChunks} chunks`);
  
  // Ensure output dir
  await fs.promises.mkdir(outputDir, { recursive: true });
  
  // Calculate chunks
  const chunks = [];
  let chunkIndex = 0;
  let currentStart = 0;
  
  while (currentStart < totalDuration) {
    const chunkEnd = Math.min(currentStart + config.size, totalDuration);
    const duration = chunkEnd - currentStart;
    
    if (duration > 10) {
      chunks.push({
        index: chunkIndex,
        start: currentStart,
        end: chunkEnd,
        duration,
        outputPath: path.join(outputDir, `chunk_${String(chunkIndex).padStart(3, '0')}.wav`)
      });
      chunkIndex++;
    }
    
    currentStart = chunkEnd - config.overlap;
  }
  
  console.log(`   Processing ${chunks.length} chunks sequentially (memory-safe)`);
  
  // Process chunks ONE AT A TIME using direct CLI
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      await new Promise((resolve, reject) => {
        const args = [
          '-hide_banner',
          '-nostats',
          '-loglevel', 'error',
          '-progress', 'pipe:2',
          '-ss', String(chunk.start),
          '-i', audioPath,
          '-t', String(chunk.duration),
          '-ar', '16000',
          '-ac', '1',
          '-y',
          chunk.outputPath
        ];
        
        const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
        let lastReported = 0;
        
        proc.stderr.on('data', (data) => {
          const text = data.toString();
          const match = text.match(/out_time_ms=(\d+)/);
          if (match && chunk.duration > 0) {
            const elapsedSeconds = Number(match[1]) / 1_000_000;
            if (!Number.isNaN(elapsedSeconds)) {
              const chunkProgress = Math.min(elapsedSeconds / chunk.duration, 1);
              const overallProgress = (i + chunkProgress) / chunks.length;
              if (overallProgress - lastReported >= 0.02) {
                lastReported = overallProgress;
                onProgress(overallProgress);
              }
            }
          }
        });
        
        proc.on('error', reject);
        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('ffmpeg exited with code ' + code));
          }
        });
      });
      
      results.push(chunk);
      
      const progress = (i + 1) / chunks.length;
      onProgress(progress);
      
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        console.log('   ✅ Chunk ' + chunk.index + ': ' + chunk.start + 's-' + chunk.end + 's');
        console.log('   📊 Progress: ' + Math.round(progress * 100) + '% (' + (i + 1) + '/' + chunks.length + ')');
      }
      
      if (global.gc) {
        global.gc();
      }
      
    } catch (error) {
      console.error('   ❌ Chunk ' + chunk.index + ' failed:', error.message);
    }
  }
  
  console.log(`✅ [CLI] Audio chunking complete: ${results.length}/${chunks.length} chunks`);
  
  return {
    totalDuration,
    chunkConfig: config,
    chunks: results,
    outputDir
  };
}

async function cleanupChunks(outputDir) {
  try {
    if (fs.existsSync(outputDir)) {
      await fs.promises.rm(outputDir, { recursive: true, force: true });
      console.log(`🧹 [CLI] Cleaned up: ${outputDir}`);
    }
  } catch (error) {
    console.warn(`⚠️ [CLI] Cleanup failed:`, error.message);
  }
}

module.exports = {
  splitAudioIntoChunks,
  getAudioDuration,
  cleanupChunks,
  CHUNK_CONFIGS
};

