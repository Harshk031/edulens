import express from 'express';
import ollamaClient from '../utils/ollamaClient.js';

const router = express.Router();

// Health check for Ollama
router.get('/health', async (req, res) => {
  const health = await ollamaClient.checkHealth();
  res.json(health);
});

// List available models
router.get('/models', async (req, res) => {
  const result = await ollamaClient.listModels();
  res.json(result);
});

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'llama3.2:3b', systemPrompt = '' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array required',
      });
    }

    // Build full message history with system prompt
    const formattedMessages = [
      { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
      ...messages,
    ];

    const result = await ollamaClient.chat(model, formattedMessages, {
      temperature: 0.7,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Summarization endpoint
router.post('/summarize', async (req, res) => {
  try {
    const { text, model = 'llama3.2:3b', maxLength = 200 } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text required for summarization',
      });
    }

    const prompt = `Please summarize the following text in ${maxLength} words or less:\n\n${text}`;

    const result = await ollamaClient.generate(model, prompt, {
      temperature: 0.5,
    });

    if (result.success) {
      return res.json({
        success: true,
        model,
        summary: result.response.trim(),
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Quiz generation endpoint
router.post('/quiz', async (req, res) => {
  try {
    const { topic, numQuestions = 5, model = 'phi3:mini' } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: 'Topic required for quiz generation',
      });
    }

    const prompt = `Generate ${numQuestions} multiple choice quiz questions about "${topic}". 
Format each question as: 
Q: [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]`;

    const result = await ollamaClient.generate(model, prompt, {
      temperature: 0.8,
    });

    if (result.success) {
      return res.json({
        success: true,
        model,
        quiz: result.response.trim(),
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Mind map generation endpoint
router.post('/mindmap', async (req, res) => {
  try {
    const { topic, model = 'mistral:7b-instruct-q4_K_M' } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: 'Topic required for mind map generation',
      });
    }

    const prompt = `Create a detailed mind map structure for the topic: "${topic}"
Format as a hierarchical JSON with the following structure:
{
  "root": "Main Topic",
  "branches": [
    {
      "title": "Branch 1",
      "subbranches": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}`;

    const result = await ollamaClient.generate(model, prompt, {
      temperature: 0.7,
    });

    if (result.success) {
      try {
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        const mindmapJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.response };
        
        return res.json({
          success: true,
          model,
          mindmap: mindmapJson,
        });
      } catch {
        return res.json({
          success: true,
          model,
          mindmap: { raw: result.response.trim() },
        });
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
