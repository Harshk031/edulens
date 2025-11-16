const axios = require('axios');
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BASE = 'https://api.groq.com/openai/v1';

// Enhanced API key validation
function validateApiKey() {
  if (!GROQ_API_KEY) {
    return { valid: false, error: 'GROQ_API_KEY environment variable not set' };
  }
  
  if (GROQ_API_KEY === 'your_groq_api_key_here' ||
      GROQ_API_KEY === 'your_api_key_here' ||
      GROQ_API_KEY.length < 20) {
    return { valid: false, error: 'Invalid GROQ_API_KEY - please set a valid API key' };
  }
  
  return { valid: true };
}

async function health() {
  const keyValidation = validateApiKey();
  if (!keyValidation.valid) {
    return {
      ok: false,
      error: keyValidation.error,
      status: 'auth_error',
      suggestion: 'Set GROQ_API_KEY environment variable with a valid Groq API key from https://console.groq.com/'
    };
  }
  
  try {
    console.log(`[groq] Checking API health with key ending in ...${GROQ_API_KEY.slice(-4)}`);
    const r = await axios.get(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      timeout: 5000
    });
    
    if (r.data?.data) {
      const models = r.data.data.map(m => m.id);
      console.log(`[groq] Health check passed - ${models.length} models available`);
      return {
        ok: true,
        status: 'ready',
        models: models,
        available: models.length > 0,
        keyPreview: `...${GROQ_API_KEY.slice(-4)}`
      };
    }
    
    return { ok: false, error: 'No models available', status: 'unavailable' };
  } catch (e) {
    const isAuthError = e.response?.status === 401;
    const isNetworkError = e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND';
    const isRateLimit = e.response?.status === 429;
    
    let errorMessage = e.message;
    if (isAuthError) {
      errorMessage = 'Authentication failed - invalid or expired API key';
    } else if (isRateLimit) {
      errorMessage = 'Rate limit exceeded - please try again later';
    } else if (isNetworkError) {
      errorMessage = 'Network connection failed - check internet connection';
    }
    
    return {
      ok: false,
      error: errorMessage,
      status: isAuthError ? 'auth_error' : isNetworkError ? 'network_error' : isRateLimit ? 'rate_limit' : 'error',
      details: {
        statusCode: e.response?.status,
        message: e.message
      }
    };
  }
}

async function generate({ prompt, maxTokens = 800, temperature = 0.3, model, outputLanguage = 'english' }) {
  const keyValidation = validateApiKey();
  if (!keyValidation.valid) {
    throw new Error(`Groq API key validation failed: ${keyValidation.error}`);
  }
  
  const useModel = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  console.log(`[groq] Generating with model: ${useModel}, output language: ${outputLanguage}`);
  
  try {
    // Add system message for language preference
    const systemMessage = outputLanguage === 'hindi' 
      ? 'You are a helpful AI assistant. IMPORTANT: Always respond in Hindi (हिंदी में), even if the input is in English. Provide detailed, accurate responses in Hindi.'
      : 'You are a helpful AI assistant. IMPORTANT: Always respond in English, even if the input is in Hindi or other languages.';
    
    const body = {
      model: useModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    };
    
    const r = await axios.post(`${BASE}/chat/completions`, body, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      timeout: 30000
    });
    
    const text = r.data?.choices?.[0]?.message?.content || '';
    const tokensIn = r.data?.usage?.prompt_tokens || 0;
    const tokensOut = r.data?.usage?.completion_tokens || 0;
    
    console.log(`[groq] Generated ${tokensOut} tokens (input: ${tokensIn})`);
    return text;
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = error.message;
    console.error('[groq] API error details:', {
      status,
      message,
      data: typeof data === 'object' ? data : error.response?.data
    });
    
    if (status === 401) {
      throw new Error('Groq authentication failed - check your API key');
    } else if (status === 429) {
      throw new Error('Groq rate limit exceeded - please try again later');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('Network connection to Groq failed - check internet connection');
    }
    const detail = data?.error?.message || message;
    throw new Error(`Groq API error (${status || 'unknown'}): ${detail}`);
  }
}

async function embed() {
  return null;
}

module.exports = { health, generate, embed };