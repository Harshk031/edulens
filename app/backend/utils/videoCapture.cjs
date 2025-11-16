/**
 * Video Capture Utility
 * Captures screenshots and extracts text from video frames
 */

const Tesseract = require('tesseract.js');

/**
 * Capture screenshot from video element
 */
function captureVideoFrame(videoElement) {
  return new Promise((resolve, reject) => {
    try {
      if (!videoElement) {
        throw new Error('Video element not found');
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      
      // Draw current video frame
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png');
      
      resolve({
        dataURL,
        timestamp: videoElement.currentTime,
        width: canvas.width,
        height: canvas.height
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extract text from image using Tesseract OCR
 */
async function extractTextFromImage(imageData) {
  try {
    console.log('[OCR] Starting text extraction...');
    
    const result = await Tesseract.recognize(
      imageData,
      'eng+hin', // English + Hindi
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log('[OCR] Text extraction complete');
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words.map(w => ({
        text: w.text,
        confidence: w.confidence
      }))
    };
  } catch (error) {
    console.error('[OCR] Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get video element from YouTube iframe
 */
function getYouTubeVideoElement() {
  // Try to find YouTube iframe
  const iframe = document.querySelector('iframe[src*="youtube.com"]');
  if (!iframe) {
    console.warn('[VideoCapture] YouTube iframe not found');
    return null;
  }
  
  try {
    // Try to access iframe content
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      return iframeDoc.querySelector('video');
    }
  } catch (e) {
    console.warn('[VideoCapture] Cannot access iframe content (CORS):', e.message);
  }
  
  return null;
}

/**
 * Capture current video frame with OCR
 */
async function captureCurrentFrame(options = {}) {
  const {
    extractText = false,
    videoElement = null
  } = options;
  
  // Get video element
  const video = videoElement || getYouTubeVideoElement();
  if (!video) {
    throw new Error('Video element not found. Make sure video is playing.');
  }
  
  // Capture frame
  const frame = await captureVideoFrame(video);
  
  // Extract text if requested
  let ocrResult = null;
  if (extractText) {
    ocrResult = await extractTextFromImage(frame.dataURL);
  }
  
  return {
    ...frame,
    timestampFormatted: formatTimestamp(frame.timestamp),
    ocr: ocrResult
  };
}

module.exports = {
  captureVideoFrame,
  extractTextFromImage,
  formatTimestamp,
  getYouTubeVideoElement,
  captureCurrentFrame
};

