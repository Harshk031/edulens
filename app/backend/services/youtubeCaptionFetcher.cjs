const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * YouTube Caption Fetcher - FAST fallback for when Whisper fails
 * Uses yt-dlp to fetch existing captions (instant, no transcription needed)
 */
class YouTubeCaptionFetcher {
  
  /**
   * Fetch captions from YouTube (if available)
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} - Transcript with segments
   */
  async fetchCaptions(videoId) {
    console.log(`\n📥 Attempting to fetch YouTube captions for ${videoId}`);
    
    try {
      // Try to get auto-generated or manual captions using yt-dlp
      const { stdout } = await execAsync(
        `yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format json3 --output "temp_%(id)s" "https://www.youtube.com/watch?v=${videoId}"`,
        { timeout: 30000 } // 30 second timeout
      );
      
      console.log(`   ✅ Captions fetched successfully`);
      
      // Parse the caption file
      const fs = require('fs');
      const captionFile = `temp_${videoId}.en.json3`;
      
      if (fs.existsSync(captionFile)) {
        const captionData = JSON.parse(fs.readFileSync(captionFile, 'utf-8'));
        
        // Convert to our segment format
        const segments = this.convertCaptionsToSegments(captionData);
        
        // Cleanup
        fs.unlinkSync(captionFile);
        
        return {
          language: 'en',
          segments,
          source: 'youtube_captions'
        };
      }
      
      console.warn(`   ⚠️ Caption file not found`);
      return null;
      
    } catch (error) {
      console.warn(`   ⚠️ Could not fetch YouTube captions: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Convert YouTube caption format to our segment format
   */
  convertCaptionsToSegments(captionData) {
    const segments = [];
    
    if (captionData.events) {
      for (const event of captionData.events) {
        if (event.segs) {
          const text = event.segs.map(s => s.utf8).join('').trim();
          if (text) {
            segments.push({
              start: event.tStartMs / 1000,
              end: (event.tStartMs + event.dDurationMs) / 1000,
              text: text
            });
          }
        }
      }
    }
    
    return segments;
  }
  
  /**
   * Check if yt-dlp is available
   */
  async isAvailable() {
    try {
      await execAsync('yt-dlp --version', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new YouTubeCaptionFetcher();
