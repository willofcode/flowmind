# Schedule Intensity: 16-Hour Waking Day Calculation

## Philosophy
Schedule intensity should reflect **how much of your waking life is occupied**, not just a percentage of an arbitrary time window.

## The Math

### Formula
```
intensity = total_busy_minutes ÷ waking_day_minutes
where waking_day_minutes = 16 hours × 60 = 960 minutes
```

### Why 16 Hours?
- **24 hours** (full day)
- **- 8 hours** (average sleep)
- **= 16 hours** (realistic waking time)

## Real-World Examples

| Scenario | Busy Time | Calculation | Intensity | Interpretation |
|----------|-----------|-------------|-----------|----------------|
| Empty calendar | 0 hours | 0 ÷ 960 min | **0%** | Full day free |
| Morning meeting | 1 hour | 60 ÷ 960 min | **6%** | Very light |
| Half-day work | 4 hours | 240 ÷ 960 min | **25%** | Light load |
| Full work day | 8 hours | 480 ÷ 960 min | **50%** | Balanced |
| Busy work day | 10 hours | 600 ÷ 960 min | **63%** | High load |
| Overloaded | 12 hours | 720 ÷ 960 min | **75%** | Very busy |
| Extreme | 14 hours | 840 ÷ 960 min | **88%** | Unsustainable |

## Activity Generation Strategy

Based on intensity percentage:

### 0-25% (Light) 
- Full workouts (30-60 min)
- Meal prep activities
- Creative projects
- Learning sessions
- **Example:** Empty morning → Suggest yoga + healthy breakfast

### 26-50% (Moderate)
- Movement snacks (15-30 min)
- Quick meals
- Short walks
- Breathing breaks
- **Example:** 4 hours of meetings → Suggest stretching between calls

### 51-75% (Busy)
- Micro-breaks (5-10 min)
- Breathing exercises
- Quick hydration reminders
- **Example:** 8-hour work day → Suggest 3 breathing breaks

### 76-100% (Overloaded)
- Mandatory breathing breaks
- Hydration reminders only
- Gentle warnings about burnout
- **Example:** 12 hours packed → "Take 5 min to breathe right now"

## Benefits Over Time Window Calculation

### ❌ Old Way (Time Window)
```javascript
// 3 hours busy in 12-hour window (9am-9pm)
intensity = 180 min ÷ 720 min = 25% busy
```
**Problem:** Same 25% for 3 hours whether it's a 12-hour or 6-hour window!

### ✅ New Way (Waking Hours)
```javascript
// 3 hours busy in any window
intensity = 180 min ÷ 960 min = 19% busy
```
**Benefit:** Consistent measure regardless of time window duration!

## Code Implementation

```javascript
// Server: server/src/routes/agentic.routes.js
const WAKING_HOURS = 16;
const WAKING_MINUTES = WAKING_HOURS * 60; // 960 minutes

// Calculate total busy time
let busyMinutes = 0;
existingEvents.forEach(event => {
  const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
  busyMinutes += duration;
});

// Calculate intensity
intensityValue = busyMinutes / WAKING_MINUTES;
actualBusyPercentage = Math.round(intensityValue * 100);

console.log(`📊 Intensity: ${actualBusyPercentage}% of ${WAKING_HOURS}-hour waking day`);
```

## Client Display

The intensity is shown to users in clear terms:

```
📊 Schedule Intensity: low (19% busy)
   • 3 hours of commitments
   • 81% of your waking day is free
   • Great time for deep work or self-care
```

## Neurodivergent-Friendly Design

### Why This Matters for ADHD/Autism
1. **Predictable baseline:** Always 16 hours, never changes
2. **Concrete numbers:** "50% = half my day" is clear
3. **Energy awareness:** 75%+ triggers rest recommendations
4. **No guilt:** System adapts to high intensity, doesn't shame

### Sensory Considerations
- **Low intensity (<25%):** More choices, longer activities
- **High intensity (>75%):** Fewer choices, mandatory breaks
- **Reduces overwhelm:** System won't suggest 1-hour workout when day is 80% full

## Testing the Calculation

### Verify in Server Logs
When generating activities, look for:
```
📊 Schedule Analysis:
   • Events: 3 activities
   • Busy Time: 180 minutes (3.0 hours)
   • Intensity: 19% of 16-hour waking day
   • Calculation: 180 min ÷ 960 min = 0.188
```

### Edge Cases Handled
- ✅ Empty calendar → 0%
- ✅ Overnight events → Only counts duration
- ✅ Multiple short events → Sums all durations
- ✅ >16 hours busy → Shows >100% (warning!)

## Future Enhancements

### Personalized Waking Hours
Could read from user profile:
```javascript
const wakingHours = userProfile.sleepSchedule 
  ? 24 - userProfile.sleepSchedule.hours 
  : 16; // default
```

### Time Zone Handling
Already supported - calculation uses event timestamps:
```javascript
const eventStart = new Date(event.start); // Handles ISO 8601 with timezone
const eventEnd = new Date(event.end);
```

### Weekly Patterns
Future: Calculate average weekly intensity:
```javascript
weeklyIntensity = totalWeekBusyMinutes ÷ (7 × WAKING_MINUTES)
```

## Related Files
- `server/src/routes/agentic.routes.js` - Main calculation (lines ~56-84)
- `client/app/(tabs)/today.tsx` - Client-side intensity categorization
- `Guide/SCHEDULE_INTENSITY_FIX.md` - Implementation details
- `.github/copilot-instructions.md` - Architecture overview
