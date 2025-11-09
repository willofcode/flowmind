/**
 * Comprehensive API Test Suite for User-Centric Schema
 * Tests all endpoints: users, profiles, mood check-ins, schedules, conversations, orchestration, feedback
 */

const API_BASE = 'http://localhost:3001';

// Test user data
const testUser = {
  email: 'monica.test@example.com',
  name: 'Monica Test',
  auth0_sub: 'auth0|test123'
};

const testProfile = {
  display_name: 'Mo',
  neuro_preferences: {
    energyWindows: [
      { start: '09:00', end: '12:00', level: 'high' },
      { start: '14:00', end: '16:00', level: 'medium' }
    ],
    sensory: {
      reducedAnimation: true,
      hapticsOnly: true,
      silentMode: false
    }
  },
  personality_traits: {
    traits: ['curious', 'organized', 'empathetic'],
    communication_style: 'direct',
    motivation_drivers: ['achievement', 'learning']
  }
};

let testUserId = null;

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, emoji, message) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, '✅', message);
}

function error(message) {
  log(colors.red, '❌', message);
}

function info(message) {
  log(colors.cyan, 'ℹ️ ', message);
}

function section(message) {
  console.log(`\n${colors.blue}${'='.repeat(60)}`);
  console.log(`${message}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

// Test runner
async function runTests() {
  console.log('\n🚀 Starting FlowMind API Tests (New Schema)...\n');

  try {
    // 1. Health Check
    await testHealthCheck();

    // 2. User Management
    await testCreateUser();
    await testGetUser();
    await testGetUserProfile();
    await testUpdateProfile();

    // 3. Mood Check-ins
    await testMoodCheckIn();
    await testGetMoodHistory();

    // 4. Pattern Discovery
    await testGetPatterns();

    // 5. Weekly Schedules
    await testCreateSchedule();
    await testGetSchedule();
    await testGetScheduleIntensity();

    // 6. Conversations
    await testSaveConversation();
    await testGetConversations();

    // 7. AI Orchestration
    await testCreateOrchestrationSession();
    await testGetOrchestrationSessions();

    // 8. Feedback
    await testSubmitFeedback();
    await testGetFeedback();

    console.log('\n✨ All tests completed!\n');

  } catch (err) {
    error(`Test suite failed: ${err.message}`);
    process.exit(1);
  }
}

// ============================================================================
// Test Functions
// ============================================================================

async function testHealthCheck() {
  section('1. Health Check');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      success('Health check passed');
      info(`Services: ${JSON.stringify(data.services)}`);
    } else {
      error('Health check failed');
      console.log(data);
    }
  } catch (err) {
    error(`Health check error: ${err.message}`);
  }
}

async function testCreateUser() {
  section('2. Create User');
  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      testUserId = data.user.id;
      success('User created successfully');
      info(`User ID: ${testUserId}`);
    } else {
      error('User creation failed');
      console.log(data);
    }
  } catch (err) {
    error(`User creation error: ${err.message}`);
  }
}

async function testGetUser() {
  section('3. Get User by Email');
  try {
    const response = await fetch(`${API_BASE}/users/${testUser.email}`);
    const data = await response.json();
    
    if (response.ok) {
      success('User fetched successfully');
      info(`Name: ${data.name}, Email: ${data.email}`);
    } else {
      error('User fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`User fetch error: ${err.message}`);
  }
}

async function testGetUserProfile() {
  section('4. Get User Profile');
  if (!testUserId) {
    error('No test user ID - skipping profile test');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/profile`);
    
    if (response.status === 404) {
      info('No profile yet (expected for new user)');
    } else if (response.ok) {
      const data = await response.json();
      success('Profile fetched');
      info(`Display name: ${data.display_name}`);
    } else {
      error('Profile fetch failed');
    }
  } catch (err) {
    error(`Profile fetch error: ${err.message}`);
  }
}

async function testUpdateProfile() {
  section('5. Update User Profile');
  if (!testUserId) {
    error('No test user ID - skipping profile update');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProfile),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      success('Profile updated successfully');
      info(`Display name: ${data.profile.display_name}`);
    } else {
      error('Profile update failed');
      console.log(data);
    }
  } catch (err) {
    error(`Profile update error: ${err.message}`);
  }
}

async function testMoodCheckIn() {
  section('6. Submit Mood Check-in');
  if (!testUserId) {
    error('No test user ID - skipping mood check-in');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/mood-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        transcription: "I'm feeling pretty good today! Just finished a productive morning session and have a lighter afternoon ahead.",
        durationSeconds: 15,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      success('Mood check-in saved');
      info(`Mood score: ${data.checkIn?.mood_score || 'N/A'}`);
      info(`Energy: ${data.checkIn?.energy_level || 'N/A'}`);
      if (data.recommendations?.length > 0) {
        info(`Recommendations: ${data.recommendations.length} provided`);
      }
    } else {
      error('Mood check-in failed');
      console.log(data);
    }
  } catch (err) {
    error(`Mood check-in error: ${err.message}`);
  }
}

async function testGetMoodHistory() {
  section('7. Get Mood History');
  if (!testUserId) {
    error('No test user ID - skipping mood history');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/mood-history?days=7`);
    const data = await response.json();
    
    if (response.ok) {
      success('Mood history fetched');
      info(`Total entries: ${data.moodHistory?.length || 0}`);
    } else {
      error('Mood history fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`Mood history error: ${err.message}`);
  }
}

async function testGetPatterns() {
  section('8. Get Discovered Patterns');
  if (!testUserId) {
    error('No test user ID - skipping patterns');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/patterns`);
    const data = await response.json();
    
    if (response.ok) {
      success('Patterns fetched');
      info(`Total patterns: ${data.patterns?.length || 0}`);
      if (data.patterns?.length > 0) {
        info(`Example: ${data.patterns[0].pattern_name}`);
      }
    } else {
      error('Patterns fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`Patterns error: ${err.message}`);
  }
}

async function testCreateSchedule() {
  section('9. Create Weekly Schedule');
  if (!testUserId) {
    error('No test user ID - skipping schedule creation');
    return;
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  try {
    const response = await fetch(`${API_BASE}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalEvents: 15,
        totalMinutes: 2400,
        avgDailyDensity: 0.6,
        dailyBreakdown: {
          monday: { events: 3, density: 0.5 },
          tuesday: { events: 4, density: 0.7 },
          wednesday: { events: 2, density: 0.4 },
        },
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      success('Schedule created');
      info(`Week: ${data.schedule.week_start} to ${data.schedule.week_end}`);
      info(`Avg density: ${data.schedule.avg_daily_density}`);
    } else {
      error('Schedule creation failed');
      console.log(data);
    }
  } catch (err) {
    error(`Schedule creation error: ${err.message}`);
  }
}

async function testGetSchedule() {
  section('10. Get Weekly Schedule');
  if (!testUserId) {
    error('No test user ID - skipping schedule fetch');
    return;
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/schedule/${weekStartStr}`);
    
    if (response.ok) {
      const data = await response.json();
      success('Schedule fetched');
      info(`Total events: ${data.total_events}`);
    } else if (response.status === 404) {
      info('No schedule found (expected if just created)');
    } else {
      error('Schedule fetch failed');
    }
  } catch (err) {
    error(`Schedule fetch error: ${err.message}`);
  }
}

async function testGetScheduleIntensity() {
  section('11. Get Schedule Intensity');
  if (!testUserId) {
    error('No test user ID - skipping intensity fetch');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/schedule-intensity?startDate=2025-10-01&endDate=2025-12-31`);
    const data = await response.json();
    
    if (response.ok) {
      success('Schedule intensity fetched');
      info(`Total schedules: ${data.schedules?.length || 0}`);
    } else {
      error('Intensity fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`Intensity fetch error: ${err.message}`);
  }
}

async function testSaveConversation() {
  section('12. Save Conversation');
  if (!testUserId) {
    error('No test user ID - skipping conversation');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        role: 'user',
        message: 'How should I structure my day today?',
        moodScore: 7,
        intent: 'planning',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      success('Conversation saved');
    } else {
      error('Conversation save failed');
      console.log(data);
    }
  } catch (err) {
    error(`Conversation error: ${err.message}`);
  }
}

async function testGetConversations() {
  section('13. Get Conversation History');
  if (!testUserId) {
    error('No test user ID - skipping conversations');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/conversations?limit=10`);
    const data = await response.json();
    
    if (response.ok) {
      success('Conversations fetched');
      info(`Total messages: ${data.conversations?.length || 0}`);
    } else {
      error('Conversations fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`Conversations error: ${err.message}`);
  }
}

async function testCreateOrchestrationSession() {
  section('14. Create AI Orchestration Session');
  if (!testUserId) {
    error('No test user ID - skipping orchestration');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/orchestration-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        sessionType: 'weekly_planning',
        moodScore: 7,
        scheduleDensity: 'medium',
        aiDecisions: {
          recommendedWorkouts: 3,
          breathingSessions: 2,
          mealPrepDays: ['sunday', 'wednesday'],
        },
        recommendations: {
          focus: 'Balance high-intensity days with recovery',
          adjustments: ['Add buffer time before meetings'],
        },
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      success('Orchestration session created');
    } else {
      error('Orchestration session failed');
      console.log(data);
    }
  } catch (err) {
    error(`Orchestration error: ${err.message}`);
  }
}

async function testGetOrchestrationSessions() {
  section('15. Get Orchestration Sessions');
  if (!testUserId) {
    error('No test user ID - skipping sessions');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/orchestration-sessions?limit=10`);
    const data = await response.json();
    
    if (response.ok) {
      success('Orchestration sessions fetched');
      info(`Total sessions: ${data.sessions?.length || 0}`);
    } else {
      error('Sessions fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`Sessions error: ${err.message}`);
  }
}

async function testSubmitFeedback() {
  section('16. Submit User Feedback');
  if (!testUserId) {
    error('No test user ID - skipping feedback');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        feedbackType: 'recommendation',
        rating: 5,
        comment: 'The breathing session recommendation was very helpful!',
        context: {
          recommendationId: 'rec_123',
          action: 'breathing_session',
        },
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      success('Feedback submitted');
    } else {
      error('Feedback submission failed');
      console.log(data);
    }
  } catch (err) {
    error(`Feedback error: ${err.message}`);
  }
}

async function testGetFeedback() {
  section('17. Get User Feedback');
  if (!testUserId) {
    error('No test user ID - skipping feedback fetch');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${testUserId}/feedback?limit=20`);
    const data = await response.json();
    
    if (response.ok) {
      success('Feedback fetched');
      info(`Total feedback entries: ${data.feedback?.length || 0}`);
    } else {
      error('Feedback fetch failed');
      console.log(data);
    }
  } catch (err) {
    error(`Feedback error: ${err.message}`);
  }
}

// Run the tests
runTests();
