import { useState, useEffect } from 'react';
import './PlaylistManager.css';

export default function PlaylistManager({ onVideoSelect }) {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractPlaylistId = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('list');
    } catch {
      return null;
    }
  };

  const loadPlaylist = async () => {
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      setError('Invalid playlist URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For now, we'll parse manually or use API
      // This is a simplified version - in production, use YouTube Data API
      // Use Vite proxy (relative URL) or fallback to env variable
      const apiBase = import.meta.env.VITE_API_BASE || '';
      const response = await fetch(`${apiBase}/api/playlist/${playlistId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load playlist');
      }

      const data = await response.json();
      setVideos(data.videos || []);
      
      if (data.videos?.length > 0) {
        setCurrentIndex(0);
        onVideoSelect(data.videos[0].videoId);
      }
    } catch (err) {
      console.error('Playlist load error:', err);
      
      // Fallback: Manual playlist parsing
      // Extract video IDs from playlist page (requires backend support)
      setError('Playlist loading failed. Please ensure backend supports playlist API.');
    } finally {
      setLoading(false);
    }
  };

  const selectVideo = (index) => {
    setCurrentIndex(index);
    if (videos[index]) {
      onVideoSelect(videos[index].videoId);
    }
  };

  const nextVideo = () => {
    if (currentIndex < videos.length - 1) {
      selectVideo(currentIndex + 1);
    }
  };

  const previousVideo = () => {
    if (currentIndex > 0) {
      selectVideo(currentIndex - 1);
    }
  };

  const clearPlaylist = () => {
    setVideos([]);
    setCurrentIndex(0);
    setPlaylistUrl('');
  };

  // Don't render if no videos and not loading
  if (videos.length === 0 && !loading && !error && !playlistUrl) {
    return null;
  }

  return (
    <div className="playlist-manager">
      <div className="playlist-header">
        <h3>📺 Playlist Manager</h3>
      </div>

      <div className="playlist-input-section">
        <input
          type="text"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
          placeholder="Paste YouTube playlist URL..."
          className="playlist-input"
          disabled={loading}
        />
        <button 
          onClick={loadPlaylist} 
          disabled={loading || !playlistUrl.trim()}
          className="load-playlist-btn"
        >
          {loading ? '⏳ Loading...' : '📥 Load Playlist'}
        </button>
      </div>

      {error && (
        <div className="playlist-error">
          ⚠️ {error}
        </div>
      )}

      {videos.length > 0 && (
        <>
          <div className="playlist-controls">
            <button 
              onClick={previousVideo} 
              disabled={currentIndex === 0}
              className="playlist-nav-btn"
            >
              ← Previous
            </button>
            
            <span className="playlist-position">
              {currentIndex + 1} / {videos.length}
            </span>
            
            <button 
              onClick={nextVideo} 
              disabled={currentIndex === videos.length - 1}
              className="playlist-nav-btn"
            >
              Next →
            </button>
            
            <button 
              onClick={clearPlaylist}
              className="clear-playlist-btn"
            >
              🗑️ Clear
            </button>
          </div>

          <div className="playlist-videos">
            {videos.map((video, index) => (
              <div
                key={video.videoId}
                className={`playlist-video-item ${index === currentIndex ? 'active' : ''}`}
                onClick={() => selectVideo(index)}
              >
                <div className="video-index">{index + 1}</div>
                <div className="video-thumbnail">
                  <img 
                    src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/default.jpg`}
                    alt={video.title || 'Video thumbnail'}
                  />
                </div>
                <div className="video-info">
                  <h4>{video.title || `Video ${index + 1}`}</h4>
                  <p className="video-id">{video.videoId}</p>
                  {video.duration && (
                    <span className="video-duration">{video.duration}</span>
                  )}
                </div>
                {index === currentIndex && (
                  <div className="playing-indicator">▶️ Playing</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {videos.length === 0 && !loading && !error && (
        <div className="playlist-empty">
          <p>📋 No playlist loaded</p>
          <p className="hint">Enter a YouTube playlist URL above to get started</p>
        </div>
      )}
    </div>
  );
}
