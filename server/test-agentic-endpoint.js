/**
 * Test script for agentic activity generation endpoint
 * Run: node test-agentic-endpoint.js
 */

const BASE_URL = 'http://192.168.1.174:3001';

async function testAgenticGeneration() {
  console.log('🧪 Testing /agentic/generate-activities endpoint...\n');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const requestBody = {
    userId: 'test-user-123',
    scheduleIntensity: 'low', // Empty schedule = low intensity
    moodScore: 6.5,
    energyLevel: 'medium',
    stressLevel: 'medium',
    timeWindow: {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    },
    existingEvents: [], // Empty schedule (0% intensity)
    userContext: 'Test request to debug 500 error'
  };

  console.log('📤 Request body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n');

  try {
    const response = await fetch(`${BASE_URL}/agentic/generate-activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:');
      console.error(errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('\n📋 Parsed error:');
        console.error(JSON.stringify(errorJson, null, 2));
      } catch {
        // Not JSON, already logged as text
      }
      return;
    }

    const data = await response.json();
    console.log('✅ Success! Response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

// Run test
testAgenticGeneration()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  });
