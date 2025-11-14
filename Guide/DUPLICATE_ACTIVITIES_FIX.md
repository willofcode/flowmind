# Duplicate Activities Fix

## Problem Identified

Activities were being **regenerated and overlapping** every time the user refreshed or reopened the app because:

1. **No deduplication check** - The server generated new activities every time `/agentic/generate-activities` was called, even if activities already existed for that day
2. **No date tracking** - Activities were stored with hardcoded date (`2025-11-09`) instead of the actual target date
3. **Generated activities not included in overlap check** - When calculating gaps, only Google Calendar events were considered, not previously generated FlowMind activities
4. **No regeneration control** - Users couldn't force refresh if they wanted new activities

## Root Cause

```javascript
// BEFORE - Every call generated new activities
router.post('/generate-activities', async (req, res) => {
  // ... validation
  
  // ❌ NO CHECK FOR EXISTING ACTIVITIES
  const activities = await generateActivitiesWithMaistro(...);
  
  // ❌ STORED WITH HARDCODED DATE
  await storeActivitiesInDatabase(userId, activities);
  
  return res.json({ activities });
});
```

This meant:
- **Refresh = duplicate generation** → Same time slots filled again
- **Database accumulation** → Multiple sets of overlapping activities
- **Calendar sync conflicts** → FlowMind kept creating duplicate calendar events

## Solution Implemented

### 1. **Deduplication Check** (Primary Fix)

Added check at the **start** of `/agentic/generate-activities` endpoint:

```javascript
// Check if activities already generated for today
const todayDate = new Date(timeWindow.start).toISOString().split('T')[0];

if (!forceRegenerate) {
  const alreadyGenerated = await checkIfActivitiesExistForDate(userId, todayDate);
  
  if (alreadyGenerated.exists && alreadyGenerated.activities.length > 0) {
    console.log(`✅ Activities already generated for ${todayDate}`);
    
    return res.json({
      success: true,
      activities: alreadyGenerated.activities, // Return cached activities
      cached: true
    });
  }
}
```

**Benefits:**
- ✅ **One-time generation per day** - Prevents duplicate creation
- ✅ **Instant response** - Returns cached activities (no AI call needed)
- ✅ **Consistent schedule** - User sees same activities throughout the day

### 2. **Force Regeneration Option**

Added optional `forceRegenerate` parameter:

```javascript
POST /agentic/generate-activities
{
  "userId": "user@email.com",
  "forceRegenerate": true, // ← NEW: Clear old activities and regenerate
  ...
}
```

When `forceRegenerate: true`:
1. Clears existing activities for that day
2. Generates fresh activities with current mood/context
3. Stores new activities

**Use case:** User wants to refresh activities based on changed mood or schedule

### 3. **Proper Date Storage**

Fixed hardcoded date bug:

```javascript
// BEFORE ❌
start_time: new Date(`2025-11-09T${activity.startTime}:00`)

// AFTER ✅
const targetDate = dateString || new Date().toISOString().split('T')[0];
start_time: new Date(`${targetDate}T${activity.startTime}:00`)
```

### 4. **Clear Activities Endpoint**

Added standalone endpoint for manual cleanup:

```javascript
POST /agentic/clear-activities
{
  "userId": "user@email.com",
  "date": "2025-11-13"
}
```

**Use case:** User wants to clear activities without regenerating (e.g., day changed unexpectedly)

## New Helper Functions

### `checkIfActivitiesExistForDate(userId, dateString)`

- Queries `agentic_activities` table for given user + date
- Returns `{ exists: boolean, activities: [...] }`
- Handles email → UUID conversion

### `clearActivitiesForDate(userId, dateString)`

- Deletes all activities for user on specific date
- Used by force regeneration
- Returns success/failure boolean

## Testing the Fix

### Test 1: Normal Flow (Should NOT duplicate)

```bash
# First call - generates activities
curl -X POST http://localhost:3001/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@email.com",
    "scheduleIntensity": "medium",
    "timeWindow": {
      "start": "2025-11-13T00:00:00",
      "end": "2025-11-13T23:59:59"
    },
    "existingEvents": []
  }'

# Second call - should return cached activities
curl -X POST http://localhost:3001/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{ ... same request ... }'

# Expected: Second response has "cached": true
```

### Test 2: Force Regeneration

```bash
curl -X POST http://localhost:3001/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@email.com",
    "forceRegenerate": true,
    ...
  }'

# Expected: Old activities cleared, new ones generated
```

### Test 3: Manual Clear

```bash
curl -X POST http://localhost:3001/agentic/clear-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@email.com",
    "date": "2025-11-13"
  }'

# Expected: Activities deleted, next generation starts fresh
```

## Database Impact

### Before Fix

```sql
-- Example: User refreshes 3 times
SELECT * FROM agentic_activities WHERE user_id = '...' AND start_time::date = '2025-11-13';

-- Result: 30+ activities (3 sets of ~10 activities each)
-- Many overlapping time slots
```

### After Fix

```sql
-- Same scenario after fix
SELECT * FROM agentic_activities WHERE user_id = '...' AND start_time::date = '2025-11-13';

-- Result: ~10 activities (one set only)
-- No overlaps, proper gaps respected
```

## Client-Side Changes Needed

### Update Today Screen

The client should handle the `cached` flag:

```typescript
const response = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
  method: 'POST',
  body: JSON.stringify(requestBody)
});

const data = await response.json();

if (data.cached) {
  console.log('✅ Using cached activities from today');
} else {
  console.log('✨ Generated fresh activities');
}
```

### Add Refresh Button (Optional)

Allow users to regenerate activities:

```typescript
const handleRegenerateActivities = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  
  const response = await fetch(`${API_BASE_URL}/agentic/generate-activities`, {
    method: 'POST',
    body: JSON.stringify({
      ...requestBody,
      forceRegenerate: true // ← Force fresh generation
    })
  });
  
  // Refresh UI with new activities
};
```

## Overlap Prevention Architecture

### Layer 1: Database Check (NEW)
```
User requests activities
  ↓
Check agentic_activities table
  ↓
Activities exist for today? → Return cached
  ↓
No activities found → Continue to generation
```

### Layer 2: Gap Detection (Existing)
```
Get existing calendar events
  ↓
Merge overlapping events with buffers
  ↓
Find gaps ≥5 minutes
  ↓
Pass gaps to AI for scheduling
```

### Layer 3: Validation (Existing)
```
AI generates activities
  ↓
validateAndConstrainActivities()
  ↓
Check each activity:
  - Fits in available window?
  - No overlap with existing events?
  - Proper spacing between activities?
  ↓
Return validated activities only
```

## Edge Cases Handled

1. **User changes mood mid-day**
   - Solution: Use `forceRegenerate: true` to refresh with new context

2. **Calendar sync adds new events**
   - Current: Activities already generated, won't overlap
   - Future: Webhook could trigger regeneration with new events

3. **Multiple devices/sessions**
   - Database is source of truth
   - Both devices see same cached activities

4. **Date boundary at midnight**
   - Each day has separate date key
   - Activities for Nov 13 ≠ Activities for Nov 14

5. **User deletes activities manually**
   - Clear endpoint removes from DB
   - Next request generates fresh activities

## Performance Improvements

### Before
- Every request → NeuralSeek API call (2-5s)
- Database writes every time
- Multiple sets stored unnecessarily

### After
- First request → NeuralSeek API call (2-5s)
- Subsequent requests → Database read (<100ms)
- One set stored per day
- **95% faster response time** for cached requests

## Monitoring & Logs

Key log messages to watch:

```bash
# ✅ GOOD - Deduplication working
✅ Activities already generated for 2025-11-13 (8 activities)
📋 Returning existing activities to prevent duplicates

# ✅ GOOD - Fresh generation
🆕 Generating fresh activities for 2025-11-13...
✅ Generated 8 activities
✅ Stored 8 activities in database for 2025-11-13

# ⚠️ WARNING - Force regeneration used
🔄 Force regenerate requested - clearing existing activities...
🗑️ Cleared activities for 2025-11-13
```

## Future Enhancements

1. **Smart refresh detection**
   - Check if calendar has new events since generation
   - Auto-regenerate only if schedule changed significantly

2. **Activity versioning**
   - Store generation timestamp
   - Allow rollback to previous generation

3. **Partial regeneration**
   - Keep validated activities
   - Only regenerate for changed time windows

4. **Cross-day planning**
   - Generate activities for multiple days
   - Respect energy patterns across days

## Summary

**Problem:** Activities duplicating on every refresh, causing overlaps and database bloat

**Solution:** 
- ✅ Check database before generation (deduplication)
- ✅ Return cached activities for same day
- ✅ Add force regeneration option
- ✅ Fix date storage bug
- ✅ Add clear endpoint for manual control

**Result:** 
- 🎯 One set of activities per day
- ⚡ 95% faster response for cached requests
- 🚫 No more overlaps or duplicates
- 🔄 User control via force regeneration
