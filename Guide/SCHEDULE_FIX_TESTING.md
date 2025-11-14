# FlowMind Schedule Fix - Quick Testing Guide

## Prerequisites
- ✅ Server running on localhost:3001
- ✅ iOS simulator or device with FlowMind installed
- ✅ Google Calendar connected (optional but recommended)
- ✅ Supabase database with user_profiles table

---

## Quick Test Procedure (5 minutes)

### Step 1: Set Your Active Hours (1 min)
```
1. Open FlowMind app
2. Tap "Browse" tab (bottom navigation, 4-square icon)
3. Scroll to "Your Profile" section
4. Tap "Active Hours Settings" (purple card with person icon)
5. Set your times:
   - Wake Time: 06:00 (or your actual wake time)
   - Bed Time: 23:00 (or your actual bed time)
6. Verify "Active hours per day" shows correct calculation
7. Tap "Save Settings"
8. You should see: "Settings Saved ✓" alert
```

**Expected Result:**
- Active hours saved to local storage (expo-secure-store)
- Active hours saved to profile (will sync to Supabase when profile API ready)
- Alert confirms: "Your active hours (17h, 06:00-23:00) have been updated"

---

### Step 2: Refresh Today Screen (1 min)
```
1. Navigate to "Today" tab (bottom navigation, calendar icon)
2. Pull down to refresh (swipe gesture)
3. Wait for loading animation (10-30 seconds for AI generation)
4. Watch the loading stages:
   - "🔍 Getting your profile..."
   - "🧠 Processing your preferences..."
   - "📊 Analyzing mood and schedule intensity..."
   - etc.
```

**Expected Result:**
- Loading completes successfully
- Activities appear in time chunks
- Time chunk labels adapt to your wake/bed time:
  - Example: 06:00 wake → "Early (06:00-10:15)"
  - Example: 09:00 wake → "Morning (09:00-13:15)"

---

### Step 3: Verify Activities Display (1 min)
```
Check Today screen for:
✓ Activities only during your active hours (06:00-23:00)
✓ No activities before wake time
✓ No activities after bed time
✓ Time chunks show your schedule range
✓ Each activity has time range (e.g., "09:15 - 09:25")
```

**Example (if wake 06:00, bed 23:00):**
```
Early (06:00 - 10:15)
├─ 06:15 - 06:45  Morning Yoga
├─ 07:00 - 07:35  Healthy Breakfast
└─ 09:00 - 10:00  Team Meeting [Calendar]

Morning (10:15 - 14:30)
├─ 10:05 - 10:15  Box Breathing
├─ 11:00 - 12:00  Client Call [Calendar]
└─ 12:05 - 12:40  Healthy Lunch

...
```

---

### Step 4: Check Server Logs (1 min)
```bash
# In server terminal, look for these logs:

👤 Using user's sleep schedule: 06:00 - 23:00 (17h active)
📋 Received 3 existing events:
   1. 09:00-10:00 (60 min) - Team Standup
   2. 11:00-12:00 (60 min) - Client Call
   3. 14:00-15:30 (90 min) - Design Review
📊 Schedule Analysis:
   • Events: 3 activities
   • Busy Time: 210 minutes (3.5 hours)
   • Intensity: 20% of 17-hour waking day
   • Calculation: 210 min ÷ 1020 min = 0.206
📊 Event merging: 3 events → 3 busy blocks (5min buffer applied)
⏰ Using user's active hours: 06:00 - 23:00
✅ Found 4 available windows: 0 micro, 1 small, 2 medium, 1 large
```

**What to Look For:**
- ✅ "Using user's sleep schedule" with YOUR wake/bed times
- ✅ "Intensity: X% of Yh waking day" (Y should match your active hours)
- ✅ "Event merging" log shows buffer applied
- ✅ "Found X available windows" shows gaps detected

---

### Step 5: Test Edge Cases (1 min)

#### Test A: Add Activity Manually
```
1. Tap the "+" FAB button (bottom-right corner)
2. Enter task name: "Test Activity"
3. Enter activity label: "Testing scheduling"
4. Tap "Confirm"
5. Wait for activity generation (10s)
6. Check if new activity:
   ✓ Fits in gap between existing activities
   ✓ Has 15-minute buffer from other tasks
   ✓ Falls within your active hours
```

#### Test B: Change Active Hours
```
1. Go to Browse → Active Hours Settings
2. Change wake time to 09:00 (late sleeper test)
3. Change bed time to 01:00 (night owl test)
4. Save settings
5. Return to Today tab → Pull to refresh
6. Verify:
   ✓ No activities before 09:00
   ✓ Activities can go past midnight (up to 01:00)
   ✓ Time chunks adapt: "Morning (09:00-13:00)" etc.
```

#### Test C: Empty Schedule (Weekend Mode)
```
1. If you have no calendar events today:
   - Expected: 10-15 diverse activities
   - Should use full active hours window
   - Mix of workouts, meals, breathing, nature walks
2. Server log should show:
   "📭 Empty schedule: 0% busy - full 17-hour waking day available"
```

---

## Expected Console Output Examples

### Client Console (React Native Debugger)
```
👤 Loaded user profile with active hours: {
  dailyActiveHours: 17,
  customSchedule: { enabled: false }
}
⏰ Using user's active hours: 06:00 - 23:00 (17h)
📅 Fetching calendar events...
📅 Got 3 calendar events
🧠 Fetching AI activities (this may take 10-30 seconds)...
🤖 Requesting agentic activities...
📊 Context: {
  scheduleIntensity: 'low',
  moodScore: 6.5,
  energyLevel: 'medium',
  stressLevel: 'medium'
}
✅ Agentic activities received: 7
💡 Reasoning: Based on your 20% busy schedule and medium energy...
📊 Task filtering results:
  - Total tasks (calendar + agentic): 10
  - After filtering: 10
  1. 06:15-06:45 (30 min) - Morning Yoga
  2. 07:00-07:35 (35 min) - Healthy Breakfast
  3. 08:00-08:10 (10 min) - Hydration Break
  4. 09:00-10:00 (60 min) - Team Standup
  5. 10:05-10:15 (10 min) - Box Breathing
  6. 11:00-12:00 (60 min) - Client Call
  7. 12:05-12:40 (35 min) - Healthy Lunch
  8. 12:45-13:00 (15 min) - Nature Walk
  9. 14:00-15:30 (90 min) - Design Review
  10. 15:35-16:20 (45 min) - Full Body Workout
```

### Server Console (Terminal)
```
POST /agentic/generate-activities
🤖 Generating agentic activities for user: user@example.com
📊 Context: {
  scheduleIntensity: 'low',
  moodScore: 6.5,
  energyLevel: 'medium',
  stressLevel: 'medium'
}
👤 Using user's sleep schedule: 06:00 - 23:00 (17h active)
📋 Received 3 existing events:
   1. 09:00-10:00 (60 min) - Team Standup
   2. 11:00-12:00 (60 min) - Client Call
   3. 14:00-15:30 (90 min) - Design Review
📊 Schedule Analysis:
   • Events: 3 activities
   • Busy Time: 210 minutes (3.5 hours)
   • Intensity: 20% of 17-hour waking day
   • Calculation: 210 min ÷ 1020 min = 0.206
📊 Event merging: 3 events → 3 busy blocks (5min buffer applied)
⏰ Using user's active hours: 06:00 - 23:00
✅ Found 4 available windows: 0 micro, 1 small, 2 medium, 1 large
🧠 Multi-stage activity generation starting...
📊 Strategy determined: {
  activityTypes: ['WORKOUT', 'MEAL', 'NATURE', 'BREATHING', 'HYDRATION'],
  count: 7,
  priority: 'balanced wellness'
}
🎯 Generating activities with selected types: WORKOUT, MEAL, NATURE, BREATHING, HYDRATION
✅ Generated 7 activities
```

---

## Troubleshooting

### Issue: Activities not showing
**Check:**
1. Server logs for errors (especially NeuralSeek API)
2. Client logs: "✅ Agentic activities received: X" (should be > 0)
3. Time chunks: Are they empty? Check if activities fall outside chunk ranges
4. Profile: Is wake/bed time valid? Check expo-secure-store

**Solution:**
```bash
# Clear cache and retry
1. In Today screen, pull to refresh (clears 5-min cache)
2. Check server logs for profile fetch errors
3. Verify Supabase user_profiles table has your data
```

---

### Issue: Activities scheduled outside active hours
**Check:**
1. Server logs: "Using user's active hours: X - Y"
2. Client logs: "Using user's active hours: Xh"
3. Profile settings: Are wake/bed times correct?

**Solution:**
```bash
# Re-save profile
1. Browse → Active Hours Settings
2. Verify wake/bed time display correctly
3. Tap "Save Settings" again
4. Return to Today → Pull to refresh
```

---

### Issue: "No Space Available" when adding activity
**Check:**
1. How busy is your schedule? Check intensity in server logs
2. Are there any gaps ≥15 minutes?
3. Server logs: "Found X available windows" (should be > 0)

**Solution:**
```bash
# This is expected behavior if schedule is truly full
# To test gap detection:
1. Delete/move a calendar event to create gap
2. Pull to refresh on Today screen
3. Try adding activity again
```

---

### Issue: Server error "Could not fetch user profile"
**Check:**
1. Supabase connection working?
2. user_profiles table exists?
3. User ID matches (email or UUID)?

**Solution:**
```bash
# Fallback to defaults
Server will log: "⚠️ Could not fetch user profile, using defaults"
Activities will use 07:00-22:00 window (15h default)

# To fix:
1. Check server/.env has SUPABASE_URL and SUPABASE_ANON_KEY
2. Run: node server/db_setup/create-tables.js
3. Restart server: npm start
```

---

## Performance Benchmarks

### Expected Timing
- Profile load: ~50ms (expo-secure-store)
- Calendar events fetch: ~200ms (Google Calendar API)
- Activity generation: 10-30s (NeuralSeek mAIstro AI)
- Total Today screen load: 10-30s (AI dominates)

### Optimization Tips
- Activities cached for 5 minutes (reduce AI calls)
- Profile cached locally (no network on every load)
- Calendar events cached briefly (FreeBusy API lightweight)

---

## Success Checklist

After completing all tests, verify:

- [ ] Active hours settings save successfully
- [ ] Today screen shows activities in correct time range
- [ ] Time chunks adapt to user's wake/bed time
- [ ] Server logs show personalized active hours
- [ ] Schedule intensity calculated with user's hours
- [ ] 5-minute buffers applied to existing events
- [ ] No overlaps between activities and calendar events
- [ ] Add activity button creates tasks in available gaps
- [ ] Early bird users see activities from early morning
- [ ] Night owl users see activities extending late
- [ ] Empty schedule generates full day of activities
- [ ] Busy schedule (>70%) generates only micro-activities

---

## Quick Commands

### Restart Server
```bash
cd server
npm start
# Should see: "🚀 Server listening on port 3001"
```

### Restart iOS App
```bash
cd client
npm run ios
# Or press Cmd+R in iOS Simulator
```

### Clear Client Cache
```javascript
// In Today screen, pull to refresh
// This clears:
// - agentic_activities_cache
// - agentic_activities_cache_time
// - agentic_activities_synced_today
```

### Check Supabase Data
```sql
-- In Supabase SQL Editor
SELECT 
  user_id,
  neuro_preferences->'sleep'->>'usualWake' as wake_time,
  neuro_preferences->'sleep'->>'usualBed' as bed_time,
  neuro_preferences->'activeHours'->>'dailyActiveHours' as active_hours
FROM user_profiles
WHERE user_id = 'your-email@example.com';
```

---

## Next Steps After Testing

If all tests pass:
1. ✅ Commit changes to git
2. ✅ Update documentation (.github/copilot-instructions.md)
3. ✅ Deploy to staging environment
4. ✅ Monitor production logs for edge cases
5. ✅ Collect user feedback on schedule accuracy

If tests fail:
1. ❌ Review error logs (server + client)
2. ❌ Check SCHEDULE_FIX_VISUAL.md for architecture details
3. ❌ Test individual components (profile load, gap finding, etc.)
4. ❌ Report issues with logs and reproduction steps

---

## Contact

Questions? Check:
- `SCHEDULE_FIX_SUMMARY.md` - Complete implementation details
- `SCHEDULE_FIX_VISUAL.md` - Visual architecture diagrams
- Server logs: Console output from `npm start`
- Client logs: React Native debugger console
- Supabase logs: Dashboard → Database → Logs
