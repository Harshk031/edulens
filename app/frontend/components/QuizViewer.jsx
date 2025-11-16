import { useState } from 'react';
import './QuizViewer.css';

export default function QuizViewer({ quizData, onClose }) {
  const [questions, setQuestions] = useState(parseQuiz(quizData));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  function parseQuiz(text) {
    // Simple parser for quiz text - improve based on actual format
    const lines = text.split('\n').filter(l => l.trim());
    const qs = [];
    let current = null;
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (current) qs.push(current);
        current = { question: line.replace(/^\d+\./, '').trim(), options: [], answer: '', type: 'mcq' };
      } else if (line.match(/^[A-D]\)/i) && current) {
        current.options.push(line.trim());
      } else if (line.toLowerCase().includes('answer:') && current) {
        current.answer = line.split(':')[1]?.trim() || '';
      }
    }
    if (current) qs.push(current);
    return qs.length > 0 ? qs : [{ question: text, options: [], answer: '', type: 'open' }];
  }

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    setShowAnswer(true);
    const isCorrect = answer === questions[currentIndex].answer || 
                     questions[currentIndex].answer.includes(answer.charAt(0));
    if (isCorrect) {
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
    } else {
      setScore(s => ({ ...s, total: s.total + 1 }));
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    }
  };

  const current = questions[currentIndex];

  return (
    <div className="quiz-viewer-overlay">
      <div className="quiz-viewer-modal">
        <button className="quiz-close" onClick={onClose}>✕</button>
        
        <div className="quiz-header">
          <h2>📝 Quiz Time</h2>
          <div className="quiz-progress">
            <span>{currentIndex + 1} / {questions.length}</span>
            <span className="quiz-score">
              Score: {score.correct}/{score.total}
            </span>
          </div>
        </div>

        <div className="quiz-content">
          <h3 className="quiz-question">{current.question}</h3>
          
          {current.options.length > 0 ? (
            <div className="quiz-options">
              {current.options.map((opt, i) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = showAnswer && opt.includes(current.answer.charAt(0));
                const isWrong = showAnswer && isSelected && !isCorrect;
                
                return (
                  <button
                    key={i}
                    className={`quiz-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                    onClick={() => !showAnswer && handleAnswer(opt)}
                    disabled={showAnswer}
                  >
                    {opt}
                    {isCorrect && showAnswer && <span className="check">✓</span>}
                    {isWrong && <span className="cross">✗</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="quiz-open-answer"
              placeholder="Type your answer..."
              disabled={showAnswer}
            />
          )}

          {showAnswer && (
            <div className={`quiz-feedback ${selectedAnswer?.includes(current.answer.charAt(0)) ? 'correct-feedback' : 'wrong-feedback'}`}>
              {selectedAnswer?.includes(current.answer.charAt(0)) ? (
                <>
                  <span className="feedback-icon">🎉</span>
                  <p>Correct! Well done!</p>
                </>
              ) : (
                <>
                  <span className="feedback-icon">💡</span>
                  <p>The correct answer is: {current.answer}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="quiz-actions">
          {showAnswer && currentIndex < questions.length - 1 && (
            <button className="quiz-next" onClick={nextQuestion}>
              Next Question →
            </button>
          )}
          {showAnswer && currentIndex === questions.length - 1 && (
            <button className="quiz-finish" onClick={onClose}>
              Finish Quiz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
