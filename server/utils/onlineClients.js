import { Groq } from 'groq-sdk';
import axios from 'axios';

// Groq Client
class GroqClient {
  constructor(apiKey) {
    this.groq = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
  }

  async chat(messages, model = 'mixtral-8x7b-32768', options = {}) {
    try {
      const response = await this.groq.chat.completions.create({
        model,
        messages,
        max_tokens: 1024,
        ...options,
      });

      return {
        success: true,
        provider: 'groq',
        model,
        content: response.choices[0].message.content,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Groq error:', error.message);
      return {
        success: false,
        provider: 'groq',
        error: error.message,
      };
    }
  }
}

// Claude Client
class ClaudeClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1';
  }

  async chat(messages, model = 'claude-3-5-sonnet-20241022', options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Claude API key not provided');
      }

      const response = await axios.post(`${this.baseURL}/messages`, {
        model,
        max_tokens: 1024,
        messages,
        ...options,
      }, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      });

      return {
        success: true,
        provider: 'claude',
        model,
        content: response.data.content[0].text,
        usage: response.data.usage,
      };
    } catch (error) {
      console.error('Claude error:', error.message);
      return {
        success: false,
        provider: 'claude',
        error: error.message,
      };
    }
  }
}

// Gemini Client
class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async chat(messages, model = 'gemini-pro', options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not provided');
      }

      // Convert message format for Gemini
      const contents = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const response = await axios.post(
        `${this.baseURL}/${model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            maxOutputTokens: 1024,
            ...options,
          },
        }
      );

      const text = response.data.candidates[0].content.parts[0].text;

      return {
        success: true,
        provider: 'gemini',
        model,
        content: text,
      };
    } catch (error) {
      console.error('Gemini error:', error.message);
      return {
        success: false,
        provider: 'gemini',
        error: error.message,
      };
    }
  }
}

// Factory function
export function createOnlineClient(provider, apiKey) {
  switch (provider.toLowerCase()) {
    case 'groq':
      return new GroqClient(apiKey);
    case 'claude':
      return new ClaudeClient(apiKey);
    case 'gemini':
      return new GeminiClient(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export default {
  GroqClient,
  ClaudeClient,
  GeminiClient,
  createOnlineClient,
};
