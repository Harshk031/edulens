const express = require('express');
const { createOnlineClient } = require('../utils/onlineClients.js');

const router = express.Router();

// Default provider
const DEFAULT_PROVIDER = 'groq';
// Never embed real keys in code. Use environment variables only.
const DEFAULT_GROQ_KEY = '';

// Helper to get provider and API key
function getProviderConfig(provider, apiKey) {
  const resolvedProvider = provider || process.env.ONLINE_AI_PROVIDER || DEFAULT_PROVIDER;
  let resolvedKey = apiKey;

  if (!resolvedKey) {
    switch (resolvedProvider.toLowerCase()) {
      case 'groq':
        resolvedKey = process.env.GROQ_API_KEY || '';
        break;
      case 'claude':
        resolvedKey = process.env.CLAUDE_API_KEY;
        break;
      case 'gemini':
        resolvedKey = process.env.GEMINI_API_KEY;
        break;
    }
  }

  return { provider: resolvedProvider, apiKey: resolvedKey };
}

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { messages, provider, apiKey, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array required',
      });
    }

    const { provider: resolvedProvider, apiKey: resolvedKey } = getProviderConfig(provider, apiKey);

    const client = createOnlineClient(resolvedProvider, resolvedKey);
    const result = await client.chat(
      messages,
      model,
      { temperature: 0.7 }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Summarization endpoint
router.post('/summarize', async (req, res) => {
  try {
    const { text, provider, apiKey, model, maxLength = 200 } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text required for summarization',
      });
    }

    const { provider: resolvedProvider, apiKey: resolvedKey } = getProviderConfig(provider, apiKey);

    const messages = [
      {
        role: 'user',
        content: `Please summarize the following text in ${maxLength} words or less:\n\n${text}`,
      },
    ];

    const client = createOnlineClient(resolvedProvider, resolvedKey);
    const result = await client.chat(messages, model, { temperature: 0.5 });

    if (result.success) {
      return res.json({
        success: true,
        provider: resolvedProvider,
        model,
        summary: result.content,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Quiz generation endpoint
router.post('/quiz', async (req, res) => {
  try {
    const { topic, provider, apiKey, model, numQuestions = 5 } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: 'Topic required for quiz generation',
      });
    }

    const { provider: resolvedProvider, apiKey: resolvedKey } = getProviderConfig(provider, apiKey);

    const prompt = `Generate ${numQuestions} multiple choice quiz questions about "${topic}". 
Format each question as: 
Q: [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]`;

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const client = createOnlineClient(resolvedProvider, resolvedKey);
    const result = await client.chat(messages, model, { temperature: 0.8 });

    if (result.success) {
      return res.json({
        success: true,
        provider: resolvedProvider,
        model,
        quiz: result.content,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Mind map generation endpoint
router.post('/mindmap', async (req, res) => {
  try {
    const { topic, provider, apiKey, model } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: 'Topic required for mind map generation',
      });
    }

    const { provider: resolvedProvider, apiKey: resolvedKey } = getProviderConfig(provider, apiKey);

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

    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const client = createOnlineClient(resolvedProvider, resolvedKey);
    const result = await client.chat(messages, model, { temperature: 0.7 });

    if (result.success) {
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        const mindmapJson = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.content };
        
        return res.json({
          success: true,
          provider: resolvedProvider,
          model,
          mindmap: mindmapJson,
        });
      } catch {
        return res.json({
          success: true,
          provider: resolvedProvider,
          model,
          mindmap: { raw: result.content },
        });
      }
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// List available providers
router.get('/providers', (req, res) => {
  res.json({
    providers: [
      {
        name: 'groq',
        models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
        status: process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY ? 'configured' : 'not configured',
      },
      {
        name: 'claude',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
        status: process.env.CLAUDE_API_KEY ? 'configured' : 'not configured',
      },
      {
        name: 'gemini',
        models: ['gemini-pro'],
        status: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
      },
    ],
  });
});

module.exports = router;
