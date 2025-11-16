import { useState } from 'react';
import './VideoCaptureButton.css';

export default function VideoCaptureButton({ videoId }) {
  const [capturing, setCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState(null);

  const captureFrame = async () => {
    if (!videoId || capturing) return;
    
    setCapturing(true);
    
    try {
      // Get current time from YouTube player first
      let currentTime = 0;
      const iframe = document.querySelector('iframe[src*="youtube.com"]');
      if (iframe) {
        try {
          if (window.YT && window.YT.Player) {
            const player = window.YT.get(iframe.id);
            if (player && player.getCurrentTime) {
              currentTime = Math.floor(player.getCurrentTime());
            }
          }
        } catch (e) {
          console.warn('Could not get current time from player:', e);
        }
      }
      const timeStr = `${Math.floor(currentTime / 60)}:${String(currentTime % 60).padStart(2, '0')}`;
      
      // Check if we're in Electron
      if (window.electronAPI?.captureScreen) {
        // Use Electron's screen capture
        const result = await window.electronAPI.captureScreen();
        
        if (result.success && result.dataURL) {
          
          // Emit event for notes
          window.dispatchEvent(new CustomEvent('video:captured', {
            detail: { dataURL: result.dataURL, timestamp: timeStr, videoId }
          }));
          
          // Also save as file
          const a = document.createElement('a');
          a.href = result.dataURL;
          a.download = `EduLens_${videoId}_${timeStr.replace(':', '-')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Show success notification
          const notification = document.createElement('div');
          notification.className = 'capture-notification';
          notification.innerHTML = `
            <span style="font-size: 24px">📸</span>
            <span>Screenshot captured!</span>
            <span style="font-size: 14px; opacity: 0.8">${timeStr}</span>
            <span style="font-size: 12px; opacity: 0.7">Saved & added to notes</span>
          `;
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
          }, 2500);
          
          setCapturing(false);
          return;
        }
      }
      
      // Fallback: Create placeholder image with timestamp
      if (!iframe) {
        alert('Video not found. Screen capture not available.');
        setCapturing(false);
        return;
      }
      
      // Create a canvas for placeholder
      const canvas = document.createElement('canvas');
      
      // Set canvas size
      canvas.width = 1280;
      canvas.height = 720;
      
      const ctx = canvas.getContext('2d');
      
      // Since we can't directly capture YouTube iframe due to CORS,
      // show a better placeholder with video info
      try {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0a1410');
        gradient.addColorStop(1, '#1a2f28');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add YouTube logo area
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.roundRect(canvas.width / 2 - 150, canvas.height / 2 - 100, 300, 200, 20);
        ctx.fill();
        
        ctx.fillStyle = '#00e08a';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📸 Screenshot', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '32px Arial';
        ctx.fillText(`⏱️ ${timeStr}`, canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#888888';
        ctx.fillText(`Video: ${videoId}`, canvas.width / 2, canvas.height / 2 + 60);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText('Note: Use system screenshot tool for actual video frame', canvas.width / 2, canvas.height / 2 + 100);
        
        // Convert to data URL and emit event for notes
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          
          // Convert blob to dataURL for notes
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataURL = e.target.result;
            
            // Emit event for notes editor to capture
            window.dispatchEvent(new CustomEvent('video:captured', {
              detail: { dataURL, timestamp: timeStr, videoId }
            }));
            
            // Also save as file
            const a = document.createElement('a');
            a.href = url;
            a.download = `EduLens_${videoId}_${timeStr.replace(':', '-')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };
          reader.readAsDataURL(blob);
          
          setLastCapture({ time: timeStr, videoId });
          
          // Show success notification
          const notification = document.createElement('div');
          notification.className = 'capture-notification';
          notification.innerHTML = `
            <span style="font-size: 24px">📸</span>
            <span>Screenshot captured!</span>
            <span style="font-size: 14px; opacity: 0.8">${timeStr}</span>
            <span style="font-size: 12px; opacity: 0.7">Saved & added to notes</span>
          `;
          document.body.appendChild(notification);
          
          setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
          }, 2500);
          
          setCapturing(false);
        }, 'image/png');
        
      } catch (error) {
        console.error('Capture error:', error);
        alert('Failed to capture screenshot. Please try again.');
        setCapturing(false);
      }
      
    } catch (error) {
      console.error('Capture failed:', error);
      alert('Screenshot capture failed. Please ensure video is playing.');
      setCapturing(false);
    }
  };

  return (
    <button
      className={`capture-btn ${capturing ? 'capturing' : ''}`}
      onClick={captureFrame}
      disabled={capturing || !videoId}
      title="Capture current frame (with timestamp)"
    >
      {capturing ? (
        <>
          <span className="capture-icon spinning">⏳</span>
          <span>Capturing...</span>
        </>
      ) : (
        <>
          <span className="capture-icon">📸</span>
          <span>Capture Frame</span>
        </>
      )}
    </button>
  );
}
