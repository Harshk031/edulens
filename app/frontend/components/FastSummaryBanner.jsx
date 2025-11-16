import './FastSummaryBanner.css';

export default function FastSummaryBanner({ summary, onUseInChat, onDismiss }) {
  if (!summary || !summary.bullets || summary.bullets.length === 0) return null;

  return (
    <div className="fast-summary-banner">
      <div className="banner-header">
        <span className="banner-icon">⚡</span>
        <h4 className="banner-title">Fast Summary Ready!</h4>
        <button 
          className="banner-close" 
          onClick={onDismiss}
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>

      <div className="banner-content">
        <ul className="summary-bullets">
          {summary.bullets.slice(0, 5).map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
        
        {summary.highlights && summary.highlights.length > 0 && (
          <div className="summary-highlights">
            <p className="highlights-label">Key Moments:</p>
            {summary.highlights.slice(0, 3).map((highlight, i) => (
              <div key={i} className="highlight-item">
                <span className="highlight-time">[{formatTime(highlight.start)}]</span>
                <span className="highlight-text">{highlight.summary}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="banner-actions">
        <button 
          className="btn-use-chat" 
          onClick={onUseInChat}
        >
          Use in AI Chat
        </button>
        <span className="banner-badge">~60s processing</span>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
