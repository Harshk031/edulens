const { Router } = require('express');
const { generateTTS, jobStatus, streamTTS } = require('../controllers/ttsController.js');

const router = Router();

router.post('/generate', generateTTS);
router.get('/status/:jobId', jobStatus);
router.get('/stream', streamTTS);

module.exports = router;