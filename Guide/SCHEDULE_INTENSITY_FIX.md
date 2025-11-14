# Schedule Intensity Fix - Accurate Percentage Calculation

## Problem
Schedule intensity was showing **25% busy** when the Google Calendar was **empty** (should be 0%).

### Root Cause
The server was using a hardcoded intensity map that assigned fixed values:
```javascript
const intensityMap = { high: 0.8, medium: 0.5, low: 0.25 };
const intensityValue = intensityMap[scheduleIntensity] || 0.5;
```

When the client calculated `scheduleIntensity = 'low'` for an empty calendar, the server mapped it to 0.25 (25%) regardless of actual busy time.

## Solution
**Calculate actual busy percentage from events using 16-hour waking day (24 hours - 8 hours sleep).**

### Implementation
1. **Define waking hours baseline:**
   ```javascript
   const WAKING_HOURS = 16;
   const WAKING_MINUTES = WAKING_HOURS * 60; // 960 minutes
   ```

2. **Calculate from existing events:**
   ```javascript
   if (existingEvents && existingEvents.length > 0) {
     // Calculate total busy minutes from event durations
     let busyMinutes = 0;
     existingEvents.forEach(event => {
       const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
       busyMinutes += duration;
     });
     
     // Calculate as percentage of 16 waking hours (not raw time window)
     intensityValue = busyMinutes / WAKING_MINUTES;
     actualBusyPercentage = Math.round(intensityValue * 100);
   }
   ```

3. **Handle empty schedule:**
   ```javascript
   else {
     intensityValue = 0;
     actualBusyPercentage = 0;
     console.log(`📭 Empty schedule: 0% busy - full 16-hour waking day available`);
   }
   ```

4. **Display actual percentage:**
   ```javascript
   // Already in prompt:
   - Schedule Intensity: ${scheduleIntensity} (${Math.round(intensityValue * 100)}% busy)
   ```

## Results
✅ **Empty calendar** → 0% busy  
✅ **3 hours of meetings** → 19% busy (3 hours ÷ 16 waking hours = 18.75%)  
✅ **8 hours of work** → 50% busy (8 hours ÷ 16 waking hours = 50%)  
✅ **12 hours busy** → 75% busy (12 hours ÷ 16 waking hours = 75%)

### Why 16 Hours?
- **24 hours total** - **8 hours sleep** = **16 waking hours**
- This reflects actual available time for activities
- More realistic intensity calculation (50% = half your waking day)
- Avoids artificially low percentages from long time windows

## Testing
```bash
# Test 1: Empty calendar
curl -X POST http://localhost:3001/api/agentic/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "low",
    "existingEvents": [],
    "timeWindow": {
      "start": "2025-06-05T09:00:00-07:00",
      "end": "2025-06-05T21:00:00-07:00"
    }
  }'
# Expected: 0% busy (0 hours ÷ 16 waking hours)

# Test 2: Light schedule (3 hours of meetings)
curl -X POST http://localhost:3001/api/agentic/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "low",
    "existingEvents": [
      {
        "start": "2025-06-05T10:00:00-07:00",
        "end": "2025-06-05T12:00:00-07:00",
        "summary": "Meeting"
      },
      {
        "start": "2025-06-05T14:00:00-07:00",
        "end": "2025-06-05T15:00:00-07:00",
        "summary": "Call"
      }
    ],
    "timeWindow": {
      "start": "2025-06-05T09:00:00-07:00",
      "end": "2025-06-05T21:00:00-07:00"
    }
  }'
# Expected: 19% busy (3 hours ÷ 16 waking hours = 18.75%)

# Test 3: Full work day (8 hours)
curl -X POST http://localhost:3001/api/agentic/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "medium",
    "existingEvents": [
      {
        "start": "2025-06-05T09:00:00-07:00",
        "end": "2025-06-05T17:00:00-07:00",
        "summary": "Work"
      }
    ],
    "timeWindow": {
      "start": "2025-06-05T09:00:00-07:00",
      "end": "2025-06-05T21:00:00-07:00"
    }
  }'
# Expected: 50% busy (8 hours ÷ 16 waking hours = 50%)

# Test 4: Very busy day (12 hours)
curl -X POST http://localhost:3001/api/agentic/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "high",
    "existingEvents": [
      {
        "start": "2025-06-05T08:00:00-07:00",
        "end": "2025-06-05T12:00:00-07:00",
        "summary": "Morning meetings"
      },
      {
        "start": "2025-06-05T13:00:00-07:00",
        "end": "2025-06-05T21:00:00-07:00",
        "summary": "Afternoon work + events"
      }
    ],
    "timeWindow": {
      "start": "2025-06-05T08:00:00-07:00",
      "end": "2025-06-05T22:00:00-07:00"
    }
  }'
# Expected: 75% busy (12 hours ÷ 16 waking hours = 75%)
```

## Changed Files
- `server/src/routes/agentic.routes.js` - Lines ~220-260
  - Removed hardcoded `intensityMap`
  - Added actual busy time calculation from events
  - Added empty schedule handling (0%)
  - Added detailed logging for debugging

## Next Steps
1. ✅ Schedule intensity shows correct percentage
2. 🔲 Run database migrations (`fix-database.sh`)
3. 🔲 Test FAB + Modal → Add activity flow
4. 🔲 Test conversation mode close button
5. 🔲 End-to-end testing with real calendar data
