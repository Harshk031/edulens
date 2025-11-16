import { useState, useRef } from 'react';
import './FlashcardViewer.css';

export default function FlashcardViewer({ flashcardsData, onClose }) {
  const [cards, setCards] = useState(parseFlashcards(flashcardsData));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  function parseFlashcards(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const flashcards = [];
    let currentCard = null;

    for (const line of lines) {
      if (line.toLowerCase().startsWith('q:') || line.toLowerCase().startsWith('question:')) {
        if (currentCard) flashcards.push(currentCard);
        currentCard = { question: line.replace(/^(q:|question:)/i, '').trim(), answer: '' };
      } else if (line.toLowerCase().startsWith('a:') || line.toLowerCase().startsWith('answer:')) {
        if (currentCard) {
          currentCard.answer = line.replace(/^(a:|answer:)/i, '').trim();
        }
      } else if (currentCard && !currentCard.answer && line.trim()) {
        currentCard.answer = line.trim();
      }
    }
    if (currentCard) flashcards.push(currentCard);

    // Fallback if no structured cards found
    if (flashcards.length === 0) {
      const chunks = text.split(/\n\n+/);
      chunks.forEach(chunk => {
        const parts = chunk.split('\n');
        if (parts.length >= 2) {
          flashcards.push({ question: parts[0].trim(), answer: parts.slice(1).join(' ').trim() });
        }
      });
    }

    return flashcards.length > 0 ? flashcards : [{ question: text, answer: 'No answer provided' }];
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleKnown = () => {
    if (!knownCards.includes(currentIndex)) {
      setKnownCards([...knownCards, currentIndex]);
    }
    handleNext();
  };

  const handleUnknown = () => {
    handleNext();
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const current = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const masteryRate = ((knownCards.length / cards.length) * 100).toFixed(0);

  return (
    <div className="flashcard-viewer-overlay">
      <div className="flashcard-viewer-container" ref={containerRef}>
        <div className="flashcard-top-controls">
          <button className="flashcard-close" onClick={onClose}>✕</button>
          <button className="flashcard-fullscreen" onClick={toggleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? '🗗' : '⛶'}
          </button>
        </div>

        <div className="flashcard-header">
          <h2>🎴 Flashcards</h2>
          <div className="flashcard-stats">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span className="mastery">Mastery: {masteryRate}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="flashcard-stage">
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
            <div className="flashcard-front">
              <div className="card-label">Question</div>
              <div className="card-content">
                {current.question}
              </div>
              <div className="flip-hint">💡 Click to reveal</div>
            </div>
            <div className="flashcard-back">
              <div className="card-label">Answer</div>
              <div className="card-content">
                {current.answer}
              </div>
              <div className="flip-hint">🔄 Click to flip back</div>
            </div>
          </div>
        </div>

        <div className="flashcard-controls">
          <button 
            className="nav-btn prev" 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            ← Prev
          </button>

          {isFlipped && (
            <div className="knowledge-buttons">
              <button className="know-btn unknown" onClick={handleUnknown}>
                ❌ Don't Know
              </button>
              <button className="know-btn known" onClick={handleKnown}>
                ✅ Know It
              </button>
            </div>
          )}

          <button 
            className="nav-btn next" 
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
          >
            Next →
          </button>
        </div>

        {currentIndex === cards.length - 1 && (
          <div className="completion-message">
            <p>🎉 You've completed all flashcards!</p>
            <p>Known: {knownCards.length} / {cards.length}</p>
          </div>
        )}
      </div>
    </div>
  );
}
