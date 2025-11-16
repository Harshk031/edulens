import React, { useState, useEffect, useRef } from 'react';

export default function YouTubeEmbed({ videoId: initialVideoId }) {
  const [videoId, setVideoId] = useState(initialVideoId || null);
  const iframeRef = useRef(null);
  const lastLoaded = useRef(null);

  useEffect(() => {
    if (initialVideoId) {
      console.log('[YouTubeEmbed] Initial videoId received:', initialVideoId);
      setVideoId(initialVideoId);
    }
  }, [initialVideoId]);

  // Listen for video loaded events
  useEffect(() => {
    const handleVideoLoaded = (e) => {
      const newVideoId = e?.detail?.videoId || window.__edulensCurrentVideoId;
      if (newVideoId && newVideoId !== videoId) {
        console.log('[YouTubeEmbed] Video loaded event received:', newVideoId);
        setVideoId(newVideoId);
      }
    };
    
    window.addEventListener('video:loaded', handleVideoLoaded);
    return () => window.removeEventListener('video:loaded', handleVideoLoaded);
  }, [videoId]);

  // Render YouTube iframe when videoId changes
  useEffect(() => {
    if (!videoId) {
      console.log('[YouTubeEmbed] No videoId, clearing iframe');
      if (iframeRef.current) {
        iframeRef.current.innerHTML = '';
      }
      lastLoaded.current = null;
      return;
    }

    // Don't reload if it's the same video
    if (lastLoaded.current === videoId) {
      console.log('[YouTubeEmbed] Same videoId, skipping reload:', videoId);
      return;
    }

    console.log('[YouTubeEmbed] 🎬 Loading YouTube video:', videoId);
    lastLoaded.current = videoId;

    // Create YouTube embed URL
    const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1&origin=${window.location.origin}`;
    
    console.log('[YouTubeEmbed] Embed URL:', embedUrl);

    // Create iframe element
    if (iframeRef.current) {
      iframeRef.current.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullScreen = true;
      iframe.style.border = 'none';
      iframe.style.borderRadius = '20px';
      iframe.title = 'YouTube video player';
      iframe.setAttribute('aria-label', 'YouTube video player');
      
      iframe.onload = () => {
        console.log('[YouTubeEmbed] ✅ Iframe loaded successfully');
      };
      
      iframe.onerror = (error) => {
        console.error('[YouTubeEmbed] ❌ Iframe load error:', error);
      };

      iframeRef.current.appendChild(iframe);
      console.log('[YouTubeEmbed] ✅ Iframe created and appended');
    } else {
      console.error('[YouTubeEmbed] ❌ iframeRef.current is null');
    }
  }, [videoId]);

  if (!videoId) {
    return (
      <div
        className="yt-embed-placeholder"
        style={{ 
          width: '100%', 
          aspectRatio: '16 / 9', 
          minHeight: '360px', 
          borderRadius: '20px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          color: '#fff',
          fontSize: '18px'
        }}
        aria-label="Video placeholder"
      >
        <p>Paste a YouTube URL to load a video</p>
      </div>
    );
  }

  return (
    <div
      className="yt-embed"
      style={{ 
        width: '100%', 
        aspectRatio: '16 / 9', 
        minHeight: '360px', 
        borderRadius: '20px', 
        overflow: 'hidden', 
        boxShadow: '0 0 24px rgba(0, 255, 156, .25)', 
        pointerEvents: 'auto',
        background: '#000',
        position: 'relative'
      }}
      aria-label="YouTube video player"
    >
      <div
        ref={iframeRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    </div>
  );
}
