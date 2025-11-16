const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Faster Whisper - Python-based Whisper implementation
 * Much more stable and faster than whisper.cpp
 * Uses faster-whisper library (CTranslate2 backend)
 */

class FasterWhisper {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'scripts', 'faster_whisper.py');
  }

  /**
   * Check if faster-whisper is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const proc = spawn('python', ['-c', 'import faster_whisper; print("OK")'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      
      proc.on('close', (code) => {
        resolve(code === 0 && output.includes('OK'));
      });
      
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Transcribe audio file using faster-whisper
   * @param {string} audioPath - Path to audio file
   * @param {object} options - Transcription options
   * @returns {Promise<object>} - Transcript with segments
   */
  async transcribe(audioPath, options = {}) {
    const { language = 'auto', model = 'base' } = options;
    
    console.log(`\n🚀 [FasterWhisper] Starting transcription`);
    console.log(`   Audio: ${path.basename(audioPath)}`);
    console.log(`   Model: ${model}`);
    console.log(`   Language: ${language}`);
    
    return new Promise((resolve, reject) => {
      const outputPath = audioPath + '.json';
      
      const args = [
        this.pythonScript,
        audioPath,
        '--output', outputPath,
        '--model', model
      ];
      
      if (language !== 'auto') {
        args.push('--language', language);
      }
      
      const proc = spawn('python', args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        
        // Parse progress from output
        const progressMatch = text.match(/Progress: (\d+)%/);
        if (progressMatch && options.onProgress) {
          const progress = parseInt(progressMatch[1]) / 100;
          options.onProgress(progress);
        }
        
        // Log important messages
        if (text.includes('Loading model') || text.includes('Transcribing')) {
          console.log(`   ${text.trim()}`);
        }
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Timeout: 60 seconds (faster-whisper is much faster than whisper.cpp)
      const timeout = setTimeout(() => {
        console.error(`   ❌ Timeout after 60 seconds`);
        proc.kill('SIGTERM');
        setTimeout(() => proc.kill('SIGKILL'), 2000);
        reject(new Error('Faster Whisper timeout'));
      }, 60000);
      
      proc.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            if (fs.existsSync(outputPath)) {
              const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
              
              // Cleanup
              fs.unlinkSync(outputPath);
              
              console.log(`   ✅ Transcription complete`);
              console.log(`   Segments: ${result.segments.length}`);
              console.log(`   Language: ${result.language}`);
              
              if (options.onProgress) {
                options.onProgress(1.0);
              }
              
              resolve(result);
            } else {
              reject(new Error('Output file not found'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse output: ${error.message}`));
          }
        } else {
          console.error(`   ❌ Process failed with code ${code}`);
          if (stderr) {
            console.error(`   Error: ${stderr.substring(0, 200)}`);
          }
          reject(new Error(`Faster Whisper failed: ${stderr || 'Unknown error'}`));
        }
      });
      
      proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Process error: ${error.message}`));
      });
    });
  }
}

module.exports = new FasterWhisper();
