import React, { useState, useEffect, useRef } from 'react';
import { loadYouTubeVideo } from '../renderer/video-loader';

export default function YouTubeEmbed({ videoId: initialVideoId }) {
  const [videoId, setVideoId] = useState(initialVideoId || null);
  const ref = useRef(null);

  useEffect(() => {
    if (initialVideoId) setVideoId(initialVideoId);
  }, [initialVideoId]);

  useEffect(() => {
    // Clipboard fallback: only set if empty
    const handleClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const match = text.match(/(?:v=|be\/)([a-zA-Z0-9_-]{11})/);
        if (match) setVideoId((prev) => prev || match[1]);
      } catch {}
    };
    window.addEventListener('focus', handleClipboard);
    return () => window.removeEventListener('focus', handleClipboard);
  }, []);

  useEffect(() => {
    if (!videoId || !ref.current) return;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    loadYouTubeVideo(ref.current, url);
  }, [videoId]);

  return (
    <div ref={ref} style={{ width: '100%', height: '480px', borderRadius: '12px', overflow: 'hidden' }} />
  );
}
