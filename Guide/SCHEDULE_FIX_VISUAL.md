# FlowMind Smart Scheduling - Visual Architecture

## Before vs After: Time Window Logic

### BEFORE (Hardcoded)
```
┌─────────────────────────────────────────────────────────┐
│ Day: 00:00 ──────────────────────────────── 23:59      │
│                                                          │
│ Scheduling Window (HARDCODED):                          │
│      07:00 ────────────────────────── 22:00             │
│      └─ Fixed for ALL users ─────────┘                  │
│                                                          │
│ Issue: User wakes at 6 AM → miss early morning          │
│ Issue: User sleeps at 11 PM → schedule during sleep     │
└─────────────────────────────────────────────────────────┘
```

### AFTER (Dynamic)
```
┌─────────────────────────────────────────────────────────┐
│ Day: 00:00 ──────────────────────────────────── 23:59  │
│                                                          │
│ User Profile: Wake 06:00, Bed 23:00 (17h active)        │
│                                                          │
│ Scheduling Window (USER-SPECIFIC):                      │
│      06:00 ──────────────────────────────── 23:00       │
│      └─ Adapts to each user's rhythm ────────┘          │
│                                                          │
│ ✓ Activities scheduled during actual waking hours       │
│ ✓ Schedule intensity = busy / waking hours (accurate)   │
└─────────────────────────────────────────────────────────┘
```

---

## Gap Detection & Buffer Management

### BEFORE (Simple Gap Finding)
```
Timeline:
├─ 07:00 ──────────────────────────────────────────────── 22:00 ─┤
│                                                                  │
│  [Meeting A]    [Meeting B]         [Meeting C]                 │
│  09:00-10:00    11:00-12:00         14:00-15:30                 │
│                                                                  │
│  Gap 1: 10:00-11:00 (60 min)                                    │
│  Gap 2: 12:00-14:00 (120 min)                                   │
│  Gap 3: 15:30-22:00 (390 min)                                   │
│                                                                  │
│  ❌ Activities could overlap with meeting start/end times       │
│  ❌ No transition buffer (stress!)                              │
└──────────────────────────────────────────────────────────────────┘
```

### AFTER (Smart Gap Finding with Buffers)
```
Timeline:
├─ 06:00 ──────────────────────────────────────────────── 23:00 ─┤
│                                                                  │
│  [Meeting A]    [Meeting B]         [Meeting C]                 │
│  09:00-10:00    11:00-12:00         14:00-15:30                 │
│   ↑5min buf     ↑5min buf           ↑5min buf                   │
│                                                                  │
│  Available Windows (with buffers):                              │
│  • 06:00-08:55 (175 min) - Morning routine                      │
│  • 10:05-10:55 (50 min)  - Short activity                       │
│  • 12:05-13:55 (110 min) - Lunch + stretch                      │
│  • 15:35-23:00 (445 min) - Workouts + evening activities        │
│                                                                  │
│  ✓ 5-minute buffers before/after each meeting                   │
│  ✓ No overlaps or stress-inducing back-to-back transitions      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Event Merging for Overlaps

### BEFORE
```
Calendar Events (Raw):
┌──────────────────────────────────────────────────────────┐
│ 1. 09:00-10:00  Team Standup                             │
│ 2. 09:45-10:15  Follow-up Discussion (overlaps #1!)      │
│ 3. 11:00-12:00  Client Call                              │
│ 4. 12:00-12:30  Lunch with client (overlaps #3!)         │
└──────────────────────────────────────────────────────────┘

Gap Calculation: Treats all 4 as separate events
→ Tries to schedule between 09:00-09:45 (BAD!)
→ Thinks 10:15-11:00 is free (but user is recovering)
```

### AFTER
```
Calendar Events (Merged):
┌──────────────────────────────────────────────────────────┐
│ Busy Block 1: 09:00-10:15 (merged events #1, #2)        │
│ Busy Block 2: 11:00-12:30 (merged events #3, #4)        │
└──────────────────────────────────────────────────────────┘

Gap Calculation: Uses merged busy blocks
→ 08:55 (with buffer) ─── Busy Block 1 ─── 10:20 (with buffer)
→ 10:20-10:55 = 35 min available (CORRECT!)
→ Activities scheduled in true gaps only
```

---

## Today Screen Display Logic

### BEFORE (Hardcoded Chunks)
```
getTimeChunks() logic:
┌────────────────────────────────────────────────┐
│ Morning:       06:00 - 10:00  [Fixed]         │
│ Late Morning:  10:00 - 14:00  [Fixed]         │
│ Afternoon:     14:00 - 18:00  [Fixed]         │
│ Evening:       18:00 - 22:00  [Fixed]         │
└────────────────────────────────────────────────┘

Issue: Activity at 05:30 → Not displayed (before 06:00)
Issue: Activity at 22:30 → Not displayed (after 22:00)
Issue: Night owls (wake at 9 AM) see "Morning" label at noon
```

### AFTER (Dynamic Chunks)
```
getTimeChunks(tasks, userProfile) logic:
┌────────────────────────────────────────────────┐
│ User: Wake 06:00, Bed 23:00 (17h active)      │
│                                                 │
│ Chunk size = 17h ÷ 4 = ~4.25h                  │
│                                                 │
│ Early:    06:00 - 10:15  [Dynamic]             │
│ Morning:  10:15 - 14:30  [Dynamic]             │
│ Midday:   14:30 - 18:45  [Dynamic]             │
│ Afternoon:18:45 - 23:00  [Dynamic]             │
└────────────────────────────────────────────────┘

✓ All activities display (no filtering by time)
✓ Chunk labels adapt to user's rhythm
✓ Edge case: 3am activity? Still displays (respects insomnia)
```

---

## Profile Settings Access Flow

### BEFORE
```
User Journey to Change Wake Time:
┌─────────────────────────────────────────────┐
│ 1. Open app                                 │
│ 2. ??? (No obvious path to settings)        │
│ 3. Dig through code to find profile store   │
│ 4. Manually edit JSON? 😱                   │
└─────────────────────────────────────────────┘

Result: Users couldn't fix scheduling issues
```

### AFTER
```
User Journey to Change Wake Time:
┌─────────────────────────────────────────────┐
│ 1. Open app → Tap "Browse" tab (bottom)    │
│ 2. Scroll to "Your Profile" section         │
│ 3. Tap "Active Hours Settings" (purple)     │
│ 4. Set Wake: 06:00, Bed: 23:00              │
│ 5. Review: "Active hours: 17h"              │
│ 6. Tap "Save Settings"                       │
│ 7. Return to Today → Pull to refresh        │
│ 8. ✓ Activities now scheduled correctly     │
└─────────────────────────────────────────────┘

Result: Self-service fix for scheduling issues
```

---

## Schedule Intensity Calculation

### BEFORE
```
Formula: intensity = busyMinutes / (16 * 60)  [HARDCODED]
         └─ Always assumes 16-hour waking day

Example User: Wake 10 AM, Bed 11 PM (13h active)
- Has 3 hours of meetings (180 min busy)
- Old calc: 180 / 960 = 18.75% (LOW) ❌ WRONG
- Reality: User has short day, should be 23% (MEDIUM)
```

### AFTER
```
Formula: intensity = busyMinutes / (userActiveHours * 60)  [DYNAMIC]
         └─ Uses actual waking hours from profile

Example User: Wake 10 AM, Bed 11 PM (13h active)
- Has 3 hours of meetings (180 min busy)
- New calc: 180 / 780 = 23.08% (MEDIUM) ✓ CORRECT
- Result: More breathing breaks, fewer workouts (appropriate!)
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (iOS App)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User opens Today screen                                     │
│     ↓                                                            │
│  2. loadProfile() → expo-secure-store                           │
│     └─ Gets: { sleep: { usualWake, usualBed }, ... }           │
│     ↓                                                            │
│  3. fetchCalendarEvents()                                       │
│     └─ Google Calendar API → existing commitments               │
│     ↓                                                            │
│  4. fetchAgenticActivities(calendarEvents, userProfile)         │
│     └─ POST /agentic/generate-activities                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTP Request
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER (Node.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  5. Receive request with existingEvents[]                       │
│     ↓                                                            │
│  6. Fetch user profile from Supabase                            │
│     SELECT neuro_preferences                                    │
│     FROM user_profiles                                          │
│     WHERE user_id = ?                                           │
│     ↓                                                            │
│  7. Extract wake/bed time from neuro_preferences.sleep          │
│     userWakeTime = "06:00"                                      │
│     userBedTime = "23:00"                                       │
│     ↓                                                            │
│  8. findAvailableTimeWindows(                                   │
│       existingEvents,                                           │
│       timeWindow,                                               │
│       { wakeTime: userWakeTime, bedTime: userBedTime }          │
│     )                                                            │
│     ↓                                                            │
│  9. Merge overlapping events + add buffers                      │
│     ↓                                                            │
│  10. Find gaps ≥5 minutes                                       │
│      └─ Classify: micro, small, medium, large                   │
│      ↓                                                           │
│  11. generateActivitiesWithMaistro(context, windows, events)    │
│      └─ NeuralSeek AI generates activities for gaps             │
│      ↓                                                           │
│  12. Return activities[] with startTime, endTime, duration      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTP Response
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (iOS App)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  13. Merge calendar events + agentic activities                 │
│      allTasks = [...calendarEvents, ...agenticActivities]      │
│      ↓                                                           │
│  14. Sort by startTime                                          │
│      ↓                                                           │
│  15. filterTasksWithTimeConstraints()                           │
│      └─ Enforce 15-min buffer between tasks                     │
│      ↓                                                           │
│  16. getTimeChunks(tasks, userProfile)                          │
│      └─ Group into dynamic 4-hour chunks                        │
│      ↓                                                           │
│  17. Render TaskBubbles in time chunks                          │
│      └─ Display in Today screen UI                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example Schedule Transformation

### INPUT
```
User Profile:
- Wake: 06:00
- Bed: 23:00
- Active Hours: 17h

Existing Calendar Events:
- 09:00-10:00  Team Standup
- 11:00-12:00  Client Call
- 14:00-15:30  Design Review

Mood Context:
- Mood Score: 6.5/10
- Energy Level: medium
- Stress Level: medium
```

### PROCESSING
```
Step 1: Calculate Schedule Intensity
  Busy: 210 min (3.5h)
  Active: 1020 min (17h)
  Intensity: 210 / 1020 = 20.6% → LOW

Step 2: Find Available Windows (with buffers)
  06:00-08:55 (175 min) - Large window
  10:05-10:55 (50 min)  - Medium window
  12:05-13:55 (110 min) - Large window
  15:35-23:00 (445 min) - Large window

Step 3: Determine Activity Strategy (AI)
  Low intensity → 8-10 activities
  Types: WORKOUT, MEAL, NATURE, BREATHING, HYDRATION

Step 4: Generate Activities in Windows
  06:00-08:55: Morning routine activities
  10:05-10:55: Quick breathing + hydration
  12:05-13:55: Lunch + light walk
  15:35-23:00: Workout + dinner + evening activities
```

### OUTPUT
```
Today Screen Display:

┌─────────────────────────────────────────────┐
│ Early (06:00 - 10:15)                       │
├─────────────────────────────────────────────┤
│ 06:15 - 06:45  Morning Yoga (30 min)       │
│ 07:00 - 07:35  Healthy Breakfast (35 min)  │
│ 08:00 - 08:10  Hydration Break (10 min)    │
│ 09:00 - 10:00  Team Standup [Calendar]     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Morning (10:15 - 14:30)                     │
├─────────────────────────────────────────────┤
│ 10:05 - 10:15  Box Breathing (10 min)      │
│ 10:20 - 10:30  Hydration Break (10 min)    │
│ 11:00 - 12:00  Client Call [Calendar]      │
│ 12:05 - 12:40  Healthy Lunch (35 min)      │
│ 12:45 - 13:00  Nature Walk (15 min)        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Midday (14:30 - 18:45)                      │
├─────────────────────────────────────────────┤
│ 14:00 - 15:30  Design Review [Calendar]    │
│ 15:35 - 16:20  Full Body Workout (45 min)  │
│ 16:30 - 16:40  Hydration Break (10 min)    │
│ 17:00 - 17:15  Stretching (15 min)         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Afternoon (18:45 - 23:00)                   │
├─────────────────────────────────────────────┤
│ 18:45 - 19:20  Dinner Prep (35 min)        │
│ 20:00 - 20:15  Evening Walk (15 min)       │
│ 21:00 - 21:10  Gratitude Practice (10 min) │
│ 22:00 - 22:08  Bedtime Breathing (8 min)   │
└─────────────────────────────────────────────┘

✓ All activities respect user's 06:00-23:00 window
✓ 5-minute buffers maintained
✓ No overlaps with calendar events
✓ Balanced mix based on low schedule intensity
```

---

## Error Handling & Fallbacks

```
┌─────────────────────────────────────────────────────────┐
│ Scenario 1: No User Profile Found                      │
├─────────────────────────────────────────────────────────┤
│ Fallback: Use defaults (7 AM - 10 PM, 15h active)      │
│ Log: "⚠️ Could not fetch user profile, using defaults" │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scenario 2: Invalid Sleep Schedule                     │
├─────────────────────────────────────────────────────────┤
│ Example: usualWake = "25:00" (invalid)                 │
│ Fallback: Use defaults                                  │
│ Log: "⚠️ Invalid sleep schedule, using defaults"       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scenario 3: No Available Windows                       │
├─────────────────────────────────────────────────────────┤
│ Example: Back-to-back meetings all day                 │
│ Result: Return empty activities[]                       │
│ UI: "All caught up! 🎉" (not an error)                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scenario 4: Calendar API Failure                       │
├─────────────────────────────────────────────────────────┤
│ Fallback: Generate activities assuming empty schedule  │
│ Log: "⚠️ Calendar fetch failed, assuming empty day"    │
│ Result: Full day of wellness activities                 │
└─────────────────────────────────────────────────────────┘
```

---

## Testing Scenarios

### Test Case 1: Early Bird User
```
Profile:
- Wake: 05:00 (early!)
- Bed: 21:00
- Active: 16h

Expected Behavior:
✓ Activities start at 05:00 (not 07:00)
✓ Last activity ends by 21:00 (not 22:00)
✓ Time chunks: 05:00-09:00, 09:00-13:00, 13:00-17:00, 17:00-21:00
✓ Morning workout at 05:30 (within wake window)
```

### Test Case 2: Night Owl User
```
Profile:
- Wake: 10:00 (late!)
- Bed: 02:00 (next day)
- Active: 16h

Expected Behavior:
✓ No activities before 10:00
✓ Activities can extend past midnight
✓ Time chunks: 10:00-14:00, 14:00-18:00, 18:00-22:00, 22:00-02:00
✓ Schedule intensity calculated for 10:00-02:00 window
```

### Test Case 3: Busy Executive
```
Profile:
- Wake: 06:00
- Bed: 23:00
- 8 meetings (480 min busy) / 1020 min active = 47% intensity

Expected Behavior:
✓ Medium intensity → 5-7 activities
✓ Prioritize breathing, hydration, quick walks
✓ Avoid long workouts (no 60+ min windows)
✓ Meals in 30+ min gaps only
```

### Test Case 4: Free Weekend
```
Profile:
- Wake: 08:00
- Bed: 23:00
- 0 meetings / 900 min active = 0% intensity

Expected Behavior:
✓ Low intensity → 10-15 activities
✓ Full range: workouts, meals, nature, creative, social
✓ Use all available windows
✓ Large time chunks for big activities (60+ min workout)
```

---

## Metrics & Monitoring

### Server-Side Metrics
```javascript
// Log every activity generation request
console.log(`📊 Schedule Analysis:
  • User: ${userId}
  • Active Hours: ${userActiveHours}h (${userWakeTime}-${userBedTime})
  • Events: ${existingEvents.length} activities
  • Busy Time: ${busyMinutes} min (${(busyMinutes/60).toFixed(1)}h)
  • Intensity: ${actualBusyPercentage}% (${intensityLevel})
  • Windows Found: ${availableWindows.length}
  • Activities Generated: ${activities.length}
`);
```

### Client-Side Metrics
```javascript
// Log user actions
console.log(`📱 Today Screen:
  • Profile Loaded: ${!!userProfile}
  • Active Hours: ${userProfile?.sleep?.usualWake}-${userProfile?.sleep?.usualBed}
  • Calendar Events: ${calendarEvents.length}
  • AI Activities: ${agenticActivities.length}
  • Total Tasks: ${tasks.length}
  • Time Chunks: ${timeChunks.length}
`);
```

### Success Criteria
- ✅ 100% of activities fall within user's active hours
- ✅ 0% overlap with existing calendar events
- ✅ 100% of activities have ≥5 min buffer from meetings
- ✅ Schedule intensity accuracy: ±5% of expected value
- ✅ Time chunk labels match user's rhythm (no "Morning" at 2 PM for night owls)
