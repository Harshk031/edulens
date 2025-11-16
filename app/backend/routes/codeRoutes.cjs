/**
 * Code Extraction and Compilation Routes
 * Handles code extraction from transcripts and code execution
 */

const express = require('express');
const router = express.Router();
const codeExtractor = require('../services/codeExtractor.cjs');
const codeCompiler = require('../services/codeCompiler.cjs');
const path = require('path');
const fs = require('fs');

// Storage path helper
const getStoragePath = (type) => {
  const basePath = path.join(process.cwd(), 'data', 'storage');
  switch(type) {
    case 'transcripts': return path.join(basePath, 'transcripts');
    default: return basePath;
  }
};

// Load transcript helper
const loadTranscript = (videoId) => {
  try {
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    if (fs.existsSync(transcriptPath)) {
      return JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    }
    return null;
  } catch (error) {
    console.error(`[loadTranscript] Error loading transcript for ${videoId}:`, error);
    return null;
  }
};

/**
 * POST /api/code/extract
 * Extract code from transcript at specific timestamp
 */
router.post('/extract', async (req, res) => {
  try {
    const { videoId, timestamp } = req.body;
    
    console.log(`[Code/Extract] Extracting code for video: ${videoId} at ${timestamp}s`);
    
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Video ID is required'
      });
    }

    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        message: 'Please ensure the video has been processed'
      });
    }

    // Extract code at timestamp
    const result = await codeExtractor.extractCodeAtTimestamp(
      transcript,
      timestamp || 0,
      30 // 30 second window
    );

    res.json(result);

  } catch (error) {
    console.error('[Code/Extract] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/code/extract-all
 * Extract all code snippets from transcript
 */
router.post('/extract-all', async (req, res) => {
  try {
    const { videoId } = req.body;
    
    console.log(`[Code/ExtractAll] Extracting all code for video: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Video ID is required'
      });
    }

    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found'
      });
    }

    // Extract all code snippets
    const snippets = await codeExtractor.extractCodeFromTranscript(transcript);

    res.json({
      success: true,
      videoId,
      snippets,
      count: snippets.length
    });

  } catch (error) {
    console.error('[Code/ExtractAll] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/code/compile
 * Compile and execute code
 */
router.post('/compile', async (req, res) => {
  try {
    const { code, language, input } = req.body;
    
    console.log(`[Code/Compile] Compiling ${language} code (${code?.length || 0} chars)`);
    
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required',
        received: { hasCode: !!code, language }
      });
    }

    // Check if language is supported
    if (!codeCompiler.isLanguageSupported(language)) {
      return res.status(400).json({
        success: false,
        error: `Language '${language}' is not supported`,
        supportedLanguages: codeCompiler.getSupportedLanguages()
      });
    }

    // Compile and run
    const result = await codeCompiler.compileAndRun(code, language, input || '');

    console.log(`[Code/Compile] Execution ${result.success ? 'successful' : 'failed'}`);

    res.json(result);

  } catch (error) {
    console.error('[Code/Compile] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/code/languages
 * Get list of supported programming languages
 */
router.get('/languages', (req, res) => {
  try {
    const languages = codeCompiler.getSupportedLanguages();
    
    res.json({
      success: true,
      languages,
      count: languages.length
    });

  } catch (error) {
    console.error('[Code/Languages] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/code/validate
 * Validate code syntax
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    console.log(`[Code/Validate] Validating ${language} code`);
    
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required'
      });
    }

    // Validate syntax
    const result = await codeCompiler.validateSyntax(code, language);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[Code/Validate] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
