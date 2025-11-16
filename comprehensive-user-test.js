/**
 * Comprehensive User Testing Script for EduLens
 * Tests every feature as a real user would experience it
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000';
const TEST_VIDEO_ID = 'jNQXAC9IVRw'; // Known working video

console.log('🎓 COMPREHENSIVE EDULENS USER TESTING');
console.log('=====================================\n');

/**
 * Test API endpoint
 */
async function testEndpoint(method, endpoint, data = null, description = '') {
  try {
    console.log(`🔍 Testing: ${description || `${method} ${endpoint}`}`);
    
    const config = {
      method: method.toLowerCase(),
      url: `${API_BASE}${endpoint}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    console.log(`✅ SUCCESS: ${response.status} - ${description}`);
    
    if (response.data && typeof response.data === 'object') {
      if (response.data.text) {
        console.log(`   📝 Response length: ${response.data.text.length} characters`);
      }
      if (response.data.error) {
        console.log(`   ⚠️  Error in response: ${response.data.error}`);
      }
    }
    
    return { success: true, data: response.data, status: response.status };
    
  } catch (error) {
    console.log(`❌ FAILED: ${description} - ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * Test all features systematically
 */
async function runComprehensiveTest() {
  const results = {
    launcher: { tested: false, working: false },
    backend: { tested: false, working: false },
    frontend: { tested: false, working: false },
    videoLoading: { tested: false, working: false },
    aiFeatures: {
      query: { tested: false, working: false, responseLength: 0 },
      summary: { tested: false, working: false, responseLength: 0 },
      notes: { tested: false, working: false, responseLength: 0 },
      quiz: { tested: false, working: false, responseLength: 0 },
      flashcards: { tested: false, working: false, responseLength: 0 },
      mindmap: { tested: false, working: false, responseLength: 0 }
    },
    codeExtraction: { tested: false, working: false },
    analytics: { tested: false, working: false },
    export: { tested: false, working: false }
  };
  
  console.log('🚀 STEP 1: Testing System Health');
  console.log('================================\n');
  
  // Test backend health
  const healthTest = await testEndpoint('GET', '/health', null, 'Backend Health Check');
  results.backend.tested = true;
  results.backend.working = healthTest.success;
  
  // Test AI status
  const aiStatusTest = await testEndpoint('GET', '/api/ai/status', null, 'AI System Status');
  
  console.log('\n🎬 STEP 2: Testing Video Loading');
  console.log('================================\n');
  
  // Test video status
  const videoStatusTest = await testEndpoint('GET', `/api/video/status?videoId=${TEST_VIDEO_ID}`, null, 'Video Status Check');
  results.videoLoading.tested = true;
  results.videoLoading.working = videoStatusTest.success;
  
  console.log('\n🤖 STEP 3: Testing AI Features');
  console.log('==============================\n');
  
  // Test AI Query
  const queryTest = await testEndpoint('POST', '/api/ai/query', {
    videoId: TEST_VIDEO_ID,
    query: 'What is this video about?',
    provider: 'lmstudio'
  }, 'AI Query Feature');
  
  results.aiFeatures.query.tested = true;
  results.aiFeatures.query.working = queryTest.success;
  if (queryTest.success && queryTest.data && queryTest.data.text) {
    results.aiFeatures.query.responseLength = queryTest.data.text.length;
  }
  
  // Test AI Summary
  const summaryTest = await testEndpoint('POST', '/api/ai/query', {
    videoId: TEST_VIDEO_ID,
    query: 'Provide a comprehensive summary of this video',
    provider: 'lmstudio'
  }, 'AI Summary Feature');
  
  results.aiFeatures.summary.tested = true;
  results.aiFeatures.summary.working = summaryTest.success;
  if (summaryTest.success && summaryTest.data && summaryTest.data.text) {
    results.aiFeatures.summary.responseLength = summaryTest.data.text.length;
  }
  
  // Test AI Notes
  const notesTest = await testEndpoint('POST', '/api/ai/notes', {
    videoId: TEST_VIDEO_ID,
    format: 'structured'
  }, 'AI Notes Feature');
  
  results.aiFeatures.notes.tested = true;
  results.aiFeatures.notes.working = notesTest.success;
  if (notesTest.success && notesTest.data && notesTest.data.text) {
    results.aiFeatures.notes.responseLength = notesTest.data.text.length;
  }
  
  // Test AI Quiz
  const quizTest = await testEndpoint('POST', '/api/ai/quiz', {
    videoId: TEST_VIDEO_ID,
    difficulty: 'medium',
    questionCount: 5
  }, 'AI Quiz Feature');
  
  results.aiFeatures.quiz.tested = true;
  results.aiFeatures.quiz.working = quizTest.success;
  if (quizTest.success && quizTest.data && quizTest.data.text) {
    results.aiFeatures.quiz.responseLength = quizTest.data.text.length;
  }
  
  // Test AI Flashcards
  const flashcardsTest = await testEndpoint('POST', '/api/ai/flashcards', {
    videoId: TEST_VIDEO_ID,
    cardCount: 10
  }, 'AI Flashcards Feature');
  
  results.aiFeatures.flashcards.tested = true;
  results.aiFeatures.flashcards.working = flashcardsTest.success;
  if (flashcardsTest.success && flashcardsTest.data && flashcardsTest.data.text) {
    results.aiFeatures.flashcards.responseLength = flashcardsTest.data.text.length;
  }
  
  // Test AI Mindmap
  const mindmapTest = await testEndpoint('POST', '/api/ai/mindmap', {
    videoId: TEST_VIDEO_ID,
    style: 'hierarchical'
  }, 'AI Mindmap Feature');
  
  results.aiFeatures.mindmap.tested = true;
  results.aiFeatures.mindmap.working = mindmapTest.success;
  if (mindmapTest.success && mindmapTest.data && mindmapTest.data.text) {
    results.aiFeatures.mindmap.responseLength = mindmapTest.data.text.length;
  }
  
  console.log('\n💻 STEP 4: Testing Code Extraction');
  console.log('==================================\n');
  
  // Test Code Extraction
  const codeTest = await testEndpoint('POST', '/api/ai/extract-code', {
    videoId: TEST_VIDEO_ID,
    timestamp: 60,
    context: 'Extract any code examples from this video'
  }, 'Code Extraction Feature');
  
  results.codeExtraction.tested = true;
  results.codeExtraction.working = codeTest.success;
  
  console.log('\n📊 STEP 5: Testing Analytics');
  console.log('============================\n');
  
  // Test Analytics
  const analyticsTest = await testEndpoint('GET', '/api/analytics', null, 'Analytics Dashboard');
  results.analytics.tested = true;
  results.analytics.working = analyticsTest.success;
  
  console.log('\n📋 COMPREHENSIVE TEST RESULTS');
  console.log('=============================\n');
  
  // Calculate overall scores
  const totalTests = Object.keys(results).length + Object.keys(results.aiFeatures).length - 1;
  let passedTests = 0;
  
  console.log('🖥️  SYSTEM COMPONENTS:');
  console.log(`   Backend Health: ${results.backend.working ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Video Loading: ${results.videoLoading.working ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Analytics: ${results.analytics.working ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Code Extraction: ${results.codeExtraction.working ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (results.backend.working) passedTests++;
  if (results.videoLoading.working) passedTests++;
  if (results.analytics.working) passedTests++;
  if (results.codeExtraction.working) passedTests++;
  
  console.log('\n🤖 AI FEATURES:');
  Object.keys(results.aiFeatures).forEach(feature => {
    const featureData = results.aiFeatures[feature];
    const status = featureData.working ? '✅ WORKING' : '❌ FAILED';
    const length = featureData.responseLength > 0 ? ` (${featureData.responseLength} chars)` : '';
    console.log(`   AI ${feature.toUpperCase()}: ${status}${length}`);
    if (featureData.working) passedTests++;
  });
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  console.log('\n🎯 OVERALL RESULTS:');
  console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${successRate}%`);
  
  if (successRate >= 90) {
    console.log('   Status: 🎉 EXCELLENT - EduLens is fully functional!');
  } else if (successRate >= 75) {
    console.log('   Status: ✅ GOOD - Most features working');
  } else if (successRate >= 50) {
    console.log('   Status: ⚠️  PARTIAL - Some issues need fixing');
  } else {
    console.log('   Status: ❌ CRITICAL - Major issues detected');
  }
  
  // Save results
  const resultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
  
  return results;
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);
