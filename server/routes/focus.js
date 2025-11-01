import express from 'express';

const router = express.Router();

// very lightweight status endpoint to avoid 500s
router.get('/status', (req, res) => {
  try {
    // For now return a neutral payload; frontend can augment with real session
    return res.json({ active: false, remaining: 0 });
  } catch (e) {
    return res.json({ active: false, remaining: 0 });
  }
});

export default router;
