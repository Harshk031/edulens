import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Simple EventEmitter for browser environment
 */
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

/**
 * useTranscriptPipeline - Single canonical pipeline for transcript processing
 * This is the ONLY source of truth for transcript state
 * All AI tools and chat must read from this hook
 */
export const transcriptEvents = new SimpleEventEmitter();

export default function useTranscriptPipeline() {
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const abortControllerRef = useRef(null);

  // Listen for video loaded events
  useEffect(() => {
    const handleVideoLoaded = (e) => {
      const id = e?.detail?.videoId || window.__edulensCurrentVideoId;
      if (id && id !== videoId) {
        setVideoId(id);
        // Auto-start pipeline if video is loaded
        if (status === 'idle') {
          start(id);
        }
      }
    };

    window.addEventListener('video:loaded', handleVideoLoaded);
    
    // Check if video already loaded
    const currentId = window.__edulensCurrentVideoId;
    if (currentId && currentId !== videoId) {
      setVideoId(currentId);
      if (status === 'idle') {
        start(currentId);
      }
    }

    return () => {
      window.removeEventListener('video:loaded', handleVideoLoaded);
    };
  }, [videoId, status]);

  // Start transcript pipeline
  const start = useCallback(async (videoIdToProcess) => {
    if (!videoIdToProcess) {
      console.error('[TranscriptPipeline] No videoId provided');
      return;
    }

    // Cancel any existing pipeline
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setStatus('running');
    setProgress(0);
    setVideoId(videoIdToProcess);
    setTranscript(null);

    transcriptEvents.emit('started', { videoId: videoIdToProcess });

    try {
      const apiBase = import.meta.env.VITE_API_BASE || '';
      
      // Step 1: Check if transcript already exists
      console.log(`[TranscriptPipeline] Checking for existing transcript: ${videoIdToProcess}`);
      const checkRes = await fetch(`${apiBase}/api/video/transcript/${videoIdToProcess}`, { signal });
      
      if (checkRes.ok) {
        const existingTranscript = await checkRes.json();
        if (existingTranscript && existingTranscript.segments?.length > 0) {
          console.log(`[TranscriptPipeline] Found existing transcript with ${existingTranscript.segments.length} segments`);
          setTranscript(existingTranscript);
          setProgress(100);
          setStatus('done');
          transcriptEvents.emit('complete', { videoId: videoIdToProcess, transcript: existingTranscript });
          return;
        }
      }

      // Step 2: Start processing if not exists
      console.log(`[TranscriptPipeline] Starting processing for: ${videoIdToProcess}`);
      setProgress(10);
      transcriptEvents.emit('progress', { videoId: videoIdToProcess, progress: 10 });

      const processRes = await fetch(`${apiBase}/api/video/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://youtu.be/${videoIdToProcess}` }),
        signal
      });

      if (!processRes.ok) {
        throw new Error(`Processing failed: ${processRes.statusText}`);
      }

      const processData = await processRes.json();
      setProgress(30);
      transcriptEvents.emit('progress', { videoId: videoIdToProcess, progress: 30 });

      // Step 3: Poll for status
      const pollInterval = setInterval(async () => {
        if (signal.aborted) {
          clearInterval(pollInterval);
          return;
        }

        try {
          const statusRes = await fetch(`${apiBase}/api/video/status?videoId=${videoIdToProcess}`, { signal });
          if (!statusRes.ok) {
            throw new Error('Status check failed');
          }

          const statusData = await statusRes.json();

          // Normalize stage/status for robust comparisons
          const stage = (statusData.stage || '').toLowerCase();
          const jobStatus = (statusData.status || '').toLowerCase();

          // Prefer backend numeric progress if available
          let newProgress = typeof statusData.progress === 'number'
            ? statusData.progress
            : progress;

          // Fallback mapping based on stage when progress is missing or low
          if (newProgress < 30) newProgress = 30;
          if (stage === 'transcribing') newProgress = Math.max(newProgress, 50);
          else if (stage === 'summarizing') newProgress = Math.max(newProgress, 70);
          else if (stage === 'indexing') newProgress = Math.max(newProgress, 85);
          else if (stage === 'complete' || jobStatus === 'completed' || jobStatus === 'done') {
            newProgress = 100;
          }

          setProgress(newProgress);
          transcriptEvents.emit('progress', { videoId: videoIdToProcess, progress: newProgress, stage: statusData.stage });

          // Treat both stage and status as completion signals
          const isComplete = stage === 'complete' || jobStatus === 'completed' || jobStatus === 'done';
          const isError = stage === 'error' || jobStatus === 'error' || jobStatus === 'failed';

          if (isComplete) {
            clearInterval(pollInterval);

            // Fetch final transcript
            const transcriptRes = await fetch(`${apiBase}/api/video/transcript/${videoIdToProcess}`, { signal });
            if (transcriptRes.ok) {
              const finalTranscript = await transcriptRes.json();
              setTranscript(finalTranscript);
              setProgress(100);
              setStatus('done');
              transcriptEvents.emit('complete', { videoId: videoIdToProcess, transcript: finalTranscript });
            } else {
              throw new Error('Failed to fetch transcript');
            }
          } else if (isError) {
            clearInterval(pollInterval);
            throw new Error(statusData.message || 'Processing failed');
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            clearInterval(pollInterval);
            return;
          }
          clearInterval(pollInterval);
          throw error;
        }
      }, 2000); // Poll every 2 seconds

      // Cleanup on abort
      signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
      });

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[TranscriptPipeline] Pipeline aborted');
        return;
      }

      console.error('[TranscriptPipeline] Pipeline error:', error);
      setStatus('error');
      setProgress(0);
      transcriptEvents.emit('error', { videoId: videoIdToProcess, error: error.message });
    }
  }, []);

  // Get transcript range (for time-based queries)
  const getRange = useCallback((startSeconds, endSeconds) => {
    if (!transcript || !transcript.segments) return null;
    
    return transcript.segments.filter(seg => 
      seg.start >= startSeconds && seg.end <= endSeconds
    );
  }, [transcript]);

  // Cancel pipeline
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setProgress(0);
  }, []);

  return {
    status,
    progress,
    transcript,
    videoId,
    start,
    cancel,
    getRange
  };
}

