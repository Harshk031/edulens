// Video loader functionality for EduLens
import { apiFetch } from '../utils/api';

/**
 * Load YouTube video and start processing pipeline
 * @param {string} videoUrl - YouTube URL or video ID
 * @param {Function} onProgress - Progress callback
 * @param {Function} onComplete - Completion callback
 * @param {Function} onError - Error callback
 */
export async function loadYouTubeVideo(videoUrl, onProgress, onComplete, onError) {
  try {
    console.log('[VideoLoader] Loading video:', videoUrl);
    
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL or video ID');
    }

    // Start video processing
    const response = await apiFetch('/api/video/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: videoId,
        url: videoUrl
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to start video processing: ${response.status}`);
    }

    const result = await response.json();
    
    // Start polling for progress
    pollVideoProgress(videoId, onProgress, onComplete, onError);
    
    return {
      videoId: videoId,
      status: 'processing',
      message: 'Video processing started'
    };

  } catch (error) {
    console.error('[VideoLoader] Error:', error);
    if (onError) onError(error);
    throw error;
  }
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - Video ID or null if invalid
 */
function extractVideoId(url) {
  if (!url) return null;
  
  // If it's already a video ID (11 characters)
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  
  // Extract from various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Poll video processing progress
 * @param {string} videoId - Video ID
 * @param {Function} onProgress - Progress callback
 * @param {Function} onComplete - Completion callback
 * @param {Function} onError - Error callback
 */
async function pollVideoProgress(videoId, onProgress, onComplete, onError) {
  const maxAttempts = 120; // 2 minutes max
  let attempts = 0;
  
  const poll = async () => {
    try {
      attempts++;
      
      const response = await apiFetch(`/api/video/status?videoId=${videoId}`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      
      const status = await response.json();
      
      if (onProgress) {
        onProgress({
          videoId: videoId,
          progress: status.progress || 0,
          stage: status.stage || 'processing',
          message: status.message || 'Processing...'
        });
      }
      
      if (status.completed) {
        console.log('[VideoLoader] Processing completed:', status);
        if (onComplete) onComplete(status);
        return;
      }
      
      if (status.error) {
        throw new Error(status.error);
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Video processing timeout');
      }
      
      // Continue polling
      setTimeout(poll, 1000);
      
    } catch (error) {
      console.error('[VideoLoader] Polling error:', error);
      if (onError) onError(error);
    }
  };
  
  // Start polling
  setTimeout(poll, 1000);
}

/**
 * Get video information
 * @param {string} videoId - Video ID
 * @returns {Promise} - Video info promise
 */
export async function getVideoInfo(videoId) {
  try {
    const response = await apiFetch(`/api/video/info?videoId=${videoId}`);
    if (!response.ok) {
      throw new Error(`Failed to get video info: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[VideoLoader] Get info error:', error);
    throw error;
  }
}

/**
 * Clear video data
 * @param {string} videoId - Video ID
 * @returns {Promise} - Clear promise
 */
export async function clearVideoData(videoId) {
  try {
    const response = await apiFetch(`/api/video/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ videoId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear video data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[VideoLoader] Clear error:', error);
    throw error;
  }
}
