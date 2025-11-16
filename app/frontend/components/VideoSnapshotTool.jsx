import { useState } from 'react';
import './VideoSnapshotTool.css';

export default function VideoSnapshotTool({ onInsert, currentTime }) {
  const [capturing, setCapturing] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const [preview, setPreview] = useState(null);

  const captureScreenshot = async () => {
    setCapturing(true);
    try {
      // Find YouTube iframe video element
      const iframe = document.querySelector('iframe[src*="youtube.com"]');
      if (!iframe) {
        throw new Error('YouTube video not found');
      }

      // Create a canvas to capture the current frame
      // Note: Due to CORS, we'll use YouTube thumbnail as fallback
      const videoId = extractVideoId(iframe.src);
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      // For demo, we'll use the thumbnail
      // In production, you'd need a backend service to capture actual frames
      const timestamp = formatTimestamp(currentTime || 0);
      
      const snapshot = {
        type: 'screenshot',
        url: thumbnailUrl,
        timestamp: currentTime || 0,
        timestampFormatted: timestamp
      };
      
      setPreview(snapshot);
      console.log('📸 Screenshot captured! Click "Insert" to add to notes.');
      
    } catch (error) {
      console.error('[Snapshot] Error:', error);
      console.error(`Failed to capture screenshot: ${error.message}`);
    } finally {
      setCapturing(false);
    }
  };

  const extractText = async () => {
    setExtractingText(true);
    try {
      // This would use OCR to extract text from current video frame
      // For demo, we'll insert a placeholder
      const timestamp = formatTimestamp(currentTime || 0);
      
      console.warn('🔍 Text extraction requires Tesseract.js. Install with: npm install tesseract.js');
      
      const extractedText = {
        type: 'extracted-text',
        text: '[Extracted text would appear here]',
        timestamp: currentTime || 0,
        timestampFormatted: timestamp
      };
      
      onInsert(extractedText);
      
    } catch (error) {
      console.error('[Extract] Error:', error);
      console.error(`Failed to extract text: ${error.message}`);
    } finally {
      setExtractingText(false);
    }
  };

  const insertTimestamp = () => {
    const timestamp = formatTimestamp(currentTime || 0);
    onInsert({
      type: 'timestamp',
      timestamp: currentTime || 0,
      timestampFormatted: timestamp
    });
  };

  const insertPreview = () => {
    if (preview) {
      onInsert(preview);
      setPreview(null);
    }
  };

  const extractVideoId = (url) => {
    const match = url.match(/embed\/([^?]+)/);
    return match ? match[1] : '';
  };

  const formatTimestamp = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="video-snapshot-tool">
      <div className="tool-header">
        <h4>📹 Video Tools</h4>
        <span className="current-time">🕒 {formatTimestamp(currentTime || 0)}</span>
      </div>
      
      <div className="tool-actions">
        <button
          className="tool-btn"
          onClick={insertTimestamp}
          title="Insert current timestamp"
        >
          ⏱️ Timestamp
        </button>
        
        <button
          className="tool-btn"
          onClick={captureScreenshot}
          disabled={capturing}
          title="Capture current frame"
        >
          {capturing ? '⏳ Capturing...' : '📸 Screenshot'}
        </button>
        
        <button
          className="tool-btn"
          onClick={extractText}
          disabled={extractingText}
          title="Extract text from current frame"
        >
          {extractingText ? '⏳ Extracting...' : '🔍 Extract Text'}
        </button>
      </div>

      {preview && (
        <div className="preview-section">
          <div className="preview-header">
            <span>Preview</span>
            <button className="btn-close-preview" onClick={() => setPreview(null)}>✕</button>
          </div>
          <img src={preview.url} alt="Video snapshot" className="preview-image" />
          <div className="preview-info">
            <span>📍 {preview.timestampFormatted}</span>
            <button className="btn-insert" onClick={insertPreview}>
              ✅ Insert to Notes
            </button>
          </div>
        </div>
      )}

      <div className="tool-hint">
        💡 Tip: Pause video at important moments before capturing
      </div>
    </div>
  );
}

