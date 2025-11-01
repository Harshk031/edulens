import { Router } from 'express';
import { generateTTS, jobStatus, streamTTS } from '../controllers/ttsController.js';

const router = Router();

router.post('/generate', generateTTS);
router.get('/status/:jobId', jobStatus);
router.get('/stream', streamTTS);

export default router;