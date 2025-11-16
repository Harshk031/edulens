/**
 * Frontend RAG (Retrieval-Augmented Generation) Service
 * Provides client-side interface for RAG operations
 */

import { apiFetch } from '../utils/api';

/**
 * RAG Service Class for Frontend
 */
export class RAG {
  constructor() {
    this.isInitialized = false;
    this.apiBase = '';
  }

  /**
   * Initialize RAG service
   * @param {object} config - Configuration options
   */
  async initialize(config = {}) {
    try {
      console.log('[RAG] Initializing frontend RAG service...');
      
      this.apiBase = config.apiBase || '';
      this.isInitialized = true;
      
      console.log('[RAG] Frontend RAG service initialized successfully');
      return { success: true, message: 'RAG service initialized' };
    } catch (error) {
      console.error('[RAG] Initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load video for RAG processing
   * @param {string} videoId - Video ID
   * @returns {Promise<object>} - Load result
   */
  async loadForVideo(videoId) {
    try {
      console.log(`[RAG] Loading RAG for video: ${videoId}`);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      const response = await apiFetch(`/api/rag/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        throw new Error(`RAG load failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[RAG] Successfully loaded for video: ${videoId}`);
      
      return {
        success: true,
        videoId: videoId,
        embeddings: result.embeddings || [],
        chunks: result.chunks || [],
        metadata: result.metadata || {}
      };

    } catch (error) {
      console.error(`[RAG] Error loading for video ${videoId}:`, error);
      
      // Return fallback response
      return {
        success: false,
        error: error.message,
        videoId: videoId,
        fallback: true,
        embeddings: [],
        chunks: [],
        metadata: {}
      };
    }
  }

  /**
   * Query RAG system
   * @param {string} videoId - Video ID
   * @param {string} query - Query text
   * @param {object} options - Query options
   * @returns {Promise<object>} - Query result
   */
  async query(videoId, query, options = {}) {
    try {
      console.log(`[RAG] Querying for video ${videoId}: "${query}"`);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      const response = await apiFetch(`/api/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          query,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[RAG] Query completed for video: ${videoId}`);
      
      return {
        success: true,
        query: query,
        videoId: videoId,
        results: result.results || [],
        sources: result.sources || [],
        confidence: result.confidence || 0,
        processingTime: result.processingTime || 0
      };

    } catch (error) {
      console.error(`[RAG] Query error for video ${videoId}:`, error);
      
      // Return fallback response
      return {
        success: false,
        error: error.message,
        query: query,
        videoId: videoId,
        fallback: true,
        results: [`Based on the video content, here's a response to: "${query}"`],
        sources: [],
        confidence: 0.5,
        processingTime: 0
      };
    }
  }

  /**
   * Get RAG status
   * @param {string} videoId - Video ID
   * @returns {Promise<object>} - Status result
   */
  async getStatus(videoId) {
    try {
      const response = await apiFetch(`/api/rag/status?videoId=${videoId}`);
      
      if (!response.ok) {
        throw new Error(`RAG status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        videoId: videoId,
        status: result.status || 'unknown',
        ready: result.ready || false,
        embeddings: result.embeddings || 0,
        chunks: result.chunks || 0
      };

    } catch (error) {
      console.error(`[RAG] Status error for video ${videoId}:`, error);
      
      return {
        success: false,
        error: error.message,
        videoId: videoId,
        status: 'error',
        ready: false,
        embeddings: 0,
        chunks: 0
      };
    }
  }

  /**
   * Clear RAG data for video
   * @param {string} videoId - Video ID
   * @returns {Promise<object>} - Clear result
   */
  async clear(videoId) {
    try {
      console.log(`[RAG] Clearing data for video: ${videoId}`);
      
      const response = await apiFetch(`/api/rag/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        throw new Error(`RAG clear failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[RAG] Successfully cleared data for video: ${videoId}`);
      
      return {
        success: true,
        videoId: videoId,
        message: result.message || 'RAG data cleared'
      };

    } catch (error) {
      console.error(`[RAG] Clear error for video ${videoId}:`, error);
      
      return {
        success: false,
        error: error.message,
        videoId: videoId
      };
    }
  }

  /**
   * Get similar content
   * @param {string} videoId - Video ID
   * @param {string} text - Text to find similar content for
   * @param {number} limit - Number of results to return
   * @returns {Promise<object>} - Similar content result
   */
  async getSimilar(videoId, text, limit = 5) {
    try {
      const response = await apiFetch(`/api/rag/similar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          text,
          limit
        })
      });

      if (!response.ok) {
        throw new Error(`RAG similar content failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        videoId: videoId,
        query: text,
        similar: result.similar || [],
        scores: result.scores || []
      };

    } catch (error) {
      console.error(`[RAG] Similar content error:`, error);
      
      return {
        success: false,
        error: error.message,
        videoId: videoId,
        query: text,
        similar: [],
        scores: []
      };
    }
  }
}

// Export singleton instance
export const ragService = new RAG();

// Default export
export default RAG;
