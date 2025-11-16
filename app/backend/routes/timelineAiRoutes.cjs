const express = require('express');
const router = express.Router();

router.post('/query', (req, res) => {
  console.log('Timeline AI query called:', req.body);
  res.json({
    text: 'This is a dummy response from the timeline AI.',
    sourceChunks: [],
    creditUseEstimate: { tokensIn: 100, tokensOut: 50 },
  });
});

module.exports = router;
