// Manual AI Pipeline Trigger Script
const fs = require('fs');
const path = require('path');

async function triggerAI() {
  console.log('🚀 Manual AI Pipeline Trigger');
  
  const videoId = '2jmiNO3jwrA';
  const transcriptPath = path.join(__dirname, 'data', 'storage', 'transcripts', `${videoId}.json`);
  
  if (!fs.existsSync(transcriptPath)) {
    console.error('❌ Transcript not found:', transcriptPath);
    return;
  }
  
  const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
  console.log(`✅ Loaded transcript: ${transcriptData.segments.length} segments`);
  
  try {
    // Import AI modules
    const embeddings = require('./backend/ai/pipeline/embeddings.cjs');
    const generator = require('./backend/ai/pipeline/generator.cjs');
    
    console.log('\n📊 Step 1: Generating Summary...');
    const summaryResult = await generator.summary(videoId, transcriptData);
    console.log('✅ Summary generated');
    
    console.log('\n🔍 Step 2: Creating Embeddings...');
    const chunks = transcriptData.segments.map((seg, index) => ({
      chunkId: `${videoId}-${index}`,
      start: seg.start,
      end: seg.end,
      text: seg.text
    }));
    
    await embeddings.indexVideo(videoId, chunks, (progress) => {
      console.log(`  Progress: ${Math.round(progress * 100)}%`);
    });
    console.log('✅ Embeddings created');
    
    console.log('\n🎉 AI Pipeline Complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

triggerAI().catch(console.error);
