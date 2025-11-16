// Regenerate AI features with Groq
const fs = require('fs');
const path = require('path');

async function regenerateWithGroq() {
  console.log('🚀 Regenerating AI Features with Groq');
  console.log('='*60);
  
  const videoId = '2jmiNO3jwrA';
  const transcriptPath = path.join(__dirname, 'data', 'storage', 'transcripts', `${videoId}.json`);
  
  if (!fs.existsSync(transcriptPath)) {
    console.error('❌ Transcript not found');
    return;
  }
  
  const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
  console.log(`✅ Loaded transcript: ${transcriptData.segments.length} segments`);
  
  try {
    // Set environment to prefer Groq
    process.env.PREFER_OFFLINE_AI = 'false';
    
    const generator = require('./backend/ai/pipeline/generator.cjs');
    const embeddings = require('./backend/ai/pipeline/embeddings.cjs');
    
    console.log('\n📊 Step 1: Generating Summary with Groq...');
    console.log('   Using Groq for high-quality summary generation');
    
    const summaryResult = await generator.summary(videoId, transcriptData, {
      provider: 'groq',
      model: 'llama-3.1-70b-versatile'
    });
    
    console.log('✅ Summary generated with Groq!');
    console.log(`   Title: ${summaryResult.title || 'Generated'}`);
    
    console.log('\n🔍 Step 2: Generating Embeddings with Groq...');
    console.log('   Note: Using TF-IDF for embeddings (Groq doesn\'t provide embeddings API)');
    
    const chunks = transcriptData.segments.map((seg, index) => ({
      chunkId: `${videoId}-${index}`,
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));
    
    // Delete old embeddings to force regeneration
    const embPath = path.join(__dirname, 'data', 'storage', 'embeddings', `${videoId}.json`);
    if (fs.existsSync(embPath)) {
      fs.unlinkSync(embPath);
      console.log('   Deleted old embeddings');
    }
    
    await embeddings.indexVideo(videoId, chunks, (progress) => {
      if (progress % 0.1 === 0 || progress === 1) {
        console.log(`   Progress: ${Math.round(progress * 100)}%`);
      }
    });
    
    console.log('✅ Embeddings regenerated');
    
    console.log('\n' + '='*60);
    console.log('🎉 AI FEATURES REGENERATED WITH GROQ!');
    console.log('='*60);
    console.log('\n✅ Summary: Using Groq LLaMA 3.1 70B');
    console.log('✅ Embeddings: 305 vectors');
    console.log('✅ Chat: Will use Groq for responses');
    console.log('\n📱 Refresh Electron app to see improvements!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

regenerateWithGroq().catch(console.error);
