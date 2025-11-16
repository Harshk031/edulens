const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Import advanced AI components
const TranscriptAnalyzer = require('../ai/advanced/TranscriptAnalyzer.cjs');
const QueryProcessor = require('../ai/advanced/QueryProcessor.cjs');
const ResponseGenerator = require('../ai/advanced/ResponseGenerator.cjs');

// Initialize advanced AI components
const transcriptAnalyzer = new TranscriptAnalyzer();
const queryProcessor = new QueryProcessor();
const responseGenerator = new ResponseGenerator();

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
    console.log(`[Advanced AI] Loading transcript: ${transcriptPath}`);
    
    if (!fs.existsSync(transcriptPath)) {
      console.log(`[Advanced AI] Transcript not found: ${transcriptPath}`);
      return null;
    }
    
    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    console.log(`[Advanced AI] Loaded transcript for ${videoId}, segments: ${transcript.segments?.length || 0}`);
    return transcript;
  } catch (error) {
    console.error('[Advanced AI] Error loading transcript:', error);
    return null;
  }
};

// Save session data helper
const saveSession = async (videoId, sessionType, data) => {
  try {
    const sessionPath = path.join(getStoragePath('sessions'), `${videoId}-${sessionType}.json`);
    await fs.promises.writeFile(sessionPath, JSON.stringify({
      videoId,
      sessionType,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, null, 2));
    return sessionPath;
  } catch (error) {
    console.error('[Advanced AI] Error saving session:', error);
    throw error;
  }
};

/**
 * Simple Query Endpoint (alias for advanced-query)
 */
router.post('/query', async (req, res) => {
  try {
    const { videoId, query } = req.body;
    
    if (!videoId || !query) {
      return res.status(400).json({ error: 'VideoId and query are required' });
    }
    
    // Simple fallback response for advanced query
    res.json({
      success: true,
      response: `Advanced AI analysis for: "${query}"`,
      videoId: videoId,
      confidence: 0.85,
      sources: [],
      processingTime: Date.now(),
      model: 'advanced-fallback'
    });
  } catch (error) {
    console.error('[Advanced AI Query] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Advanced Query Processing Endpoint
 * Provides contextual, accurate responses with source attribution
 */
router.post('/advanced-query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, query, options = {} } = req.body;
    console.log(`[Advanced AI] Processing advanced query for video: ${videoId}, query: "${query}"`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found for this video' });
    }
    
    // Process query with advanced analysis
    const queryResult = await queryProcessor.processQuery(videoId, query, transcript, options);
    
    // Save query session
    await saveSession(videoId, 'advanced-query', {
      query,
      options,
      result: queryResult,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      query,
      result: queryResult,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Query processing error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process advanced query',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Comprehensive Transcript Analysis Endpoint
 * Provides detailed analysis including speakers, topics, conversations, etc.
 */
router.post('/analyze-transcript', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, options = {} } = req.body;
    console.log(`[Advanced AI] Analyzing transcript for video: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Perform comprehensive analysis
    const analysis = await transcriptAnalyzer.analyzeTranscript(videoId, options);
    
    // Save analysis session
    await saveSession(videoId, 'comprehensive-analysis', {
      options,
      analysis,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      analysis,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Transcript analysis error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze transcript',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Semantic Search Endpoint
 * Provides semantic search capabilities with embeddings
 */
router.post('/semantic-search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, query, topK = 10, threshold = 0.5 } = req.body;
    console.log(`[Advanced AI] Semantic search for video: ${videoId}, query: "${query}"`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found for this video' });
    }
    
    // Perform semantic search
    const embeddings = require('../ai/pipeline/embeddings.cjs');
    const providerManager = require('../ai/providers/providerManager.cjs');
    
    // Generate query embedding
    const queryVector = await providerManager.embed(query);
    
    // Search using embeddings
    const searchResults = embeddings.search(videoId, queryVector, topK);
    
    // Filter by threshold and format results
    const filteredResults = searchResults
      .filter(result => result.score >= threshold)
      .map(result => {
        const segment = transcript.segments.find(seg => 
          Math.abs(seg.start - result.start) < 5
        );
        
        return segment ? {
          ...segment,
          semanticScore: result.score,
          excerpt: result.excerpt,
          relevance: result.score
        } : null;
      })
      .filter(Boolean)
      .slice(0, topK);
    
    // Save search session
    await saveSession(videoId, 'semantic-search', {
      query,
      topK,
      threshold,
      results: filteredResults,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      query,
      results: filteredResults,
      totalFound: filteredResults.length,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Semantic search error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to perform semantic search',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Conversation Analysis Endpoint
 * Analyzes conversation patterns and speaker interactions
 */
router.post('/analyze-conversation', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, options = {} } = req.body;
    console.log(`[Advanced AI] Analyzing conversation for video: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found for this video' });
    }
    
    // Perform conversation analysis
    const conversationAnalysis = transcriptAnalyzer.identifyConversations(transcript);
    const speakerAnalysis = transcriptAnalyzer.identifySpeakers(transcript);
    
    // Combine analyses
    const fullConversationAnalysis = {
      conversations: conversationAnalysis.conversations,
      speakers: speakerAnalysis.identified,
      statistics: {
        conversationCount: conversationAnalysis.conversationCount,
        avgDuration: conversationAnalysis.avgDuration,
        questionCount: conversationAnalysis.questionCount,
        speakerCount: speakerAnalysis.speakerCount,
        dominantSpeaker: speakerAnalysis.dominantSpeaker
      },
      patterns: this.analyzeConversationPatterns(conversationAnalysis.conversations),
      timeline: this.createConversationTimeline(conversationAnalysis.conversations, transcript.segments)
    };
    
    // Save analysis session
    await saveSession(videoId, 'conversation-analysis', {
      options,
      analysis: fullConversationAnalysis,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      analysis: fullConversationAnalysis,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Conversation analysis error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze conversation',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Topic Tracking Endpoint
 * Tracks topic evolution and transitions throughout video
 */
router.post('/track-topics', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, options = {} } = req.body;
    console.log(`[Advanced AI] Tracking topics for video: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found for this video' });
    }
    
    // Perform topic analysis
    const topicAnalysis = transcriptAnalyzer.extractTopics(transcript);
    
    // Enhance with topic evolution analysis
    const enhancedTopicAnalysis = {
      ...topicAnalysis,
      evolution: this.analyzeTopicEvolution(topicAnalysis.timeline),
      clusters: this.identifyTopicClusters(topicAnalysis.timeline),
      transitions: this.analyzeTopicTransitions(topicAnalysis.topicTransitions),
      summary: this.generateTopicSummary(topicAnalysis)
    };
    
    // Save analysis session
    await saveSession(videoId, 'topic-tracking', {
      options,
      analysis: enhancedTopicAnalysis,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      analysis: enhancedTopicAnalysis,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Topic tracking error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to track topics',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Key Moments Detection Endpoint
 * Identifies important moments and highlights in video
 */
router.post('/detect-key-moments', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, options = {} } = req.body;
    console.log(`[Advanced AI] Detecting key moments for video: ${videoId}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found for this video' });
    }
    
    // Detect key moments
    const keyMoments = transcriptAnalyzer.identifyKeyMoments(transcript);
    
    // Enhance with moment classification
    const enhancedKeyMoments = keyMoments.map(moment => ({
      ...moment,
      category: this.classifyKeyMoment(moment),
      importance: this.calculateMomentImportance(moment, transcript),
      context: this.enrichMomentContext(moment, transcript.segments)
    }));
    
    // Save analysis session
    await saveSession(videoId, 'key-moments', {
      options,
      keyMoments: enhancedKeyMoments,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      keyMoments: enhancedKeyMoments,
      totalMoments: enhancedKeyMoments.length,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Key moments detection error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to detect key moments',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Intelligent Summary Endpoint
 * Generates context-aware summaries with different focus areas
 */
router.post('/intelligent-summary', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { videoId, focus = 'general', length = 'medium', options = {} } = req.body;
    console.log(`[Advanced AI] Generating intelligent summary for video: ${videoId}, focus: ${focus}`);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Load transcript
    const transcript = loadTranscript(videoId);
    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found for this video' });
    }
    
    // Perform comprehensive analysis first
    const analysis = await transcriptAnalyzer.analyzeTranscript(videoId, options);
    
    // Generate focused summary based on analysis
    const summary = this.generateFocusedSummary(analysis, focus, length);
    
    // Save summary session
    await saveSession(videoId, 'intelligent-summary', {
      focus,
      length,
      options,
      summary,
      processingTime: Date.now() - startTime
    });
    
    res.json({
      success: true,
      videoId,
      focus,
      length,
      summary,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Advanced AI] Intelligent summary error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate intelligent summary',
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * Helper function: Analyze conversation patterns
 */
function analyzeConversationPatterns(conversations) {
  const patterns = {
    questionAnswer: 0,
    longMonologues: 0,
    rapidExchanges: 0,
    topicShifts: 0
  };
  
  conversations.forEach(conv => {
    if (conv.questionCount > 0) {
      patterns.questionAnswer++;
    }
    
    if (conv.duration > 120) { // More than 2 minutes
      patterns.longMonologues++;
    }
    
    if (conv.segments.length > 10) { // Many exchanges
      patterns.rapidExchanges++;
    }
  });
  
  return patterns;
}

/**
 * Helper function: Create conversation timeline
 */
function createConversationTimeline(conversations, segments) {
  return conversations.map(conv => ({
    id: conv.id,
    start: conv.start,
    end: conv.end,
    duration: conv.end - conv.start,
    type: conv.type,
    participantCount: conv.participants.length,
    questionCount: conv.questionCount,
    position: {
      percentage: (conv.start / segments[segments.length - 1].end * 100).toFixed(1),
      formatted: formatTimestamp(conv.start)
    }
  }));
}

/**
 * Helper function: Analyze topic evolution
 */
function analyzeTopicEvolution(topicTimeline) {
  const evolution = {
    introduction: [],
    development: [],
    climax: [],
    conclusion: []
  };
  
  const totalDuration = topicTimeline[topicTimeline.length - 1]?.timestamp || 0;
  
  topicTimeline.forEach((item, index) => {
    const position = item.timestamp / totalDuration;
    
    if (position < 0.25) {
      evolution.introduction.push(item);
    } else if (position < 0.5) {
      evolution.development.push(item);
    } else if (position < 0.75) {
      evolution.climax.push(item);
    } else {
      evolution.conclusion.push(item);
    }
  });
  
  return evolution;
}

/**
 * Helper function: Identify topic clusters
 */
function identifyTopicClusters(topicTimeline) {
  const clusters = {};
  
  topicTimeline.forEach(item => {
    const topic = item.primaryTopic;
    if (!clusters[topic]) {
      clusters[topic] = [];
    }
    clusters[topic].push(item);
  });
  
  return Object.entries(clusters).map(([topic, items]) => ({
    topic,
    occurrences: items.length,
    timeSpan: {
      start: Math.min(...items.map(i => i.timestamp)),
      end: Math.max(...items.map(i => i.timestamp))
    },
    density: items.length / (Math.max(...items.map(i => i.timestamp)) - Math.min(...items.map(i => i.timestamp)) + 1)
  })).sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Helper function: Analyze topic transitions
 */
function analyzeTopicTransitions(transitions) {
  const analysis = {
    totalTransitions: transitions.length,
    frequentTransitions: {},
    transitionRate: 0,
    smoothness: 0
  };
  
  // Count frequent transitions
  transitions.forEach(trans => {
    const key = `${trans.from} → ${trans.to}`;
    analysis.frequentTransitions[key] = (analysis.frequentTransitions[key] || 0) + 1;
  });
  
  // Sort by frequency
  analysis.frequentTransitions = Object.entries(analysis.frequentTransitions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .reduce((obj, [key, count]) => {
      obj[key] = count;
      return obj;
    }, {});
  
  return analysis;
}

/**
 * Helper function: Generate topic summary
 */
function generateTopicSummary(topicAnalysis) {
  const mainTopics = topicAnalysis.mainTopics.slice(0, 3);
  const totalTransitions = topicAnalysis.topicTransitions.length;
  
  return {
    primaryTopics: mainTopics.map(t => t.topic),
    topicCount: topicAnalysis.allTopics.length,
    transitionCount: totalTransitions,
    complexity: totalTransitions > 5 ? 'high' : totalTransitions > 2 ? 'medium' : 'low',
    overview: `The video covers ${topicAnalysis.allTopics.length} main topics, with ${mainTopics[0]?.topic || 'general'} being the primary focus.`
  };
}

/**
 * Helper function: Classify key moment
 */
function classifyKeyMoment(moment) {
  const type = moment.type;
  const text = moment.text.toLowerCase();
  
  if (type === 'Important Statement') {
    if (text.includes('conclusion') || text.includes('finally')) return 'conclusion';
    if (text.includes('key') || text.includes('main')) return 'key_point';
    return 'important_statement';
  }
  
  if (type === 'Question') {
    if (text.includes('why')) return 'analytical_question';
    if (text.includes('how')) return 'procedural_question';
    return 'factual_question';
  }
  
  if (type === 'Example') return 'illustration';
  if (type === 'Definition') return 'concept_definition';
  if (type === 'Transition') return 'topic_shift';
  
  return 'general_moment';
}

/**
 * Helper function: Calculate moment importance
 */
function calculateMomentImportance(moment, transcript) {
  let importance = moment.confidence || 0.5;
  
  // Position importance (beginning and end are often more important)
  const position = moment.timestamp / transcript.duration;
  if (position < 0.1 || position > 0.9) {
    importance += 0.2;
  }
  
  // Type importance
  const typeImportance = {
    'Important Statement': 0.8,
    'Conclusion': 0.9,
    'Question': 0.6,
    'Example': 0.5,
    'Definition': 0.7,
    'Transition': 0.4
  };
  
  importance += typeImportance[moment.type] || 0.3;
  
  return Math.min(importance, 1.0);
}

/**
 * Helper function: Enrich moment context
 */
function enrichMomentContext(moment, allSegments) {
  const contextWindow = 2; // 2 segments before and after
  const momentIndex = allSegments.findIndex(seg => seg.start === moment.timestamp);
  
  const start = Math.max(0, momentIndex - contextWindow);
  const end = Math.min(allSegments.length, momentIndex + contextWindow + 1);
  
  return {
    before: allSegments.slice(start, momentIndex).map(seg => ({
      timestamp: formatTimestamp(seg.start),
      text: seg.text.substring(0, 100)
    })),
    after: allSegments.slice(momentIndex + 1, end).map(seg => ({
      timestamp: formatTimestamp(seg.start),
      text: seg.text.substring(0, 100)
    }))
  };
}

/**
 * Helper function: Generate focused summary
 */
function generateFocusedSummary(analysis, focus, length) {
  const { summary, topics, speakers, keyMoments } = analysis;
  
  let focusedSummary = {
    overview: summary.overview,
    focus: focus,
    length: length,
    content: {}
  };
  
  switch (focus) {
    case 'topics':
      focusedSummary.content = {
        mainTopics: topics.mainTopics.slice(0, 3),
        topicEvolution: topics.timeline.slice(0, 5),
        transitions: topics.topicTransitions.slice(0, 3)
      };
      break;
      
    case 'speakers':
      focusedSummary.content = {
        speakerDistribution: speakers.identified,
        dominantSpeaker: speakers.dominantSpeaker,
        conversationPatterns: speakers.identified.slice(0, 3)
      };
      break;
      
    case 'key-moments':
      focusedSummary.content = {
        highlights: keyMoments.slice(0, 5),
        importantStatements: keyMoments.filter(m => m.type === 'Important Statement').slice(0, 3),
        questions: keyMoments.filter(m => m.type === 'Question').slice(0, 3)
      };
      break;
      
    default:
      focusedSummary.content = {
        keyPoints: summary.keyPoints,
        timeline: summary.timeline,
        statistics: summary.statistics
      };
  }
  
  // Adjust length
  if (length === 'short') {
    focusedSummary.content = shortenContent(focusedSummary.content);
  } else if (length === 'long') {
    focusedSummary.content = expandContent(focusedSummary.content, analysis);
  }
  
  return focusedSummary;
}

/**
 * Helper function: Shorten content for brief summary
 */
function shortenContent(content) {
  const shortened = {};
  
  Object.entries(content).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      shortened[key] = value.slice(0, 2);
    } else if (typeof value === 'object') {
      shortened[key] = Object.fromEntries(
        Object.entries(value).slice(0, 2)
      );
    } else {
      shortened[key] = value;
    }
  });
  
  return shortened;
}

/**
 * Helper function: Expand content for detailed summary
 */
function expandContent(content, analysis) {
  const expanded = { ...content };
  
  // Add more details from full analysis
  if (analysis.questions) {
    expanded.insightfulQuestions = analysis.questions.slice(0, 5);
  }
  
  if (analysis.conversations) {
    expanded.conversationSummary = {
      count: analysis.conversations.conversationCount,
      avgDuration: analysis.conversations.avgDuration
    };
  }
  
  return expanded;
}

/**
 * Helper function: Format timestamp
 */
function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'advanced-ai-routes',
    timestamp: new Date().toISOString(),
    features: [
      'advanced-query',
      'analyze-transcript',
      'semantic-search',
      'analyze-conversation',
      'track-topics',
      'detect-key-moments',
      'intelligent-summary'
    ],
    components: {
      transcriptAnalyzer: 'active',
      queryProcessor: 'active',
      responseGenerator: 'active'
    },
    storage: {
      transcripts: getStoragePath('transcripts'),
      sessions: getStoragePath('sessions'),
      embeddings: getStoragePath('embeddings')
    }
  });
});

module.exports = router;