const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Import complete AI assistant
const CompleteAIAssistant = require('../ai/advanced/CompleteAIAssistant.cjs');

// Initialize complete AI assistant
const aiAssistant = new CompleteAIAssistant();

// Storage paths
const getStoragePath = (type) => {
  const basePath = path.join(__dirname, '..', '..', '..', 'data', 'storage');
  switch(type) {
    case 'transcripts': return path.join(basePath, 'transcripts');
    case 'embeddings': return path.join(basePath, 'embeddings');
    case 'sessions': return path.join(basePath, 'sessions');
    default: return basePath;
  }
};

// Load transcript helper
const loadTranscript = (videoId) => {
  try {
    const transcriptPath = path.join(getStoragePath('transcripts'), `${videoId}.json`);
    console.log(`[CompleteAI] Looking for transcript at: ${transcriptPath}`);
    
    if (!fs.existsSync(transcriptPath)) {
      console.log(`[CompleteAI] Transcript not found: ${transcriptPath}`);
      return null;
    }
    
    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    console.log(`[CompleteAI] Successfully loaded transcript for ${videoId}, segments: ${transcript.segments?.length || 0}`);
    return transcript;
  } catch (error) {
    console.error('[CompleteAI] Error loading transcript:', error);
    return null;
  }
};

// Save session data helper
const saveSession = async (videoId, sessionType, data) => {
  try {
    const sessionPath = path.join(getStoragePath('sessions'), `${videoId}-${sessionType}.json`);
    const sessionData = {
      videoId,
      sessionType,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
    console.log(`[CompleteAI] Session saved: ${videoId}-${sessionType}`);
    return sessionPath;
  } catch (error) {
    console.error('[CompleteAI] Error saving session:', error);
    throw error;
  }
};

// Format timestamp helper
const formatTimestamp = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

/**
 * Complete AI Query route
 * Processes queries with full advanced AI capabilities
 */
router.post('/query', async (req, res) => {
  try {
    const { videoId, query, context, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/query] Processing query for video: ${videoId}, query: "${query}", useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Process query with advanced capabilities
    const result = await aiAssistant.processAdvancedQuery(videoId, query, {
      includeContext: true,
      maxSources: options.maxSources || 5,
      semanticSearch: options.semanticSearch !== false,
      synthesisStrategy: options.synthesisStrategy || 'comprehensive',
      includeFollowUp: options.includeFollowUp !== false
    });
    
    // Save session
    await saveSession(videoId, 'complete-query', {
      query,
      context: context || {},
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      response: result.response,
      sources: result.sources,
      confidence: result.confidence,
      synthesis: result.synthesis,
      followUp: result.followUp,
      metadata: result.metadata,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/query] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process AI query' });
  }
});

/**
 * Complete AI Summary route
 * Generates intelligent summaries with different types
 */
router.post('/summary', async (req, res) => {
  try {
    const { videoId, type = 'general', useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/summary] Generating summary for video: ${videoId}, type: ${type}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Generate intelligent summary
    const result = await aiAssistant.generateIntelligentSummary(videoId, type, options.length || 'medium', {
      focus: type,
      synthesisStrategy: options.synthesisStrategy || 'educational',
      includeKeyPoints: options.includeKeyPoints !== false,
      includeTopics: options.includeTopics !== false
    });
    
    // Save session
    await saveSession(videoId, 'complete-summary', {
      type,
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      summary: result.summary,
      sources: result.sources,
      confidence: result.confidence,
      focus: result.focus,
      length: result.length,
      metadata: result.metadata,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/summary] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

/**
 * Complete AI Quiz route
 * Generates quizzes with variable difficulty and question counts
 */
router.post('/quiz', async (req, res) => {
  try {
    const { videoId, difficulty = 'medium', questionCount = 5, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/quiz] Generating quiz for video: ${videoId}, difficulty: ${difficulty}, questions: ${questionCount}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Generate intelligent quiz
    const result = await aiAssistant.generateQuiz(videoId, difficulty, questionCount, {
      includeAnswers: options.includeAnswers !== false,
      includeExplanations: options.includeExplanations !== false,
      questionTypes: options.questionTypes || ['multiple-choice', 'short-answer']
    });
    
    // Save session
    await saveSession(videoId, 'complete-quiz', {
      difficulty,
      questionCount,
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      quiz: result.quiz,
      sources: result.sources,
      confidence: result.confidence,
      difficulty: result.difficulty,
      questionCount: result.questionCount,
      metadata: result.metadata,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/quiz] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

/**
 * Complete AI Flashcards route
 * Generates flashcards with customizable card counts
 */
router.post('/flashcards', async (req, res) => {
  try {
    const { videoId, cardCount = 10, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/flashcards] Generating flashcards for video: ${videoId}, cards: ${cardCount}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Generate intelligent flashcards
    const result = await aiAssistant.generateFlashcards(videoId, cardCount, {
      includeTimestamps: options.includeTimestamps !== false,
      includeContext: options.includeContext !== false,
      cardTypes: options.cardTypes || ['concept', 'definition', 'example']
    });
    
    // Save session
    await saveSession(videoId, 'complete-flashcards', {
      cardCount,
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      flashcards: result.flashcards,
      sources: result.sources,
      confidence: result.confidence,
      cardCount: result.cardCount,
      metadata: result.metadata,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/flashcards] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

/**
 * Complete AI Notes route
 * Generates comprehensive notes with topic extraction
 */
router.post('/notes', async (req, res) => {
  try {
    const { videoId, format = 'structured', useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/notes] Generating notes for video: ${videoId}, format: ${format}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Generate comprehensive notes
    const result = await aiAssistant.generateNotes(videoId, format, {
      includeTopics: options.includeTopics !== false,
      includeSpeakers: options.includeSpeakers !== false,
      includeTimeline: options.includeTimeline !== false,
      includeKeyMoments: options.includeKeyMoments !== false
    });
    
    // Save session
    await saveSession(videoId, 'complete-notes', {
      format,
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      notes: result.notes,
      sources: result.sources,
      confidence: result.confidence,
      format: result.format,
      metadata: result.metadata,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/notes] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate notes' });
  }
});

/**
 * Complete AI Mindmap route
 * Generates mindmaps with hierarchical structure mapping
 */
router.post('/mindmap', async (req, res) => {
  try {
    const { videoId, style = 'hierarchical', useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/mindmap] Generating mindmap for video: ${videoId}, style: ${style}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Generate hierarchical mindmap
    const result = await aiAssistant.generateMindmap(videoId, style, {
      includeRelationships: options.includeRelationships !== false,
      includeEvolution: options.includeEvolution !== false,
      includeClusters: options.includeClusters !== false,
      maxDepth: options.maxDepth || 3
    });
    
    // Save session
    await saveSession(videoId, 'complete-mindmap', {
      style,
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      mindmap: result.mindmap,
      sources: result.sources,
      confidence: result.confidence,
      style: result.style,
      metadata: result.metadata,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/mindmap] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate mindmap' });
  }
});

/**
 * Semantic Search route
 * Performs semantic search with embeddings
 */
router.post('/semantic-search', async (req, res) => {
  try {
    const { videoId, query, topK = 10, threshold = 0.5, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/semantic-search] Performing search for video: ${videoId}, query: "${query}", useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Perform semantic search
    const result = await aiAssistant.semanticSearch(videoId, query, {
      topK,
      threshold,
      includeContext: options.includeContext !== false,
      searchStrategy: options.searchStrategy || 'hybrid'
    });
    
    // Save session
    await saveSession(videoId, 'semantic-search', {
      query,
      topK,
      threshold,
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      results: result.results,
      totalFound: result.totalFound,
      query: result.query,
      processingTime: result.processingTime,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/semantic-search] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to perform semantic search' });
  }
});

/**
 * Conversation Analysis route
 * Analyzes conversation flow and patterns
 */
router.post('/analyze-conversation', async (req, res) => {
  try {
    const { videoId, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/analyze-conversation] Analyzing conversation for video: ${videoId}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Analyze conversation
    const result = await aiAssistant.analyzeConversation(videoId, {
      includePatterns: options.includePatterns !== false,
      includeStatistics: options.includeStatistics !== false,
      includeTimeline: options.includeTimeline !== false
    });
    
    // Save session
    await saveSession(videoId, 'conversation-analysis', {
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      analysis: result.analysis,
      processingTime: result.processingTime,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/analyze-conversation] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze conversation' });
  }
});

/**
 * Topic Tracking route
 * Tracks topic evolution throughout video
 */
router.post('/track-topics', async (req, res) => {
  try {
    const { videoId, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/track-topics] Tracking topics for video: ${videoId}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Track topics
    const result = await aiAssistant.trackTopics(videoId, {
      includeEvolution: options.includeEvolution !== false,
      includeTransitions: options.includeTransitions !== false,
      includeClusters: options.includeClusters !== false
    });
    
    // Save session
    await saveSession(videoId, 'topic-tracking', {
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      tracking: result.tracking,
      processingTime: result.processingTime,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/track-topics] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to track topics' });
  }
});

/**
 * Key Moments Detection route
 * Detects important statements, questions, conclusions
 */
router.post('/detect-key-moments', async (req, res) => {
  try {
    const { videoId, useAdvanced = true, options = {} } = req.body;
    console.log(`[CompleteAI/detect-key-moments] Detecting key moments for video: ${videoId}, useAdvanced: ${useAdvanced}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Initialize AI assistant if needed
    if (useAdvanced) {
      await aiAssistant.initialize(videoId, options);
    }
    
    // Detect key moments
    const result = await aiAssistant.detectKeyMoments(videoId, {
      includeTypes: options.includeTypes || ['question', 'conclusion', 'important-statement'],
      minImportance: options.minImportance || 0.7,
      maxMoments: options.maxMoments || 20
    });
    
    // Save session
    await saveSession(videoId, 'key-moments-detection', {
      options,
      result,
      useAdvanced
    });
    
    res.json({
      success: true,
      keyMoments: result.keyMoments,
      totalMoments: result.totalMoments,
      processingTime: result.processingTime,
      useAdvanced
    });
    
  } catch (error) {
    console.error('[CompleteAI/detect-key-moments] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to detect key moments' });
  }
});

/**
 * Get session history route
 */
router.get('/sessions/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    console.log(`[CompleteAI/sessions] Getting sessions for video: ${videoId}`);
    
    const sessionsDir = getStoragePath('sessions');
    const files = fs.readdirSync(sessionsDir)
      .filter(f => f.startsWith(videoId + '-') && f.endsWith('.json'));
    
    const sessions = files.map(file => {
      const sessionPath = path.join(sessionsDir, file);
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      const sessionType = file.replace(videoId + '-', '').replace('.json', '');
      
      return {
        sessionType,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
        data: sessionData.data
      };
    });
    
    res.json({
      success: true,
      videoId,
      sessions,
      count: sessions.length
    });
    
  } catch (error) {
    console.error('[CompleteAI/sessions] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get sessions' });
  }
});

/**
 * Delete session route
 */
router.delete('/sessions/:videoId/:sessionType', async (req, res) => {
  try {
    const { videoId, sessionType } = req.params;
    console.log(`[CompleteAI/sessions] Deleting session: ${videoId}-${sessionType}`);
    
    const sessionPath = path.join(getStoragePath('sessions'), `${videoId}-${sessionType}.json`);
    
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }
    
    res.json({
      success: true,
      videoId,
      sessionType,
      message: 'Session deleted successfully'
    });
    
  } catch (error) {
    console.error('[CompleteAI/sessions] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete session' });
  }
});

/**
 * Health check route
 */
router.get('/health', (req, res) => {
  const healthStatus = aiAssistant.getHealthStatus();
  
  res.json({
    ...healthStatus,
    service: 'complete-ai-routes',
    timestamp: new Date().toISOString(),
    features: [
      'query',
      'summary',
      'quiz',
      'flashcards',
      'notes',
      'mindmap',
      'semantic-search',
      'analyze-conversation',
      'track-topics',
      'detect-key-moments'
    ],
    storage: {
      transcripts: getStoragePath('transcripts'),
      sessions: getStoragePath('sessions')
    }
  });
});

module.exports = router;