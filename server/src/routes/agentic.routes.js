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
      userContext,
      timeWindow,
      existingEvents = [],
      forceRegenerate = false // NEW: Allow force regeneration
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
    
    // NEW ARCHITECTURE: Cache-based deduplication (no database storage)
    // Client will check cache flag before calling this endpoint
    const todayDate = new Date(timeWindow.start).toISOString().split('T')[0];
    console.log(`🆕 Generating fresh activities for ${todayDate}...`);
    
    // Fetch user profile to get personalized active hours
    let userActiveHours = 16; // Default: 16 waking hours
    let userWakeTime = null;
    let userBedTime = null;
    
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('neuro_preferences')
        .eq('user_id', userId)
        .single();
      
      if (profileData?.neuro_preferences) {
        const neuroPrefs = profileData.neuro_preferences;
        
        // Try to get wake/bed time from sleep schedule
        if (neuroPrefs.sleep?.usualWake && neuroPrefs.sleep?.usualBed) {
          userWakeTime = neuroPrefs.sleep.usualWake;
          userBedTime = neuroPrefs.sleep.usualBed;
          
          // Calculate active hours from wake/bed time
          const [wakeHour, wakeMin] = userWakeTime.split(':').map(Number);
          const [bedHour, bedMin] = userBedTime.split(':').map(Number);
          
          let totalMinutes = (bedHour * 60 + bedMin) - (wakeHour * 60 + wakeMin);
          if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
          
          userActiveHours = Math.round(totalMinutes / 60);
          console.log(`👤 Using user's sleep schedule: ${userWakeTime} - ${userBedTime} (${userActiveHours}h active)`);
        } else if (neuroPrefs.activeHours?.dailyActiveHours) {
          // Fallback to activeHours if sleep schedule not set
          userActiveHours = neuroPrefs.activeHours.dailyActiveHours;
          console.log(`👤 Using user's active hours: ${userActiveHours}h (personalized, no sleep schedule)`);
        } else {
          console.log(`📋 Using default active hours: ${userActiveHours}h (no custom setting)`);
        }
      }
    } catch (profileError) {
      console.log('⚠️  Could not fetch user profile, using default active hours:', profileError.message);
    }
    
    // Log user-provided context (task name and activity label)
    if (userContext) {
      console.log('👤 User Context:', userContext);
    }

    // Calculate actual schedule intensity percentage from existing events
    // Use user's personalized active hours (default: 16 hours = 24 - 8 sleep)
    const WAKING_MINUTES = userActiveHours * 60;
    
    let intensityValue = 0.5; // default medium
    let actualBusyPercentage = 50;
    
    if (existingEvents && existingEvents.length > 0) {
      // Calculate actual busy time from events
      const now = new Date();
      const startOfDay = new Date(timeWindow.start);
      const endOfDay = new Date(timeWindow.end);
      
      // Log existing events for debugging
      console.log(`📋 Received ${existingEvents.length} existing events:`);
      existingEvents.forEach((event, idx) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const startTime = `${eventStart.getHours()}:${String(eventStart.getMinutes()).padStart(2, '0')}`;
        const endTime = `${eventEnd.getHours()}:${String(eventEnd.getMinutes()).padStart(2, '0')}`;
        const duration = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60));
        console.log(`   ${idx + 1}. ${startTime}-${endTime} (${duration} min) - ${event.summary || 'Untitled'}`);
      });
      
      // Calculate total busy minutes from all events
      let busyMinutes = 0;
      existingEvents.forEach(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
        busyMinutes += duration;
      });
      
      // Calculate intensity as ratio of busy time to user's waking hours
      intensityValue = busyMinutes / WAKING_MINUTES;
      actualBusyPercentage = Math.round(intensityValue * 100);
      console.log(`📊 Schedule Analysis:`);
      console.log(`   • Events: ${existingEvents.length} activities`);
      console.log(`   • Busy Time: ${busyMinutes} minutes (${(busyMinutes / 60).toFixed(1)} hours)`);
      console.log(`   • Intensity: ${actualBusyPercentage}% of ${userActiveHours}-hour waking day`);
      console.log(`   • Calculation: ${busyMinutes} min ÷ ${WAKING_MINUTES} min = ${intensityValue.toFixed(3)}`);
    } else {
      // Empty schedule - 0% busy
      intensityValue = 0;
      actualBusyPercentage = 0;
      console.log(`📭 Empty schedule: 0% busy - full ${userActiveHours}-hour waking day available`);
    }

    // Find available time windows (gaps between events)
    const availableWindows = findAvailableTimeWindows(
      existingEvents, 
      timeWindow,
      userWakeTime && userBedTime ? { wakeTime: userWakeTime, bedTime: userBedTime } : null
    );
    console.log(`📅 Found ${availableWindows.length} available time windows`);

    // Build context for mAIstro
    const aiContext = {
      scheduleIntensity,
      intensityValue,
      actualBusyPercentage, // Use actual percentage instead of hardcoded map
      moodScore: moodScore || 5,
      energyLevel: energyLevel || 'medium',
      stressLevel: stressLevel || 'medium',
      availableWindows: availableWindows.length,
      existingEventsCount: existingEvents.length,
      userProvidedContext: userContext // Include user's task name and label
    };

    // Generate activities using NeuralSeek mAIstro
    const activities = await generateActivitiesWithMaistro(
      aiContext,
      availableWindows,
      existingEvents
    );

    console.log(`✅ Generated ${activities.length} activities`);

    // NEW ARCHITECTURE: Return activities for client to sync to Google Calendar
    // No database storage - Calendar is the source of truth
    res.json({
      success: true,
      activities,
      reasoning: generateReasoningText(aiContext, activities),
      shouldSyncToCalendar: true, // Client should write these to Google Calendar
      context: aiContext,
      metadata: {
        generatedAt: new Date().toISOString(),
        targetDate: todayDate,
        userContext: userContext || null
      }
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
 * UPDATED: Now detects micro-windows (5+ min) for mental health support
 * Uses user's actual wake/bed time from profile instead of hardcoded bounds
 * Ensures proper buffers to prevent overlaps
 */
function findAvailableTimeWindows(existingEvents, timeWindow, userActiveHours = null) {
  const windows = [];
  const MIN_WINDOW_MINUTES = 5; // Minimum for micro-activities (breathing, hydration, etc)
  const BUFFER_MINUTES = 5; // Buffer before/after each existing event to prevent overlaps

  // Parse time window
  const dayStart = new Date(timeWindow.start);
  const dayEnd = new Date(timeWindow.end);

  // Use user's wake/bed time if available, otherwise use reasonable defaults (7 AM - 10 PM)
  let minHour = 7;
  let maxHour = 22;
  
  if (userActiveHours?.wakeTime && userActiveHours?.bedTime) {
    const [wakeHour] = userActiveHours.wakeTime.split(':').map(Number);
    const [bedHour] = userActiveHours.bedTime.split(':').map(Number);
    minHour = wakeHour;
    maxHour = bedHour;
    console.log(`⏰ Using user's active hours: ${userActiveHours.wakeTime} - ${userActiveHours.bedTime}`);
  } else {
    console.log(`⏰ Using default active hours: 07:00 - 22:00 (no user profile)`);
  }
  
  dayStart.setHours(Math.max(dayStart.getHours(), minHour), 0, 0, 0);
  dayEnd.setHours(Math.min(dayEnd.getHours(), maxHour), 0, 0, 0);

  // Sort events by start time and merge overlapping events
  const sortedEvents = existingEvents
    .map(e => ({
      start: new Date(e.start),
      end: new Date(e.end)
    }))
    .sort((a, b) => a.start - b.start);
  
  // Merge overlapping or adjacent events to get true busy blocks
  const mergedEvents = [];
  for (const event of sortedEvents) {
    if (mergedEvents.length === 0) {
      mergedEvents.push(event);
    } else {
      const lastEvent = mergedEvents[mergedEvents.length - 1];
      // Merge if events overlap or are within buffer distance
      if (event.start <= new Date(lastEvent.end.getTime() + BUFFER_MINUTES * 60000)) {
        lastEvent.end = new Date(Math.max(lastEvent.end.getTime(), event.end.getTime()));
      } else {
        mergedEvents.push(event);
      }
    }
  }

  console.log(`📊 Event merging: ${sortedEvents.length} events → ${mergedEvents.length} busy blocks (${BUFFER_MINUTES}min buffer applied)`);

  // Find gaps between merged events with buffers
  let currentTime = dayStart;

  for (const event of mergedEvents) {
    // Add buffer BEFORE the event
    const eventStartWithBuffer = new Date(event.start.getTime() - BUFFER_MINUTES * 60000);
    const gapMinutes = (eventStartWithBuffer - currentTime) / (1000 * 60);
    
    // Accept windows as small as MIN_WINDOW_MINUTES for micro-activities
    if (gapMinutes >= MIN_WINDOW_MINUTES) {
      const windowType = gapMinutes < 10 ? 'micro' : gapMinutes < 30 ? 'small' : gapMinutes < 60 ? 'medium' : 'large';
      windows.push({
        start: new Date(currentTime),
        end: new Date(eventStartWithBuffer),
        duration: Math.floor(gapMinutes),
        type: windowType // 'micro', 'small', 'medium', 'large'
      });
    }
    
    // Move current time to AFTER the event (with buffer)
    const eventEndWithBuffer = new Date(event.end.getTime() + BUFFER_MINUTES * 60000);
    currentTime = new Date(Math.max(currentTime.getTime(), eventEndWithBuffer.getTime()));
  }

  // Check gap after last event
  const finalGapMinutes = (dayEnd - currentTime) / (1000 * 60);
  if (finalGapMinutes >= MIN_WINDOW_MINUTES) {
    const windowType = finalGapMinutes < 10 ? 'micro' : finalGapMinutes < 30 ? 'small' : finalGapMinutes < 60 ? 'medium' : 'large';
    windows.push({
      start: new Date(currentTime),
      end: dayEnd,
      duration: Math.floor(finalGapMinutes),
      type: windowType
    });
  }

  console.log(`✅ Found ${windows.length} available windows: ${windows.filter(w => w.type === 'micro').length} micro, ${windows.filter(w => w.type === 'small').length} small, ${windows.filter(w => w.type === 'medium').length} medium, ${windows.filter(w => w.type === 'large').length} large`);

  return windows;
}

/**
 * Stage 1: Analyze schedule and determine activity strategy
 * Returns: activity types and count based on user's context
 */
async function determineActivityStrategy(context, availableWindows) {
  const { intensityValue, moodScore, energyLevel, stressLevel } = context;
  const totalAvailableMinutes = availableWindows.reduce((sum, w) => sum + w.duration, 0);

    const prompt = `Analyze this user's schedule and recommend activity types.

CONTEXT:
- Schedule: ${Math.round(intensityValue * 100)}% busy
- Mood: ${moodScore}/10, Energy: ${energyLevel}, Stress: ${stressLevel}
- Available: ${totalAvailableMinutes} min across ${availableWindows.length} time gaps

ACTIVITY TYPES (includes diverse fitness options):
BREATHING, HYDRATION, LIGHT_WALK, STRETCH, MEAL, NATURE, CREATIVE, SOCIAL, LEARNING, ORGANIZATION
FITNESS: WORKOUT, GYM, ROCK_CLIMBING, SWIMMING, CYCLING, YOGA, RUNNING

RULES:
- Overloaded (>75% busy): 3-5 activities, focus on BREATHING, HYDRATION, LIGHT_WALK (NO intense fitness)
- Busy (51-75%): 5-7 activities, add STRETCH, MEAL, YOGA
- Moderate (26-50%): 8-10 activities, add WORKOUT, GYM, CREATIVE, NATURE
- Open (<25%): 10-15 activities, VARY fitness types (GYM, ROCK_CLIMBING, SWIMMING, CYCLING, RUNNING), add SOCIAL, LEARNING
- High stress: prioritize BREATHING, NATURE, HYDRATION, YOGA, SWIMMING (avoid intense fitness)
- Low energy: avoid intense WORKOUT/GYM/RUNNING, prioritize HYDRATION, MEAL, gentle SWIMMING/YOGA
- High energy: include varied intense fitness (GYM, ROCK_CLIMBING, RUNNING, CYCLING)
- Empty schedule: SELECT 3-4 DIFFERENT fitness types for variety

Return ONLY the JSON object (no markdown, no code blocks):
{"activityTypes": ["BREATHING", "GYM", "SWIMMING"], "count": 12, "priority": "varied-fitness"}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for simple task

    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'embedcode': NS_EMBED_CODE },
      body: JSON.stringify({
        ntl: prompt,
        parameters: { temperature: 0.3, max_tokens: 500 } // Low temp for consistency, short response
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Strategy API error: ${response.status}`);

    const data = await response.json();
    
    // Clean up response - remove markdown code blocks
    let strategyText = data.answer || '{}';
    strategyText = strategyText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to parse, if it fails try to extract JSON object
    let strategy;
    try {
      strategy = JSON.parse(strategyText);
    } catch (parseError) {
      // Try to find JSON object in the text
      const jsonMatch = strategyText.match(/\{[^{}]*"activityTypes"[^{}]*\}/);
      if (jsonMatch) {
        strategy = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }
    
    // Validate strategy has required fields
    if (!strategy.activityTypes || !Array.isArray(strategy.activityTypes) || strategy.activityTypes.length === 0) {
      throw new Error('Invalid strategy: missing activityTypes array');
    }
    
    console.log('📊 Strategy determined:', strategy);
    return strategy;
  } catch (error) {
    console.error('❌ Strategy determination failed:', error);
    // Fallback to rule-based strategy
    return determineStrategyRuleBased(context, availableWindows);
  }
}

/**
 * Stage 2: Generate specific activities based on strategy
 */
async function generateActivitiesWithMaistro(context, availableWindows, existingEvents) {
  const { scheduleIntensity, intensityValue, moodScore, energyLevel, stressLevel } = context;

  console.log('🧠 Multi-stage activity generation starting...');

  // STAGE 1: Determine strategy
  const strategy = await determineActivityStrategy(context, availableWindows);
  
  if (!strategy.activityTypes || strategy.activityTypes.length === 0) {
    console.log('⚠️  No strategy returned, falling back to rule-based');
    return generateRuleBasedActivities(context, availableWindows);
  }

  // STAGE 2: Generate activities based on strategy
  const minBufferBetweenActivities = intensityValue > 0.75 ? 5 : intensityValue > 0.50 ? 10 : intensityValue > 0.25 ? 15 : 20;
  
  // Format existing events to show blocked times
  const blockedTimesDescription = existingEvents.length > 0
    ? existingEvents
        .map((event) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          const startTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          const endTime = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          return `${startTime}-${endTime} (${event.summary || 'Busy'})`;
        })
        .join(', ')
    : 'None';

  // Format windows with buffers
  const windowsDescription = availableWindows
    .map((w, i) => {
      let requiredBuffer;
      if (w.duration >= 120) requiredBuffer = Math.max(minBufferBetweenActivities, 15);
      else if (w.duration >= 60) requiredBuffer = Math.max(minBufferBetweenActivities, 10);
      else if (w.duration >= 30) requiredBuffer = 5;
      else requiredBuffer = 2;
      
      const usableStart = new Date(w.start.getTime() + requiredBuffer * 60000);
      const usableEnd = new Date(w.end.getTime() - requiredBuffer * 60000);
      const usableDuration = Math.floor((usableEnd - usableStart) / 60000);
      
      const startTime = usableStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endTime = usableEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${startTime}-${endTime} (${usableDuration} min)`;
    })
    .join(', ');

  const activityPrompt = `Generate ${strategy.count} wellness activities with VARIED FITNESS OPTIONS.

⛔ BLOCKED TIMES (existing calendar events - DO NOT SCHEDULE DURING THESE):
${blockedTimesDescription}

✅ AVAILABLE WINDOWS ONLY (schedule activities ONLY within these times):
${windowsDescription}

CRITICAL RULES:
1. Activities MUST be scheduled within the available windows shown above
2. Activities MUST NOT overlap with blocked times
3. Leave ${minBufferBetweenActivities}+ min between activities
4. If an activity cannot fit in any window, DO NOT include it

ACTIVITY TYPES TO USE: ${strategy.activityTypes.join(', ')}
PRIORITY: ${strategy.priority || 'balanced wellness'}

DURATIONS & EXAMPLES:
- BREATHING/HYDRATION: 5-10 min ("Box Breathing", "Water + Snack")
- LIGHT_WALK/STRETCH: 10-15 min ("Park Stroll", "Full Body Stretch")
- YOGA: 20-45 min ("Vinyasa Flow", "Restorative Yoga", "Power Yoga")
- GYM: 45-75 min ("Strength Training", "HIIT Session", "Leg Day", "Upper Body")
- ROCK_CLIMBING: 60-90 min ("Bouldering Session", "Top Rope Practice", "Lead Climbing")
- SWIMMING: 30-60 min ("Lap Swimming", "Water Aerobics", "Open Water Swim")
- CYCLING: 30-90 min ("Spin Class", "Road Ride", "Mountain Biking")
- RUNNING: 20-60 min ("5K Run", "Interval Training", "Trail Run", "Tempo Run")
- MEAL: 25-35 min ("Healthy Lunch", "Protein-Rich Breakfast")
- NATURE: 15-30 min ("Park Visit", "Garden Walk")
- CREATIVE: 20-45 min ("Journaling", "Drawing", "Music Practice")
- SOCIAL: 30-60 min ("Coffee with Friend", "Call Family")
- LEARNING: 30-60 min ("Read Book", "Online Course", "Podcast")
- ORGANIZATION: 15-30 min ("Tidy Workspace", "Plan Tomorrow")

IMPORTANT: 
- If multiple fitness types selected, USE DIFFERENT ONES (don't repeat GYM 3 times)
- Vary specific activities (e.g., "Bouldering" then "Lead Climbing", not "Rock Climbing" twice)
- Match duration to window size (don't schedule 90-min activity in 60-min window)

OUTPUT (JSON array only):
[
  {
    "type": "ROCK_CLIMBING",
    "title": "Bouldering Session",
    "startTime": "10:00",
    "endTime": "11:30",
    "durationSec": 5400,
    "description": "Indoor climbing - focus on technique and fun",
    "isBreathing": false
  },
  {
    "type": "SWIMMING",
    "title": "Lap Swimming",
    "startTime": "14:00",
    "endTime": "14:45",
    "durationSec": 2700,
    "description": "45 minutes freestyle and backstroke",
    "isBreathing": false
  }
]

Requirements:
- Use ONLY types from: ${strategy.activityTypes.join(', ')}
- Schedule within window times shown
- Leave ${minBufferBetweenActivities} min gaps
- Concrete, varied titles
- DIFFERENT fitness activities when multiple fitness types included`;

  try {
    console.log('🎯 Generating activities with selected types:', strategy.activityTypes);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for generation

    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'embedcode': NS_EMBED_CODE },
      body: JSON.stringify({
        ntl: activityPrompt,
        parameters: { temperature: 0.7, max_tokens: 2000 }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Activity generation error: ${response.status}`);

    const data = await response.json();
    console.log('✅ Activities generated');

    const activities = parseActivitiesFromMaistroResponse(data, availableWindows);
    console.log(`📦 Parsed ${activities.length} activities`);
    
    return validateAndConstrainActivities(
      activities, 
      availableWindows, 
      existingEvents, 
      context.intensityValue, 
      minBufferBetweenActivities
    );

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Activity generation timed out');
    } else {
      console.error('❌ Activity generation failed:', error);
    }
    
    console.log('⚠️  Falling back to rule-based generation');
    return generateRuleBasedActivities(context, availableWindows);
  }
}

/**
 * Rule-based strategy fallback
 * ENHANCED: Full activity type support with DIVERSE FITNESS OPTIONS
 * 
 * Activity Types:
 * - BREATHING, HYDRATION, LIGHT_WALK, STRETCH
 * - WORKOUT: General fitness
 * - GYM: Structured gym session
 * - ROCK_CLIMBING: Indoor/outdoor climbing
 * - SWIMMING: Pool or open water
 * - CYCLING: Road or stationary bike
 * - YOGA: Various styles
 * - RUNNING: Outdoor or treadmill
 * - MEAL, NATURE, CREATIVE, SOCIAL, LEARNING, ORGANIZATION
 */
function determineStrategyRuleBased(context, availableWindows) {
  const { intensityValue, stressLevel, energyLevel } = context;
  
  let activityTypes = [];
  let count = 5;
  let priority = 'balanced';

  if (intensityValue > 0.75) {
    // Overloaded: Essential wellness only (NO fitness when busy)
    activityTypes = ['BREATHING', 'HYDRATION', 'LIGHT_WALK', 'STRETCH'];
    count = 5;
    priority = 'essential-wellness';
  } else if (intensityValue > 0.50) {
    // Busy: Quick recharge activities (light fitness only)
    activityTypes = ['BREATHING', 'HYDRATION', 'LIGHT_WALK', 'STRETCH', 'YOGA', 'MEAL'];
    count = 7;
    priority = 'quick-recharge';
  } else if (intensityValue > 0.25) {
    // Moderate: Balanced wellness with structured fitness
    activityTypes = ['BREATHING', 'WORKOUT', 'GYM', 'YOGA', 'MEAL', 'NATURE', 'CREATIVE', 'STRETCH', 'HYDRATION'];
    count = 10;
    priority = 'balanced';
  } else {
    // Open: Comprehensive activities with DIVERSE fitness options
    // VARIETY: Randomly select 3-4 fitness types for today
    const fitnessOptions = ['GYM', 'ROCK_CLIMBING', 'SWIMMING', 'CYCLING', 'YOGA', 'RUNNING', 'WORKOUT'];
    const selectedFitness = shuffleArray(fitnessOptions).slice(0, 3 + Math.floor(Math.random() * 2)); // 3-4 types
    
    activityTypes = [
      ...selectedFitness,
      'MEAL', 'CREATIVE', 'NATURE', 'SOCIAL', 'LEARNING', 
      'BREATHING', 'ORGANIZATION', 'STRETCH', 'HYDRATION'
    ];
    count = 15;
    priority = 'comprehensive-varied';
    console.log(`🎲 Empty schedule - selected diverse fitness: ${selectedFitness.join(', ')}`);
  }

  // Stress-based adjustments
  if (stressLevel === 'high' || stressLevel === 'overwhelming') {
    // High stress: Remove intense fitness, add calming activities
    activityTypes = activityTypes.filter(t => 
      !['GYM', 'ROCK_CLIMBING', 'RUNNING', 'WORKOUT'].includes(t)
    );
    activityTypes = ['BREATHING', 'NATURE', 'HYDRATION', 'YOGA', 'SWIMMING', ...activityTypes];
    priority = 'stress-relief';
    count = Math.min(count, 8);
  }

  // Energy-based adjustments
  if (energyLevel === 'very_low' || energyLevel === 'low') {
    // Low energy: Remove all fitness except gentle yoga/swimming
    activityTypes = activityTypes.filter(t => 
      !['WORKOUT', 'GYM', 'ROCK_CLIMBING', 'RUNNING', 'CYCLING', 'SOCIAL'].includes(t)
    );
    activityTypes.unshift('HYDRATION', 'MEAL', 'BREATHING');
    if (!activityTypes.includes('SWIMMING')) activityTypes.push('SWIMMING'); // Gentle on joints
    if (!activityTypes.includes('YOGA')) activityTypes.push('YOGA'); // Restorative
    priority = 'energy-restoration';
  }

  // High energy: Boost active/intense fitness
  if (energyLevel === 'high' || energyLevel === 'very_high') {
    const intenseFitness = ['GYM', 'ROCK_CLIMBING', 'RUNNING', 'CYCLING', 'WORKOUT'];
    intenseFitness.forEach(type => {
      if (!activityTypes.includes(type)) activityTypes.unshift(type);
    });
    if (!activityTypes.includes('SOCIAL')) activityTypes.push('SOCIAL');
    if (!activityTypes.includes('CREATIVE')) activityTypes.push('CREATIVE');
  }

  return {
    activityTypes: [...new Set(activityTypes)], // Dedupe
    count,
    priority
  };
}

/**
 * Helper: Shuffle array for randomization
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Parse activities from mAIstro response
 * Handles incomplete JSON arrays by extracting valid objects
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

    // Remove markdown code block markers if present
    activitiesText = activitiesText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Try to find complete JSON array first
    let jsonMatch = activitiesText.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        const activities = JSON.parse(jsonMatch[0]);
        console.log(`✅ Parsed complete JSON array with ${activities.length} activities`);
        
        // Add IDs and status to each activity
        return activities.map(activity => ({
          id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...activity,
          status: 'PENDING',
          isBreathing: activity.type === 'BREATHING'
        }));
      } catch (parseError) {
        console.warn('⚠️  JSON array found but failed to parse, trying object extraction...');
      }
    }
    
    // Fallback: Extract individual activity objects (handles incomplete arrays)
    console.log('⚠️  No complete JSON array found, extracting individual objects...');
    const objectMatches = activitiesText.matchAll(/\{[^}]*"type"[^}]*\}/g);
    const activities = [];
    
    for (const match of objectMatches) {
      try {
        const activity = JSON.parse(match[0]);
        if (activity.type && activity.title && activity.startTime && activity.endTime) {
          activities.push({
            id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...activity,
            status: 'PENDING',
            isBreathing: activity.type === 'BREATHING'
          });
        }
      } catch (err) {
        console.warn('⚠️  Failed to parse activity object:', match[0].substring(0, 100));
      }
    }
    
    if (activities.length > 0) {
      console.log(`✅ Extracted ${activities.length} activities from incomplete response`);
      return activities;
    }

    console.warn('⚠️  No valid activities found in response');
    return [];

  } catch (error) {
    console.error('❌ Failed to parse mAIstro response:', error);
    console.error('Raw response:', JSON.stringify(data).substring(0, 500));
    return [];
  }
}

/**
 * Validate and constrain activities to ensure they fit properly
 * NO HARD LIMIT - let schedule intensity dictate quantity
 */
function validateAndConstrainActivities(activities, availableWindows, existingEvents, intensityValue = 0.5, minBuffer = 10) {
  const validated = [];
  
  // Determine max activities based on intensity (dynamic, not fixed)
  let maxActivitiesForIntensity;
  if (intensityValue > 0.75) {
    maxActivitiesForIntensity = 5; // Overloaded: breathing + water + quick walks
  } else if (intensityValue > 0.50) {
    maxActivitiesForIntensity = 7; // Busy: quick activities + light movement
  } else if (intensityValue > 0.25) {
    maxActivitiesForIntensity = 10; // Moderate: balanced mix
  } else {
    maxActivitiesForIntensity = 15; // Open: comprehensive activities
  }

  console.log(`📋 Validating activities (max ${maxActivitiesForIntensity} for ${Math.round(intensityValue * 100)}% intensity)...`);

  for (const activity of activities) {
    if (validated.length >= maxActivitiesForIntensity) {
      console.log(`⚠️  Reached max activities (${maxActivitiesForIntensity}) for this intensity level`);
      break;
    }

    // Validate required fields
    if (!activity.startTime || !activity.endTime || !activity.title) {
      console.warn('⚠️  Skipping activity with missing fields:', activity.title);
      continue;
    }

    // Check if activity fits in an available window (with adaptive buffer)
    const fitsInWindow = checkIfActivityFitsInWindow(activity, availableWindows, minBuffer);
    if (!fitsInWindow) {
      console.warn('⚠️  Skipping activity that doesn\'t fit in any window:', activity.title);
      continue;
    }

    // Check no overlap with existing events
    const hasOverlap = checkForOverlap(activity, existingEvents);
    if (hasOverlap) {
      console.warn('⚠️  ❌ REJECTED: Activity overlaps with existing event:', activity.title);
      continue;
    }

    // Check spacing between validated activities (use minBuffer)
    const hasProperSpacing = checkSpacingBetweenActivities(activity, validated, minBuffer);
    if (!hasProperSpacing) {
      console.warn(`⚠️  Skipping activity too close to another (needs ${minBuffer} min buffer):`, activity.title);
      continue;
    }

    validated.push(activity);
  }

  console.log(`✅ Validated ${validated.length} activities`);
  return validated;
}

/**
 * Check if activity fits within available time windows
 * Uses adaptive buffer based on window size and provided minBuffer
 */
function checkIfActivityFitsInWindow(activity, availableWindows, minBuffer = 10) {
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
    
    // Adaptive buffer: use minBuffer from intensity, but allow smaller buffers for micro-windows
    let requiredBuffer;
    if (window.duration >= 120) {
      // Large window (2+ hours): use full minBuffer
      requiredBuffer = Math.max(minBuffer, 15);
    } else if (window.duration >= 60) {
      // Medium window (1-2 hours): standard buffer
      requiredBuffer = Math.max(minBuffer, 10);
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
 * Enhanced with proper date+time comparison using ISO timestamps
 */
function checkForOverlap(activity, existingEvents) {
  // Validate activity has required fields
  if (!activity.startTime || !activity.endTime) {
    console.warn('⚠️  Activity missing time fields:', activity.title);
    return true; // Treat as overlap to skip invalid activities
  }

  const [actStartHour, actStartMin] = activity.startTime.split(':').map(Number);
  const [actEndHour, actEndMin] = activity.endTime.split(':').map(Number);
  
  // Validate parsed time values
  if (isNaN(actStartHour) || isNaN(actStartMin) || isNaN(actEndHour) || isNaN(actEndMin)) {
    console.warn('⚠️  Invalid time format for activity:', activity.title, activity.startTime, activity.endTime);
    return true; // Treat as overlap to skip invalid activities
  }
  
  const actStartMinutes = actStartHour * 60 + actStartMin;
  const actEndMinutes = actEndHour * 60 + actEndMin;
  
  // Validate activity duration
  if (actEndMinutes <= actStartMinutes) {
    console.warn('⚠️  Invalid activity duration (end before/equal start):', activity.title);
    return true;
  }
  
  for (const event of existingEvents) {
    // Validate event has required fields
    if (!event.start || !event.end) {
      console.warn('⚠️  Existing event missing time fields, skipping overlap check');
      continue;
    }
    
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Validate dates
    if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
      console.warn('⚠️  Invalid date format for existing event:', event);
      continue;
    }
    
    const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
    const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
    
    // Check for any overlap
    // Overlap exists if: activity starts before event ends AND activity ends after event starts
    const hasOverlap = actStartMinutes < eventEndMinutes && actEndMinutes > eventStartMinutes;
    
    if (hasOverlap) {
      const eventSummary = event.summary || 'Unnamed Event';
      const eventTimeStr = `${Math.floor(eventStartMinutes/60)}:${String(eventStartMinutes%60).padStart(2,'0')}-${Math.floor(eventEndMinutes/60)}:${String(eventEndMinutes%60).padStart(2,'0')}`;
      console.log(`⚠️  OVERLAP DETECTED: "${activity.title}" (${activity.startTime}-${activity.endTime}) conflicts with "${eventSummary}" (${eventTimeStr})`);
      return true;
    }
  }
  
  return false;
}

/**
 * Check spacing between activities to ensure proper buffer
 * Ensures minBuffer minutes between end of one activity and start of next
 */
function checkSpacingBetweenActivities(newActivity, validatedActivities, minBuffer = 10) {
  const [newStartHour, newStartMin] = newActivity.startTime.split(':').map(Number);
  const [newEndHour, newEndMin] = newActivity.endTime.split(':').map(Number);
  const newStartMinutes = newStartHour * 60 + newStartMin;
  const newEndMinutes = newEndHour * 60 + newEndMin;
  
  for (const existingActivity of validatedActivities) {
    const [exStartHour, exStartMin] = existingActivity.startTime.split(':').map(Number);
    const [exEndHour, exEndMin] = existingActivity.endTime.split(':').map(Number);
    const exStartMinutes = exStartHour * 60 + exStartMin;
    const exEndMinutes = exEndHour * 60 + exEndMin;
    
    // Check spacing: need minBuffer minutes between activities
    // Case 1: New activity comes after existing - check gap after existing
    if (newStartMinutes >= exEndMinutes) {
      const gapAfter = newStartMinutes - exEndMinutes;
      if (gapAfter < minBuffer) {
        return false; // Too close
      }
    }
    
    // Case 2: New activity comes before existing - check gap before existing
    if (newEndMinutes <= exStartMinutes) {
      const gapBefore = exStartMinutes - newEndMinutes;
      if (gapBefore < minBuffer) {
        return false; // Too close
      }
    }
    
    // Case 3: Activities overlap (shouldn't happen if overlap check passed)
    if (newStartMinutes < exEndMinutes && newEndMinutes > exStartMinutes) {
      return false; // Overlapping
    }
  }
  
  return true; // Proper spacing maintained
}

/**
 * Fallback: Generate rule-based activities if AI fails
 */
function generateRuleBasedActivities(context, availableWindows) {
  const { scheduleIntensity, moodScore, energyLevel, stressLevel } = context;
  const activities = [];

  // Sort windows by duration (largest first)
  const sortedWindows = [...availableWindows].sort((a, b) => b.duration - a.duration);

  // High stress or busy schedule: calming activities prioritized (including micro-activities)
  if (stressLevel === 'high' || scheduleIntensity === 'high') {
    for (let i = 0; i < sortedWindows.length; i++) {
      if (activities.length >= 6) break; // Increased from 4 to allow more micro-activities
      
      const window = sortedWindows[i];
      
      // Micro-windows (5-10 min): Ultra-quick calming activities
      if (window.duration >= 5 && window.duration < 10 && activities.filter(a => a.type === 'BREATHING' && a.durationSec <= 300).length < 3) {
        const startTime = new Date(window.start.getTime() + 1 * 60000); // 1-min buffer for micro
        const duration = Math.min(5, window.duration - 2); // Max 5 min
        activities.push({
          id: `fallback-${Date.now()}-micro-breathing-${i}`,
          type: 'BREATHING',
          title: `${duration}-min Quick Calm`,
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + duration * 60000)),
          durationSec: duration * 60,
          description: 'Ultra-quick breathing: 3 deep breaths, reset your nervous system',
          isBreathing: true,
          status: 'PENDING'
        });
      }
      // Small windows (10-20 min): Quick calming activities
      else if (window.duration >= 10 && window.duration < 20 && activities.filter(a => a.type === 'HYDRATION').length < 2) {
        const startTime = new Date(window.start.getTime() + 2 * 60000); // 2-min buffer
        const duration = Math.min(8, window.duration - 4);
        activities.push({
          id: `fallback-${Date.now()}-hydration-${i}`,
          type: 'HYDRATION',
          title: `${duration}-min Water Break`,
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + duration * 60000)),
          durationSec: duration * 60,
          description: 'Drink water slowly, hydration reduces stress',
          isBreathing: false,
          status: 'PENDING'
        });
      }
      // Regular windows (20+ min)
      else if (window.duration >= 20 && activities.filter(a => a.type === 'BREATHING' && a.durationSec > 300).length < 2) {
        const startTime = new Date(window.start.getTime() + 5 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-${i}`,
          type: 'BREATHING',
          title: '10-min Calm Break',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 10 * 60000)),
          durationSec: 600,
          description: 'Box breathing: Inhale 4, hold 4, exhale 4, hold 4',
          isBreathing: true,
          status: 'PENDING'
        });
      } else if (window.duration >= 15 && activities.filter(a => a.type === 'SENSORY').length === 0) {
        const startTime = new Date(window.start.getTime() + 2 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-sensory`,
          type: 'SENSORY',
          title: '10-min Sensory Reset',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 10 * 60000)),
          durationSec: 600,
          description: 'Find a quiet space, dim lights, noise-canceling headphones if available',
          isBreathing: false,
          status: 'PENDING'
        });
      }
    }
  } 
  // Low mood: activities proven to boost mood
  else if (moodScore < 4) {
    for (const window of sortedWindows) {
      if (activities.length >= 5) break;
      
      if (window.duration >= 45 && activities.filter(a => a.type === 'NATURE').length === 0) {
        const startTime = new Date(window.start.getTime() + 15 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-nature`,
          type: 'NATURE',
          title: '20-min Nature Walk',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 20 * 60000)),
          durationSec: 1200,
          description: 'Walk outside, notice trees, sky, birds. Nature improves mood significantly.',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 30 && activities.filter(a => a.type === 'SOCIAL').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-social`,
          type: 'SOCIAL',
          title: '15-min Friend Check-in',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 15 * 60000)),
          durationSec: 900,
          description: 'Text or call a friend. Social connection reduces depression.',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 35 && activities.filter(a => a.type === 'CREATIVE').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-creative`,
          type: 'CREATIVE',
          title: '20-min Creative Expression',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 20 * 60000)),
          durationSec: 1200,
          description: 'Doodle, journal, play music - whatever feels creative to you',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 25 && activities.filter(a => a.type === 'WORKOUT').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-workout`,
          type: 'WORKOUT',
          title: '15-min Movement',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 15 * 60000)),
          durationSec: 900,
          description: 'Gentle exercise releases endorphins. Walk, stretch, or dance.',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 20) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-breathing-${activities.length}`,
          type: 'BREATHING',
          title: '10-min Meditation',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 10 * 60000)),
          durationSec: 600,
          description: 'Guided meditation helps process emotions',
          isBreathing: true,
          status: 'PENDING'
        });
      }
    }
  }
  // Low energy: gentle restoration with energy boosts
  else if (energyLevel === 'low') {
    for (const window of sortedWindows) {
      if (activities.length >= 4) break;
      
      if (window.duration >= 20 && activities.filter(a => a.type === 'HYDRATION').length === 0) {
        const startTime = new Date(window.start.getTime() + 5 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-hydration`,
          type: 'HYDRATION',
          title: 'Water + Snack Break',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 10 * 60000)),
          durationSec: 600,
          description: 'Drink water and have a healthy snack for energy',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 25 && activities.filter(a => a.type === 'ENERGY_BOOST').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-energy`,
          type: 'ENERGY_BOOST',
          title: '5-min Energy Boost',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 5 * 60000)),
          durationSec: 300,
          description: 'Cold water splash, light stretches, or 10 jumping jacks',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 35 && activities.filter(a => a.type === 'MEAL').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-meal`,
          type: 'MEAL',
          title: 'Nourishing Meal',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 25 * 60000)),
          durationSec: 1500,
          description: 'Protein + complex carbs for sustained energy',
          isBreathing: false,
          status: 'PENDING'
        });
      } else if (window.duration >= 20) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-breathing-${activities.length}`,
          type: 'BREATHING',
          title: 'Restorative Breathing',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 10 * 60000)),
          durationSec: 600,
          description: 'Gentle breathing to restore energy without exhaustion',
          isBreathing: true,
          status: 'PENDING'
        });
      }
    }
  } 
  // Balanced schedule: diverse wellness activities
  else {
    let activityCount = 0;
    
    for (const window of sortedWindows) {
      if (activityCount >= 5) break;
      
      if (window.duration >= 60 && activityCount === 0) {
        // Add workout in longest window
        const startTime = new Date(window.start.getTime() + 15 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-workout`,
          type: 'WORKOUT',
          title: '30-min Active Session',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 30 * 60000)),
          durationSec: 1800,
          description: 'Yoga, strength training, or cardio - your choice',
          isBreathing: false,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 35 && activities.filter(a => a.type === 'MEAL').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-meal`,
          type: 'MEAL',
          title: 'Mindful Meal',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 25 * 60000)),
          durationSec: 1500,
          description: 'Eat slowly, savor flavors, no screens',
          isBreathing: false,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 30 && activities.filter(a => a.type === 'ORGANIZATION').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-organize`,
          type: 'ORGANIZATION',
          title: '15-min Tidy & Plan',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 15 * 60000)),
          durationSec: 900,
          description: 'Clear desk, review calendar, plan tomorrow',
          isBreathing: false,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 25 && activities.filter(a => a.type === 'LEARNING').length === 0) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-learning`,
          type: 'LEARNING',
          title: '15-min Learning',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 15 * 60000)),
          durationSec: 900,
          description: 'Read article, watch tutorial, or listen to podcast',
          isBreathing: false,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 20) {
        const startTime = new Date(window.start.getTime() + 10 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-breathing-${activityCount}`,
          type: 'BREATHING',
          title: '10-min Mindfulness',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 10 * 60000)),
          durationSec: 600,
          description: 'Meditation or breathing exercise for mental clarity',
          isBreathing: true,
          status: 'PENDING'
        });
        activityCount++;
      } else if (window.duration >= 12 && activities.filter(a => a.type === 'TRANSITION').length === 0) {
        const startTime = new Date(window.start.getTime() + 5 * 60000);
        activities.push({
          id: `fallback-${Date.now()}-transition`,
          type: 'TRANSITION',
          title: '5-min Transition Buffer',
          startTime: formatTime(startTime),
          endTime: formatTime(new Date(startTime.getTime() + 5 * 60000)),
          durationSec: 300,
          description: 'Mental reset: step away, stretch, shift focus',
          isBreathing: false,
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
 * UPDATED: Now accepts dateString parameter to use correct date instead of hardcoded
 */
async function storeActivitiesInDatabase(userId, activities, userContext = null, dateString = null) {
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

    // Use provided dateString or fallback to today
    const targetDate = dateString || new Date().toISOString().split('T')[0];

    const records = activities.map(activity => ({
      user_id: actualUserId,
      activity_type: activity.type,
      title: activity.title,
      description: activity.description,
      start_time: new Date(`${targetDate}T${activity.startTime}:00`),
      end_time: new Date(`${targetDate}T${activity.endTime}:00`),
      duration_sec: activity.durationSec,
      status: 'PENDING',
      metadata: userContext ? {
        user_task_name: userContext.taskName,
        user_activity_label: userContext.activityLabel,
        manually_added: true
      } : null
    }));

    const { data, error } = await supabase
      .from('agentic_activities')
      .insert(records);

    if (error) {
      console.error('❌ Database insert error:', error);
    } else {
      console.log(`✅ Stored ${records.length} activities in database for ${targetDate}`);
      if (userContext) {
        console.log('📝 Included user context:', userContext);
      }
    }
  } catch (error) {
    console.error('❌ Store activities error:', error);
  }
}

/**
 * Check if activities already exist for a given date
 * Prevents duplicate generation when user refreshes
 */
async function checkIfActivitiesExistForDate(userId, dateString) {
  try {
    // Convert email to UUID if needed
    let actualUserId = userId;
    
    if (userId && userId.includes('@')) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', userId)
        .single();
      
      if (userData) {
        actualUserId = userData.id;
      } else {
        // User doesn't exist yet, so no activities exist
        return { exists: false, activities: [] };
      }
    }

    // Check if activities exist for this date
    const startOfDay = new Date(`${dateString}T00:00:00`);
    const endOfDay = new Date(`${dateString}T23:59:59`);

    const { data, error } = await supabase
      .from('agentic_activities')
      .select('*')
      .eq('user_id', actualUserId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ Error checking existing activities:', error);
      return { exists: false, activities: [] };
    }

    if (data && data.length > 0) {
      // Convert database records to activity format
      const activities = data.map(record => ({
        id: record.id,
        type: record.activity_type,
        title: record.title,
        description: record.description,
        startTime: new Date(record.start_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        }),
        endTime: new Date(record.end_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        }),
        durationSec: record.duration_sec,
        isBreathing: record.activity_type === 'BREATHING',
        status: record.status
      }));

      return { exists: true, activities };
    }

    return { exists: false, activities: [] };
  } catch (error) {
    console.error('❌ Check existing activities error:', error);
    return { exists: false, activities: [] };
  }
}

/**
 * Clear activities for a specific date
 * Helper function used by force regeneration
 */
async function clearActivitiesForDate(userId, dateString) {
  try {
    // Convert email to UUID if needed
    let actualUserId = userId;
    
    if (userId.includes('@')) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', userId)
        .single();
      
      if (!userData) {
        console.error('❌ User not found for clearing activities');
        return false;
      }
      
      actualUserId = userData.id;
    }

    const startOfDay = new Date(`${dateString}T00:00:00`);
    const endOfDay = new Date(`${dateString}T23:59:59`);

    const { error } = await supabase
      .from('agentic_activities')
      .delete()
      .eq('user_id', actualUserId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    if (error) {
      console.error('❌ Error clearing activities:', error);
      return false;
    }

    console.log(`🗑️  Cleared activities for ${dateString}`);
    return true;
  } catch (error) {
    console.error('❌ Clear activities helper error:', error);
    return false;
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

/**
 * Clear activities for a specific date
 * POST /agentic/clear-activities
 * Allows user to regenerate activities if needed
 */
router.post('/clear-activities', async (req, res) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, date'
      });
    }

    // Convert email to UUID if needed
    let actualUserId = userId;
    
    if (userId.includes('@')) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', userId)
        .single();
      
      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      actualUserId = userData.id;
    }

    // Delete activities for the specified date
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const { data, error } = await supabase
      .from('agentic_activities')
      .delete()
      .eq('user_id', actualUserId)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    if (error) {
      console.error('❌ Error clearing activities:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    console.log(`🗑️  Cleared activities for user ${userId} on ${date}`);

    res.json({
      success: true,
      message: `Activities cleared for ${date}. Generate new activities to refresh.`
    });

  } catch (error) {
    console.error('❌ Clear activities error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
