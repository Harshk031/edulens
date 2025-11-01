module.exports = {
  chunk: {
    tokens: 800,
    seconds: 30,
    overlapSeconds: 12,
    maxChars: 3000
  },
  topK: 8,
  provider: 'auto', // 'ollama' | 'groq' | 'auto'
};
