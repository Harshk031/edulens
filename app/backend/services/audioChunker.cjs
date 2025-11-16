const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');

const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const execFileAsync = promisify(execFile);

const CHUNK_CONFIGS = {
  SHORT: { size: 180, overlap: 15 },   // 3min chunks (REDUCED from 5min)
  MEDIUM: { size: 240, overlap: 20 },  // 4min chunks (REDUCED from 10min)
  LONG: { size: 300, overlap: 30 },    // 5min chunks (REDUCED from 15min)
  ULTRA: { size: 360, overlap: 40 }    // 6min chunks (REDUCED from 20min)
};

function getOptimalConfig(totalDuration) {
  // OPTIMIZED: Smaller chunks = faster processing, less hanging
  if (totalDuration <= 1800) return CHUNK_CONFIGS.SHORT;   // <30min
  if (totalDuration <= 7200) return CHUNK_CONFIGS.MEDIUM;  // <2hr
  if (totalDuration <= 36000) return CHUNK_CONFIGS.LONG;   // <10hr
  return CHUNK_CONFIGS.ULTRA;                               // >10hr
}

async function getAudioDuration(audioPath) {
  const { stdout } = await execFileAsync(ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath
  ], { windowsHide: true });

  const duration = parseFloat(stdout.trim());
  if (Number.isNaN(duration)) {
    throw new Error(`Invalid duration reported by ffprobe: ${stdout}`);
  }
  return Math.floor(duration);
}

async function createChunk(audioPath, chunk, chunkIndex, totalChunks, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-nostats',
      '-loglevel', 'error',
      '-progress', 'pipe:2',
      '-ss', chunk.start.toFixed(2),
      '-i', audioPath,
      '-t', chunk.duration.toFixed(2),
      '-ar', '16000',
      '-ac', '1',
      '-y',
      chunk.outputPath
    ];

    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let reported = 0;

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      const match = /out_time_ms=(\d+)/.exec(text);
      if (match && chunk.duration > 0) {
        const elapsed = Number(match[1]) / 1_000_000;
        if (!Number.isNaN(elapsed)) {
          const chunkProgress = Math.min(elapsed / chunk.duration, 1);
          const overall = (chunkIndex + chunkProgress) / totalChunks;
          if (overall - reported >= 0.02) {
            reported = overall;
            onProgress(overall);
          }
        }
      }
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        onProgress((chunkIndex + 1) / totalChunks);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function splitAudioIntoChunks(audioPath, outputDir, onProgress = () => {}) {
  console.log(`🔪 [audioChunker] Preparing chunks for ${path.basename(audioPath)}`);

  const totalDuration = await getAudioDuration(audioPath);
  console.log(`   Duration: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`);

  let config = getOptimalConfig(totalDuration);
  let expectedChunks = Math.ceil(totalDuration / Math.max(5, config.size - config.overlap));

  const MAX_CHUNKS = 200;
  if (expectedChunks > MAX_CHUNKS) {
    console.log('   ⚠️  Very long audio detected, adjusting chunk size');
    const step = Math.ceil(totalDuration / MAX_CHUNKS);
    config = { size: step + 60, overlap: 60 };
  }

  await fs.promises.mkdir(outputDir, { recursive: true });

  const step = Math.max(5, config.size - config.overlap);
  const chunks = [];
  let chunkIndex = 0;

  for (let start = 0; start < totalDuration; start += step) {
    const chunkEnd = Math.min(start + config.size, totalDuration);
    const duration = chunkEnd - start;
    if (duration <= 10) {
      if (chunkEnd >= totalDuration) {
        break;
      }
      continue;
    }

    chunks.push({
      index: chunkIndex,
      start,
      end: chunkEnd,
      duration,
      outputPath: path.join(outputDir, `chunk_${String(chunkIndex).padStart(3, '0')}.wav`)
    });

    chunkIndex++;
    if (chunkEnd >= totalDuration) {
      break;
    }
  }

  console.log(`   Generating ${chunks.length} chunks (sequential, memory-safe)`);

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      await createChunk(audioPath, chunk, i, chunks.length, onProgress);
      results.push(chunk);
      if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
        console.log(`   ✅ Chunk ${chunk.index}: ${chunk.start}s - ${chunk.end}s (${i + 1}/${chunks.length})`);
      }
      if (global.gc && (i + 1) % 10 === 0) {
        global.gc();
      }
    } catch (error) {
      console.error(`   ❌ Failed to generate chunk ${chunk.index}: ${error.message}`);
    }
  }

  console.log(`✅ [audioChunker] Chunking complete: ${results.length}/${chunks.length} chunks ready`);

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
      console.log(`🧹 [audioChunker] Cleaned up temporary chunks: ${outputDir}`);
    }
  } catch (error) {
    console.warn(`⚠️ [audioChunker] Failed to cleanup chunks: ${error.message}`);
  }
}

module.exports = {
  splitAudioIntoChunks,
  getAudioDuration,
  cleanupChunks,
  CHUNK_CONFIGS
};