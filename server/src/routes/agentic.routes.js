/**
 * Agentic Activities Routes
 * NeuralSeek mAIstro integration for AI-generated wellness activities
 * Adapts to schedule intensity, mood, stress, and energy levels
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// NeuralSeek configuration
const NS_MAISTRO_ENDPOINT = process.env.NS_MAISTRO_ENDPOINT || 'https://neuralseekai.azurewebsites.net/maistro';
const NS_EMBED_CODE = process.env.NS_EMBED_CODE;

/**
 * Generate personalized wellness activities using NeuralSeek mAIstro
 * POST /agentic/generate-activities
 */
router.post('/generate-activities', async (req, res) => {
  try {
    const {
      userId,
      scheduleIntensity,
      moodScore,
      energyLevel,
      stressLevel,
      timeWindow,
      existingEvents = []
    } = req.body;

    // Validate required fields
    if (!userId || !scheduleIntensity || !timeWindow) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, scheduleIntensity, timeWindow'
      });
    }

    console.log('🤖 Generating agentic activities for user:', userId);
    console.log('📊 Context:', { scheduleIntensity, moodScore, energyLevel, stressLevel });

    // Calculate schedule intensity percentage
    const intensityMap = { high: 0.8, medium: 0.5, low: 0.25 };
    const intensityValue = intensityMap[scheduleIntensity] || 0.5;

    // Find available time windows (gaps between events)
    const availableWindows = findAvailableTimeWindows(existingEvents, timeWindow);
    console.log(`📅 Found ${availableWindows.length} available time windows`);

    // Build context for mAIstro
    const userContext = {
      scheduleIntensity,
      intensityValue,
      moodScore: moodScore || 5,
      energyLevel: energyLevel || 'medium',
      stressLevel: stressLevel || 'medium',
      availableWindows: availableWindows.length,
      existingEventsCount: existingEvents.length
    };

    // Generate activities using NeuralSeek mAIstro
    const activities = await generateActivitiesWithMaistro(
      userContext,
      availableWindows,
      existingEvents
    );

    console.log(`✅ Generated ${activities.length} activities`);

    // Store activities in database
    if (activities.length > 0) {
      await storeActivitiesInDatabase(userId, activities);
    }

    res.json({
      success: true,
      activities,
      reasoning: generateReasoningText(userContext, activities),
      scheduledToCalendar: false, // TODO: Implement Google Calendar sync
      context: userContext
    });

  } catch (error) {
    console.error('❌ Generate activities error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * Find available time windows between events
 */
function findAvailableTimeWindows(existingEvents, timeWindow) {
  const windows = [];
  const MIN_WINDOW_MINUTES = 15; // Minimum 15 minutes for an activity

  // Parse time window
  const dayStart = new Date(timeWindow.start);
  const dayEnd = new Date(timeWindow.end);

  // Set reasonable bounds (7 AM - 10 PM)
  const minHour = 7;
  const maxHour = 22;
  
  dayStart.setHours(Math.max(dayStart.getHours(), minHour), 0, 0, 0);
  dayEnd.setHours(Math.min(dayEnd.getHours(), maxHour), 0, 0, 0);

  // Sort events by start time
  const sortedEvents = existingEvents
    .map(e => ({
      start: new Date(e.start),
      end: new Date(e.end)
    }))
    .sort((a, b) => a.start - b.start);

  // Find gaps between events
  let currentTime = dayStart;

  for (const event of sortedEvents) {
    const gapMinutes = (event.start - currentTime) / (1000 * 60);
    
    if (gapMinutes >= MIN_WINDOW_MINUTES) {
      windows.push({
        start: new Date(currentTime),
        end: new Date(event.start),
        duration: Math.floor(gapMinutes)
      });
    }
    
    currentTime = new Date(Math.max(currentTime, event.end));
  }

  // Check gap after last event
  const finalGapMinutes = (dayEnd - currentTime) / (1000 * 60);
  if (finalGapMinutes >= MIN_WINDOW_MINUTES) {
    windows.push({
      start: new Date(currentTime),
      end: dayEnd,
      duration: Math.floor(finalGapMinutes)
    });
  }

  return windows;
}

/**
 * Generate activities using NeuralSeek mAIstro with context-aware prompting
 */
async function generateActivitiesWithMaistro(context, availableWindows, existingEvents) {
  const {
    scheduleIntensity,
    intensityValue,
    moodScore,
    energyLevel,
    stressLevel
  } = context;

  // Build adaptive prompt based on context
  const prompt = buildAdaptivePrompt(context, availableWindows);

  console.log('🧠 Calling NeuralSeek mAIstro...');
  console.log('📝 Prompt preview:', prompt.substring(0, 200) + '...');

  try {
    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'embedcode': NS_EMBED_CODE
      },
      body: JSON.stringify({
        ntl: prompt, // Use 'ntl' for natural language input
        context: JSON.stringify({
          scheduleIntensity,
          moodScore,
          energyLevel,
          stressLevel,
          availableWindowsCount: availableWindows.length
        }),
        parameters: {
          temperature: 0.7,
          max_tokens: 2000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`mAIstro API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ mAIstro response received');

    // Parse AI response
    const activities = parseActivitiesFromMaistroResponse(data, availableWindows);
    
    // Apply final validation and constraints
    return validateAndConstrainActivities(activities, availableWindows, existingEvents);

  } catch (error) {
    console.error('❌ mAIstro call failed:', error);
    
    // Fallback: Generate rule-based activities if AI fails
    console.log('⚠️  Falling back to rule-based generation');
    return generateRuleBasedActivities(context, availableWindows);
  }
}

/**
 * Build adaptive prompt based on user context
 */
function buildAdaptivePrompt(context, availableWindows) {
  const {
    scheduleIntensity,
    intensityValue,
    moodScore,
    energyLevel,
    stressLevel,
    existingEventsCount
  } = context;

  // Calculate total available time in minutes
  const totalAvailableMinutes = availableWindows.reduce((sum, w) => sum + w.duration, 0);
  
  // Determine activity strategy based on context AND available time
  let strategy = '';
  let maxActivities = 4;
  let priorityTypes = [];

  if (stressLevel === 'high' || intensityValue > 0.7) {
    strategy = 'HIGH STRESS MODE: Focus on stress relief and calming activities';
    // Even when stressed, if there's time, add more breathing breaks
    maxActivities = totalAvailableMinutes >= 120 ? 3 : 2;
    priorityTypes = ['BREATHING', 'BREATHING', 'MEAL'];
  } else if (energyLevel === 'low') {
    strategy = 'LOW ENERGY MODE: Gentle, restorative activities only';
    maxActivities = totalAvailableMinutes >= 150 ? 3 : 2;
    priorityTypes = ['BREATHING', 'MEAL', 'WORKOUT'];
  } else if (intensityValue < 0.4 && totalAvailableMinutes >= 300) {
    strategy = 'BALANCED MODE: Full range of wellness activities';
    maxActivities = 4;
    priorityTypes = ['BREATHING', 'WORKOUT', 'MEAL', 'WORKOUT'];
  } else {
    strategy = 'MODERATE MODE: Mix of calming and active support';
    maxActivities = totalAvailableMinutes >= 120 ? 3 : 2;
    priorityTypes = ['BREATHING', 'WORKOUT', 'MEAL'];
  }

  const windowsDescription = availableWindows
    .map((w, i) => {
      const startTime = w.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = w.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${i + 1}. ${startTime}-${endTime} (${w.duration} min available)`;
    })
    .join('\n');

  return `You are a neurodivergent-friendly wellness coach AI generating personalized activities for a user dealing with mental health and stress challenges.

USER CONTEXT:
- Schedule Intensity: ${scheduleIntensity} (${Math.round(intensityValue * 100)}% busy)
- Current Mood Score: ${moodScore}/10 ${moodScore < 5 ? '(needs support)' : moodScore > 7 ? '(feeling good)' : '(moderate)'}
- Energy Level: ${energyLevel} ${energyLevel === 'low' ? '(tired, gentle activities only)' : ''}
- Stress Level: ${stressLevel} ${stressLevel === 'high' ? '(HIGH - needs stress relief!)' : ''}
- Existing Commitments: ${existingEventsCount} events today
- Total Available Time: ${totalAvailableMinutes} minutes across ${availableWindows.length} windows

STRATEGY: ${strategy}

AVAILABLE TIME WINDOWS:
${windowsDescription || 'No clear windows found - suggest short breathing breaks'}

BUFFER RULES (ADAPTIVE):
- Large windows (120+ min): Use 15-min buffer before/after
- Medium windows (60-120 min): Use 10-min buffer before/after  
- Small windows (30-60 min): Use 5-min buffer before/after
- Tiny windows (<30 min): Use 2-min buffer before/after

YOUR TASK:
Generate UP TO ${maxActivities} personalized wellness activities that fit into available time windows.
${totalAvailableMinutes < 60 ? 'CRITICAL: Very limited time available - prioritize SHORT activities (5-10 min)!' : ''}

ACTIVITY TYPES & DURATIONS:
1. BREATHING: Meditation, breathing exercises, calm sessions
   - Short (5-10 min): Quick calm breaks ${totalAvailableMinutes < 90 ? '← PRIORITIZE THIS' : ''}
   - Medium (10-15 min): Deeper relaxation sessions
   
2. WORKOUT: Movement, fitness, stretches
   - Light (15-20 min): Gentle walks, stretches, movement snacks
   - Medium (20-30 min): Proper workouts, yoga
   
3. MEAL: Nutrition, hydration, eating
   - Snack (10-15 min): Quick healthy snack, water break
   - Meal (25-35 min): Proper meal with prep time

STRICT REQUIREMENTS:
1. Activities MUST fit within available windows (use appropriate buffer from BUFFER RULES)
2. Place activity start times that align with window timing + buffer
3. Match activity intensity to energy level (low energy = shorter, gentler)
4. ${stressLevel === 'high' ? 'PRIORITIZE breathing/calm activities for stress relief' : ''}
5. No activities before 7:00 AM or after 10:00 PM
6. Clear, concrete titles (not vague like "Get ready" or "Prepare")
7. Helpful descriptions with specific guidance
8. BE FLEXIBLE: Use shorter activities if windows are limited

NEURODIVERGENT-FRIENDLY RULES:
- Use concrete, specific language (not abstract)
- Predictable timing and structure
- No overwhelming/complex activities
- Support executive function with clear steps
- Respect sensory needs (no loud/intense when stressed)

OUTPUT FORMAT (JSON):
Return ONLY valid JSON array with UP TO ${maxActivities} activities:
[
  {
    "type": "BREATHING",
    "title": "5-min Box Breathing",
    "startTime": "09:45",
    "endTime": "09:50",
    "durationSec": 300,
    "description": "4-4-4-4 breathing pattern: Inhale 4, hold 4, exhale 4, hold 4",
    "isBreathing": true
  }
]

IMPORTANT: Choose start times that are WITHIN the available windows (add appropriate buffer). For example, if a window is 08:00-09:00 (60 min), you can place a 5-min activity at 08:10-08:15 (10-min buffer on each side).

Generate UP TO ${maxActivities} activities now based on the user's context and available windows:`;
}

/**
 * Parse activities from mAIstro response
 */
function parseActivitiesFromMaistroResponse(data, availableWindows) {
  try {
    // Extract JSON from response (handle various response formats)
    let activitiesText = '';
    
    if (data.answer) {
      activitiesText = data.answer;
    } else if (data.text) {
      activitiesText = data.text;
    } else if (typeof data === 'string') {
      activitiesText = data;
    } else {
      activitiesText = JSON.stringify(data);
    }

    // Try to find JSON array in response
    const jsonMatch = activitiesText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️  No JSON array found in response');
      return [];
    }

    const activities = JSON.parse(jsonMatch[0]);
    
    // Add IDs and status to each activity
    return activities.map(activity => ({
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...activity,
      status: 'PENDING',
      isBreathing: activity.type === 'BREATHING'
    }));

  } catch (error) {
    console.error('❌ Failed to parse mAIstro response:', error);
    console.error('Raw response:', JSON.stringify(data).substring(0, 500));
    return [];
  }
}

/**
 * Validate and constrain activities to ensure they fit properly
 */
function validateAndConstrainActivities(activities, availableWindows, existingEvents) {
  const validated = [];
  const MAX_ACTIVITIES = 4;

  for (const activity of activities) {
    if (validated.length >= MAX_ACTIVITIES) break;

    // Validate required fields
    if (!activity.startTime || !activity.endTime || !activity.title) {
      console.warn('⚠️  Skipping activity with missing fields:', activity.title);
      continue;
    }

    // Check if activity fits in an available window
    const fitsInWindow = checkIfActivityFitsInWindow(activity, availableWindows);
    if (!fitsInWindow) {
      console.warn('⚠️  Skipping activity that doesn\'t fit in any window:', activity.title);
      continue;
    }

    // Check no overlap with existing events
    const hasOverlap = checkForOverlap(activity, existingEvents);
    if (hasOverlap) {
      console.warn('⚠️  Skipping activity that overlaps with existing event:', activity.title);
      continue;
    }

    validated.push(activity);
  }

  return validated;
}

/**
 * Check if activity fits within available time windows
 * Uses adaptive buffer based on window size
 */
function checkIfActivityFitsInWindow(activity, availableWindows) {
  const [startHour, startMin] = activity.startTime.split(':').map(Number);
  const [endHour, endMin] = activity.endTime.split(':').map(Number);
  
  for (const window of availableWindows) {
    const windowStartHour = window.start.getHours();
    const windowStartMin = window.start.getMinutes();
    const windowEndHour = window.end.getHours();
    const windowEndMin = window.end.getMinutes();
    
    const activityStartMinutes = startHour * 60 + startMin;
    const activityEndMinutes = endHour * 60 + endMin;
    const windowStartMinutes = windowStartHour * 60 + windowStartMin;
    const windowEndMinutes = windowEndHour * 60 + windowEndMin;
    
    const activityDuration = activityEndMinutes - activityStartMinutes;
    
    // Adaptive buffer based on window size and activity duration
    // Larger windows = stricter buffer, smaller windows = more flexible
    let requiredBuffer;
    if (window.duration >= 120) {
      // Large window (2+ hours): 15 min buffer
      requiredBuffer = 15;
    } else if (window.duration >= 60) {
      // Medium window (1-2 hours): 10 min buffer
      requiredBuffer = 10;
    } else if (window.duration >= 30) {
      // Small window (30-60 min): 5 min buffer
      requiredBuffer = 5;
    } else {
      // Tiny window (<30 min): 2 min buffer (just breathing space)
      requiredBuffer = 2;
    }
    
    // Check if activity fits with adaptive buffer
    const availableSpace = windowEndMinutes - windowStartMinutes - (requiredBuffer * 2);
    const activityFitsInDuration = activityDuration <= availableSpace;
    
    // Check if activity timing aligns with window (with buffer)
    const fitsInWindow = 
      activityStartMinutes >= windowStartMinutes + requiredBuffer && 
      activityEndMinutes <= windowEndMinutes - requiredBuffer;
    
    if (fitsInWindow && activityFitsInDuration) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for overlap with existing events
 */
function checkForOverlap(activity, existingEvents) {
  const [actStartHour, actStartMin] = activity.startTime.split(':').map(Number);
  const [actEndHour, actEndMin] = activity.endTime.split(':').map(Number);
  const actStartMinutes = actStartHour * 60 + actStartMin;
  const actEndMinutes = actEndHour * 60 + actEndMin;
  
  for (const event of existingEvents) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
    
    // Check for any overlap
    if (actStartMinutes < eventEndMinutes && actEndMinutes > eventStartMinutes) {
      return true;
    }
  }
  
  return false;
}

/**
 * Fallback: Generate rule-based activities if AI fails
 */
function generateRuleBasedActivities(context, availableWindows) {
  const { scheduleIntensity, moodScore, energyLevel, stressLevel } = context;
  const activities = [];

  // Sort windows by duration (largest first)
  const sortedWindows = [...availableWindows].sort((a, b) => b.duration - a.duration);

  // High stress or busy schedule: breathing breaks only
  if (stressLevel === 'high' || scheduleIntensity === 'high') {
    for (let i = 0; i < Math.min(3, sortedWindows.length); i++) {
      const window = sortedWindows[i];
      if (window.duration >= 20) {
        const startTime = new Date(window.start.getTime() + 15 * 60000); // 15 min buffer
        activities.push({
          id: `fallback-${Date.now()}-${i}`,
          type: 'BREATHING',
          title: '5-min Calm Break',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 5 * 60000)),
          durationSec: 300,
          description: 'Box breathing: Inhale 4, hold 4, exhale 4, hold 4',
          isBreathing: true,
          status: 'PENDING'
        });
      }
    }
  } else {
    // Balanced schedule: mix of activities
    let activityCount = 0;
    
    for (const window of sortedWindows) {
      if (activityCount >= 4) break;
      
      if (window.duration >= 45 && activityCount === 0) {
        // Add workout in longest window
        const startTime = new Date(window.start.getTime() + 15 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-workout`,
          type: 'WORKOUT',
          title: energyLevel === 'low' ? '15-min Gentle Walk' : '20-min Morning Walk',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + (energyLevel === 'low' ? 15 : 20) * 60000)),
          durationSec: (energyLevel === 'low' ? 15 : 20) * 60,
          description: 'Light walk outdoors for movement and fresh air',
          isBreathing: false,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 35 && activities.filter(a => a.type === 'MEAL').length === 0) {
        // Add meal
        const startTime = new Date(window.start.getTime() + 15 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-meal`,
          type: 'MEAL',
          title: 'Healthy Lunch',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 30 * 60000)),
          durationSec: 1800,
          description: 'Balanced meal with protein and vegetables',
          isBreathing: false,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 20) {
        // Add breathing break
        const startTime = new Date(window.start.getTime() + 15 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-breathing-${activityCount}`,
          type: 'BREATHING',
          title: '5-min Mindful Break',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 5 * 60000)),
          durationSec: 300,
          description: 'Short meditation or breathing exercise',
          isBreathing: true,
          status: 'PENDING'
        });
        activityCount++;
      }
    }
  }

  console.log(`✅ Generated ${activities.length} fallback activities`);
  return activities;
}

/**
 * Format time as HH:MM
 */
function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Store activities in database
 */
async function storeActivitiesInDatabase(userId, activities) {
  try {
    // Convert email to UUID if needed
    let actualUserId = userId;
    
    // Check if userId is an email (contains @)
    if (userId && userId.includes('@')) {
      console.log(`🔍 Looking up UUID for email: ${userId}`);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userId)
        .single();
      
      if (userError || !userData) {
        // Try to create user if not exists
        console.log(`📝 Creating new user for email: ${userId}`);
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({ email: userId, name: userId.split('@')[0] })
          .select('id')
          .single();
        
        if (createError) {
          console.error('❌ Failed to create user:', createError);
          return;
        }
        
        actualUserId = newUser.id;
        console.log(`✅ Created user with UUID: ${actualUserId}`);
      } else {
        actualUserId = userData.id;
        console.log(`✅ Found user UUID: ${actualUserId}`);
      }
    }

    const records = activities.map(activity => ({
      user_id: actualUserId,
      activity_type: activity.type,
      title: activity.title,
      description: activity.description,
      start_time: new Date(`2025-11-09T${activity.startTime}:00`), // TODO: Use actual date
      end_time: new Date(`2025-11-09T${activity.endTime}:00`),
      duration_sec: activity.durationSec,
      status: 'PENDING'
    }));

    const { data, error } = await supabase
      .from('agentic_activities')
      .insert(records);

    if (error) {
      console.error('❌ Database insert error:', error);
    } else {
      console.log('✅ Stored activities in database');
    }
  } catch (error) {
    console.error('❌ Store activities error:', error);
  }
}

/**
 * Generate reasoning text for response
 */
function generateReasoningText(context, activities) {
  const { scheduleIntensity, moodScore, stressLevel, energyLevel } = context;
  
  let reasoning = [];
  
  if (stressLevel === 'high') {
    reasoning.push('High stress detected - prioritized breathing and calm activities');
  }
  
  if (scheduleIntensity === 'high') {
    reasoning.push('Busy schedule - focused on short, stress-relieving breaks');
  }
  
  if (energyLevel === 'low') {
    reasoning.push('Low energy - selected gentle, restorative activities');
  }
  
  if (moodScore && moodScore < 5) {
    reasoning.push('Lower mood - included supportive wellness activities');
  }
  
  const breathingCount = activities.filter(a => a.type === 'BREATHING').length;
  const workoutCount = activities.filter(a => a.type === 'WORKOUT').length;
  const mealCount = activities.filter(a => a.type === 'MEAL').length;
  
  reasoning.push(`Generated ${activities.length} activities: ${breathingCount} breathing, ${workoutCount} workout, ${mealCount} meal`);
  
  return reasoning.join('. ') + '.';
}

export default router;
