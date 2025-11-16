// Quick progress checker
const fs = require('fs');
const path = require('path');

const videoId = 'a-wVHL0lpb0';
const jobsDir = path.join(process.cwd(), 'data', 'storage', 'sessions', 'jobs');

try {
  const jobFiles = fs.readdirSync(jobsDir)
    .filter(f => f.includes(videoId) && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (jobFiles.length > 0) {
    const jobData = JSON.parse(fs.readFileSync(path.join(jobsDir, jobFiles[0]), 'utf8'));
    
    console.log('\n📊 PROCESSING STATUS');
    console.log('═══════════════════════════════════════');
    console.log(`Video ID: ${jobData.videoId}`);
    console.log(`Status: ${jobData.status}`);
    console.log(`Progress: ${jobData.progress}%`);
    console.log(`Stage: ${jobData.stage}`);
    console.log(`Started: ${new Date(jobData.startedAt).toLocaleString()}`);
    console.log(`Updated: ${new Date(jobData.updatedAt).toLocaleString()}`);
    
    if (jobData.error) {
      console.log(`\n⚠️  Error: ${jobData.error}`);
    }
    
    console.log('\n📋 STAGES:');
    Object.entries(jobData.stages || {}).forEach(([name, stage]) => {
      const icon = stage.status === 'done' ? '✅' : stage.status === 'processing' ? '🔄' : '⏳';
      console.log(`  ${icon} ${name}: ${stage.status} (${stage.progress}%)`);
    });
    
    // Check transcript
    const transcriptPath = path.join(process.cwd(), 'data', 'storage', 'transcripts', `${videoId}.json`);
    const hasTranscript = fs.existsSync(transcriptPath);
    
    console.log(`\n📝 Transcript: ${hasTranscript ? '✅ Available' : '❌ Not yet available'}`);
    
    if (hasTranscript) {
      const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
      console.log(`   Segments: ${transcript.segments?.length || 0}`);
      console.log(`   Duration: ${Math.round(transcript.duration || 0)}s`);
    }
    
    console.log('\n');
  } else {
    console.log('❌ No processing job found for video:', videoId);
  }
} catch (error) {
  console.error('Error:', error.message);
}
