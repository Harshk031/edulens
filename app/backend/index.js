require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const providerManager = require('../ai/providers/providerManager');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Ensure storage directories
const storageDirs = [
  path.join(__dirname, '..', 'storage'),
  path.join(__dirname, '..', 'storage', 'transcripts'),
  path.join(__dirname, '..', 'storage', 'embeddings'),
  path.join(__dirname, '..', 'storage', 'sessions'),
];
storageDirs.forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// Routes
app.use('/api/video', require('./routes/videoRoutes'));
app.use('/api/ai', require('./routes/aiRoutes.cjs'));

app.get('/health', async (req, res) => {
  const providers = await providerManager.health();
  res.json({ ok: true, providers });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server listening on :${PORT}`);
});
