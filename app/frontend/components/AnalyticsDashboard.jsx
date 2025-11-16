import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './AnalyticsDashboard.css';

export default function AnalyticsDashboard({
  summary = {},
  gamification = {},
  sessions = [],
  onTabChange = () => {},
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const dashboardRef = useRef(null);

  useEffect(() => {
    // Animate dashboard on mount
    const elements = dashboardRef.current?.querySelectorAll('.stat-box');
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
        }
      );
    }
  }, []);

  const completionRate = summary?.completionRate || 0;
  const totalFocusTime = Math.round((summary?.totalFocusTime || 0) / 60000);

  const renderOverview = () => (
    <div className="dashboard-tab overview-tab">
      <div className="dashboard-stats">
        <div className="stat-box">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-value">{summary?.totalSessions || 0}</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-label">Focus Time</span>
            <span className="stat-value">{totalFocusTime}m</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-label">Completion Rate</span>
            <span className="stat-value">{completionRate}%</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-label">Avg Duration</span>
            <span className="stat-value">
              {Math.round((summary?.averageSessionDuration || 0) / 60000)}m
            </span>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="chart-container">
        <h3>Session Progress</h3>
        <div className="progress-bars">
          <div className="progress-item">
            <label>Completion Rate</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="progress-text">{completionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGamification = () => (
    <div className="dashboard-tab gamification-tab">
      <div className="gamification-section">
        <div className="gamification-header">
          <h3>🏆 Your Achievements</h3>
        </div>

        {/* Points & Streak */}
        <div className="achievement-cards">
          <div className="achievement-card points">
            <div className="achievement-icon">⭐</div>
            <h4>Total Points</h4>
            <p className="achievement-value">{gamification?.points || 0}</p>
          </div>

          <div className="achievement-card streak">
            <div className="achievement-icon">🔥</div>
            <h4>Current Streak</h4>
            <p className="achievement-value">{gamification?.streak || 0} days</p>
          </div>

          <div className="achievement-card sessions">
            <div className="achievement-icon">💪</div>
            <h4>Sessions</h4>
            <p className="achievement-value">
              {gamification?.totalSessions || 0}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="badges-section">
          <h4>🎖️ Badges Earned</h4>
          {gamification?.badges && gamification.badges.length > 0 ? (
            <div className="badges-grid">
              {gamification.badges.map((badge) => (
                <div key={badge.id} className="badge-item">
                  <div className="badge-icon">{badge.name.split(' ')[0]}</div>
                  <span className="badge-label">
                    {badge.name.split(' ').slice(1).join(' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-badges">
              Keep focusing to unlock badges! 🚀
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderSessionBreakdown = () => {
    const offlineSessions = sessions.filter(
      (s) => s.aiMode === 'offline'
    ).length;
    const onlineSessions = sessions.filter(
      (s) => s.aiMode === 'online'
    ).length;
    const completedSessions = sessions.filter((s) => s.completed).length;

    return (
      <div className="dashboard-tab breakdown-tab">
        <div className="breakdown-section">
          <h3>Session Breakdown</h3>

          <div className="breakdown-cards">
            <div className="breakdown-card">
              <span className="breakdown-label">Offline Sessions</span>
              <span className="breakdown-value">{offlineSessions}</span>
            </div>
            <div className="breakdown-card">
              <span className="breakdown-label">Online Sessions</span>
              <span className="breakdown-value">{onlineSessions}</span>
            </div>
            <div className="breakdown-card">
              <span className="breakdown-label">Completed</span>
              <span className="breakdown-value">{completedSessions}</span>
            </div>
            <div className="breakdown-card">
              <span className="breakdown-label">Early Exits</span>
              <span className="breakdown-value">
                {sessions.filter((s) => s.earlyExit).length}
              </span>
            </div>
          </div>

          {/* Mode Distribution */}
          <div className="distribution-chart">
            <h4>Mode Distribution</h4>
            <div className="pie-chart">
              <div className="pie-section offline" style={{
                '--percentage': `${offlineSessions ? Math.round((offlineSessions / sessions.length) * 100) : 0}`
              }}>
                <span className="pie-label">Offline {offlineSessions}</span>
              </div>
              <div className="pie-section online" style={{
                '--percentage': `${onlineSessions ? Math.round((onlineSessions / sessions.length) * 100) : 0}`
              }}>
                <span className="pie-label">Online {onlineSessions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-dashboard" ref={dashboardRef}>
      <div className="dashboard-header">
        <h2>📊 Analytics Dashboard</h2>
        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('overview');
              onTabChange('overview');
            }}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'gamification' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('gamification');
              onTabChange('gamification');
            }}
          >
            🏆 Achievements
          </button>
          <button
            className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('breakdown');
              onTabChange('breakdown');
            }}
          >
            Breakdown
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'gamification' && renderGamification()}
        {activeTab === 'breakdown' && renderSessionBreakdown()}
      </div>
    </div>
  );
}
