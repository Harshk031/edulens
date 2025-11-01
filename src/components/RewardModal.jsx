import { useEffect } from 'react';
import gsap from 'gsap';
import './RewardModal.css';

export default function RewardModal({
  isOpen,
  onClose,
  badge,
  points,
  message = 'Achievement Unlocked!',
}) {
  useEffect(() => {
    if (isOpen) {
      const modal = document.querySelector('.reward-modal-overlay');
      if (modal) {
        gsap.fromTo(
          modal,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );

        const card = document.querySelector('.reward-modal-card');
        if (card) {
          gsap.fromTo(
            card,
            { scale: 0.5, y: 50, opacity: 0 },
            { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out' }
          );

          // Pulse animation for badge icon
          const icon = card.querySelector('.reward-badge-icon');
          if (icon) {
            gsap.to(icon, {
              scale: 1.1,
              duration: 0.6,
              repeat: 2,
              yoyo: true,
              ease: 'power1.inOut',
            });
          }
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="reward-modal-overlay" onClick={onClose}>
      <div className="reward-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="reward-close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="reward-content">
          <h2 className="reward-title">{message}</h2>

          {badge && (
            <div className="reward-badge-section">
              <div className="reward-badge-icon">{badge.name.split(' ')[0]}</div>
              <h3 className="reward-badge-name">
                {badge.name.split(' ').slice(1).join(' ')}
              </h3>
              <p className="reward-badge-description">{badge.description}</p>
            </div>
          )}

          {points > 0 && (
            <div className="reward-points-section">
              <span className="points-icon">⭐</span>
              <p className="points-text">+{points} Points Earned!</p>
            </div>
          )}

          <div className="reward-stats">
            <div className="stat-item">
              <span className="stat-label">Keep the momentum!</span>
              <span className="stat-value">🔥</span>
            </div>
          </div>

          <button className="reward-celebrate-btn" onClick={onClose}>
            Awesome! Continue
          </button>
        </div>

        <div className="reward-confetti">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                '--delay': `${i * 0.05}s`,
                '--duration': `${0.6 + Math.random() * 0.4}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
