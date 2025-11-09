/**
 * Google Calendar Optimizer Service - Agentic Workflow
 * 
 * Purpose: Intelligently reorganize Google Calendar events using NeuralSeek mAIstro
 *          based on mood analysis, schedule intensity, and neurodivergent needs
 * 
 * Key Features:
 *   - Analyzes schedule density and identifies optimization opportunities
 *   - Uses mAIstro to generate context-aware recommendations
 *   - Respects energy windows, buffer policies, and sensory preferences
 *   - Creates/moves/deletes events to optimize cognitive load
 * 
 * Agentic Workflow:
 *   1. Fetch current calendar state (Google Calendar API)
 *   2. Calculate schedule intensity and identify gaps
 *   3. Get latest mood + neuro profile from database
 *   4. Ask mAIstro for optimization strategy
 *   5. Execute calendar changes (move/create/delete events)
 *   6. Generate adaptive activities (breathing, meals, workouts)
 *   7. Return optimization summary
 * 
 * @module services/calendar-optimizer
 */

import fetch from "node-fetch";
import { NS_CONFIG, getNeuralSeekHeaders } from "../config/neuralseek.js";
import { supabase } from "../config/database.js";

/**
 * Calculate schedule intensity from busy blocks
 * 
 * @param {Array} busyBlocks - Array of {start, end} time blocks
 * @param {Date} dayStart - Start of day to analyze
 * @param {Date} dayEnd - End of day to analyze
 * @param {Object} sleepSchedule - {usualWake: "07:30", usualBed: "23:30"}
 * @returns {Object} {level: 'low'|'medium'|'high', ratio, busyMinutes, totalMinutes}
 */
function calculateScheduleIntensity(busyBlocks, dayStart, dayEnd, sleepSchedule = null) {
  let effectiveStart = dayStart;
  let effectiveEnd = dayEnd;
  
  // Only consider waking hours if sleep schedule provided
  if (sleepSchedule) {
    const [wakeHour, wakeMin] = sleepSchedule.usualWake.split(':').map(Number);
    const [bedHour, bedMin] = sleepSchedule.usualBed.split(':').map(Number);
    
    const wakeTime = new Date(dayStart);
    wakeTime.setHours(wakeHour, wakeMin, 0, 0);
    
    const bedTime = new Date(dayStart);
    bedTime.setHours(bedHour, bedMin, 0, 0);
    
    effectiveStart = Math.max(dayStart.getTime(), wakeTime.getTime());
    effectiveEnd = Math.min(dayEnd.getTime(), bedTime.getTime());
  }
  
  const totalMinutes = (effectiveEnd - effectiveStart) / (1000 * 60);
  
  // Calculate busy time
  let busyMinutes = 0;
  for (const block of busyBlocks) {
    const blockStart = new Date(block.start).getTime();
    const blockEnd = new Date(block.end).getTime();
    
    // Only count time within waking hours
    const countStart = Math.max(blockStart, effectiveStart);
    const countEnd = Math.min(blockEnd, effectiveEnd);
    
    if (countStart < countEnd) {
      busyMinutes += (countEnd - countStart) / (1000 * 60);
    }
  }
  
  const ratio = busyMinutes / totalMinutes;
  
  // Classify intensity
  let level = 'low';
  if (ratio > 0.70) level = 'high';
  else if (ratio > 0.40) level = 'medium';
  
  return { level, ratio, busyMinutes, totalMinutes };
}

/**
 * Find available gaps in calendar
 * 
 * @param {Array} busyBlocks - Sorted array of busy time blocks
 * @param {Date} dayStart - Start of analysis window
 * @param {Date} dayEnd - End of analysis window
 * @param {Array} energyWindows - User's peak energy times
 * @returns {Array} Array of gap objects with start, end, minutes, inEnergyWindow
 */
function findAvailableGaps(busyBlocks, dayStart, dayEnd, energyWindows = []) {
  const gaps = [];
  let currentTime = new Date(dayStart);
  
  // Sort busy blocks chronologically
  const sortedBlocks = [...busyBlocks].sort((a, b) => 
    new Date(a.start) - new Date(b.start)
  );
  
  for (const block of sortedBlocks) {
    const blockStart = new Date(block.start);
    const gapMinutes = (blockStart - currentTime) / (1000 * 60);
    
    if (gapMinutes >= 10) { // Only consider gaps 10+ minutes
      // Check if gap overlaps with energy windows
      const overlapsEnergy = energyWindows.some(window => {
        const [startHour, startMin] = window.start.split(':').map(Number);
        const [endHour, endMin] = window.end.split(':').map(Number);
        
        const windowStart = new Date(currentTime);
        windowStart.setHours(startHour, startMin, 0, 0);
        
        const windowEnd = new Date(currentTime);
        windowEnd.setHours(endHour, endMin, 0, 0);
        
        return currentTime < windowEnd && blockStart > windowStart;
      });
      
      gaps.push({
        start: currentTime.toISOString(),
        end: blockStart.toISOString(),
        minutes: Math.floor(gapMinutes),
        inEnergyWindow: overlapsEnergy
      });
    }
    
    currentTime = new Date(block.end);
  }
  
  // Check final gap after last event
  const endTime = new Date(dayEnd);
  if (currentTime < endTime) {
    const finalGapMinutes = (endTime - currentTime) / (1000 * 60);
    if (finalGapMinutes >= 10) {
      gaps.push({
        start: currentTime.toISOString(),
        end: endTime.toISOString(),
        minutes: Math.floor(finalGapMinutes),
        inEnergyWindow: false
      });
    }
  }
  
  return gaps;
}

/**
 * Generate breathing session activity
 */
function createBreathingActivity(gap, profile) {
  const duration = Math.min(gap.minutes, 10);
  
  return {
    type: 'breathing',
    summary: `🫁 Breathing Break (${duration} min)`,
    description: 'Calm your nervous system with guided breathing',
    duration,
    startISO: gap.start,
    endISO: new Date(new Date(gap.start).getTime() + duration * 60000).toISOString(),
    microSteps: [
      'Find a quiet, comfortable spot',
      'Put on headphones (optional)',
      'Start breathing session',
      'Follow the audio guide'
    ],
    reminders: [
      { method: 'popup', minutes: 10 },
      { method: 'popup', minutes: 3 },
      { method: 'popup', minutes: 1 }
    ],
    colorId: '7', // Peacock blue for calming activities
    needsTTS: true
  };
}

/**
 * Generate movement activity
 */
function createMovementActivity(gap, profile, intensity) {
  const isFullWorkout = gap.minutes >= 60 && intensity === 'low' && gap.inEnergyWindow;
  
  if (isFullWorkout) {
    const duration = Math.min(gap.minutes - 20, 45); // Leave 20min buffer
    return {
      type: 'workout',
      summary: `💪 Workout (${duration} min)`,
      description: 'Full workout during peak energy window',
      duration,
      startISO: gap.start,
      endISO: new Date(new Date(gap.start).getTime() + duration * 60000).toISOString(),
      microSteps: [
        'Change into workout clothes',
        'Set up workout space',
        'Start workout routine',
        'Cool down and stretch',
        'Shower and change'
      ],
      reminders: [
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 3 }
      ],
      colorId: '11' // Red for high-energy activities
    };
  } else {
    // Movement snack
    const duration = Math.min(gap.minutes, 15);
    return {
      type: 'movement_snack',
      summary: `🚶 Movement Break (${duration} min)`,
      description: 'Quick movement to reset energy',
      duration,
      startISO: gap.start,
      endISO: new Date(new Date(gap.start).getTime() + duration * 60000).toISOString(),
      microSteps: [
        'Stand up and stretch',
        'Take a 10-minute walk',
        'Fill water bottle',
        'Return refreshed'
      ],
      reminders: [
        { method: 'popup', minutes: 5 },
        { method: 'popup', minutes: 1 }
      ],
      colorId: '10' // Green for movement
    };
  }
}

/**
 * Generate meal activity
 */
function createMealActivity(gap, profile, mealType) {
  const duration = 30;
  
  return {
    type: 'meal',
    summary: `🍽️ ${mealType} (${duration} min)`,
    description: 'Time to nourish your body',
    duration,
    startISO: gap.start,
    endISO: new Date(new Date(gap.start).getTime() + duration * 60000).toISOString(),
    microSteps: [
      'Get ingredients from fridge',
      'Prepare meal (15 min max)',
      'Eat mindfully (15 min)',
      'Clean up quickly (5 min)'
    ],
    reminders: [
      { method: 'popup', minutes: 10 },
      { method: 'popup', minutes: 3 }
    ],
    colorId: '6' // Orange for meals
  };
}

/**
 * Ask mAIstro for calendar optimization strategy
 * 
 * @param {Object} context - Full context for AI decision
 * @returns {Promise<Object>} Optimization recommendations
 */
async function getOptimizationStrategy(context) {
  const {
    userId,
    moodData,
    scheduleIntensity,
    gaps,
    existingEvents,
    neuroProfile,
    currentTime
  } = context;
  
  const prompt = `You are an AI agent helping a neurodivergent individual (ADHD/Anxiety) optimize their calendar for today.

**Current State:**
- Time: ${new Date(currentTime).toLocaleTimeString()}
- Mood Score: ${moodData.moodScore}/10
- Energy Level: ${moodData.energyLevel}
- Stress Level: ${moodData.stressLevel}
- Schedule Intensity: ${scheduleIntensity.level} (${Math.round(scheduleIntensity.ratio * 100)}% busy)
- Busy Minutes: ${scheduleIntensity.busyMinutes} / ${scheduleIntensity.totalMinutes} waking minutes

**Available Gaps:**
${gaps.map(g => `- ${g.minutes} min at ${new Date(g.start).toLocaleTimeString()} ${g.inEnergyWindow ? '(PEAK ENERGY)' : ''}`).join('\n')}

**User Preferences:**
- Energy Windows: ${neuroProfile.energyWindows?.map(w => `${w.start}-${w.end}`).join(', ') || 'Not set'}
- Buffer Before: ${neuroProfile.bufferPolicy?.before || 10} min
- Buffer After: ${neuroProfile.bufferPolicy?.after || 5} min
- Sensory: Reduced animation=${neuroProfile.sensory?.reducedAnimation}, Silent mode=${neuroProfile.sensory?.silentMode}

**Existing Calendar Events Today:**
${existingEvents.slice(0, 10).map(e => `- ${e.summary} (${new Date(e.start.dateTime || e.start.date).toLocaleTimeString()})`).join('\n')}

**Your Task:**
Analyze this data and provide optimization recommendations. Consider:
1. Should we add breathing breaks during high-stress periods?
2. Can we insert movement snacks or meals in appropriate gaps?
3. Should any events be moved to better align with energy windows?
4. Are there too many events clustered together (buffer violations)?

Return JSON with:
{
  "assessment": "Brief analysis of current schedule",
  "actions": [
    {
      "type": "create|move|delete",
      "activity": "breathing|movement|meal|workout",
      "reason": "Why this helps",
      "gapIndex": 0,
      "priority": "high|medium|low"
    }
  ],
  "recommendations": ["Specific advice for user"]
}`;

  try {
    const response = await fetch(NS_CONFIG.MAISTRO_ENDPOINT, {
      method: "POST",
      headers: getNeuralSeekHeaders(),
      body: JSON.stringify({
        ntl: prompt,
        context: { 
          userId, 
          moodScore: moodData.moodScore,
          scheduleIntensity: scheduleIntensity.level
        },
        parameters: { 
          temperature: 0.7, 
          response_format: "json",
          max_tokens: 1000
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`mAIstro API error: ${response.statusText}`);
    }

    const data = await response.json();
    const strategy = typeof data.answer === "string" ? JSON.parse(data.answer) : data.answer;
    
    console.log('✅ mAIstro optimization strategy generated');
    return strategy;
    
  } catch (err) {
    console.error("❌ mAIstro optimization error:", err);
    
    // Fallback strategy based on rules
    return generateFallbackStrategy(context);
  }
}

/**
 * Fallback optimization strategy when mAIstro is unavailable
 */
function generateFallbackStrategy(context) {
  const { scheduleIntensity, moodData, gaps } = context;
  const actions = [];
  
  // High intensity: breathing breaks only
  if (scheduleIntensity.level === 'high') {
    gaps.filter(g => g.minutes >= 5 && g.minutes < 20).forEach((gap, idx) => {
      actions.push({
        type: 'create',
        activity: 'breathing',
        reason: 'High schedule density detected - breathing break to reduce stress',
        gapIndex: idx,
        priority: 'high'
      });
    });
  }
  
  // Medium intensity: breathing + movement + meals
  if (scheduleIntensity.level === 'medium') {
    gaps.forEach((gap, idx) => {
      if (gap.minutes >= 30 && gap.minutes < 60) {
        actions.push({
          type: 'create',
          activity: 'meal',
          reason: 'Adequate time for a quick meal',
          gapIndex: idx,
          priority: 'medium'
        });
      } else if (gap.minutes >= 15 && gap.minutes < 30) {
        actions.push({
          type: 'create',
          activity: 'movement',
          reason: 'Movement break to maintain energy',
          gapIndex: idx,
          priority: 'medium'
        });
      } else if (gap.minutes >= 5) {
        actions.push({
          type: 'create',
          activity: 'breathing',
          reason: 'Short breathing break between tasks',
          gapIndex: idx,
          priority: 'low'
        });
      }
    });
  }
  
  // Low intensity: full workouts + all activities
  if (scheduleIntensity.level === 'low') {
    gaps.forEach((gap, idx) => {
      if (gap.minutes >= 60 && gap.inEnergyWindow) {
        actions.push({
          type: 'create',
          activity: 'workout',
          reason: 'Peak energy window with ample time for full workout',
          gapIndex: idx,
          priority: 'high'
        });
      } else if (gap.minutes >= 30) {
        actions.push({
          type: 'create',
          activity: 'meal',
          reason: 'Time available for meal prep and eating',
          gapIndex: idx,
          priority: 'medium'
        });
      } else if (gap.minutes >= 15) {
        actions.push({
          type: 'create',
          activity: 'movement',
          reason: 'Good opportunity for movement',
          gapIndex: idx,
          priority: 'low'
        });
      }
    });
  }
  
  // Limit to top 5 actions
  const sortedActions = actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 5);
  
  return {
    assessment: `Schedule is ${scheduleIntensity.level} intensity. Mood: ${moodData.moodScore}/10. ` +
                `Recommending ${sortedActions.length} activities to optimize day.`,
    actions: sortedActions,
    recommendations: [
      moodData.moodScore < 5 ? 'Focus on stress reduction activities today' : 'Good mood - maintain with regular breaks',
      scheduleIntensity.level === 'high' ? 'High schedule density - prioritize breathing breaks' : 'Schedule allows for more comprehensive activities',
      'Remember to respect your energy windows'
    ]
  };
}

/**
 * Main calendar optimization function - Agentic Workflow
 * 
 * @param {Object} params - Optimization parameters
 * @param {string} params.userId - User's unique identifier
 * @param {string} params.accessToken - Google Calendar access token
 * @param {Date} params.targetDate - Date to optimize (defaults to today)
 * @returns {Promise<Object>} Optimization results with created events
 * 
 * @example
 * const result = await optimizeCalendar({
 *   userId: "user-123",
 *   accessToken: "ya29.a0...",
 *   targetDate: new Date()
 * });
 */
export async function optimizeCalendar({ userId, accessToken, targetDate = new Date() }) {
  console.log(`🤖 Starting agentic calendar optimization for user ${userId}`);
  
  try {
    // ====================================================================
    // STEP 1: Fetch Current Calendar State
    // ====================================================================
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Fetch FreeBusy data
    const freeBusyResponse = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: "primary" }]
      })
    });
    
    if (!freeBusyResponse.ok) {
      throw new Error(`Google Calendar API error: ${freeBusyResponse.statusText}`);
    }
    
    const freeBusyData = await freeBusyResponse.json();
    const busyBlocks = freeBusyData.calendars?.primary?.busy || [];
    
    // Fetch actual events for more context
    const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    eventsUrl.searchParams.append("timeMin", dayStart.toISOString());
    eventsUrl.searchParams.append("timeMax", dayEnd.toISOString());
    eventsUrl.searchParams.append("singleEvents", "true");
    eventsUrl.searchParams.append("orderBy", "startTime");
    
    const eventsResponse = await fetch(eventsUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    
    const eventsData = await eventsResponse.json();
    const existingEvents = eventsData.items || [];
    
    console.log(`📅 Found ${busyBlocks.length} busy blocks and ${existingEvents.length} events`);
    
    // ====================================================================
    // STEP 2: Get User Profile & Latest Mood
    // ====================================================================
    const { data: userData } = await supabase
      .from('user_current_state')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!userData) {
      throw new Error('User not found');
    }
    
    const neuroProfile = userData.neuro_preferences || {};
    const sleepSchedule = neuroProfile.sleepSchedule;
    const energyWindows = neuroProfile.energyWindows || [];
    
    // Get latest mood check-in
    const { data: latestMood } = await supabase
      .from('mood_check_ins')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .single();
    
    const moodData = latestMood || {
      moodScore: 5,
      energyLevel: 'moderate',
      stressLevel: 'mild'
    };
    
    console.log(`😊 Mood: ${moodData.moodScore}/10, Energy: ${moodData.energyLevel}`);
    
    // ====================================================================
    // STEP 3: Calculate Schedule Intensity & Find Gaps
    // ====================================================================
    const scheduleIntensity = calculateScheduleIntensity(
      busyBlocks, 
      dayStart, 
      dayEnd, 
      sleepSchedule
    );
    
    const gaps = findAvailableGaps(busyBlocks, dayStart, dayEnd, energyWindows);
    
    console.log(`📊 Schedule: ${scheduleIntensity.level} intensity (${Math.round(scheduleIntensity.ratio * 100)}%)`);
    console.log(`🕳️  Found ${gaps.length} available gaps`);
    
    // ====================================================================
    // STEP 4: Ask mAIstro for Optimization Strategy
    // ====================================================================
    const strategy = await getOptimizationStrategy({
      userId,
      moodData,
      scheduleIntensity,
      gaps,
      existingEvents,
      neuroProfile,
      currentTime: new Date()
    });
    
    console.log(`🧠 mAIstro strategy: ${strategy.assessment}`);
    console.log(`📋 Recommended ${strategy.actions?.length || 0} actions`);
    
    // ====================================================================
    // STEP 5: Execute Calendar Changes
    // ====================================================================
    const createdEvents = [];
    const errors = [];
    
    for (const action of strategy.actions || []) {
      if (action.type !== 'create') continue; // Only handle creates for now
      
      const gap = gaps[action.gapIndex];
      if (!gap) {
        console.warn(`⚠️  Gap ${action.gapIndex} not found, skipping`);
        continue;
      }
      
      let activityConfig;
      
      // Generate activity based on type
      switch (action.activity) {
        case 'breathing':
          activityConfig = createBreathingActivity(gap, neuroProfile);
          break;
        case 'movement':
        case 'workout':
          activityConfig = createMovementActivity(gap, neuroProfile, scheduleIntensity.level);
          break;
        case 'meal':
          // Determine meal type based on time
          const hour = new Date(gap.start).getHours();
          let mealType = 'Snack';
          if (hour >= 6 && hour < 10) mealType = 'Breakfast';
          else if (hour >= 11 && hour < 14) mealType = 'Lunch';
          else if (hour >= 17 && hour < 21) mealType = 'Dinner';
          
          activityConfig = createMealActivity(gap, neuroProfile, mealType);
          break;
        default:
          console.warn(`⚠️  Unknown activity type: ${action.activity}`);
          continue;
      }
      
      // Create event in Google Calendar
      try {
        const eventResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              summary: activityConfig.summary,
              description: `${activityConfig.description}\n\nMicro-steps:\n${activityConfig.microSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nReason: ${action.reason}`,
              start: { 
                dateTime: activityConfig.startISO, 
                timeZone: "America/New_York" 
              },
              end: { 
                dateTime: activityConfig.endISO, 
                timeZone: "America/New_York" 
              },
              reminders: {
                useDefault: false,
                overrides: activityConfig.reminders
              },
              colorId: activityConfig.colorId
            })
          }
        );
        
        if (!eventResponse.ok) {
          throw new Error(`Failed to create event: ${eventResponse.statusText}`);
        }
        
        const createdEvent = await eventResponse.json();
        createdEvents.push({
          ...activityConfig,
          eventId: createdEvent.id,
          htmlLink: createdEvent.htmlLink,
          reason: action.reason
        });
        
        console.log(`✅ Created: ${activityConfig.summary}`);
        
      } catch (err) {
        console.error(`❌ Failed to create ${activityConfig.type}:`, err);
        errors.push({
          activity: action.activity,
          error: err.message
        });
      }
    }
    
    // ====================================================================
    // STEP 6: Save Orchestration Session
    // ====================================================================
    await supabase.from('ai_orchestration_sessions').insert({
      user_id: userId,
      session_type: 'calendar_optimization',
      mood_score: moodData.moodScore,
      schedule_density: scheduleIntensity.level,
      ai_decisions: {
        strategy,
        createdEvents: createdEvents.length,
        errors: errors.length
      },
      recommendations: strategy.recommendations
    });
    
    // ====================================================================
    // STEP 7: Return Results
    // ====================================================================
    return {
      success: true,
      optimizationId: `opt_${Date.now()}`,
      summary: {
        assessment: strategy.assessment,
        scheduleIntensity,
        moodScore: moodData.moodScore,
        energyLevel: moodData.energyLevel,
        totalGaps: gaps.length,
        actionsPlanned: strategy.actions?.length || 0,
        eventsCreated: createdEvents.length,
        errors: errors.length
      },
      createdEvents,
      recommendations: strategy.recommendations,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (err) {
    console.error("❌ Calendar optimization failed:", err);
    throw err;
  }
}

/**
 * Get optimization history for user
 */
export async function getOptimizationHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('ai_orchestration_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_type', 'calendar_optimization')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export default { 
  optimizeCalendar, 
  getOptimizationHistory,
  calculateScheduleIntensity,
  findAvailableGaps
};
