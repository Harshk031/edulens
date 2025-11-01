import { useState, useEffect } from 'react';
import HybridAIToggle from './components/HybridAIToggle';
import AIChatPanel from './components/AIChatPanel';
import AIPipelineVisualizer from './components/AIPipelineVisualizer';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import HistoryPanel from './components/HistoryPanel';
import RewardModal from './components/RewardModal';
import useAnalytics from './hooks/useAnalytics';
import { useClipboardListener } from './hooks/useClipboardListener';
import YouTubeEmbed from './components/YouTubeEmbed.jsx';
import FocusModeLayout from './components/FocusModeLayout.jsx';
import './App.css';
import useHybridRuntime from './hooks/useHybridRuntime';

function App() {
  const [aiMode, setAiMode] = useState('offline');
  const [activeTab, setActiveTab] = useState('main'); // main, analytics, history
  const [rewardData, setRewardData] = useState(null);
  const analytics = useAnalytics();
  const [videoUrl, setVideoUrl] = useState(null);

  const { isElectron } = useHybridRuntime();

  useClipboardListener((link) => {
    console.log('🎬 YouTube link detected from clipboard:', link);
    setVideoUrl(link);
  });



  // Check for new badges when focus session ends
  useEffect(() => {
    if (analytics.gamification?.badges) {
      const recommendations = analytics.calculateBadgeRecommendations();
      if (recommendations.length > analytics.gamification.badges.length) {
        const newBadge = recommendations[recommendations.length - 1];
        setRewardData({
          badge: newBadge,
          points: 10,
          message: '🎉 Achievement Unlocked!'
        });
      }
    }
  }, [analytics.gamification?.badges.length])


  // Always render main EduLens UI; overlay sits on top when active
  return (
    <>
    <div className="app-container">
      <header className="app-header">
        <h1>🧠 EduLens Hybrid AI</h1>
        <p className="subtitle">Phase 1-3: AI + Focus + Analytics</p>
        <div className="app-nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            🏠 Main
          </button>
          <button
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📚 History ({analytics.sessions?.length || 0})
          </button>
        </div>
        {analytics.gamification && (
          <div className="header-stats">
            <span className="stat-badge">⭐ {analytics.gamification.points || 0}pts</span>
            <span className="stat-badge">🔥 {analytics.gamification.streak || 0}day</span>
          </div>
        )}
      </header>

      <main className="app-main" style={{ display: activeTab === 'main' ? 'block' : 'none' }}>

        <section className="section">
          <h2>AI Mode & Provider Selector</h2>
          <HybridAIToggle onModeChange={setAiMode} />
        </section>

        <section className="section">
          <h2>Pipeline Visualization</h2>
          <AIPipelineVisualizer mode={aiMode} />
        </section>

        <section className="section chat-section">
          <h2>Interactive AI Chat</h2>
          <AIChatPanel />
        </section>

        <section className="section youtube-test">
          <h2>YouTube Autoload</h2>
          {!videoUrl ? (
            <p>📋 Copy any YouTube link — EduLens will auto-load it here.</p>
          ) : (
            <div className="youtube-container">
              <FocusModeLayout videoId={(videoUrl.split('v=')[1] || videoUrl.split('/').pop()).split('&')[0]} />
            </div>
          )}
        </section>

        <section className="section status-info">
          <h2>System Status</h2>
          <ul className="status-list">
            <li>✅ React Vite foundation loaded</li>
            <li>✅ Electron window spawned</li>
            <li>✅ Offline AI (Ollama) routes configured</li>
            <li>✅ Online AI (Groq/Claude/Gemini) routes configured</li>
            <li>✅ HybridAI hook with state management</li>
            <li>✅ AIChatPanel with chat & tools</li>
            <li>✅ Pipeline visualizer with GSAP animations</li>
            <li>📦 Models path: D:/edulens-models</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>EduLens Hybrid © 2025 | Phase 1-3 Complete</p>
      </footer>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
      <main className="app-main">
        <AnalyticsDashboard
          summary={analytics.summary}
          gamification={analytics.gamification}
          sessions={analytics.sessions}
          onTabChange={(tab) => console.log('Switched to:', tab)}
        />
      </main>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
      <main className="app-main">
        <HistoryPanel
          sessions={analytics.sessions}
          onExport={() => analytics.exportToCSV()}
          onDelete={() => analytics.deleteHistory()}
          loading={analytics.loading}
        />
      </main>
      )}

      {/* Reward Modal */}
      <RewardModal
        isOpen={!!rewardData}
        onClose={() => setRewardData(null)}
        badge={rewardData?.badge}
        points={rewardData?.points}
        message={rewardData?.message}
      />
    </div>
    </>
  );
}

export default App;
