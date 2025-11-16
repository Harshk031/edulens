import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { API_BASE_URL } from './utils/env.js';
import HybridAIToggle from './components/HybridAIToggle';
import AIChatPanel from './components/AIChatPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import HistoryPanel from './components/HistoryPanel';
import RewardModal from './components/RewardModal';
import LaunchScreen from './components/LaunchScreen';
import ThreeBackground from './components/ThreeBackground';
import CalmBackground from './components/CalmBackground';
import TopTimer from './components/TopTimer';
import FocusExit from './components/FocusExit';
import PipelineFlow from './components/PipelineFlow';
import FastSummaryBanner from './components/FastSummaryBanner';
import DebugPanel from './components/DebugPanel';
import useAnalytics from './hooks/useAnalytics';
import { useClipboardListener } from './hooks/useClipboardListener';
import YouTubeEmbed from './components/YouTubeEmbed.jsx';
import AIPipelineVisualizer from './components/AIPipelineVisualizer.jsx';
import TranscriptProgress from './components/TranscriptProgress.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import VideoCaptureButton from './components/VideoCaptureButton.jsx';
import AIToolsDock from './components/AIToolsDock.jsx';
import RichNotesEditor from './components/RichNotesEditor.jsx';
import VoiceNotesRecorder from './components/VoiceNotesRecorder.jsx';
import PlaylistManager from './components/PlaylistManager.jsx';
import CodingNotesPanel from './components/CodingNotesPanel.jsx';
import ModernAppLayout from './components/layout/ModernAppLayout.jsx';
import TimerDebug from './components/TimerDebug.jsx';
import './App.css';
import useHybridRuntime from './hooks/useHybridRuntime';
import useFocusMode from './hooks/useFocusMode';
import FocusModeIndicator from './components/FocusModeIndicator.jsx';
function App() {
  const [activeTab, setActiveTab] = useState('main'); // main, analytics, history, coding-notes
  const [rewardData, setRewardData] = useState(null);
  const analytics = useAnalytics();
  const [videoUrl, setVideoUrl] = useState(null);
  const appRef = useRef(null);
  const [cpOpen, setCpOpen] = useState(false);
  const [perfLow, setPerfLow] = useState(false);
  // Initialize showLaunch - Launch screen enabled
  const [showLaunch, setShowLaunch] = useState(true);
  const [jobStatus, setJobStatus] = useState(null);
  const [fastSummary, setFastSummary] = useState(null);
  const [showFastBanner, setShowFastBanner] = useState(false);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [showCodingNotes, setShowCodingNotes] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [exitStep, setExitStep] = useState(0); // 0=none, 1=blurring, 2=darkness
  const [isExitingNow, setIsExitingNow] = useState(false);
  
  // CRITICAL FIX: Ensure exitStep is always 0 unless explicitly exiting
  useEffect(() => {
    if (!isExitingNow && exitStep !== 0) {
      console.warn('⚠️ exitStep was non-zero but not exiting, resetting to 0');
      setExitStep(0);
    }
  }, [isExitingNow, exitStep]);
  
  // Set launch time for debugging
  if (!window.launchTime) {
    window.launchTime = Date.now();
  }
  
  useHybridRuntime(); // keep runtime checks
  const { isFocusMode, actions: focusActions } = useFocusMode();

  const handleExit = () => {
    console.log('[App] 🔍 handleExit called');
    console.trace('[App] handleExit call stack:');
    
    // Check if this is being called automatically or by user action
    const callStack = new Error().stack;
    console.log('[App] Call stack:', callStack);
    
    // Add a check to see if this is being called immediately after launch
    const timeSinceLaunch = Date.now() - (window.launchTime || Date.now());
    console.log('[App] Time since launch:', timeSinceLaunch, 'ms');
    
    // Prevent accidental exits - only allow after 10 seconds
    if (timeSinceLaunch < 10000) {
      console.log('[App] ⚠️ handleExit blocked - too soon after launch');
      return;
    }
    
    
    setIsExitingNow(true); // Disable app interactions
    setExitStep(1); // Start blur animation
    
    
    // After blur completes (1s), start darkness
    setTimeout(() => {
      
      setExitStep(2);
    }, 1000);
    
    
    // After darkness and blur animation
    setTimeout(() => {
      
      
      // Clear sessionStorage completely for clean exit
      try {
        sessionStorage.clear();
        
      } catch (e) {
        console.error('Failed to clear sessionStorage:', e);
      }
      
      
      // Clear localStorage too for complete reset
      try {
        localStorage.clear();
        
      } catch (e) {
        console.error('Failed to clear localStorage:', e);
      }
      
      
      // Disable all interactions
      document.body.style.pointerEvents = 'none';
      document.documentElement.style.pointerEvents = 'none';
      
      
      // Show fully dark screen
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
      
      
      
      
      // Auto cleanup and close app
      if (window.electronAPI?.closeApp) {
        console.log('🔄 Starting auto cleanup and closing Electron app...');
        // Call cleanup first, then close
        if (window.electronAPI?.cleanup) {
          window.electronAPI.cleanup();
        }
        setTimeout(() => {
          window.electronAPI.closeApp();
        }, 500);
      } else {
        console.log('🔄 Browser environment - attempting to close window...');
        // Try to close browser tab/window
        try {
          window.close();
        } catch (e) {
          console.warn('Could not close window:', e);
          // Fallback: redirect to blank page
          window.location.href = 'about:blank';
        }
      }
    }, 2500);
  };

  // Expose handleExit globally for other components
  useEffect(() => {
    window.__edulensHandleExit = handleExit;
    return () => {
      delete window.__edulensHandleExit;
    };
  }, [handleExit]);

  useClipboardListener((link) => {
    console.log('[App] useClipboardListener callback received link:', link);
    if (link) {
      console.log('[App] Setting video URL:', link);
      setVideoUrl(link);
      console.log('[App] ✅ Video URL set successfully');
    } else {
      console.warn('[App] useClipboardListener received empty link');
    }
  });

  // One-shot clipboard read on mount (Electron or browser) for auto-load
  useEffect(() => {
    const readClipboardOnMount = async () => {
      try {
        let t = '';
        // Check if readClipboard function is actually available (async)
        if (window?.electronAPI?.readClipboard && typeof window.electronAPI.readClipboard === 'function') {
          try {
            t = await window.electronAPI.readClipboard();
            console.log('[App] Initial clipboard read (Electron):', t ? `${t.substring(0, 50)}...` : 'empty');
          } catch (clipboardErr) {
            console.warn('[App] Electron clipboard read failed:', clipboardErr);
            t = '';
          }
        }
        if (!t && navigator.clipboard?.readText) {
          try {
            const s = await navigator.clipboard.readText();
            console.log('[App] Initial clipboard read (Browser):', s ? `${s.substring(0, 50)}...` : 'empty');
            if (/(youtube\.com|youtu\.be)/i.test(s)) {
              setVideoUrl(s);
              console.log('[App] ✅ YouTube link found on mount:', s);
            }
          } catch (browserErr) {
            // Silently handle permission errors
            if (!browserErr.message?.includes('not focused') && !browserErr.message?.includes('permission')) {
              console.warn('[App] Browser clipboard read failed:', browserErr);
            }
          }
        } else if (t && /(youtube\.com|youtu\.be)/i.test(t)) {
          setVideoUrl(t);
          console.log('[App] ✅ YouTube link found on mount (Electron):', t);
        }
      } catch (e) {
        console.warn('[App] Failed to read clipboard on mount:', e);
      }
    };
    
    readClipboardOnMount();
  }, []);

  // Badges on session end
  useEffect(() => {
    if (analytics.gamification?.badges) {
      const recommendations = analytics.calculateBadgeRecommendations();
      if (recommendations.length > analytics.gamification.badges.length) {
        const newBadge = recommendations[recommendations.length - 1];
        setRewardData({ badge: newBadge, points: 10, message: '🎉 Achievement Unlocked!' });
      }
    }
  }, [analytics.gamification?.badges.length]);

  // Cmd/Ctrl+K command palette
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setCpOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Custom GSAP cursor + ripple binding (skip in perf-low or reduced motion)
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (perfLow || reduce) return; // disable cursor
    if (window.__edulensCursorActive) return;
    window.__edulensCursorActive = true;
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    const dot = document.createElement('div'); dot.className = 'cursor-dot';
    document.body.appendChild(ring); document.body.appendChild(dot);

    let rx = 0, ry = 0, dx = 0, dy = 0;
    const mm = (e) => { dx = e.clientX; dy = e.clientY; };
    const tick = () => {
      rx += (dx - rx) * 0.18; ry += (dy - ry) * 0.18;
      gsap.set(ring, { x: rx, y: ry }); gsap.set(dot, { x: dx, y: dy });
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    const click = (e) => {
      gsap.fromTo(ring, { scale: 0.85 }, { scale: 1, duration: 0.25, ease: 'power2.out' });
      dot.classList.add('pulse-active'); setTimeout(()=>dot.classList.remove('pulse-active'), 350);
      const t = e.target.closest('.ripple');
      if (t) { t.classList.remove('is-animating'); void t.offsetWidth; t.classList.add('is-animating'); setTimeout(()=>t.classList.remove('is-animating'), 450); }
    };

    window.addEventListener('mousemove', mm);
    window.addEventListener('mousedown', click);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mousedown', click); cancelAnimationFrame(raf); ring.remove(); dot.remove(); window.__edulensCursorActive = false; };
  }, [perfLow]);

  // Extract video ID from URL - handle both youtu.be and youtube.com formats
  const videoId = videoUrl ? (() => {
    try {
      // Handle youtu.be format: https://youtu.be/a-wVHL0lpb0?si=...
      if (videoUrl.includes('youtu.be/')) {
        const match = videoUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
      }
      // Handle youtube.com format: https://www.youtube.com/watch?v=...
      if (videoUrl.includes('youtube.com')) {
        const match = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
      }
      // Fallback: try to extract from URL path
      const parts = videoUrl.split('/');
      const lastPart = parts[parts.length - 1];
      const extracted = lastPart.split('?')[0].split('&')[0];
      if (extracted && extracted.length === 11 && /^[a-zA-Z0-9_-]+$/.test(extracted)) {
        return extracted;
      }
      return null;
    } catch (e) {
      console.error('[App] Error extracting video ID:', e);
      return null;
    }
  })() : null;
  
  // Debug: Log video URL and ID changes
  useEffect(() => {
    if (videoUrl) {
      console.log('[App] 📹 Video URL changed:', videoUrl);
      console.log('[App] 🆔 Extracted video ID:', videoId);
      
      // Set global video ID for other components
      if (videoId) {
        window.__edulensCurrentVideoId = videoId;
        console.log('[App] ✅ Set global video ID:', videoId);
        
        // Dispatch video loaded event
        window.dispatchEvent(new CustomEvent('video:loaded', { detail: { videoId } }));
        console.log('[App] ✅ Dispatched video:loaded event');
      }
    } else {
      console.log('[App] 📹 Video URL cleared');
      window.__edulensCurrentVideoId = null;
    }
  }, [videoUrl, videoId]);

  // Auto-trigger video processing when VideoId changes - AUTOMATIC PROCESSING
  useEffect(() => {
    if (!videoId) {
      console.log('[App] ⚠️ No videoId, skipping processing');
      // Cleanup when video is removed
      setJobStatus(null);
      setFastSummary(null);
      setShowFastBanner(false);
      return;
    }
    
    console.log('[App] 🎬 Video ID detected, AUTOMATICALLY starting transcript processing:', videoId);
    
    let pollInterval = null;
    let isMounted = true;
    
    const triggerProcessing = async () => {
      try {
        console.log(`[App] 🚀 Starting processing for videoId: ${videoId}`);
        console.log(`[App] 📡 Using API base: ${API_BASE_URL}`);
        
        const processUrl = `${API_BASE_URL}/api/video/process`;
        const requestBody = { url: `https://youtu.be/${videoId}`, force: false };
        
        console.log('[App] 📤 Sending request to:', processUrl);
        console.log('[App] 📦 Request body:', requestBody);
        
        const res = await fetch(processUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }).catch((fetchError) => {
          console.error('[App] ❌ Fetch error:', fetchError);
          if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
            throw new Error('Backend server is not running. Please start the backend server.');
          }
          throw fetchError;
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[App] ❌ Process request failed: ${res.status} ${res.statusText}`);
          console.error('[App] Error response:', errorText);
          throw new Error(`Failed to start processing: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        
        console.log(`[App] ✅ Process response:`, data);
        
        // Handle both new jobs and already processed videos
        if ((data.jobId || data.alreadyProcessed) && isMounted) {
          if (data.alreadyProcessed) {
            console.log('[App] ✅ Video already processed, fetching existing status');
          } else {
            console.log('[App] ✅ Job created, starting status polling');
          }
          
          // Immediately fetch initial status
          try {
            const statusRes = await fetch(`${apiBase}/api/video/status?videoId=${videoId}`).catch((fetchError) => {
              console.error('[App] ❌ Status fetch error:', fetchError);
              return null;
            });
            
            if (statusRes && statusRes.ok) {
              const status = await statusRes.json();
              console.log(`[App] ✅ Initial status:`, status);
              if (isMounted) {
                setJobStatus(status);
                console.log('[App] ✅ JobStatus set:', status);
              }
            } else if (statusRes) {
              const errorText = await statusRes.text();
              console.error(`[App] ❌ Status check failed: ${statusRes.status} - ${errorText}`);
            } else {
              console.error('[App] ❌ Status check failed: Backend not responding');
            }
          } catch (err) {
            console.error('[App] ❌ Failed to fetch initial status:', err);
          }
          
          // Start polling immediately with faster interval for better sync
          console.log('[App] 🔄 Starting status polling (1s interval for better sync)...');
          pollInterval = setInterval(async () => {
            if (!isMounted) {
              console.log('[App] ⚠️ Component unmounted, stopping poll');
              clearInterval(pollInterval);
              return;
            }
            try {
              const statusRes = await fetch(`${apiBase}/api/video/status?videoId=${videoId}`).catch((fetchError) => {
                console.error('[App] ❌ Status poll fetch error:', fetchError);
                return null;
              });
              
              if (!statusRes) {
                console.error('[App] ❌ Status poll failed: Backend not responding');
                return;
              }
              
              if (!statusRes.ok) {
                const errorText = await statusRes.text();
                console.error(`[App] ❌ Status poll failed: ${statusRes.status} - ${errorText}`);
                return;
              }
              
              const status = await statusRes.json();
              
              console.log(`[App] 📊 Poll status:`, {
                status: status.status,
                progress: status.progress,
                stage: status.stage,
                stages: status.stages ? Object.keys(status.stages) : 'none'
              });
              
              if (isMounted) {
                setJobStatus(status);
                console.log('[App] ✅ JobStatus updated');
              }
              
              // Check for fast summary (after parallelx stage ~70% progress)
              if (status.progress >= 75 && !fastSummary && isMounted) {
                try {
                  const summaryRes = await fetch(`${apiBase}/api/video/fast-summary/${videoId}`);
                  if (summaryRes.ok) {
                    const summary = await summaryRes.json();
                    if (isMounted) {
                      setFastSummary(summary);
                      setShowFastBanner(true);
                    }
                  }
                } catch (err) {
                  console.warn('[App] Fast summary fetch failed:', err);
                }
              }
              
              // CRITICAL FIX: Check for completion status (done, completed, or progress 100)
              if (status.status === 'done' || status.status === 'completed' || 
                  (status.progress === 100 && status.status !== 'processing')) {
                console.log(`[App] Processing complete (status: ${status.status}, progress: ${status.progress}%), stopping poll`);
                if (pollInterval) clearInterval(pollInterval);
              } else if (status.status === 'error' || status.status === 'failed') {
                console.log(`[App] Processing failed (status: ${status.status}), stopping poll`);
                if (pollInterval) clearInterval(pollInterval);
              }
            } catch (err) {
              console.error('Polling error:', err);
            }
          }, 1000); // Poll every 1 second for better sync and responsiveness
        }
      } catch (err) {
        console.error('Failed to trigger processing:', err);
      }
    };
    
    triggerProcessing();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [videoId]);

  // Load transcript RAG when video changes
  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      if (!videoId) {
        setTranscript(null);
        return;
      }
      try {
        const { ragService } = await import('./services/rag.js');
        if (isMounted) await ragService.loadForVideo(videoId);
        
        // Also load transcript for coding notes
        const transcriptRes = await fetch(`${API_BASE_URL}/api/video/transcript/${videoId}`);
        if (transcriptRes.ok && isMounted) {
          const transcriptData = await transcriptRes.json();
          setTranscript(transcriptData);
        }
      } catch (err) {
        console.error('Failed to load RAG/transcript:', err);
      }
    })();
    
    return () => {
      isMounted = false;
      // Clean up RAG data when video changes
      if (videoId) {
        import('./services/rag.js').then(({ ragService }) => {
          ragService.cleanup?.();
        }).catch(() => {});
      }
    };
  }, [videoId]);

  // Note: showLaunch is now initialized correctly, so we don't need this useEffect anymore
  // The initialization happens in useState(() => ...) above

  // Check if we should automatically exit after launch (for testing purposes)
  useEffect(() => {
    // Only run this check once on mount
    let isMounted = true;
    
    // Check if there's a flag in sessionStorage or localStorage that indicates
    // we should exit immediately after launch
    const shouldExitImmediately = sessionStorage.getItem('edulens-exit-immediately') || 
                                localStorage.getItem('edulens-exit-immediately');
    
    if (shouldExitImmediately && isMounted) {
      
      // For debugging, we'll ignore the exit flag
      // In production, this would trigger the exit:
      // handleExit();
    }
    
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Add a new useEffect to check if handleExit is being called immediately
  useEffect(() => {
    
    
    // Add a timeout to see if the app stays open
    const timeout = setTimeout(() => {
      
    }, 10000);
    
    
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const handleLaunchComplete = useCallback(() => {
    console.log('[App] LaunchScreen completed, hiding permanently');
    setShowLaunch(false);
    sessionStorage.setItem('edulens-launch-seen', 'true');
    // Also set a flag to prevent any future re-mounting
    window.__edulensLaunchCompleted = true;
  }, []);

  // Prevent LaunchScreen from showing if already completed
  if (showLaunch && !window.__edulensLaunchCompleted) {
    return <LaunchScreen onComplete={handleLaunchComplete} />;
  }

  return (
    <div ref={appRef} className={`edulens-app ${perfLow ? 'perf-low' : ''} ${isExitingNow ? 'exiting' : ''}`}>
      {(() => { try { document.body.classList.add('hide-cursor'); } catch (e) { console.warn('Failed to add hide-cursor class:', e); } return null; })()}
      
      
      {/* Exit animations - Blur then Darkness */}
      {exitStep >= 1 && <div className="exit-blur-overlay" />}
      {exitStep >= 2 && <div className="exit-darkness-overlay" />}
      
      
      <CalmBackground disabled={perfLow} />
      <ThreeBackground perfLow={perfLow} />
      
      {/* Old header - hidden when using modern layout */}
      {activeTab !== 'main' && (
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark" />
          <span className="logo-text grad-text">EduLens Hybrid</span>
        </div>
        <div className="header-controls">
          <button 
            className="btn btn-glass ripple"
            onClick={handleExit}
            title="Exit EduLens (with animation)"
            style={{
              padding: '10px 20px',
              background: '#1a1a2e',
              color: '#FFFFFF',
              border: '2px solid #ff0000',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 15px rgba(255, 0, 0, 0.5)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#2a2a3e';
              e.target.style.transform = 'scale(1.08)';
              e.target.style.boxShadow = '0 0 25px rgba(255, 0, 0, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#1a1a2e';
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.5)';
            }}
          >
            ✕ EXIT
          </button>
          <HybridAIToggle />
          {videoId && (
            <button 
              className="btn btn-glass ripple clear-video-btn"
              onClick={() => {
                setVideoUrl(null);
                setJobStatus(null);
                setFastSummary(null);
                setShowFastBanner(false);
              }}
              title="Clear current video and clean data"
            >
              🗑️ Clear Video
            </button>
          )}
          {isFocusMode && (
            <button 
              className="btn btn-gradient ripple exit-btn-header"
              onClick={() => {
                 
                focusActions.exitFocusMode('button', 'User clicked exit button');
              }}
              title="Exit Focus Mode"
            >
              ✕ Exit Focus
            </button>
          )}
        </div>
      </header>
      )}

      {/* Modern Layout - Video-first with unified right panel */}
      {activeTab === 'main' && (
        <div style={{ display: 'contents' }}>
          <ModernAppLayout
            videoId={videoId}
            jobStatus={jobStatus}
            onVideoLoad={(url) => {
              setVideoUrl(url);
              const vid = url ? (() => { const raw = (url.split('v=')[1] || url.split('/').pop()); return (raw || '').split(/[&?]/)[0]; })() : null;
              if (vid) {
                window.__edulensCurrentVideoId = vid;
                window.dispatchEvent(new CustomEvent('video:loaded', { detail: { videoId: vid } }));
              }
            }}
            onVideoClear={() => {
              setVideoUrl(null);
              setJobStatus(null);
              setFastSummary(null);
              setShowFastBanner(false);
              setShowNotesEditor(false);
              setShowCodingNotes(false);
              window.__edulensCurrentVideoId = null;
            }}
            focusTime={1500}
            onTimerEnd={() => {
              analytics.trackEvent?.('timer_completed', { duration: 1500 });
            }}
            onProviderChange={(provider) => {
              // Provider change handler
              console.log('Provider changed:', provider);
            }}
            onLanguageChange={(language) => {
              // Language change handler
              console.log('Language changed:', language);
            }}
          />
        </div>
      )}

      <main className="landscape" style={{display: activeTab === 'analytics' ? 'grid' : 'none'}}>
        <div className="glass span-2">
          <AnalyticsDashboard
            summary={analytics.summary}
            gamification={analytics.gamification}
            sessions={analytics.sessions}
            onTabChange={(tab) => {
              // Analytics tab switching - could track usage
              
            }}
          />
        </div>
      </main>

      <main className="landscape" style={{display: activeTab === 'history' ? 'grid' : 'none'}}>
        <div className="glass span-2">
          <HistoryPanel
            sessions={analytics.sessions}
            onExport={() => analytics.exportToCSV()}
            onDelete={() => analytics.deleteHistory()}
            loading={analytics.loading}
          />
        </div>
      </main>

      <FocusModeIndicator active={isFocusMode} />
      <FocusExit 
        visible={isFocusMode} 
        onExit={() => {
          
          focusActions.exitFocusMode('button', 'User clicked exit button');
        }} 
      />

      <footer className="app-footer">
        <div>Session: {analytics.sessions?.length || 0} • Points: {analytics.gamification?.points || 0}</div>
        <div style={{display:'flex', gap:8}}>
          <button className={`btn btn-glass ripple ${activeTab==='main'?'pulse-active':''}`} onClick={() => setActiveTab('main')}>Main</button>
          <button className={`btn btn-glass ripple ${activeTab==='analytics'?'pulse-active':''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
          <button className={`btn btn-glass ripple ${activeTab==='history'?'pulse-active':''}`} onClick={() => setActiveTab('history')}>History</button>
          <button className="btn btn-gradient ripple" onClick={() => setCpOpen(true)}>⌘K Commands</button>
          <button className="btn btn-glass ripple" onClick={() => setPerfLow(v=>!v)}>{perfLow ? 'Perf: Low' : 'Perf: High'}</button>
        </div>
      </footer>

      <CommandPalette open={cpOpen} onClose={() => setCpOpen(false)} />

      <RewardModal
        isOpen={!!rewardData}
        onClose={() => setRewardData(null)}
        badge={rewardData?.badge}
        points={rewardData?.points}
        message={rewardData?.message}
      />
      
      {showNotesEditor && videoId && (
        <RichNotesEditor 
          videoId={videoId}
          onClose={() => setShowNotesEditor(false)}
        />
      )}
      
      {/* Debug panel for diagnosing API issues */}
      <DebugPanel />
    </div>
  );
}

export default App;