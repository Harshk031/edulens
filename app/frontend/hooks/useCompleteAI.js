import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../utils/env.js';

/**
 * Complete AI Hook
 * Integrates all advanced AI features with comprehensive functionality
 * Provides seamless integration for Quiz, Summary, Mind Maps, AI Chat
 */
const useCompleteAI = (videoId, options = {}) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});
  const [history, setHistory] = useState([]);
  const [cache, setCache] = useState(new Map());
  
  // Use centralized API base URL
  const baseURL = options.baseURL || API_BASE_URL;
  const useAdvanced = options.useAdvanced !== false;
  
  // Ref for tracking current request
  const currentRequestRef = useRef(null);
  
  // Helper function to make API requests
  const makeRequest = useCallback(async (endpoint, data) => {
    try {
      const response = await fetch(`${baseURL}/api/complete-ai${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          useAdvanced,
          ...data
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error(`Complete AI Hook Error: ${endpoint}`, err);
      setError(err.message);
      throw err;
    }
  }, [baseURL, useAdvanced, videoId]);
  
  // Initialize AI assistant
  const initialize = useCallback(async () => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('initializing');
    setError(null);
    
    try {
      // Initialize with advanced features
      const response = await makeRequest('/initialize', {
        options: {
          includeSpeakers: true,
          includeTopics: true,
          includeConversations: true,
          includeKeyMoments: true,
          includeTimeline: true,
          ...options
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          initialization: response
        }));
      } else {
        throw new Error(response.error || 'Failed to initialize AI assistant');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest, options]);
  
  // Process advanced query
  const processQuery = useCallback(async (query, queryOptions = {}) => {
    if (!videoId || !query) {
      setError('Video ID and query are required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/query', {
        query,
        options: {
          includeContext: true,
          maxSources: queryOptions.maxSources || 5,
          semanticSearch: queryOptions.semanticSearch !== false,
          synthesisStrategy: queryOptions.synthesisStrategy || 'comprehensive',
          includeFollowUp: queryOptions.includeFollowUp !== false,
          ...queryOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          query: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'query',
            timestamp: new Date().toISOString(),
            query,
            response: response.response,
            sources: response.sources,
            confidence: response.confidence
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to process query');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Generate intelligent summary
  const generateSummary = useCallback(async (type = 'general', summaryOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/summary', {
        type,
        options: {
          focus: type,
          length: summaryOptions.length || 'medium',
          synthesisStrategy: summaryOptions.synthesisStrategy || 'educational',
          includeKeyPoints: summaryOptions.includeKeyPoints !== false,
          includeTopics: summaryOptions.includeTopics !== false,
          ...summaryOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          summary: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'summary',
            timestamp: new Date().toISOString(),
            type,
            response: response.summary,
            sources: response.sources,
            confidence: response.confidence,
            focus: response.focus,
            length: response.length
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to generate summary');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Generate intelligent quiz
  const generateQuiz = useCallback(async (quizOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/quiz', {
        difficulty: quizOptions.difficulty || 'medium',
        questionCount: quizOptions.questionCount || 5,
        options: {
          includeAnswers: quizOptions.includeAnswers !== false,
          includeExplanations: quizOptions.includeExplanations !== false,
          questionTypes: quizOptions.questionTypes || ['multiple-choice', 'short-answer'],
          ...quizOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          quiz: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'quiz',
            timestamp: new Date().toISOString(),
            response: response.quiz,
            sources: response.sources,
            confidence: response.confidence,
            difficulty: response.difficulty,
            questionCount: response.questionCount
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to generate quiz');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Generate intelligent flashcards
  const generateFlashcards = useCallback(async (flashcardOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/flashcards', {
        cardCount: flashcardOptions.cardCount || 10,
        options: {
          includeTimestamps: flashcardOptions.includeTimestamps !== false,
          includeContext: flashcardOptions.includeContext !== false,
          cardTypes: flashcardOptions.cardTypes || ['concept', 'definition', 'example'],
          ...flashcardOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          flashcards: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'flashcards',
            timestamp: new Date().toISOString(),
            response: response.flashcards,
            sources: response.sources,
            confidence: response.confidence,
            cardCount: response.cardCount
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to generate flashcards');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Generate comprehensive notes
  const generateNotes = useCallback(async (notesOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/notes', {
        format: notesOptions.format || 'structured',
        options: {
          includeTopics: notesOptions.includeTopics !== false,
          includeSpeakers: notesOptions.includeSpeakers !== false,
          includeTimeline: notesOptions.includeTimeline !== false,
          includeKeyMoments: notesOptions.includeKeyMoments !== false,
          ...notesOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          notes: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'notes',
            timestamp: new Date().toISOString(),
            response: response.notes,
            sources: response.sources,
            confidence: response.confidence,
            format: response.format
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to generate notes');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Generate hierarchical mindmap
  const generateMindmap = useCallback(async (mindmapOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/mindmap', {
        style: mindmapOptions.style || 'hierarchical',
        options: {
          includeRelationships: mindmapOptions.includeRelationships !== false,
          includeEvolution: mindmapOptions.includeEvolution !== false,
          includeClusters: mindmapOptions.includeClusters !== false,
          maxDepth: mindmapOptions.maxDepth || 3,
          ...mindmapOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          mindmap: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'mindmap',
            timestamp: new Date().toISOString(),
            response: response.mindmap,
            sources: response.sources,
            confidence: response.confidence,
            style: response.style
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to generate mindmap');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Perform semantic search
  const semanticSearch = useCallback(async (query, searchOptions = {}) => {
    if (!videoId || !query) {
      setError('Video ID and query are required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/semantic-search', {
        query,
        topK: searchOptions.topK || 10,
        threshold: searchOptions.threshold || 0.5,
        options: {
          includeContext: searchOptions.includeContext !== false,
          searchStrategy: searchOptions.searchStrategy || 'hybrid',
          ...searchOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          semanticSearch: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'semantic-search',
            timestamp: new Date().toISOString(),
            query,
            results: response.results,
            totalFound: response.totalFound,
            processingTime: response.processingTime
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to perform semantic search');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Analyze conversation
  const analyzeConversation = useCallback(async (conversationOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/analyze-conversation', {
        options: {
          includePatterns: conversationOptions.includePatterns !== false,
          includeStatistics: conversationOptions.includeStatistics !== false,
          includeTimeline: conversationOptions.includeTimeline !== false,
          ...conversationOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          conversationAnalysis: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'conversation-analysis',
            timestamp: new Date().toISOString(),
            response: response.analysis,
            processingTime: response.processingTime
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to analyze conversation');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Track topics
  const trackTopics = useCallback(async (topicOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/track-topics', {
        options: {
          includeEvolution: topicOptions.includeEvolution !== false,
          includeTransitions: topicOptions.includeTransitions !== false,
          includeClusters: topicOptions.includeClusters !== false,
          ...topicOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          topicTracking: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'topic-tracking',
            timestamp: new Date().toISOString(),
            response: response.tracking,
            processingTime: response.processingTime
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to track topics');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Detect key moments
  const detectKeyMoments = useCallback(async (momentOptions = {}) => {
    if (!videoId) {
      setError('Video ID is required');
      return;
    }
    
    setStatus('processing');
    setError(null);
    
    try {
      const response = await makeRequest('/detect-key-moments', {
        options: {
          includeTypes: momentOptions.includeTypes || ['question', 'conclusion', 'important-statement'],
          minImportance: momentOptions.minImportance || 0.7,
          maxMoments: momentOptions.maxMoments || 20,
          ...momentOptions
        }
      });
      
      if (response.success) {
        setStatus('ready');
        setResults(prev => ({
          ...prev,
          keyMoments: response
        }));
        
        // Add to history
        setHistory(prev => [
          ...prev,
          {
            type: 'key-moments-detection',
            timestamp: new Date().toISOString(),
            response: response.keyMoments,
            totalMoments: response.totalMoments,
            processingTime: response.processingTime
          }
        ]);
      } else {
        throw new Error(response.error || 'Failed to detect key moments');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }, [videoId, makeRequest]);
  
  // Get session history
  const getSessionHistory = useCallback(async () => {
    if (!videoId) {
      setError('Video ID is required');
      return [];
    }
    
    try {
      const response = await fetch(`${baseURL}/api/complete-ai/sessions/${videoId}`);
      const data = await response.json();
      
      if (data.success) {
        return data.sessions;
      } else {
        throw new Error(data.error || 'Failed to get session history');
      }
    } catch (err) {
      console.error('Complete AI Hook Error: getSessionHistory', err);
      setError(err.message);
      return [];
    }
  }, [baseURL, videoId]);
  
  // Delete session
  const deleteSession = useCallback(async (sessionType) => {
    if (!videoId || !sessionType) {
      setError('Video ID and session type are required');
      return;
    }
    
    try {
      const response = await fetch(`${baseURL}/api/complete-ai/sessions/${videoId}/${sessionType}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear from local cache
        setCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(`${videoId}-${sessionType}`);
          return newCache;
        });
        
        return true;
      } else {
        throw new Error(data.error || 'Failed to delete session');
      }
    } catch (err) {
      console.error('Complete AI Hook Error: deleteSession', err);
      setError(err.message);
      return false;
    }
  }, [baseURL, videoId]);
  
  // Clear cache
  const clearCache = useCallback(() => {
    setCache(new Map());
    setResults({});
    setHistory([]);
    setStatus('idle');
    setError(null);
  }, []);
  
  // Get health status
  const getHealthStatus = useCallback(async () => {
    try {
      const response = await fetch(`${baseURL}/api/complete-ai/health`);
      const data = await response.json();
      
      return data;
    } catch (err) {
      console.error('Complete AI Hook Error: getHealthStatus', err);
      setError(err.message);
      return { status: 'error', error: err.message };
    }
  }, [baseURL]);
  
  // Cancel current request
  const cancelRequest = useCallback(() => {
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
      currentRequestRef.current = null;
      setStatus('idle');
    }
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    if (videoId && options.autoInitialize !== false) {
      initialize();
    }
  }, [videoId, options.autoInitialize]);
  
  // Cleanup on unmount
  useEffect(() => {
    cancelRequest();
  }, []);
  
  return {
    // State
    status,
    error,
    results,
    history,
    cache,
    
    // Actions
    actions: {
      initialize,
      processQuery,
      generateSummary,
      generateQuiz,
      generateFlashcards,
      generateNotes,
      generateMindmap,
      semanticSearch,
      analyzeConversation,
      trackTopics,
      detectKeyMoments,
      getSessionHistory,
      deleteSession,
      clearCache,
      getHealthStatus,
      cancelRequest
    },
    
    // Utilities
    utils: {
      formatTimestamp: (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${String(secs).padStart(2, '0')}`;
      },
      getConfidenceColor: (confidence) => {
        if (confidence >= 0.8) return '#10b981'; // green
        if (confidence >= 0.6) return '#f59e0b'; // yellow
        if (confidence >= 0.4) return '#f97316'; // orange
        return '#ef4444'; // red
      },
      formatSource: (source, index) => {
        return {
          id: source.id || index + 1,
          timestamp: source.timestamp || '0:00',
          text: source.text || '',
          relevance: source.relevance || 0,
          confidence: source.confidence || 0,
          type: source.type || 'unknown',
          context: source.context || null
        };
      }
    }
  };
};

export default useCompleteAI;