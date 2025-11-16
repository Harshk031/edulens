import { useEffect, useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../utils/env.js';

// Use centralized environment detection
const API_BASE = API_BASE_URL;

async function apiFetch(path, options) {
  // Use relative URL - Vite dev server will proxy to backend
  console.log(`📡 Advanced AI API Call: ${path}`);
  const res = await fetch(path, options);
  
  // Log response for debugging
  console.log(`📤 Advanced AI Response: ${res.status} ${res.statusText}`);
  
  return res;
}

/**
 * Advanced AI Hook for Enhanced Video Transcript Analysis
 * Provides comprehensive AI capabilities including semantic search, conversation analysis, and intelligent responses
 */
export default function useAdvancedAI() {
  const [provider, setProvider] = useState('ollama');
  const [status, setStatus] = useState({ 
    advanced: 'unknown', 
    semantic: 'unknown',
    analysis: 'unknown'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoId, setVideoId] = useState('');
  const [analysisCache, setAnalysisCache] = useState(new Map());
  const [queryHistory, setQueryHistory] = useState([]);
  const processingRef = useRef(false);

  useEffect(() => {
    const h = (e) => { 
      const id = e?.detail?.videoId || window.__edulensCurrentVideoId; 
      if (id) setVideoId(id); 
    };
    window.addEventListener('video:loaded', h);
    h();
    return () => window.removeEventListener('video:loaded', h);
  }, []);

  const checkAdvancedStatus = useCallback(async () => {
    try {
      const h = await fetch(`/api/ai/advanced/health`).then(r=>r.ok ? r.json() : null);
      if (h && h.status === 'ok') {
        setStatus({
          advanced: 'ready',
          semantic: h.components?.embeddings ? 'ready' : 'unavailable',
          analysis: h.components?.transcriptAnalyzer ? 'ready' : 'unavailable'
        });
        return;
      }
      setStatus({ advanced: 'unknown', semantic: 'unknown', analysis: 'unknown' });
    } catch { 
      setStatus({ advanced: 'unknown', semantic: 'unknown', analysis: 'unknown' }); 
    }
  }, []);

  useEffect(() => {
    checkAdvancedStatus();
    // Monitor advanced AI health
    let lastOk = null;
    const monitor = async () => {
      let ok = false;
      try { 
        const r = await fetch(`/api/ai/advanced/health`); 
        ok = r.ok; 
      } catch { /* ignore */ }
      if (lastOk !== ok) {
        if (ok) console.log('✅ Advanced AI backend healthy');
        else console.warn('⚠️ Advanced AI backend temporarily unavailable');
        lastOk = ok;
      }
      setTimeout(monitor, ok ? 15000 : 8000);
    };
    monitor();
    return () => { lastOk = null; };
  }, [checkAdvancedStatus]);

  /**
   * Advanced query processing with contextual understanding
   */
  const processAdvancedQuery = useCallback(async (query, options = {}) => {
    if (processingRef.current) {
      console.warn('Query already processing, skipping...');
      return;
    }

    setLoading(true); 
    setError(null);
    processingRef.current = true;

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`🧠 Processing advanced query: "${query}" with options:`, options);
      
      const res = await apiFetch(`/api/ai/advanced/advanced-query`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, query, options })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Invalid JSON response from backend: ${parseErr.message}`);
      }
      
      if (!res.ok) {
        console.error('Advanced query error:', data);
        throw new Error(data.error||`Advanced query API error (${res.status}): ${res.statusText}`);
      }
      
      console.log('✅ Advanced query response received');
      
      // Update query history
      setQueryHistory(prev => [...prev.slice(-9), {
        query,
        response: data.result.response,
        timestamp: Date.now(),
        confidence: data.result.confidence,
        sources: data.result.sources.length
      }]);

      // Cache analysis if available
      if (data.result.metadata) {
        setAnalysisCache(prev => new Map(prev).set(videoId, data.result.metadata));
      }

      return {
        response: data.result.response,
        sources: data.result.sources,
        confidence: data.result.confidence,
        synthesis: data.result.synthesis,
        metadata: data.result.metadata,
        followUp: data.result.followUp
      };
      
    } catch(e) { 
      console.error('Advanced query error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
      processingRef.current = false;
    }
  }, [videoId]);

  /**
   * Comprehensive transcript analysis
   */
  const analyzeTranscript = useCallback(async (options = {}) => {
    setLoading(true); 
    setError(null);

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`🔍 Analyzing transcript for video: ${videoId}`);
      
      const res = await apiFetch(`/api/ai/advanced/analyze-transcript`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, options })
      });
      
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Transcript analysis failed');
      
      console.log('✅ Transcript analysis completed');
      
      // Cache the analysis
      setAnalysisCache(prev => new Map(prev).set(videoId, data.analysis));

      return {
        analysis: data.analysis,
        processingTime: data.processingTime,
        timestamp: data.timestamp
      };
      
    } catch(e) { 
      console.error('Transcript analysis error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
    }
  }, [videoId]);

  /**
   * Semantic search with embeddings
   */
  const semanticSearch = useCallback(async (query, options = {}) => {
    setLoading(true); 
    setError(null);

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`🔍 Performing semantic search: "${query}"`);
      
      const { topK = 10, threshold = 0.5 } = options;
      
      const res = await apiFetch(`/api/ai/advanced/semantic-search`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, query, topK, threshold })
      });
      
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Semantic search failed');
      
      console.log('✅ Semantic search completed');

      return {
        results: data.results,
        totalFound: data.totalFound,
        query: data.query,
        processingTime: data.processingTime
      };
      
    } catch(e) { 
      console.error('Semantic search error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
    }
  }, [videoId]);

  /**
   * Conversation analysis
   */
  const analyzeConversation = useCallback(async (options = {}) => {
    setLoading(true); 
    setError(null);

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`💬 Analyzing conversation for video: ${videoId}`);
      
      const res = await apiFetch(`/api/ai/advanced/analyze-conversation`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, options })
      });
      
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Conversation analysis failed');
      
      console.log('✅ Conversation analysis completed');

      return {
        analysis: data.analysis,
        processingTime: data.processingTime,
        timestamp: data.timestamp
      };
      
    } catch(e) { 
      console.error('Conversation analysis error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
    }
  }, [videoId]);

  /**
   * Topic tracking
   */
  const trackTopics = useCallback(async (options = {}) => {
    setLoading(true); 
    setError(null);

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`🏷️ Tracking topics for video: ${videoId}`);
      
      const res = await apiFetch(`/api/ai/advanced/track-topics`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, options })
      });
      
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Topic tracking failed');
      
      console.log('✅ Topic tracking completed');

      return {
        analysis: data.analysis,
        processingTime: data.processingTime,
        timestamp: data.timestamp
      };
      
    } catch(e) { 
      console.error('Topic tracking error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
    }
  }, [videoId]);

  /**
   * Key moments detection
   */
  const detectKeyMoments = useCallback(async (options = {}) => {
    setLoading(true); 
    setError(null);

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`⭐ Detecting key moments for video: ${videoId}`);
      
      const res = await apiFetch(`/api/ai/advanced/detect-key-moments`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, options })
      });
      
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Key moments detection failed');
      
      console.log('✅ Key moments detection completed');

      return {
        keyMoments: data.keyMoments,
        totalMoments: data.totalMoments,
        processingTime: data.processingTime,
        timestamp: data.timestamp
      };
      
    } catch(e) { 
      console.error('Key moments detection error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
    }
  }, [videoId]);

  /**
   * Intelligent summary generation
   */
  const generateIntelligentSummary = useCallback(async (focus = 'general', length = 'medium', options = {}) => {
    setLoading(true); 
    setError(null);

    try {
      if (!videoId) throw new Error('No video loaded');
      console.log(`📝 Generating intelligent summary: focus=${focus}, length=${length}`);
      
      const res = await apiFetch(`/api/ai/advanced/intelligent-summary`, {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ videoId, focus, length, options })
      });
      
      const data = await res.json(); 
      if(!res.ok) throw new Error(data.error||'Intelligent summary failed');
      
      console.log('✅ Intelligent summary generated');

      return {
        summary: data.summary,
        focus: data.focus,
        length: data.length,
        processingTime: data.processingTime,
        timestamp: data.timestamp
      };
      
    } catch(e) { 
      console.error('Intelligent summary error:', e);
      setError(e.message); 
      return null;
    } finally { 
      setLoading(false);
    }
  }, [videoId]);

  /**
   * Clear query history
   */
  const clearHistory = useCallback(() => {
    setQueryHistory([]);
    console.log('🗑️ Query history cleared');
  }, []);

  /**
   * Clear analysis cache
   */
  const clearCache = useCallback(() => {
    setAnalysisCache(new Map());
    console.log('🗑️ Analysis cache cleared');
  }, []);

  /**
   * Get cached analysis for current video
   */
  const getCachedAnalysis = useCallback(() => {
    return analysisCache.get(videoId) || null;
  }, [videoId, analysisCache]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }, []);

  /**
   * Calculate confidence color
   */
  const getConfidenceColor = useCallback((confidence) => {
    if (confidence >= 0.8) return '#10b981'; // green
    if (confidence >= 0.6) return '#f59e0b'; // yellow
    if (confidence >= 0.4) return '#f97316'; // orange
    return '#ef4444'; // red
  }, []);

  /**
   * Format source for display
   */
  const formatSource = useCallback((source, index) => {
    return {
      id: source.id || index + 1,
      timestamp: source.timestamp || '0:00',
      text: source.text || '',
      relevance: source.relevance || 0,
      confidence: source.confidence || 0,
      type: source.type || 'unknown',
      context: source.context || null
    };
  }, []);

  return {
    // State
    provider,
    setProvider,
    status,
    loading,
    error,
    videoId,
    queryHistory,
    analysisCache,
    
    // Advanced AI Actions
    actions: {
      processAdvancedQuery,
      analyzeTranscript,
      semanticSearch,
      analyzeConversation,
      trackTopics,
      detectKeyMoments,
      generateIntelligentSummary,
      checkAdvancedStatus,
      clearHistory,
      clearCache
    },
    
    // Utility functions
    utils: {
      formatTimestamp,
      getConfidenceColor,
      formatSource,
      getCachedAnalysis
    }
  };
}