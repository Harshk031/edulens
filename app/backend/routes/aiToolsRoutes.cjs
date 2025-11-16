const express = require('express');
const router = express.Router();

router.post('/summary', (req, res) => {
  console.log('AI summary called:', req.body);
  res.json({
    text: 'This is a dummy summary.',
    sourceChunks: [],
    creditUseEstimate: { tokensIn: 200, tokensOut: 100 },
  });
});

router.post('/quiz', (req, res) => {
  console.log('AI quiz called:', req.body);
  res.json({
    text: 'This is a dummy quiz.',
    quiz: 'Dummy quiz content',
    sourceChunks: [],
    creditUseEstimate: { tokensIn: 150, tokensOut: 80 },
  });
});

router.post('/flashcards', (req, res) => {
  console.log('AI flashcards called:', req.body);
  res.json({
    text: 'This is a dummy flashcard.',
    flashcards: 'Dummy flashcard content',
    sourceChunks: [],
    creditUseEstimate: { tokensIn: 120, tokensOut: 60 },
  });
});

router.post('/notes', (req, res) => {
  console.log('AI notes called:', req.body);
  res.json({
    text: 'These are dummy notes.',
    sourceChunks: [],
    creditUseEstimate: { tokensIn: 100, tokensOut: 40 },
  });
});

router.post('/mindmap', (req, res) => {
  console.log('AI mindmap called:', req.body);
  res.json({
    text: 'This is a dummy mindmap.',
    sourceChunks: [],
    creditUseEstimate: { tokensIn: 130, tokensOut: 70 },
  });
});

module.exports = router;
