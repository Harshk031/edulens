import { useEffect, useState } from 'react';
import './FocusExit.css';

export default function FocusExit({ visible = false, onExit }) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  if (!isVisible) return null;

  return (
    <button
      className="focus-exit-btn"
      onClick={onExit}
      aria-label="Exit Focus Mode"
      title="Exit Focus Mode (Esc)"
    >
      <span className="exit-icon">✕</span>
      <span className="exit-text">Exit Focus</span>
    </button>
  );
}
