# Schedule Intensity Algorithm

## Overview
The schedule intensity algorithm analyzes a user's Google Calendar to determine how packed their day is, then adapts the types of activities suggested to match their available time and energy.

## Core Algorithm

### Step 1: Fetch Calendar Data
```javascript
// Get FreeBusy blocks for the day/week
const freeBusyResponse = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
  method: "POST",
  headers: { "Authorization": `Bearer ${accessToken}` },
  body: JSON.stringify({
    timeMin: dayStartISO,
    timeMax: dayEndISO,
    items: [{ id: "primary" }]
  })
});

const busyBlocks = freeBusyData.calendars.primary.busy || [];
```

### Step 2: Calculate Intensity
```javascript
function calculateScheduleIntensity(busyBlocks, dayStart, dayEnd, sleepSchedule) {
  // Only consider waking hours
  const wakeTime = parseTime(sleepSchedule.usualWake); // e.g., "07:30"
  const bedTime = parseTime(sleepSchedule.usualBed);   // e.g., "23:30"
  
  const effectiveStart = Math.max(dayStart, wakeTime);
  const effectiveEnd = Math.min(dayEnd, bedTime);
  const totalWakingMinutes = (effectiveEnd - effectiveStart) / (1000 * 60);
  
  // Calculate busy time
  let busyMinutes = 0;
  for (const block of busyBlocks) {
    const blockStart = new Date(block.start);
    const blockEnd = new Date(block.end);
    
    // Only count time within waking hours
    const countStart = Math.max(blockStart, effectiveStart);
    const countEnd = Math.min(blockEnd, effectiveEnd);
    
    if (countStart < countEnd) {
      busyMinutes += (countEnd - countStart) / (1000 * 60);
    }
  }
  
  const intensityRatio = busyMinutes / totalWakingMinutes;
  
  // Classify intensity
  if (intensityRatio > 0.70) return { level: 'high', busyMinutes, totalWakingMinutes };
  if (intensityRatio > 0.40) return { level: 'medium', busyMinutes, totalWakingMinutes };
  return { level: 'low', busyMinutes, totalWakingMinutes };
}
```

### Step 3: Identify Available Gaps
```javascript
function findAvailableGaps(busyBlocks, dayStart, dayEnd, energyWindows) {
  const gaps = [];
  let currentTime = dayStart;
  
  // Sort busy blocks chronologically
  const sortedBlocks = busyBlocks.sort((a, b) => 
    new Date(a.start) - new Date(b.start)
  );
  
  for (const block of sortedBlocks) {
    const blockStart = new Date(block.start);
    const gapMinutes = (blockStart - currentTime) / (1000 * 60);
    
    if (gapMinutes >= 10) { // Only consider gaps 10+ minutes
      // Check if gap overlaps with energy windows
      const overlapsEnergy = energyWindows.some(window => 
        timeOverlaps(currentTime, blockStart, window.start, window.end)
      );
      
      gaps.push({
        start: currentTime.toISOString(),
        end: blockStart.toISOString(),
        minutes: gapMinutes,
        inEnergyWindow: overlapsEnergy
      });
    }
    
    currentTime = new Date(block.end);
  }
  
  // Check final gap after last event
  if (currentTime < dayEnd) {
    const finalGapMinutes = (dayEnd - currentTime) / (1000 * 60);
    if (finalGapMinutes >= 10) {
      gaps.push({
        start: currentTime.toISOString(),
        end: dayEnd.toISOString(),
        minutes: finalGapMinutes,
        inEnergyWindow: false // Adjust based on energy windows
      });
    }
  }
  
  return gaps;
}
```

### Step 4: Generate Adaptive Activities

#### High Intensity (>70% busy)
```javascript
function generateHighIntensityActivities(gaps, profile) {
  const activities = [];
  
  for (const gap of gaps) {
    if (gap.minutes >= 5 && gap.minutes < 15) {
      // 5-10 min breathing breaks
      activities.push({
        type: 'breathing',
        duration: Math.min(gap.minutes, 10),
        startTime: gap.start,
        microSteps: [
          'Find a quiet spot',
          'Open breathing session',
          'Follow audio guide'
        ],
        ttsScript: getBreathingScript(Math.min(gap.minutes, 10)),
        alternative: {
          type: 'stretch',
          duration: 5,
          microSteps: ['Stand up', 'Neck rolls (10x)', 'Shoulder shrugs (10x)']
        }
      });
    }
  }
  
  return activities;
}
```

#### Medium Intensity (40-70% busy)
```javascript
function generateMediumIntensityActivities(gaps, profile) {
  const activities = [];
  
  for (const gap of gaps) {
    if (gap.minutes >= 30 && gap.minutes < 60) {
      // Quick meals
      activities.push({
        type: 'meal',
        duration: 30,
        startTime: gap.start,
        microSteps: [
          'Get meal ingredients from fridge',
          'Heat/assemble (15 min max)',
          'Eat mindfully (15 min)',
          'Clean up (5 min)'
        ],
        suggestions: getQuickMealIdeas(profile.diet)
      });
    } else if (gap.minutes >= 15 && gap.minutes < 30) {
      // Movement snacks
      activities.push({
        type: 'movement_snack',
        duration: 15,
        startTime: gap.start,
        microSteps: [
          'Change into comfortable clothes',
          '10-min walk or stretch routine',
          'Fill water bottle'
        ]
      });
    } else if (gap.minutes >= 5) {
      // Breathing breaks
      activities.push({
        type: 'breathing',
        duration: 5,
        startTime: gap.start,
        microSteps: ['Find quiet spot', 'Open breathing session', 'Follow guide'],
        ttsScript: getBreathingScript(5)
      });
    }
  }
  
  return activities;
}
```

#### Low Intensity (<40% busy)
```javascript
function generateLowIntensityActivities(gaps, profile) {
  const activities = [];
  
  for (const gap of gaps) {
    if (gap.minutes >= 60 && gap.inEnergyWindow) {
      // Full workout during energy peaks
      activities.push({
        type: 'workout',
        duration: Math.min(gap.minutes - 20, profile.maxWorkoutMin), // Leave buffer
        startTime: gap.start,
        workoutType: profile.workoutLikes[0], // Primary preference
        microSteps: [
          'Put on workout clothes',
          'Fill water bottle',
          'Set up space/equipment',
          `${profile.workoutLikes[0]} for ${Math.min(gap.minutes - 20, profile.maxWorkoutMin)} min`,
          'Cool down & stretch (5 min)'
        ],
        alternative: {
          workoutType: profile.workoutLikes[1],
          duration: 30
        }
      });
    } else if (gap.minutes >= 45 && gap.minutes < 60) {
      // Meal prep
      activities.push({
        type: 'meal_prep',
        duration: 45,
        startTime: gap.start,
        microSteps: [
          'Review recipe (2 min)',
          'Gather ingredients & tools (5 min)',
          'Cook/prep (30 min)',
          'Store/serve (5 min)',
          'Clean up (3 min)'
        ],
        recipe: getRecipeForProfile(profile.diet)
      });
    }
  }
  
  return activities;
}
```

### Step 5: Apply Buffer Policy
```javascript
function applyBuffers(activities, bufferPolicy) {
  return activities.map(activity => ({
    ...activity,
    scheduledStart: subtractMinutes(activity.startTime, bufferPolicy.before),
    actualStart: activity.startTime,
    actualEnd: addMinutes(activity.startTime, activity.duration),
    scheduledEnd: addMinutes(
      addMinutes(activity.startTime, activity.duration),
      bufferPolicy.after
    ),
    reminders: [
      { minutes: 10, message: `${activity.type} in 10 minutes` },
      { minutes: 3, message: `${activity.type} in 3 minutes` },
      { minutes: 1, message: `Time to ${activity.microSteps[0]}` }
    ]
  }));
}
```

## Cache Strategy

### Save to Database
```javascript
// Cache intensity calculation to avoid repeated API calls
await supabase.from('schedule_intensity').upsert({
  user_id: userId,
  date: dateString,
  intensity_level: intensity.level,
  busy_minutes: intensity.busyMinutes,
  total_minutes: intensity.totalWakingMinutes,
  gap_windows: gaps,
  calculated_at: new Date().toISOString()
});
```

### Check Cache First
```javascript
// Before calling Google Calendar API, check if we have recent data
const { data: cached } = await supabase
  .from('schedule_intensity')
  .select('*')
  .eq('user_id', userId)
  .eq('date', dateString)
  .gte('calculated_at', oneHourAgo)
  .single();

if (cached) {
  return {
    intensity: cached.intensity_level,
    gaps: cached.gap_windows
  };
}

// Otherwise, fetch fresh data from Google Calendar
```

## Integration with NeuralSeek mAIstro

```javascript
const prompt = `
Given schedule intensity: ${intensity.level}
Available gaps: ${JSON.stringify(gaps)}
User energy windows: ${JSON.stringify(profile.energyWindows)}
User preferences: ${JSON.stringify(profile.workoutLikes)}

Generate activities that:
1. Fit within available gaps
2. Respect energy windows (schedule intense activities during peaks)
3. Include 10-min buffer before/after each activity
4. Provide A/B alternatives
5. Break each activity into 3-5 micro-steps

For high intensity days: Focus on 5-10 min breathing breaks
For medium intensity days: Mix of movement snacks, quick meals, breathing
For low intensity days: Full workouts + meal prep + optional activities
`;
```

## Testing Scenarios

```javascript
// Test Case 1: High Intensity (80% busy)
const highIntensitySchedule = [
  { start: '09:00', end: '10:30' }, // Meeting
  { start: '10:45', end: '12:00' }, // Meeting
  { start: '13:00', end: '14:30' }, // Lunch meeting
  { start: '14:45', end: '16:30' }, // Work session
  { start: '17:00', end: '18:00' }  // Call
];
// Expected: Only 5-10 min breathing breaks in small gaps

// Test Case 2: Medium Intensity (50% busy)
const mediumIntensitySchedule = [
  { start: '09:00', end: '10:00' }, // Meeting
  { start: '14:00', end: '15:30' }  // Meeting
];
// Expected: 30-min meal, 15-min movement snacks, breathing breaks

// Test Case 3: Low Intensity (25% busy)
const lowIntensitySchedule = [
  { start: '14:00', end: '15:00' }  // Only 1 meeting
];
// Expected: Full 40-min workout during energy window, meal prep, optional activities
```
