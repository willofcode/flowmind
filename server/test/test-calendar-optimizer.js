/**
 * Calendar Optimizer Test Suite
 * 
 * Tests the agentic workflow for Google Calendar optimization
 */

import fetch from "node-fetch";

const API_BASE = "http://localhost:3001";

// Test user data
const TEST_USER_ID = "test-user-123";
const TEST_ACCESS_TOKEN = "mock-google-token"; // Replace with real token for live tests

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(title, 'bright');
  log('='.repeat(80), 'cyan');
}

/**
 * Test 1: Schedule Analysis
 */
async function testScheduleAnalysis() {
  section('TEST 1: Schedule Analysis (Preview Mode)');
  
  try {
    log('📊 Analyzing schedule without making changes...', 'blue');
    
    const response = await fetch(`${API_BASE}/calendar/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        accessToken: TEST_ACCESS_TOKEN,
        targetDate: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || response.statusText);
    }
    
    const result = await response.json();
    
    log('✅ Analysis Complete:', 'green');
    log(`   Date: ${result.date}`);
    log(`   Intensity: ${result.scheduleIntensity.level.toUpperCase()} (${Math.round(result.scheduleIntensity.ratio * 100)}%)`);
    log(`   Busy Minutes: ${result.scheduleIntensity.busyMinutes} / ${result.scheduleIntensity.totalMinutes}`);
    log(`   Available Gaps: ${result.summary.totalGaps}`);
    log(`   Total Available Minutes: ${result.summary.totalAvailableMinutes}`);
    log(`   Energy Peak Gaps: ${result.summary.energyPeakGaps}`);
    
    log('\n📋 Recommendations:', 'cyan');
    result.recommendations.forEach((rec, idx) => {
      log(`   ${idx + 1}. ${rec}`);
    });
    
    if (result.gaps.length > 0) {
      log('\n🕳️  Available Time Gaps:', 'cyan');
      result.gaps.slice(0, 5).forEach((gap, idx) => {
        log(`   ${idx + 1}. ${gap.minutes} min at ${gap.startTime} ${gap.inEnergyWindow ? '(PEAK ENERGY)' : ''}`);
      });
    }
    
    return { success: true, result };
    
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Full Calendar Optimization
 */
async function testCalendarOptimization() {
  section('TEST 2: Full Calendar Optimization (Creates Events)');
  
  try {
    log('🤖 Running agentic optimization workflow...', 'blue');
    log('⚠️  This will create events in Google Calendar', 'yellow');
    
    const response = await fetch(`${API_BASE}/calendar/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        accessToken: TEST_ACCESS_TOKEN,
        targetDate: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || response.statusText);
    }
    
    const result = await response.json();
    
    log('✅ Optimization Complete:', 'green');
    log(`   Optimization ID: ${result.optimizationId}`);
    log(`   Assessment: ${result.summary.assessment}`);
    log(`   Mood Score: ${result.summary.moodScore}/10`);
    log(`   Energy Level: ${result.summary.energyLevel}`);
    log(`   Schedule Intensity: ${result.summary.scheduleIntensity.level.toUpperCase()}`);
    log(`   Actions Planned: ${result.summary.actionsPlanned}`);
    log(`   Events Created: ${result.summary.eventsCreated}`);
    
    if (result.createdEvents.length > 0) {
      log('\n📅 Created Events:', 'cyan');
      result.createdEvents.forEach((event, idx) => {
        log(`   ${idx + 1}. ${event.summary}`);
        log(`      Duration: ${event.duration} min`);
        log(`      Reason: ${event.reason}`);
        log(`      Link: ${event.htmlLink}`);
      });
    }
    
    log('\n💡 AI Recommendations:', 'cyan');
    result.recommendations.forEach((rec, idx) => {
      log(`   ${idx + 1}. ${rec}`);
    });
    
    if (result.errors && result.errors.length > 0) {
      log('\n⚠️  Errors:', 'yellow');
      result.errors.forEach((err, idx) => {
        log(`   ${idx + 1}. ${err.activity}: ${err.error}`);
      });
    }
    
    return { success: true, result };
    
  } catch (error) {
    log(`❌ Optimization failed: ${error.message}`, 'red');
    
    if (error.message.includes('Google Calendar access failed')) {
      log('\n💡 Tip: Make sure you have a valid Google Calendar access token', 'yellow');
      log('   You can get one by signing in with Google in the app', 'yellow');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Manual Activity Creation
 */
async function testManualActivity() {
  section('TEST 3: Manual Activity Creation');
  
  try {
    log('🫁 Creating manual breathing activity...', 'blue');
    
    // Create activity 30 minutes from now
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 30);
    
    const response = await fetch(`${API_BASE}/calendar/manual-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: TEST_ACCESS_TOKEN,
        activityType: 'breathing',
        startISO: startTime.toISOString(),
        duration: 5
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || response.statusText);
    }
    
    const result = await response.json();
    
    log('✅ Activity created:', 'green');
    log(`   Event ID: ${result.event.id}`);
    log(`   Summary: ${result.event.summary}`);
    log(`   Start: ${new Date(result.event.start.dateTime).toLocaleTimeString()}`);
    log(`   Link: ${result.event.htmlLink}`);
    
    return { success: true, result };
    
  } catch (error) {
    log(`❌ Manual activity failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Optimization History
 */
async function testOptimizationHistory() {
  section('TEST 4: Optimization History');
  
  try {
    log('📜 Fetching optimization history...', 'blue');
    
    const response = await fetch(
      `${API_BASE}/calendar/optimization-history?userId=${TEST_USER_ID}&limit=5`
    );
    
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    
    const result = await response.json();
    
    log('✅ History retrieved:', 'green');
    log(`   Total records: ${result.count}`);
    
    if (result.history.length > 0) {
      log('\n📊 Recent Optimizations:', 'cyan');
      result.history.forEach((session, idx) => {
        log(`   ${idx + 1}. ${new Date(session.created_at).toLocaleString()}`);
        log(`      Mood: ${session.mood_score}/10`);
        log(`      Intensity: ${session.schedule_density}`);
        log(`      Events Created: ${session.ai_decisions?.createdEvents || 0}`);
      });
    } else {
      log('   No optimization history found', 'yellow');
    }
    
    return { success: true, result };
    
  } catch (error) {
    log(`❌ History retrieval failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Error Handling
 */
async function testErrorHandling() {
  section('TEST 5: Error Handling');
  
  const tests = [
    {
      name: 'Missing userId',
      endpoint: '/calendar/optimize',
      body: { accessToken: TEST_ACCESS_TOKEN },
      expectedError: 'userId'
    },
    {
      name: 'Missing accessToken',
      endpoint: '/calendar/optimize',
      body: { userId: TEST_USER_ID },
      expectedError: 'accessToken'
    },
    {
      name: 'Invalid activity type',
      endpoint: '/calendar/manual-activity',
      body: { 
        accessToken: TEST_ACCESS_TOKEN, 
        activityType: 'invalid',
        startISO: new Date().toISOString()
      },
      expectedError: 'Invalid activityType'
    }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    try {
      log(`\n🧪 Testing: ${test.name}`, 'blue');
      
      const response = await fetch(`${API_BASE}${test.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        if (error.error.toLowerCase().includes(test.expectedError.toLowerCase())) {
          log(`   ✅ Correctly rejected with: ${error.error}`, 'green');
          passed++;
        } else {
          log(`   ❌ Wrong error: ${error.error}`, 'red');
        }
      } else {
        log(`   ❌ Should have failed but succeeded`, 'red');
      }
      
    } catch (error) {
      log(`   ❌ Unexpected error: ${error.message}`, 'red');
    }
  }
  
  log(`\n📊 Passed ${passed}/${tests.length} error handling tests`, passed === tests.length ? 'green' : 'yellow');
  
  return { success: passed === tests.length, passed, total: tests.length };
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n' + '█'.repeat(80), 'bright');
  log('   CALENDAR OPTIMIZER TEST SUITE', 'bright');
  log('█'.repeat(80) + '\n', 'bright');
  
  const results = {
    analysis: null,
    optimization: null,
    manualActivity: null,
    history: null,
    errorHandling: null
  };
  
  // Run tests sequentially
  results.analysis = await testScheduleAnalysis();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.optimization = await testCalendarOptimization();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.manualActivity = await testManualActivity();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.history = await testOptimizationHistory();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.errorHandling = await testErrorHandling();
  
  // Summary
  section('TEST SUMMARY');
  
  const tests = [
    { name: 'Schedule Analysis', result: results.analysis },
    { name: 'Calendar Optimization', result: results.optimization },
    { name: 'Manual Activity', result: results.manualActivity },
    { name: 'Optimization History', result: results.history },
    { name: 'Error Handling', result: results.errorHandling }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const icon = test.result?.success ? '✅' : '❌';
    const color = test.result?.success ? 'green' : 'red';
    log(`${icon} ${test.name}`, color);
    if (test.result?.success) passed++;
  });
  
  log(`\n📊 Overall: ${passed}/${tests.length} tests passed`, passed === tests.length ? 'green' : 'yellow');
  
  if (passed < tests.length) {
    log('\n💡 Tips:', 'cyan');
    log('   1. Make sure server is running: cd server && npm start');
    log('   2. Set up Google Calendar OAuth token');
    log('   3. Create test user in database');
    log('   4. Ensure NeuralSeek API is configured');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
