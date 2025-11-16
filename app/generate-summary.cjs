// Generate Summary with Groq
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function generateSummary() {
  console.log('📊 GENERATING SUMMARY WITH GROQ');
  console.log('='*50);
  
  const videoId = '2jmiNO3jwrA';
  const transcriptPath = path.join(__dirname, 'data', 'storage', 'transcripts', `${videoId}.json`);
  
  if (!fs.existsSync(transcriptPath)) {
    console.error('❌ Transcript not found');
    return;
  }
  
  const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
  console.log(`✅ Loaded transcript: ${transcript.segments.length} segments`);
  
  // Get full text
  const fullText = transcript.segments.map(s => s.text).join(' ');
  console.log(`📝 Full text: ${fullText.length} characters`);
  
  try {
    const groq = require('./backend/ai/providers/groqProvider.cjs');
    
    console.log('\n🤖 Generating summary with Groq...');
    const summaryPrompt = `Please provide a comprehensive summary of this educational video transcript:

"${fullText}"

Please provide:
1. A clear, engaging title
2. A detailed summary (3-4 paragraphs)
3. Key learning points (bullet points)
4. Main topics covered

Format as a well-structured educational summary.`;

    const summaryResponse = await groq.generate({
      prompt: summaryPrompt,
      maxTokens: 800,
      model: 'llama-3.3-70b-versatile'
    });
    
    console.log('✅ Summary generated!');
    console.log(`📄 Length: ${summaryResponse.length} characters`);
    
    // Create summary object
    const summaryData = {
      videoId: videoId,
      title: "AI and Coding: Future Workforce Preparation",
      summary: summaryResponse,
      generatedAt: new Date().toISOString(),
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      segments: transcript.segments.length,
      duration: transcript.segments[transcript.segments.length - 1]?.end || 0
    };
    
    // Save summary
    const summariesDir = path.join(__dirname, 'data', 'storage', 'summaries');
    if (!fs.existsSync(summariesDir)) {
      fs.mkdirSync(summariesDir, { recursive: true });
    }
    
    const summaryPath = path.join(summariesDir, `${videoId}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    
    console.log(`\n✅ Summary saved to: ${summaryPath}`);
    console.log('\n📄 Summary Preview:');
    console.log(summaryResponse.substring(0, 300) + '...');
    
    console.log('\n' + '='*50);
    console.log('🎉 SUMMARY GENERATION COMPLETE!');
    console.log('='*50);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateSummary().catch(console.error);
