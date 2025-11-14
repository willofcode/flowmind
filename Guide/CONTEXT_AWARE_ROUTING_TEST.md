# Context-Aware Routing Test Guide

## ✅ Completed Features

### 1. Sand Timer Fixes
- [x] Default time: 1 minute (was 5)
- [x] Quick select: [1, 5, 15, 30] minutes
- [x] Scroll picker initialization (100ms delay)

### 2. Today/Tomorrow Tabs
- [x] Tab switcher UI with haptic feedback
- [x] Date-specific caching (`activities_generated_date_YYYY-MM-DD`)
- [x] Independent schedule generation per day

### 3. Duplicate Prevention
- [x] 3-layer deduplication:
  1. Cache flag check before API call
  2. Calendar scan for FlowMind events (🌿)
  3. Auto-caching when events detected
- [x] Removed FlowMind event exclusion filter
- [x] All events now visible in calendar

### 4. Context-Aware Swipe Actions ⭐ NEW
- [x] Breathing activities → Calm Session (with protocol)
- [x] All other FlowMind activities → Sand Timer (with duration)
- [x] Non-FlowMind events → Just mark accepted

## Testing Steps

### Test 1: Context-Aware Routing
1. **Generate Activities**:
   - Open Today tab
   - Pull to refresh to generate AI activities
   - Wait for "🌿 Morning Breathing" and "🌿 Light Workout" bubbles

2. **Test Breathing → Calm Session**:
   - Swipe RIGHT on "🌿 Morning Breathing" bubble
   - Should navigate to `/calm-session` with:
     * Protocol: "4-7-8" or "Box Breathing" (auto-detected)
     * Haptic feedback on swipe
   - Verify calm session UI loads

3. **Test Workout → Sand Timer**:
   - Go back to Today tab
   - Swipe RIGHT on "🌿 Light Workout" bubble
   - Should navigate to `/sand-timer` with:
     * Duration: Calculated from activity (e.g., 30 min)
     * Title: "Light Workout" (🌿 removed)
     * Task ID: Passed for completion tracking
   - Verify sand timer shows correct duration

4. **Test Other Activities**:
   - Try "🌿 Healthy Lunch" → Sand Timer (meal duration)
   - Try "🌿 Evening Walk" → Sand Timer (walk duration)
   - Try regular Google Calendar event → Just marks accepted (no timer)

### Test 2: Duration Calculation
Activities should route with these durations:

| Activity Type | Expected Duration | Source |
|---------------|-------------------|--------|
| Breathing | N/A (calm session) | Protocol-based |
| Workout | 20-60 min | `durationSec` or time range |
| Meal | 30-45 min | `durationSec` or time range |
| Walk | 15-30 min | `durationSec` or time range |
| Default | 30 min | Fallback value |

**Verification**:
- Check sand-timer top bar shows correct duration
- Timer countdown matches expected time

### Test 3: Multi-Day Scheduling (No Duplicates)
1. **Day 1 - Today**:
   - Generate activities → Check Google Calendar app
   - Note 3-4 FlowMind events created (🌿 prefix)
   - Pull to refresh → NO new duplicates
   - Verify cache: `activities_generated_date_2025-01-08` = "true"

2. **Day 2 - Tomorrow**:
   - Tap "Tomorrow" tab
   - Should generate NEW activities (different date)
   - Check Google Calendar → See tomorrow's events
   - Pull to refresh → NO new duplicates
   - Verify cache: `activities_generated_date_2025-01-09` = "true"

3. **Switch Back to Today**:
   - Tap "Today" tab
   - Should show same events (no regeneration)
   - Events should match Google Calendar exactly

### Test 4: Week Plan All Events Display
1. **Navigate to Schedule Tab**:
   - Tap "Schedule" tab in bottom navigation

2. **Select Busy Day**:
   - Tap a day with 5+ events in calendar grid
   - Verify day is highlighted

3. **Check Event List**:
   - Scroll down to event list below calendar
   - Should see ALL events for that day (not just 3)
   - Verify scrolling works smoothly
   - Check both FlowMind (🌿) and regular events

### Test 5: Overlap Prevention
1. **Create Test Event**:
   - Open Google Calendar app
   - Create "Test Meeting" from 10:00 AM - 11:00 AM today

2. **Generate Activities**:
   - Open FlowMind Today tab
   - Clear cache: Swipe down to pull-to-refresh
   - Let AI generate activities

3. **Verify No Overlap**:
   - Check Today tab → No activities between 10:00-11:00
   - Check server logs for: `"OVERLAP DETECTED: [activity name] conflicts with 'Test Meeting'"`
   - Verify activities scheduled around meeting (before/after)

4. **Check Google Calendar**:
   - Open Google Calendar app
   - Verify no FlowMind events overlap with "Test Meeting"

## Expected Behavior

### Breathing Activity Flow
```
User swipes right on "🌿 Morning Breathing"
  ↓
Haptic feedback (Medium impact)
  ↓
Detect FlowMind activity (🌿 prefix)
  ↓
Check type: BREATHING = true
  ↓
Extract protocol: "Box Breathing" (4-4-4-4)
  ↓
router.push('/calm-session', { protocol: "Box Breathing" })
  ↓
Calm session screen loads with breathing guide
```

### Workout Activity Flow
```
User swipes right on "🌿 Light Workout"
  ↓
Haptic feedback (Medium impact)
  ↓
Detect FlowMind activity (🌿 prefix)
  ↓
Check type: BREATHING = false
  ↓
Calculate duration:
  - durationSec exists? → Convert to minutes
  - Else: Calculate from startTime/endTime
  - Fallback: 30 minutes
  ↓
Clean title: Remove "🌿 " prefix
  ↓
router.push('/sand-timer', { 
  duration: "30",
  title: "Light Workout",
  taskId: "abc123"
})
  ↓
Sand timer screen loads with 30-minute countdown
```

### Regular Event Flow
```
User swipes right on "Team Meeting" (no 🌿)
  ↓
Haptic feedback (Medium impact)
  ↓
isFlowMindActivity = false
  ↓
Call onAccept() directly
  ↓
Bubble disappears (marked as accepted)
```

## Code Locations

| Feature | File | Lines |
|---------|------|-------|
| Sand Timer fixes | `client/app/sand-timer-input.tsx` | 28, 35-51, 256 |
| Today/Tomorrow tabs | `client/app/(tabs)/today.tsx` | 987-1027 |
| Date-specific caching | `client/app/(tabs)/today.tsx` | 154, 409-414, 453-482 |
| Context-aware routing | `client/components/task-bubble.tsx` | 40-92 |
| Overlap detection | `server/src/routes/agentic.routes.js` | 860-925 |

## Debugging Tips

### Issue: Wrong timer opens
**Check**: Line 42 in `task-bubble.tsx`
```typescript
const isFlowMindActivity = task.title?.startsWith('🌿');
```
Verify activity titles have 🌿 emoji prefix.

### Issue: Wrong duration in sand timer
**Check**: Lines 54-62 in `task-bubble.tsx`
```typescript
let duration = 30; // Default
if (task.durationSec) {
  duration = Math.round(task.durationSec / 60);
}
```
Log `task.durationSec` to verify backend is passing duration.

### Issue: Activities still duplicating
**Check**: Lines 387-408, 409-414 in `today.tsx`
```typescript
// Should include ALL events (including FlowMind)
const allEvents = await fetchCalendarEvents(startOfDay, endOfDay, accessToken);
// Should auto-detect and cache
const flowMindEvents = allEvents.filter(e => e.summary?.startsWith('🌿'));
if (flowMindEvents.length > 0) {
  await SecureStore.setItemAsync(cacheKey, 'true');
}
```

### Issue: Overlap still occurring
**Check**: Server logs at `server/src/routes/agentic.routes.js:860-925`
Should see: `"OVERLAP DETECTED: [activity] conflicts with [event]"`

## Success Criteria

✅ **Context-Aware Routing**:
- Breathing activities open calm session with correct protocol
- Other FlowMind activities open sand timer with correct duration
- Regular events just mark accepted (no timer)

✅ **Multi-Day Scheduling**:
- Today and Tomorrow tabs work independently
- No duplicate activities on refresh
- Cache keys include date: `activities_generated_date_YYYY-MM-DD`

✅ **Sand Timer**:
- Opens to 1 minute by default
- Quick select shows [1, 5, 15, 30] minutes
- Scroll picker initializes correctly

✅ **Week Plan**:
- Shows all events for selected day (not just 3)
- Scrolling works smoothly
- Both FlowMind and regular events visible

✅ **Overlap Prevention**:
- No FlowMind activities scheduled during existing events
- Server logs show overlap detection messages
- Activities fill gaps intelligently

## Next Steps

After testing, consider:

1. **Add Duration Override**: Let users adjust timer duration before starting
2. **Activity History**: Track which activities were completed via sand-timer vs calm-session
3. **Smart Defaults**: Learn user's preferred durations per activity type
4. **Quick Actions**: Add "Skip & Start Next" button in timers
5. **Completion Sync**: Mark Google Calendar event as completed when timer finishes

---

**All features implemented and ready for testing!** 🎉
