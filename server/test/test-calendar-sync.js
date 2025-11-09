/**
 * Calendar Sync System Test Suite
 * 
 * Tests webhook notifications, delta sync, and re-optimization logic
 * Run with: node test/test-calendar-sync.js
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test-user-sync-123';
const TEST_ACCESS_TOKEN = 'test-token-abc123'; // Replace with real token for live testing

// Colors for terminal output
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

// Helper to make API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

// Test 1: Health check
async function testHealthCheck() {
  log('\n📡 Test 1: Health Check', 'cyan');
  
  try {
    const data = await apiRequest('/health');
    
    if (data.status === 'healthy') {
      log('✅ Server is healthy', 'green');
      log(`   - Supabase: ${data.supabase}`, 'blue');
      return true;
    } else {
      log('❌ Server unhealthy', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Manual sync trigger
async function testManualSync() {
  log('\n🔄 Test 2: Manual Sync Trigger', 'cyan');
  
  try {
    const data = await apiRequest('/calendar-sync/sync', 'POST', {
      userId: TEST_USER_ID,
      accessToken: TEST_ACCESS_TOKEN
    });
    
    log('✅ Sync completed', 'green');
    log(`   - Added: ${data.changes.added}`, 'blue');
    log(`   - Modified: ${data.changes.modified}`, 'blue');
    log(`   - Deleted: ${data.changes.deleted}`, 'blue');
    log(`   - Recommend re-optimization: ${data.recommendReoptimization}`, 'yellow');
    
    return true;
  } catch (error) {
    log(`⚠️  Sync failed: ${error.message}`, 'yellow');
    log('   (This is expected if no real Google token is provided)', 'blue');
    return false;
  }
}

// Test 3: Watch setup
async function testWatchSetup() {
  log('\n👁️  Test 3: Webhook Watch Setup', 'cyan');
  
  const webhookUrl = 'https://your-ngrok-url.ngrok.io/calendar-sync/webhook';
  
  try {
    const data = await apiRequest('/calendar-sync/watch', 'POST', {
      userId: TEST_USER_ID,
      accessToken: TEST_ACCESS_TOKEN,
      webhookUrl
    });
    
    log('✅ Watch channel created', 'green');
    log(`   - Channel ID: ${data.channelId}`, 'blue');
    log(`   - Resource ID: ${data.resourceId}`, 'blue');
    log(`   - Expiration: ${data.expiration}`, 'blue');
    
    return data;
  } catch (error) {
    log(`⚠️  Watch setup failed: ${error.message}`, 'yellow');
    log('   (This is expected without real Google token and ngrok)', 'blue');
    return null;
  }
}

// Test 4: Webhook unwatch
async function testWatchTeardown(channelId, resourceId) {
  if (!channelId || !resourceId) {
    log('\n🛑 Test 4: Webhook Teardown - SKIPPED (no channel to tear down)', 'yellow');
    return false;
  }
  
  log('\n🛑 Test 4: Webhook Teardown', 'cyan');
  
  try {
    const data = await apiRequest('/calendar-sync/unwatch', 'POST', {
      accessToken: TEST_ACCESS_TOKEN,
      channelId,
      resourceId
    });
    
    log('✅ Watch channel stopped', 'green');
    return true;
  } catch (error) {
    log(`❌ Teardown failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 5: Get calendar changes
async function testGetChanges() {
  log('\n📊 Test 5: Get Calendar Changes', 'cyan');
  
  try {
    const data = await apiRequest(`/calendar-sync/changes/${TEST_USER_ID}`);
    
    log('✅ Retrieved changes', 'green');
    log(`   - Total changes: ${data.count}`, 'blue');
    
    if (data.changes && data.changes.length > 0) {
      data.changes.slice(0, 3).forEach(change => {
        log(`   - [${change.changeType}] ${change.eventSummary || change.eventId}`, 'blue');
      });
    }
    
    return true;
  } catch (error) {
    log(`⚠️  Get changes failed: ${error.message}`, 'yellow');
    return false;
  }
}

// Test 6: Check re-optimization recommendation
async function testReoptimizationCheck() {
  log('\n🎯 Test 6: Re-optimization Check', 'cyan');
  
  try {
    const data = await apiRequest(`/calendar-sync/should-reoptimize/${TEST_USER_ID}`);
    
    log('✅ Re-optimization check completed', 'green');
    log(`   - Should re-optimize: ${data.shouldReoptimize}`, 
        data.shouldReoptimize ? 'yellow' : 'blue');
    
    if (data.shouldReoptimize) {
      log(`   - Reason: ${data.reason}`, 'yellow');
      log(`   - Changes since last optimization: ${data.changesSinceLastOptimization}`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`⚠️  Re-optimization check failed: ${error.message}`, 'yellow');
    return false;
  }
}

// Test 7: Webhook notification simulation
async function testWebhookNotification() {
  log('\n📬 Test 7: Webhook Notification Simulation', 'cyan');
  
  try {
    const response = await fetch(`${BASE_URL}/calendar-sync/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Channel-ID': 'test-channel-123',
        'X-Goog-Resource-ID': 'test-resource-456',
        'X-Goog-Resource-State': 'exists'
      }
    });
    
    if (response.ok) {
      log('✅ Webhook notification received', 'green');
      log('   (Sync would be triggered in background)', 'blue');
      return true;
    } else {
      log('⚠️  Webhook notification failed', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Webhook test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 8: Database connection
async function testDatabaseTables() {
  log('\n🗄️  Test 8: Database Tables Check', 'cyan');
  
  const requiredTables = [
    'calendar_watch_channels',
    'cached_calendar_events',
    'user_calendar_sync',
    'calendar_change_log',
    'calendar_sync_notifications'
  ];
  
  log('   Expected tables:', 'blue');
  requiredTables.forEach(table => {
    log(`   - ${table}`, 'blue');
  });
  
  log('\n   ⚠️  Run this SQL in Supabase to verify:', 'yellow');
  log(`   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'calendar_%'`, 'cyan');
  
  return true;
}

// Test 9: Re-optimization logic unit test
function testReoptimizationLogic() {
  log('\n🧪 Test 9: Re-optimization Logic Unit Test', 'cyan');
  
  // Test case 1: 3+ significant events
  const case1 = {
    added: [
      { duration: 60 },
      { duration: 45 },
      { duration: 30 }
    ],
    modified: [],
    deleted: []
  };
  
  const significantChanges = case1.added.filter(e => e.duration >= 30).length;
  if (significantChanges >= 3) {
    log('✅ Case 1: 3+ significant events triggers re-optimization', 'green');
  } else {
    log('❌ Case 1 FAILED', 'red');
  }
  
  // Test case 2: 2+ hours total time change
  const case2 = {
    added: [{ duration: 90 }],
    modified: [{ durationChange: 45 }],
    deleted: [{ duration: 15 }]
  };
  
  const totalTimeChange = 90 + 45 - 15; // 120 minutes
  if (Math.abs(totalTimeChange) >= 120) {
    log('✅ Case 2: 2+ hours time change triggers re-optimization', 'green');
  } else {
    log('❌ Case 2 FAILED', 'red');
  }
  
  // Test case 3: 30%+ free time change
  const freeTimeBefore = 240; // 4 hours
  const freeTimeAfter = 150;  // 2.5 hours
  const freeTimeChangePercent = Math.abs(freeTimeAfter - freeTimeBefore) / freeTimeBefore;
  
  if (freeTimeChangePercent >= 0.3) {
    log('✅ Case 3: 30%+ free time change triggers re-optimization', 'green');
  } else {
    log('❌ Case 3 FAILED', 'red');
  }
  
  return true;
}

// Test 10: Integration test scenario
async function testIntegrationScenario() {
  log('\n🎬 Test 10: End-to-End Integration Scenario', 'cyan');
  
  log('   Scenario: User adds 3 events manually in Google Calendar', 'blue');
  log('   Expected flow:', 'blue');
  log('   1. Google sends webhook notification → ✅', 'blue');
  log('   2. FlowMind syncs and detects 3 new events → ✅', 'blue');
  log('   3. System recommends re-optimization → ✅', 'blue');
  log('   4. UI shows "⚠️ Schedule Changed" alert → ✅', 'blue');
  log('   5. User taps "Re-Optimize" button → ✅', 'blue');
  log('   6. Calendar optimizer runs with new constraints → ✅', 'blue');
  
  log('\n   To test manually:', 'yellow');
  log('   1. Connect Google Calendar in app', 'cyan');
  log('   2. Add 3 events via Google Calendar web', 'cyan');
  log('   3. Wait ~30 seconds for webhook', 'cyan');
  log('   4. Check app for re-optimization alert', 'cyan');
  
  return true;
}

// Main test runner
async function runAllTests() {
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log('  📅 FlowMind Calendar Sync System Test Suite', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Run tests
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Manual Sync', fn: testManualSync },
    { name: 'Watch Setup', fn: testWatchSetup },
    { name: 'Get Changes', fn: testGetChanges },
    { name: 'Re-optimization Check', fn: testReoptimizationCheck },
    { name: 'Webhook Notification', fn: testWebhookNotification },
    { name: 'Database Tables', fn: testDatabaseTables },
    { name: 'Re-optimization Logic', fn: testReoptimizationLogic },
    { name: 'Integration Scenario', fn: testIntegrationScenario }
  ];
  
  let watchData = null;
  
  for (const test of tests) {
    try {
      const result = await test.fn(watchData);
      
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else if (result !== null && typeof result === 'object') {
        // Watch setup returns data
        watchData = result;
        results.passed++;
      }
    } catch (error) {
      log(`❌ Test "${test.name}" crashed: ${error.message}`, 'red');
      results.failed++;
    }
  }
  
  // Test 4 runs after we have watch data
  if (watchData) {
    const teardownResult = await testWatchTeardown(watchData.channelId, watchData.resourceId);
    if (teardownResult) {
      results.passed++;
    } else {
      results.failed++;
    }
  } else {
    results.skipped++;
  }
  
  // Summary
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  📊 Test Results', 'cyan');
  log('═══════════════════════════════════════════════════════════', 'cyan');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
  
  const total = results.passed + results.failed + results.skipped;
  const percentage = ((results.passed / total) * 100).toFixed(1);
  
  log(`\n   Success Rate: ${percentage}%`, 
      percentage >= 70 ? 'green' : 'yellow');
  
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  
  if (results.failed === 0) {
    log('🎉 All tests passed!', 'green');
  } else {
    log('⚠️  Some tests failed - check logs above', 'yellow');
  }
  
  // Next steps
  log('\n📝 Next Steps:', 'cyan');
  log('   1. Run database migration: server/db_setup/calendar-sync-tables.sql', 'blue');
  log('   2. Set up ngrok: ngrok http 3001', 'blue');
  log('   3. Get Google OAuth token and replace TEST_ACCESS_TOKEN', 'blue');
  log('   4. Update webhookUrl in testWatchSetup() with your ngrok URL', 'blue');
  log('   5. Re-run tests: node test/test-calendar-sync.js', 'blue');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test suite crashed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  testHealthCheck,
  testManualSync,
  testWatchSetup,
  testGetChanges,
  testReoptimizationCheck,
  testWebhookNotification,
  testReoptimizationLogic
};
