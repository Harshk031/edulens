const path = require('path');
const fs = require('fs');
const providerManager = require('../providers/providerManager.cjs');

/**
 * Complete AI Assistant with full transcript processing
 * Provides comprehensive AI features: query, summary, quiz, flashcards, notes, mindmap
 */
class CompleteAIAssistant {
  constructor() {
    this.initialized = true;
    this.transcriptCache = new Map();
  }
  
  /**
   * Initialize assistant with video transcript
   */
  async initialize(videoId, options = {}) {
    console.log(`[CompleteAI] Initializing for video: ${videoId}`);
    
    // Load transcript if not cached
    if (!this.transcriptCache.has(videoId)) {
      const transcript = this.loadTranscript(videoId);
      if (transcript) {
        this.transcriptCache.set(videoId, transcript);
        console.log(`[CompleteAI] Transcript cached: ${transcript.segments?.length || 0} segments`);
      }
    }
    
    return true;
  }
  
  /**
   * Load transcript from storage
   */
  loadTranscript(videoId) {
    try {
      const transcriptPath = path.join(process.cwd(), 'data', 'storage', 'transcripts', `${videoId}.json`);
      
      if (!fs.existsSync(transcriptPath)) {
        console.error(`[CompleteAI] Transcript not found: ${transcriptPath}`);
        return null;
      }
      
      const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
      
      if (!transcript.segments || transcript.segments.length === 0) {
        console.error(`[CompleteAI] Transcript has no segments`);
        return null;
      }
      
      console.log(`[CompleteAI] Loaded transcript: ${transcript.segments.length} segments`);
      return transcript;
    } catch (error) {
      console.error(`[CompleteAI] Error loading transcript:`, error);
      return null;
    }
  }
  
  /**
   * Get full transcript text
   */
  getFullTranscriptText(transcript) {
    if (!transcript || !transcript.segments) return '';
    return transcript.segments.map(seg => seg.text).join(' ');
  }
  
  /**
   * Format timestamp helper
   */
  formatTimestamp(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }
  
  /**
   * Process advanced query with full transcript context
   */
  async processAdvancedQuery(videoId, query, options = {}) {
    console.log(`[CompleteAI] Processing query: "${query}" for video: ${videoId}`);
    
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const fullText = this.getFullTranscriptText(transcript);
    
    const prompt = `You are an expert educational AI assistant analyzing a video transcript.

VIDEO TRANSCRIPT (COMPLETE):
${fullText}

USER QUERY: ${query}

Provide a comprehensive, detailed answer based on the ENTIRE transcript above. Include specific examples, timestamps if relevant, and thorough explanations. Make sure your response demonstrates deep understanding of the full video content.`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: 2000,
        temperature: 0.3,
        provider: options.provider || 'lmstudio'
      });
      
      return {
        response: response.text,
        sources: this.extractRelevantSegments(transcript, query, 5),
        confidence: 0.9,
        synthesis: 'comprehensive',
        followUp: this.generateFollowUpQuestions(query),
        metadata: {
          transcriptLength: fullText.length,
          segmentCount: transcript.segments.length,
          provider: response.provider
        }
      };
    } catch (error) {
      console.error(`[CompleteAI] Query error:`, error);
      throw error;
    }
  }
  
  /**
   * Generate intelligent summary
   */
  async generateIntelligentSummary(videoId, type = 'general', length = 'medium', options = {}) {
    console.log(`[CompleteAI] Generating ${type} summary (${length}) for video: ${videoId}`);
    
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const fullText = this.getFullTranscriptText(transcript);
    
    const lengthInstructions = {
      short: 'Provide a concise 2-3 sentence summary.',
      medium: 'Provide a comprehensive paragraph summary (5-8 sentences).',
      long: 'Provide a detailed multi-paragraph summary covering all major points.'
    };
    
    const prompt = `You are an expert at creating educational summaries.

FULL VIDEO TRANSCRIPT:
${fullText}

Create a ${type} summary of this video. ${lengthInstructions[length] || lengthInstructions.medium}

Include:
- Main topics and key concepts
- Important details and examples
- Overall structure and flow
- Key takeaways

Make the summary comprehensive and informative so someone who hasn't watched the video can understand the full content.`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: length === 'long' ? 3000 : length === 'medium' ? 1500 : 800,
        temperature: 0.3,
        provider: options.provider || 'lmstudio'
      });
      
      return {
        summary: response.text,
        sources: this.extractKeySegments(transcript, 10),
        confidence: 0.95,
        focus: type,
        length: length,
        metadata: {
          transcriptLength: fullText.length,
          segmentCount: transcript.segments.length,
          provider: response.provider
        }
      };
    } catch (error) {
      console.error(`[CompleteAI] Summary error:`, error);
      throw error;
    }
  }
  
  /**
   * Generate quiz questions
   */
  async generateQuiz(videoId, difficulty = 'medium', questionCount = 5, options = {}) {
    console.log(`[CompleteAI] Generating quiz (${difficulty}, ${questionCount} questions) for video: ${videoId}`);
    
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const fullText = this.getFullTranscriptText(transcript);
    
    const prompt = `You are an expert educational quiz creator.

FULL VIDEO TRANSCRIPT:
${fullText}

Create ${questionCount} ${difficulty} difficulty quiz questions based on the ENTIRE video content above.

For each question:
1. Write a clear, specific question
2. Provide 4 multiple choice options (A, B, C, D)
3. Mark the correct answer
4. Include a brief explanation referencing the video content

Format each question like this:
Question 1: [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [Letter]
Explanation: [Why this is correct, with reference to video content]

Make questions that test true understanding of the video content, not just memorization.`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: 2500,
        temperature: 0.4,
        provider: options.provider || 'lmstudio'
      });
      
      return {
        quiz: response.text,
        sources: this.extractKeySegments(transcript, 8),
        confidence: 0.9,
        difficulty: difficulty,
        questionCount: questionCount,
        metadata: {
          transcriptLength: fullText.length,
          segmentCount: transcript.segments.length,
          provider: response.provider
        }
      };
    } catch (error) {
      console.error(`[CompleteAI] Quiz error:`, error);
      throw error;
    }
  }
  
  /**
   * Generate flashcards
   */
  async generateFlashcards(videoId, cardCount = 10, options = {}) {
    console.log(`[CompleteAI] Generating ${cardCount} flashcards for video: ${videoId}`);
    
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const fullText = this.getFullTranscriptText(transcript);
    
    const prompt = `You are an expert at creating educational flashcards.

FULL VIDEO TRANSCRIPT:
${fullText}

Create ${cardCount} flashcards covering the key concepts from this video.

For each flashcard:
- Front: A clear question or concept prompt
- Back: A comprehensive answer with details from the video
- Include timestamp references when relevant

Format each card like this:
Card 1:
Front: [Question or concept]
Back: [Detailed answer with video context]
Timestamp: [Relevant time if applicable]

Cover diverse topics from throughout the entire video to ensure comprehensive learning.`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: 2500,
        temperature: 0.3,
        provider: options.provider || 'lmstudio'
      });
      
      return {
        flashcards: response.text,
        sources: this.extractKeySegments(transcript, cardCount),
        confidence: 0.9,
        cardCount: cardCount,
        metadata: {
          transcriptLength: fullText.length,
          segmentCount: transcript.segments.length,
          provider: response.provider
        }
      };
    } catch (error) {
      console.error(`[CompleteAI] Flashcards error:`, error);
      throw error;
    }
  }
  
  /**
   * Generate comprehensive notes
   */
  async generateNotes(videoId, format = 'structured', options = {}) {
    console.log(`[CompleteAI] Generating ${format} notes for video: ${videoId}`);
    
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const fullText = this.getFullTranscriptText(transcript);
    
    const prompt = `You are an expert note-taker creating comprehensive study notes.

FULL VIDEO TRANSCRIPT:
${fullText}

Create detailed, well-organized notes from this video in ${format} format.

Include:
- Overview/Introduction
- Main topics with detailed explanations
- Key concepts and definitions
- Important examples and details
- Timeline of major points with timestamps
- Summary/Conclusion
- Key takeaways

Make the notes comprehensive enough that someone could learn the material without watching the video.`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: 3000,
        temperature: 0.3,
        provider: options.provider || 'lmstudio'
      });
      
      return {
        notes: response.text,
        sources: this.extractKeySegments(transcript, 15),
        confidence: 0.95,
        format: format,
        metadata: {
          transcriptLength: fullText.length,
          segmentCount: transcript.segments.length,
          provider: response.provider
        }
      };
    } catch (error) {
      console.error(`[CompleteAI] Notes error:`, error);
      throw error;
    }
  }
  
  /**
   * Generate mindmap
   */
  async generateMindmap(videoId, style = 'hierarchical', options = {}) {
    console.log(`[CompleteAI] Generating ${style} mindmap for video: ${videoId}`);
    
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const fullText = this.getFullTranscriptText(transcript);
    
    const prompt = `You are an expert at creating visual mindmaps for learning.

FULL VIDEO TRANSCRIPT:
${fullText}

Create a ${style} mindmap representing the structure and content of this video.

Use this format:
📹 [Main Topic]
├── 🎯 [Major Theme 1]
│   ├── [Sub-topic 1.1]
│   │   └── [Detail]
│   └── [Sub-topic 1.2]
├── 🎯 [Major Theme 2]
│   ├── [Sub-topic 2.1]
│   └── [Sub-topic 2.2]
└── 🎯 [Major Theme 3]
    └── [Sub-topics...]

Include:
- Clear hierarchical structure
- All major topics from the video
- Important sub-topics and details
- Relationships between concepts
- 3-4 levels of depth

Make it comprehensive so it captures the full scope of the video content.`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: 2000,
        temperature: 0.3,
        provider: options.provider || 'lmstudio'
      });
      
      return {
        mindmap: response.text,
        sources: this.extractKeySegments(transcript, 12),
        confidence: 0.9,
        style: style,
        metadata: {
          transcriptLength: fullText.length,
          segmentCount: transcript.segments.length,
          provider: response.provider
        }
      };
    } catch (error) {
      console.error(`[CompleteAI] Mindmap error:`, error);
      throw error;
    }
  }
  
  /**
   * Extract relevant segments based on query
   */
  extractRelevantSegments(transcript, query, count = 5) {
    if (!transcript.segments) return [];
    
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // Score segments by relevance
    const scoredSegments = transcript.segments.map(seg => {
      const text = seg.text.toLowerCase();
      const score = queryWords.reduce((acc, word) => {
        return acc + (text.includes(word) ? 1 : 0);
      }, 0);
      
      return { ...seg, score };
    });
    
    // Sort by score and return top segments
    return scoredSegments
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map(seg => ({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        timestamp: this.formatTimestamp(seg.start)
      }));
  }
  
  /**
   * Extract key segments evenly distributed
   */
  extractKeySegments(transcript, count = 10) {
    if (!transcript.segments || transcript.segments.length === 0) return [];
    
    const segments = transcript.segments;
    const step = Math.max(1, Math.floor(segments.length / count));
    
    const keySegments = [];
    for (let i = 0; i < segments.length && keySegments.length < count; i += step) {
      const seg = segments[i];
      keySegments.push({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        timestamp: this.formatTimestamp(seg.start)
      });
    }
    
    return keySegments;
  }
  
  /**
   * Generate follow-up questions
   */
  generateFollowUpQuestions(query) {
    return [
      `Can you provide more details about this topic?`,
      `What are the key takeaways related to this?`,
      `How does this connect to other parts of the video?`
    ];
  }
  
  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      status: 'ok',
      initialized: this.initialized,
      features: [
        'query',
        'summary',
        'quiz',
        'flashcards',
        'notes',
        'mindmap'
      ],
      cachedTranscripts: this.transcriptCache.size,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Semantic search (placeholder for future implementation)
   */
  async semanticSearch(videoId, query, options = {}) {
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const results = this.extractRelevantSegments(transcript, query, options.topK || 10);
    
    return {
      results: results,
      totalFound: results.length,
      query: query,
      processingTime: 0
    };
  }
  
  /**
   * Analyze conversation (placeholder)
   */
  async analyzeConversation(videoId, options = {}) {
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    return {
      analysis: {
        segmentCount: transcript.segments?.length || 0,
        duration: transcript.duration || 0,
        topics: ['Analysis not yet implemented']
      },
      processingTime: 0
    };
  }
  
  /**
   * Track topics (placeholder)
   */
  async trackTopics(videoId, options = {}) {
    return {
      tracking: {
        topics: ['Topic tracking not yet implemented']
      },
      processingTime: 0
    };
  }
  
  /**
   * Detect key moments (placeholder)
   */
  async detectKeyMoments(videoId, options = {}) {
    const transcript = this.transcriptCache.get(videoId) || this.loadTranscript(videoId);
    if (!transcript) {
      throw new Error('Transcript not available');
    }
    
    const keyMoments = this.extractKeySegments(transcript, options.maxMoments || 20);
    
    return {
      keyMoments: keyMoments,
      totalMoments: keyMoments.length,
      processingTime: 0
    };
  }
}

module.exports = CompleteAIAssistant;