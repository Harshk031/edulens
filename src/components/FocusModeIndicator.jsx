import { useEffect, useState } from 'react';
import './FocusModeIndicator.css';

export default function FocusModeIndicator({ active = false }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      // Fade out delay
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [active]);
  
  if (!visible && !active) return null;
  
  return (
    <div className={`focus-mode-indicator ${active ? 'active' : 'inactive'}`}>
      <div className="focus-badge">
        <div className="focus-icon">🎯</div>
        <div className="focus-text">
          <div className="focus-title">Focus Mode</div>
          <div className="focus-subtitle">Stay locked in</div>
        </div>
        <div className="focus-pulse"></div>
      </div>
    </div>
  );
}
