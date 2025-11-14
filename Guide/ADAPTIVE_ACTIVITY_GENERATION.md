# Adaptive Activity Generation - No More 4-Activity Limit!

## Overview
Removed the artificial 4-activity constraint and made activity generation fully adaptive based on schedule intensity. More intense schedules get fewer (but essential) activities, while empty schedules get comprehensive wellness plans.

## Key Changes

### 1. Removed Hard Limits
**Before:**
```javascript
const MAX_ACTIVITIES = 4; // Fixed limit
maxActivities = 4; // Hardcoded everywhere
```

**After:**
```javascript
// Dynamic based on schedule intensity
if (intensityValue > 0.75) maxActivities = 3;  // Overloaded
else if (intensityValue > 0.50) maxActivities = 6;  // Busy
else if (intensityValue > 0.25) maxActivities = 10; // Moderate
else maxActivities = 15; // Open schedule
```

### 2. Intensity-Aware Buffer Spacing
**New Feature:** Activities have proper spacing based on schedule intensity

| Intensity | Buffer | Reasoning |
|-----------|--------|-----------|
| >75% (Overloaded) | 5 min | Tight schedule, minimal gaps |
| 51-75% (Busy) | 10 min | Standard transitions |
| 26-50% (Moderate) | 15 min | Comfortable pace |
| 0-25% (Open) | 20 min | Generous relaxation time |

### 3. Activity Strategy by Intensity

#### OVERLOADED (>75% busy)
- **Max Activities:** 3
- **Types:** Breathing breaks, hydration only
- **Duration:** 5-10 minutes each
- **Goal:** Prevent burnout, mandatory rest
- **Example:** 3 breathing breaks scattered through packed day

#### BUSY (51-75% busy)
- **Max Activities:** 6
- **Types:** Quick recharge (breathing, stretching, hydration, transitions)
- **Duration:** 5-15 minutes each
- **Goal:** Maintain energy, smooth transitions
- **Example:** 2 breathing breaks + 2 stretch sessions + 2 hydration reminders

#### MODERATE (26-50% busy)
- **Max Activities:** 10
- **Types:** Balanced mix (movement, meals, breaks, creativity)
- **Duration:** 15-45 minutes each
- **Goal:** Comprehensive wellness
- **Example:** 30-min workout + meal + creative project + nature walk + breathing breaks

#### OPEN (<25% busy)
- **Max Activities:** 15
- **Types:** Full wellness program (workouts, meal prep, projects, learning, self-care)
- **Duration:** 30-90 minutes each
- **Goal:** Maximize growth and self-care
- **Example:** 60-min workout + 45-min meal prep + creative project + learning session + social activity + nature walk + organization

## Implementation Details

### Updated Functions

**1. buildAdaptivePrompt() - Returns Object**
```javascript
// Before: return `prompt string`
// After: return { prompt, minBufferBetweenActivities }

const { prompt, minBufferBetweenActivities } = buildAdaptivePrompt(context, windows);
```

**2. validateAndConstrainActivities() - New Parameters**
```javascript
// Added parameters:
function validateAndConstrainActivities(
  activities, 
  availableWindows, 
  existingEvents, 
  intensityValue = 0.5,  // NEW: for dynamic max
  minBuffer = 10          // NEW: for spacing check
)
```

**3. checkSpacingBetweenActivities() - New Function**
```javascript
// Ensures minBuffer minutes between activities
function checkSpacingBetweenActivities(newActivity, validatedActivities, minBuffer) {
  // Checks gaps before and after new activity
  // Returns false if too close (<minBuffer minutes)
  // Prevents cramming activities together
}
```

## Real-World Examples

### Scenario A: Empty Saturday (0% busy)
**Input:** No calendar events, 16 waking hours available  
**Strategy:** OPEN MODE - comprehensive wellness  
**Activities Generated:** 12 activities
- 08:00-09:00: Morning yoga (60 min)
- 09:20-10:20: Breakfast meal prep (60 min)
- 10:40-11:40: Creative writing (60 min)
- 12:00-13:00: Lunch + walk (60 min)
- 13:20-14:00: Learning session (40 min)
- 14:20-15:05: Breathing + meditation (45 min)
- 15:25-16:25: Organization project (60 min)
- 16:45-17:30: Nature walk (45 min)
- 17:50-18:20: Stretching (30 min)
- 18:40-19:40: Dinner prep (60 min)
- 20:00-20:30: Journaling (30 min)
- 20:50-21:00: Evening breathing (10 min)

**Buffer:** 20 minutes between activities

### Scenario B: Busy Workday (65% busy)
**Input:** 10 hours of meetings/work, 6 hours free  
**Strategy:** BUSY MODE - quick recharge  
**Activities Generated:** 5 activities
- 08:00-08:10: Morning breathing (10 min)
- 12:05-12:15: Midday stretch (10 min)
- 14:20-14:30: Hydration break (10 min)
- 16:45-16:55: Breathing reset (10 min)
- 19:10-19:25: Evening stretch (15 min)

**Buffer:** 10 minutes between activities

### Scenario C: Overloaded Day (85% busy)
**Input:** 14 hours of commitments, 2 hours free  
**Strategy:** OVERLOAD MODE - mandatory rest  
**Activities Generated:** 3 activities
- 09:55-10:05: Morning breathing (10 min)
- 14:25-14:35: Stress relief breathing (10 min)
- 18:50-19:00: Evening reset (10 min)

**Buffer:** 5 minutes (tight spacing due to limited time)

## Benefits

### For Users
1. **More activities on free days** - Fill empty schedules with valuable wellness
2. **Appropriate pacing** - Busy days get essentials only, not overwhelmed
3. **Proper spacing** - Activities have breathing room, not back-to-back
4. **Realistic plans** - System adapts to actual available time

### For the System
1. **No artificial constraints** - Let time and intensity dictate
2. **Better space utilization** - Empty days get 10-15 activities vs. capped at 4
3. **Smarter validation** - Checks spacing between activities
4. **Adaptive buffers** - Tighter when busy, generous when free

## Technical Changes

### Files Modified
- `server/src/routes/agentic.routes.js` - Main logic

### Key Code Sections

**Strategy Selection (Lines ~307-350):**
```javascript
if (intensityValue > 0.75) {
  strategy = 'OVERLOAD MODE';
  maxActivities = 3;
  minBufferBetweenActivities = 5;
} else if (intensityValue > 0.50) {
  strategy = 'BUSY MODE';
  maxActivities = 6;
  minBufferBetweenActivities = 10;
} // ... etc
```

**Validation with Spacing (Lines ~588-640):**
```javascript
// Check spacing between validated activities
const hasProperSpacing = checkSpacingBetweenActivities(
  activity, 
  validated, 
  minBuffer
);
if (!hasProperSpacing) {
  console.warn(`Too close to another (needs ${minBuffer} min buffer)`);
  continue;
}
```

**Spacing Check Logic (Lines ~722-764):**
```javascript
function checkSpacingBetweenActivities(newActivity, validatedActivities, minBuffer) {
  for (const existingActivity of validatedActivities) {
    // Check gap after existing activity
    if (newStartMinutes >= exEndMinutes) {
      const gapAfter = newStartMinutes - exEndMinutes;
      if (gapAfter < minBuffer) return false;
    }
    // Check gap before existing activity
    if (newEndMinutes <= exStartMinutes) {
      const gapBefore = exStartMinutes - newEndMinutes;
      if (gapBefore < minBuffer) return false;
    }
  }
  return true;
}
```

## Testing

### Test Case 1: Empty Schedule
```bash
curl -X POST http://localhost:3001/api/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "low",
    "existingEvents": [],
    "timeWindow": {
      "start": "2025-11-13T08:00:00-08:00",
      "end": "2025-11-13T22:00:00-08:00"
    }
  }'
```
**Expected:** 10-15 activities with 20-min buffers

### Test Case 2: Busy Schedule
```bash
# Add 10 hours of meetings first
curl -X POST http://localhost:3001/api/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "high",
    "existingEvents": [/* 10 hours of events */],
    "timeWindow": {
      "start": "2025-11-13T08:00:00-08:00",
      "end": "2025-11-13T22:00:00-08:00"
    }
  }'
```
**Expected:** 4-6 activities with 10-min buffers

### Server Logs to Watch
```
📊 Schedule Analysis:
   • Intensity: 18% of 16-hour waking day
   • Strategy: OPEN MODE
📏 Using 20 min buffer between activities
📋 Validating activities (max 15 for 18% intensity)...
✅ Validated 12 activities
```

## Migration Notes
- ✅ Backward compatible (defaults work for missing params)
- ✅ No database changes needed
- ✅ Existing API contract unchanged
- ✅ Graceful degradation if intensity not calculated

## Future Enhancements
1. **User-configurable buffers** - Let users set preferred spacing
2. **Buffer preferences by time of day** - Shorter buffers in morning vs evening
3. **Activity clustering** - Group related activities with shorter buffers
4. **Smart prioritization** - When time is limited, show top N priorities

## Related Documentation
- `Guide/WAKING_HOURS_CALCULATION.md` - Intensity calculation basis
- `Guide/SCHEDULE_INTENSITY_FIX.md` - How intensity is computed
- `Guide/ACTIVE_HOURS_IMPLEMENTATION.md` - User-configurable active hours
- `.github/copilot-instructions.md` - Overall architecture
