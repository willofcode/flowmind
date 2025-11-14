# Agentic Activities Validation Refinement

## Problem Statement
The initial validation logic used a **fixed 15-minute buffer** for all time windows, which was too strict and rejected activities that could fit in smaller windows. This resulted in fewer activities being generated than optimal.

**Example Issue:**
- Medium schedule (2 events, 2 time windows)
- Only 1 activity generated instead of 2-3
- Activities rejected: "Healthy Breakfast Bowl", "5-min Box Breathing"

## Solution: Adaptive Buffer System

### Buffer Rules (Based on Window Duration)
```javascript
Window Duration      → Required Buffer
─────────────────────────────────────
≥ 120 minutes       → 15 min buffer
60-120 minutes      → 10 min buffer  
30-60 minutes       → 5 min buffer
< 30 minutes        → 2 min buffer
```

### Implementation
File: `server/src/routes/agentic.routes.js`
Function: `checkIfActivityFitsInWindow()` (lines 416-463)

```javascript
// OLD: Fixed buffer
if (activityStartMinutes >= windowStartMinutes + 15 && 
    activityEndMinutes <= windowEndMinutes - 15) {
  return true;
}

// NEW: Adaptive buffer
let requiredBuffer;
if (window.duration >= 120) {
  requiredBuffer = 15; // 2+ hours: generous buffer
} else if (window.duration >= 60) {
  requiredBuffer = 10; // 1-2 hours: moderate buffer
} else if (window.duration >= 30) {
  requiredBuffer = 5;  // 30-60 min: tight buffer
} else {
  requiredBuffer = 2;  // < 30 min: minimal buffer
}

const availableSpace = window.duration - (2 * requiredBuffer);
if (activityDuration > availableSpace) return false;
```

## Additional Improvements

### 1. Total Available Time Calculation
The AI prompt now includes total available time to make better decisions:

```javascript
const totalAvailableMinutes = windows.reduce((sum, w) => sum + w.duration, 0);

// maxActivities now considers available time
if (stressLevel === 'high' || scheduleIntensity === 'high') {
  maxActivities = Math.min(3, Math.floor(totalAvailableMinutes / 20));
} else if (scheduleIntensity === 'medium') {
  maxActivities = Math.min(4, Math.floor(totalAvailableMinutes / 25));
} else {
  maxActivities = Math.min(5, Math.floor(totalAvailableMinutes / 30));
}
```

### 2. Flexible Prompt Guidance
Added to AI prompt:
```
BUFFER RULES (adapt to window size):
- 120+ min windows: 15-min buffers
- 60-120 min windows: 10-min buffers  
- 30-60 min windows: 5-min buffers
- <30 min windows: 2-min buffers

BE FLEXIBLE: If time is limited, use shorter activities (5-10 min breathing)
rather than skipping windows. Maximize utilization of available time.
```

## Test Results

### Before Refinement (Fixed 15-min buffer)
**Medium Schedule (2 events, 2 windows):**
```
✅ Generated: 1 activity
⚠️  Rejected: Healthy Breakfast Bowl (didn't fit)
⚠️  Rejected: 5-min Box Breathing (didn't fit)
```

### After Refinement (Adaptive buffers)
**Medium Schedule (2 events, 2 windows):**
```
✅ Generated: 2 activities
- 10-min Guided Meditation (BREATHING)
- 20-min Gentle Yoga Flow (WORKOUT)
```

**Low Schedule (1 event, larger windows):**
```
✅ Generated: 4 activities
- 10-min Guided Meditation (BREATHING)
- 20-min Gentle Yoga Flow (WORKOUT)
- Healthy Snack Break (MEAL)
- 5-min Box Breathing (BREATHING)
```

## Architecture Alignment

This refinement aligns with **FlowMind's neurodivergent-friendly principles**:

1. **Maximize Support**: Use all available time for wellness activities
2. **Flexibility**: Adapt buffers to reality (not rigid rules)
3. **Gentle Guidance**: 2-min buffers in tight windows reduce pressure
4. **Intelligence**: AI considers total time, not just stress level

## Database Schema Status

**Schema File:** `server/db_setup/agentic-activities-table.sql`

**Status:** ⚠️ **NOT YET APPLIED**

**Next Step:** Run in Supabase SQL Editor:
```sql
-- Copy/paste entire agentic-activities-table.sql
-- Includes:
-- - agentic_activities table
-- - Indexes for performance
-- - User feedback tracking
-- - Google Calendar sync fields
```

**Current Behavior:** Activities generated but not stored (returns mock success)

## Testing Command

```bash
# Test medium schedule
curl -X POST http://localhost:3001/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@example.com",
    "scheduleIntensity": "medium",
    "moodScore": 6.5,
    "energyLevel": "medium",
    "stressLevel": "medium",
    "timeWindow": {
      "start": "2025-11-09T08:00:00Z",
      "end": "2025-11-09T20:00:00Z"
    },
    "existingEvents": [
      {"start": "2025-11-09T10:00:00Z", "end": "2025-11-09T11:00:00Z"},
      {"start": "2025-11-09T15:00:00Z", "end": "2025-11-09T16:30:00Z"}
    ]
  }'
```

**Expected:** 2-3 activities generated (was 1 before refinement)

## Next Steps

1. ✅ **Validation Refinement** - COMPLETED
   - Adaptive buffer system (2-15 min)
   - Total time calculation in prompt
   - Flexible AI guidance

2. ⏳ **Apply Database Schema**
   - Run `agentic-activities-table.sql` in Supabase
   - Enable activity storage and user feedback

3. 🔄 **Monitor & Iterate**
   - Track activity acceptance rate
   - Adjust buffer thresholds if needed (currently 30/60/120 min)
   - Fine-tune maxActivities formula

4. 📈 **Optional Enhancements**
   - Fetch actual mood scores from mood check-ins
   - Push activities to Google Calendar
   - Collect user feedback on activity helpfulness
   - A/B test different buffer thresholds

## Files Modified

- `server/src/routes/agentic.routes.js`
  - Line 234-341: Updated `buildAdaptivePrompt()` with total time
  - Line 416-463: Refactored `checkIfActivityFitsInWindow()` with adaptive buffers

## Deployment Notes

- Server restarted with PID 34770
- No breaking changes to API contract
- Client-side code (`client/app/(tabs)/today.tsx`) requires no changes
- Database schema ready but not yet applied

---

**Status:** ✅ VALIDATION REFINEMENT COMPLETE
**Impact:** 2-4x more activities generated based on available time
**User Feedback Addressed:** "should really depend on amount of events and time in day"
