# User Active Hours - Personalized Schedule Intensity

## Overview
Users can now configure their **active/waking hours** in their profile, giving them control over how schedule intensity is calculated. This makes the AI more accurate and personalized.

## What Changed

### 1. Profile Schema (`client/types/neuro-profile.ts`)
Added `ActiveHoursConfig` interface:
```typescript
export interface ActiveHoursConfig {
  dailyActiveHours: number; // Total waking hours (default: 16)
  customSchedule?: {
    enabled: boolean;
    // Optional: Different active hours per day
    monday?: number;
    tuesday?: number;
    // ... etc
  };
}

export interface PersonalNeuroProfile {
  // ... existing fields
  activeHours?: ActiveHoursConfig; // NEW: User's waking hours
}
```

### 2. Default Profile (`client/lib/profile-store.ts`)
```typescript
activeHours: {
  dailyActiveHours: 16, // Default: 16 waking hours (24 - 8 sleep)
  customSchedule: {
    enabled: false,
  },
}
```

### 3. Profile Settings Screen (`client/app/profile-settings.tsx`)
New screen for users to configure active hours:
- **Visual hour selector**: 12h, 14h, 15h, 16h (default), 17h, 18h, 20h
- **Sleep calculation**: Shows estimated sleep time (24 - active hours)
- **Clear explanations**: Why it matters, how it affects intensity
- **Neurodivergent-friendly**: Large buttons, haptic feedback, calm UI
- **Real-world examples**: Shows what each intensity level means

### 4. Server Integration (`server/src/routes/agentic.routes.js`)
**Fetches user profile:**
```javascript
// Fetch user profile to get personalized active hours
let userActiveHours = 16; // Default
const { data: profileData } = await supabase
  .from('user_profiles')
  .select('neuro_preferences')
  .eq('user_id', userId)
  .single();

if (profileData?.neuro_preferences?.activeHours?.dailyActiveHours) {
  userActiveHours = profileData.neuro_preferences.activeHours.dailyActiveHours;
}
```

**Uses in calculation:**
```javascript
const WAKING_MINUTES = userActiveHours * 60;
intensityValue = busyMinutes / WAKING_MINUTES;
```

## User Flow

### Step 1: User Opens Settings
Navigate to **Profile Settings** → **Active Hours Settings**

### Step 2: Configure Active Hours
1. See current setting (default: 16 hours)
2. Tap desired hours from grid (12, 14, 15, 16, 17, 18, 20)
3. Preview shows estimated sleep time
4. Read examples of how intensity works

### Step 3: Save Settings
1. Tap "Save Settings"
2. Confirmation shows: "Your active hours (Xh) have been updated"
3. Settings saved locally + synced to server
4. All future activity generation uses personalized hours

## Schedule Intensity Calculation

### Formula
```
intensity = total_busy_minutes ÷ (user_active_hours × 60)
actualBusyPercentage = Math.round(intensity × 100)
```

### Example Scenarios

#### User A: Night Owl (18 active hours)
- Sleeps 6 hours/night
- 8 hours of work = 8 ÷ 18 = **44% busy**
- More "free" percentage because they're awake longer

#### User B: Early Riser (14 active hours)
- Sleeps 10 hours/night
- 8 hours of work = 8 ÷ 14 = **57% busy**
- Higher percentage because less waking time

#### User C: Standard (16 active hours - default)
- Sleeps 8 hours/night
- 8 hours of work = 8 ÷ 16 = **50% busy**
- Balanced calculation

## Benefits

### For Users
1. **Personalized to their rhythm**: Night owls vs early risers
2. **Accurate intensity readings**: Reflects their actual capacity
3. **Better AI recommendations**: Activities fit their schedule style
4. **Sense of control**: They configure their own parameters

### For the System
1. **More accurate calculations**: No one-size-fits-all
2. **Better activity timing**: Respects individual schedules
3. **Improved user satisfaction**: AI "gets" their lifestyle
4. **Data collection**: Learn patterns about active hours preferences

## Technical Details

### Database Storage
Stored in `user_profiles.neuro_preferences` as JSONB:
```json
{
  "activeHours": {
    "dailyActiveHours": 17,
    "customSchedule": {
      "enabled": false
    }
  }
}
```

### API Flow
```
1. POST /agentic/generate-activities
2. Extract userId from request
3. Query: SELECT neuro_preferences FROM user_profiles WHERE user_id = ?
4. Parse: neuro_preferences.activeHours.dailyActiveHours
5. Use in calculation: WAKING_MINUTES = activeHours × 60
6. Calculate: intensity = busyMinutes / WAKING_MINUTES
7. Return activities with accurate intensity
```

### Fallback Behavior
If profile fetch fails or activeHours not set:
- ✅ Uses default 16 hours
- ✅ Logs warning to console
- ✅ System continues normally
- ✅ No errors thrown

## Future Enhancements

### Per-Day Active Hours (Phase 2)
```typescript
customSchedule: {
  enabled: true,
  monday: 16,
  tuesday: 16,
  wednesday: 16,
  thursday: 16,
  friday: 18,    // Stay up later on Friday
  saturday: 18,  // Weekend hours
  sunday: 17
}
```

### Smart Auto-Detection (Phase 3)
- Analyze calendar patterns over 2 weeks
- Detect earliest/latest events
- Suggest active hours: "Looks like you're active 14-15 hours/day"
- User confirms or adjusts

### Energy-Aware Active Hours (Phase 4)
- Different active hours for high-energy vs low-energy days
- "Today feels like a 12-hour day" option
- Adaptive based on mood check-ins

## Testing

### Manual Testing
1. Go to profile settings
2. Change active hours to 12
3. Generate activities with empty calendar
4. Check server logs: "Using user's active hours: 12h (personalized)"
5. Verify intensity calculation uses 720 minutes (12 × 60)

### Server Log Output
```
👤 Using user's active hours: 18h (personalized)
📊 Schedule Analysis:
   • Events: 3 activities
   • Busy Time: 480 minutes (8.0 hours)
   • Intensity: 44% of 18-hour waking day
   • Calculation: 480 min ÷ 1080 min = 0.444
```

## Related Files
- `client/types/neuro-profile.ts` - Type definitions
- `client/lib/profile-store.ts` - Default profile with activeHours
- `client/app/profile-settings.tsx` - UI for configuration
- `server/src/routes/agentic.routes.js` - Server-side calculation
- `Guide/WAKING_HOURS_CALCULATION.md` - Technical details
- `Guide/SCHEDULE_INTENSITY_FIX.md` - Original intensity fix

## Documentation Updates Needed
- [ ] Update `.github/copilot-instructions.md` with activeHours field
- [ ] Add to user onboarding flow
- [ ] Create help text/tooltips in app
- [ ] Add to API documentation

## Migration Notes
- ✅ Backward compatible (defaults to 16 if not set)
- ✅ No database migration needed (JSONB column)
- ✅ Existing users get default 16 hours
- ✅ Can be rolled out gradually
