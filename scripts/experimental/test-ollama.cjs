import axios from 'axios';

async function test() {
  try {
    console.log('Testing Ollama generation...');
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.2:3b',
      prompt: 'What is 2+2? Answer in one sentence.',
      options: { temperature: 0.3, num_predict: 50 },
      stream: false
    }, { timeout: 60000 });
    
    console.log('Response:', response.data);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
