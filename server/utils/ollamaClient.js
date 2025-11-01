import axios from 'axios';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

class OllamaClient {
  constructor() {
    this.baseURL = OLLAMA_BASE_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60s timeout for long inference
    });
  }

  async checkHealth() {
    try {
      const response = await this.client.get('/api/tags');
      return {
        status: 'online',
        models: response.data.models || [],
      };
    } catch (error) {
      console.error('Ollama health check failed:', error.message);
      return {
        status: 'offline',
        error: error.message,
      };
    }
  }

  async generate(model, prompt, options = {}) {
    try {
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        stream: false,
        ...options,
      });
      
      return {
        success: true,
        model,
        response: response.data.response,
        context: response.data.context,
      };
    } catch (error) {
      console.error('Ollama generation failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async chat(model, messages, options = {}) {
    try {
      const response = await this.client.post('/api/chat', {
        model,
        messages,
        stream: false,
        ...options,
      });
      
      return {
        success: true,
        model,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Ollama chat failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async listModels() {
    try {
      const response = await this.client.get('/api/tags');
      return {
        success: true,
        models: response.data.models || [],
      };
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return {
        success: false,
        models: [],
        error: error.message,
      };
    }
  }
}

export default new OllamaClient();
