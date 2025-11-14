/**
 * Test Duplicate Activities Fix
 * Run this to verify deduplication is working
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function testDuplicatePrevention() {
  console.log('🧪 Testing Duplicate Activities Prevention\n');

  const testUserId = 'test-user@flowmind.test';
  const today = new Date().toISOString().split('T')[0];

  const requestBody = {
    userId: testUserId,
    scheduleIntensity: 'medium',
    moodScore: 7,
    energyLevel: 'medium',
    stressLevel: 'low',
    timeWindow: {
      start: `${today}T00:00:00`,
      end: `${today}T23:59:59`
    },
    existingEvents: [
      {
        start: `${today}T09:00:00`,
        end: `${today}T10:00:00`,
        summary: 'Morning Meeting'
      },
      {
        start: `${today}T14:00:00`,
        end: `${today}T15:30:00`,
        summary: 'Afternoon Call'
      }
    ]
  };

  try {
    // TEST 1: First generation
    console.log('📝 Test 1: First generation (should create new activities)');
    const response1 = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data1 = await response1.json();
    
    if (!response1.ok) {
      console.error('❌ Test 1 failed:', data1.error);
      return;
    }

    console.log(`✅ Generated ${data1.activities.length} activities`);
    console.log(`   Cached: ${data1.cached || false}`);
    console.log(`   Reasoning: ${data1.reasoning}\n`);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 2: Second generation (should return cached)
    console.log('📝 Test 2: Second generation (should return cached activities)');
    const response2 = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data2 = await response2.json();
    
    if (!response2.ok) {
      console.error('❌ Test 2 failed:', data2.error);
      return;
    }

    console.log(`✅ Returned ${data2.activities.length} activities`);
    console.log(`   Cached: ${data2.cached || false}`);
    
    if (data2.cached === true) {
      console.log('✅ PASS: Deduplication working! Activities were cached.\n');
    } else {
      console.log('❌ FAIL: Activities were regenerated instead of cached.\n');
    }

    // Check if activities are identical
    const activity1Ids = data1.activities.map(a => `${a.startTime}-${a.title}`).sort();
    const activity2Ids = data2.activities.map(a => `${a.startTime}-${a.title}`).sort();
    
    if (JSON.stringify(activity1Ids) === JSON.stringify(activity2Ids)) {
      console.log('✅ PASS: Same activities returned (no duplicates).\n');
    } else {
      console.log('❌ FAIL: Different activities returned!\n');
      console.log('First call:', activity1Ids);
      console.log('Second call:', activity2Ids);
    }

    // TEST 3: Force regeneration
    console.log('📝 Test 3: Force regeneration (should create new activities)');
    const response3 = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...requestBody,
        forceRegenerate: true
      })
    });

    const data3 = await response3.json();
    
    if (!response3.ok) {
      console.error('❌ Test 3 failed:', data3.error);
      return;
    }

    console.log(`✅ Regenerated ${data3.activities.length} activities`);
    console.log(`   Cached: ${data3.cached || false}`);
    
    if (data3.cached !== true) {
      console.log('✅ PASS: Force regeneration worked.\n');
    } else {
      console.log('❌ FAIL: Force regeneration still returned cached.\n');
    }

    // TEST 4: Clear activities
    console.log('📝 Test 4: Clear activities endpoint');
    const response4 = await fetch(`${API_BASE_URL}/agentic/clear-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        date: today
      })
    });

    const data4 = await response4.json();
    
    if (!response4.ok) {
      console.error('❌ Test 4 failed:', data4.error);
      return;
    }

    console.log(`✅ ${data4.message}\n`);

    // TEST 5: Generation after clear (should create new)
    console.log('📝 Test 5: Generation after clear (should create fresh activities)');
    const response5 = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data5 = await response5.json();
    
    if (!response5.ok) {
      console.error('❌ Test 5 failed:', data5.error);
      return;
    }

    console.log(`✅ Generated ${data5.activities.length} activities`);
    console.log(`   Cached: ${data5.cached || false}`);
    
    if (data5.cached !== true) {
      console.log('✅ PASS: Fresh generation after clear.\n');
    } else {
      console.log('❌ FAIL: Still returned cached after clear.\n');
    }

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run tests
testDuplicatePrevention();
