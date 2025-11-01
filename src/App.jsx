import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import HybridAIToggle from './components/HybridAIToggle';
import AIChatPanel from './components/AIChatPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import HistoryPanel from './components/HistoryPanel';
import RewardModal from './components/RewardModal';
import LaunchScreen from './components/LaunchScreen';
import ThreeBackground from './components/ThreeBackground';
import useAnalytics from './hooks/useAnalytics';
import { useClipboardListener } from './hooks/useClipboardListener';
import YouTubeEmbed from './components/YouTubeEmbed.jsx';
import FocusTimerTracker from './components/FocusTimerTracker.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import TranscriptProgress from './components/TranscriptProgress.jsx';
import './App.css';
import useHybridRuntime from './hooks/useHybridRuntime';
function App() {
  const [showLaunch, setShowLaunch] = useState(true);
  const [aiMode, setAiMode] = useState('offline');
  const [activeTab, setActiveTab] = useState('main'); // main, analytics, history
  const [rewardData, setRewardData] = useState(null);
  const analytics = useAnalytics();
  const [videoUrl, setVideoUrl] = useState(null);
  const appRef = useRef(null);
  const [cpOpen, setCpOpen] = useState(false);
  const [perfLow, setPerfLow] = useState(false);

  useHybridRuntime(); // keep runtime checks

  useClipboardListener((link) => {
    setVideoUrl(link);
  });

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

  const videoId = videoUrl ? (videoUrl.split('v=')[1] || videoUrl.split('/').pop()).split('&')[0] : null;

  // Load transcript RAG when video changes
  useEffect(() => {
    (async () => {
      const { RAG } = await import('./services/rag.js');
      await RAG.loadForVideo(videoId);
    })();
  }, [videoId]);

  // Skip launch screen in development if already seen
  useEffect(() => {
    const hasSeenLaunch = sessionStorage.getItem('edulens-launch-seen');
    if (hasSeenLaunch) {
      setShowLaunch(false);
    }
  }, []);

  const handleLaunchComplete = () => {
    setShowLaunch(false);
    sessionStorage.setItem('edulens-launch-seen', 'true');
  };

  if (showLaunch) {
    return <LaunchScreen onComplete={handleLaunchComplete} />;
  }

  return (
    <div ref={appRef} className={`edulens-app ${perfLow ? 'perf-low' : ''}`}>
      <ThreeBackground perfLow={perfLow} />
      
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark" />
          <span className="logo-text grad-text">EduLens Hybrid</span>
        </div>
        <HybridAIToggle onModeChange={setAiMode} />
        <button className="btn btn-glass ripple" onClick={() => window?.electronAPI?.quit?.()}>Exit</button>
      </header>

      {/* Keep all tabs mounted to preserve state - just hide inactive ones */}
      <main className="landscape" style={{display: activeTab === 'main' ? 'grid' : 'none'}}>
        <section className="left-pane fade-in-up" style={{position:'relative'}}>
          {/* Hourglass/Timer above video, not overlaying */}
          <div className="timer-bar" style={{marginBottom: 10, zIndex:100}}>
            <FocusTimerTracker variant="bar" />
          </div>
          <div className="video-shell glass" style={{position:'relative'}}>
            {videoId ? (
              <YouTubeEmbed videoId={videoId} />
            ) : (
              <div style={{height:'540px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-secondary)'}}>
                Copy a YouTube link and return — it will auto-load here.
              </div>
            )}
            {/* subtle bottom overlay progress (non-interactive) */}
            <div style={{position:'absolute', left:12, right:12, bottom:12, pointerEvents:'none'}}>
              <TranscriptProgress videoId={videoId} />
            </div>
            <div className="glass glass-strong glass-controls" style={{transition:'all .35s cubic-bezier(.2,.6,.2,1)'}}>
              <span style={{opacity:.9}}>Distraction-free player</span>
              <span style={{opacity:.7, fontSize:12}}>No suggestions · No external UI</span>
            </div>
          </div>
        </section>

        <aside className="right-pane fade-in-up">
          <div className="span-2 glass hover-animate">
            <AIChatPanel />
          </div>
        </aside>
      </main>

      <main className="landscape" style={{display: activeTab === 'analytics' ? 'grid' : 'none'}}>
        <div className="glass span-2">
          <AnalyticsDashboard
            summary={analytics.summary}
            gamification={analytics.gamification}
            sessions={analytics.sessions}
            onTabChange={(tab) => console.log('Switched to:', tab)}
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
    </div>
  );
}

export default App;
