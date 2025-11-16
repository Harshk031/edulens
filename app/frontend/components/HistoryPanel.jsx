import { useState, useMemo } from 'react';
import './HistoryPanel.css';

export default function HistoryPanel({
  sessions = [],
  onExport,
  onDelete,
  loading = false,
}) {
  const [sortBy, setSortBy] = useState('date');
  const [filterMode, setFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSorted = useMemo(() => {
    let filtered = sessions.filter((s) => {
      // Filter by mode
      if (filterMode !== 'all' && s.aiMode !== filterMode) return false;

      // Search by session ID
      if (
        searchTerm &&
        !s.id.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.startTime - a.startTime;
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'completion':
          return b.completed - a.completed;
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, sortBy, filterMode, searchTerm]);

  const stats = useMemo(() => {
    const completed = filteredAndSorted.filter((s) => s.completed).length;
    const totalTime = filteredAndSorted.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );
    const avgDuration =
      filteredAndSorted.length > 0
        ? Math.round(totalTime / filteredAndSorted.length / 60000)
        : 0;

    return {
      total: filteredAndSorted.length,
      completed,
      completionRate:
        filteredAndSorted.length > 0
          ? Math.round((completed / filteredAndSorted.length) * 100)
          : 0,
      totalTime: Math.round(totalTime / 60000),
      avgDuration,
    };
  }, [filteredAndSorted]);

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2>📚 Session History</h2>
        <button
          className="history-export-btn"
          onClick={onExport}
          disabled={loading || sessions.length === 0}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="history-stats">
        <div className="stat-card">
          <span className="stat-label">Total Sessions</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{stats.completed}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">{stats.completionRate}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Time</span>
          <span className="stat-value">{stats.totalTime}m</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg Duration</span>
          <span className="stat-value">{stats.avgDuration}m</span>
        </div>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <input
          type="text"
          placeholder="Search session ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="history-search"
        />

        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="history-filter-select"
        >
          <option value="all">All Modes</option>
          <option value="offline">Offline</option>
          <option value="online">Online</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="history-sort-select"
        >
          <option value="date">Sort by Date</option>
          <option value="duration">Sort by Duration</option>
          <option value="score">Sort by Score</option>
          <option value="completion">Sort by Completion</option>
        </select>
      </div>

      {/* Sessions List */}
      <div className="history-list">
        {filteredAndSorted.length === 0 ? (
          <div className="history-empty">
            <p>No sessions found</p>
          </div>
        ) : (
          <div className="history-table">
            <div className="history-table-header">
              <div className="table-col date-col">Date</div>
              <div className="table-col duration-col">Duration</div>
              <div className="table-col mode-col">Mode</div>
              <div className="table-col score-col">Score</div>
              <div className="table-col status-col">Status</div>
            </div>

            {filteredAndSorted.map((session) => (
              <div
                key={session.id}
                className={`history-table-row ${
                  session.completed ? 'completed' : 'incomplete'
                }`}
              >
                <div className="table-col date-col">
                  {formatDate(session.startTime)}
                </div>
                <div className="table-col duration-col">
                  {formatDuration(session.duration || 0)}
                </div>
                <div className="table-col mode-col">
                  <span className={`mode-badge ${session.aiMode}`}>
                    {session.aiMode === 'offline' ? '🔌' : '🌐'}{' '}
                    {session.aiMode}
                  </span>
                </div>
                <div className="table-col score-col">
                  {session.score || 0}
                </div>
                <div className="table-col status-col">
                  {session.completed ? (
                    <span className="status-badge completed">✅ Complete</span>
                  ) : session.earlyExit ? (
                    <span className="status-badge early-exit">🚪 Early</span>
                  ) : (
                    <span className="status-badge incomplete">⏸️ Paused</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="history-actions">
        <button
          className="history-delete-btn"
          onClick={onDelete}
          disabled={loading || sessions.length === 0}
        >
          🗑️ Delete History
        </button>
      </div>
    </div>
  );
}
