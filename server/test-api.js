#!/usr/bin/env node

/**
 * FlowMind Backend API Test Script
 * Run with: node test-api.js
 */

const API_BASE = 'http://localhost:3001';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  log(`\n📡 Testing: ${name}`, 'cyan');
  log(`   URL: ${url}`, 'blue');
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      log(`   ✅ Status: ${response.status}`, 'green');
      log(`   Response: ${JSON.stringify(data, null, 2)}`, 'reset');
      return { success: true, data };
    } else {
      log(`   ❌ Status: ${response.status}`, 'red');
      log(`   Error: ${JSON.stringify(data, null, 2)}`, 'red');
      return { success: false, error: data };
    }
  } catch (error) {
    log(`   ❌ Network Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🧪 FlowMind Backend API Test Suite', 'cyan');
  log('=' .repeat(50), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: Health Check
  log('\n📋 TEST SUITE 1: Server Health', 'yellow');
  const health = await testEndpoint(
    'Health Check',
    `${API_BASE}/health`
  );
  results.total++;
  health.success ? results.passed++ : results.failed++;
  
  // Test 2: Profile Management
  log('\n📋 TEST SUITE 2: Profile Management', 'yellow');
  
  // Generate a valid UUID for testing
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
  const testProfile = {
    energyWindows: [
      { start: '09:00', end: '12:00', label: 'Morning Peak' }
    ],
    sensory: {
      reducedAnimation: false,
      hapticsOnly: true,
      silentMode: false
    },
    bufferPolicy: {
      before: 10,
      after: 5
    }
  };
  
  // Test 2.1: Create Profile
  const createProfile = await testEndpoint(
    'Create Profile',
    `${API_BASE}/profile`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        profile: testProfile
      })
    }
  );
  results.total++;
  createProfile.success ? results.passed++ : results.failed++;
  
  // Test 2.2: Get Profile
  if (createProfile.success) {
    const getProfile = await testEndpoint(
      'Get Profile',
      `${API_BASE}/profile/${testUserId}`
    );
    results.total++;
    getProfile.success ? results.passed++ : results.failed++;
  }
  
  // Test 2.3: Update Profile
  if (createProfile.success) {
    const updatedProfile = {
      ...testProfile,
      energyWindows: [
        { start: '14:00', end: '17:00', label: 'Afternoon Peak' }
      ]
    };
    
    const updateProfile = await testEndpoint(
      'Update Profile',
      `${API_BASE}/profile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: testUserId,
          profile: updatedProfile
        })
      }
    );
    results.total++;
    updateProfile.success ? results.passed++ : results.failed++;
  }
  
  // Test 2.4: Get Non-existent Profile (should fail with 404)
  const getNonExistent = await testEndpoint(
    'Get Non-existent Profile (should return 404)',
    `${API_BASE}/profile/nonexistent-user-999`
  );
  results.total++;
  // This should fail with 404
  !getNonExistent.success && getNonExistent.error?.error === 'Profile not found' 
    ? results.passed++ 
    : results.failed++;
  
  // Test 3: NeuralSeek Integration
  log('\n📋 TEST SUITE 3: NeuralSeek Integration', 'yellow');
  
  // Test 3.1: Seek Endpoint
  const seek = await testEndpoint(
    'NeuralSeek Seek Query',
    `${API_BASE}/seek`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What are good breathing exercises for ADHD?',
        context: { userType: 'ADHD' }
      })
    }
  );
  results.total++;
  seek.success ? results.passed++ : results.failed++;
  
  // Test 3.2: mAIstro Endpoint
  const maistro = await testEndpoint(
    'NeuralSeek mAIstro Agent',
    `${API_BASE}/maistro`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create a simple 1-day wellness plan',
        context: { scheduleIntensity: 'low' }
      })
    }
  );
  results.total++;
  maistro.success ? results.passed++ : results.failed++;
  
  // Test 4: Auth0 Integration (without actual token - should fail)
  log('\n📋 TEST SUITE 4: Auth0 Integration (No Token)', 'yellow');
  
  const updateNameNoAuth = await testEndpoint(
    'Update User Name Without Token (should fail)',
    `${API_BASE}/update-user-name`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User' })
    }
  );
  results.total++;
  // This should fail with 401
  !updateNameNoAuth.success 
    ? results.passed++ 
    : results.failed++;
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log('\n📊 TEST SUMMARY', 'cyan');
  log(`   Total Tests: ${results.total}`, 'blue');
  log(`   Passed: ${results.passed}`, 'green');
  log(`   Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`   Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.failed > 0 ? 'yellow' : 'green');
  
  if (results.failed === 0) {
    log('\n✅ All tests passed! Backend is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }
  
  log('\n💡 Next Steps:', 'cyan');
  log('   1. To test Auth0 integration, get a valid access token from iOS app', 'reset');
  log('   2. To test Google Calendar, configure Auth0 Google social connection', 'reset');
  log('   3. Check server logs for detailed error messages', 'reset');
  log('   4. See API_TEST_GUIDE.md for manual testing with curl', 'reset');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
log('\n🚀 Starting FlowMind Backend API Tests...', 'cyan');
log('   Make sure the backend server is running on http://localhost:3001\n', 'yellow');

runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
