# NeuralSeek Agentic Activities Endpoint

## Purpose
Generate AI-powered wellness activities (breathing, fitness, meals, breaks) that intelligently fit into the user's schedule to help with mental health, stress management, and neurodivergent needs.

## Endpoint Specification

### `POST /agentic/generate-activities`

Generate personalized wellness activities based on user context, schedule intensity, and neuro profile.

#### Request Body
```json
{
  "userId": "user-uuid",
  "scheduleIntensity": "high" | "medium" | "low",  // From calendar density calculation
  "moodScore": 7.5,                                 // 1-10 from mood check-in
  "energyLevel": "medium",                          // From mood analysis
  "stressLevel": "high",                            // From mood analysis
  "timeWindow": {
    "start": "2025-11-09T09:00:00Z",
    "end": "2025-11-09T22:00:00Z"
  },
  "existingEvents": [                               // User's calendar commitments
    {
      "start": "2025-11-09T10:00:00Z",
      "end": "2025-11-09T11:00:00Z"
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "activities": [
    {
      "id": "activity-uuid",
      "type": "BREATHING",
      "title": "5-min Calm Break",
      "startTime": "09:30",
      "endTime": "09:35",
      "durationSec": 300,
      "description": "Box breathing: 4-4-4-4",
      "isBreathing": true,
      "status": "PENDING"
    },
    {
      "id": "activity-uuid-2",
      "type": "WORKOUT",
      "title": "Movement Snack",
      "startTime": "14:30",
      "endTime": "14:45",
      "durationSec": 900,
      "description": "Gentle stretches and light movement",
      "isBreathing": false,
      "status": "PENDING"
    },
    {
      "id": "activity-uuid-3",
      "type": "MEAL",
      "title": "Healthy Lunch",
      "startTime": "12:30",
      "endTime": "13:00",
      "durationSec": 1800,
      "description": "Balanced meal with protein and vegetables",
      "isBreathing": false,
      "status": "PENDING"
    }
  ],
  "reasoning": "High stress detected - added breathing breaks between intense blocks. Schedule density is medium, so included workout and meal.",
  "scheduledToCalendar": true  // If activities were pushed to Google Calendar
}
```

## NeuralSeek mAIstro Integration

### Prompt Template for Activity Generation
```javascript
const prompt = `You are a neurodivergent-friendly wellness coach generating activities for a user dealing with mental health challenges.

User Context:
- Schedule Intensity: ${scheduleIntensity} (${intensity > 0.7 ? 'very busy' : intensity > 0.4 ? 'moderately busy' : 'light schedule'})
- Current Mood: ${moodScore}/10
- Energy Level: ${energyLevel}
- Stress Level: ${stressLevel}
- Existing Calendar Events: ${existingEvents.length} events today

Available Time Windows (15+ min gaps):
${availableWindows.map(w => `- ${w.start} to ${w.end} (${w.duration} minutes)`).join('\n')}

Task: Generate 2-4 wellness activities that:
1. Fit into available time gaps (minimum 15 min buffer before/after events)
2. Match energy level (low energy = gentle activities, high energy = more active)
3. Address stress (high stress = more breathing/calm breaks)
4. Support neurodivergent needs (clear structure, predictable timing)
5. Include variety: breathing (5-10 min), movement (15-30 min), meals (30 min)

Activity Types:
- BREATHING: Meditation, breathing exercises, calm sessions (5-15 min)
- WORKOUT: Light walks, stretches, movement snacks (15-30 min)
- MEAL: Planned meals, hydration breaks (20-30 min)

Constraints:
- Max 4 activities total (prevent overwhelm)
- No activities before 7:00 AM or after 10:00 PM
- Respect 15-minute buffers around existing calendar events
- High stress → more breathing breaks
- Low energy → shorter, gentler activities
- High schedule intensity → only breathing/short breaks

Return JSON array of activities with id, type, title, startTime (HH:MM), endTime (HH:MM), durationSec, description, isBreathing, status: "PENDING"`;
```

### Implementation Steps

1. **Calculate Schedule Intensity**
   ```javascript
   const intensity = busyMinutes / totalMinutes;
   // >70% = high, 40-70% = medium, <40% = low
   ```

2. **Find Available Time Windows**
   - Parse existing calendar events
   - Identify gaps ≥15 minutes
   - Exclude early morning (<7am) and late night (>10pm)

3. **Call NeuralSeek mAIstro**
   ```javascript
   const response = await fetch(NS_MAISTRO_ENDPOINT, {
     method: 'POST',
     headers: { 'embedcode': NS_EMBED_CODE },
     body: JSON.stringify({
       ntl: prompt,  // Use 'ntl' not 'prompt'
       context: JSON.stringify(userContext),
       parameters: {
         temperature: 0.7,
         max_tokens: 1500
       }
     })
   });
   ```

4. **Parse AI Response**
   - Extract JSON array of activities
   - Validate timing (check conflicts with existing events)
   - Generate UUIDs for activity IDs

5. **Optional: Push to Google Calendar**
   - Create calendar events for generated activities
   - Add FlowMind prefix: "FlowMind: 5-min Calm Break"
   - Include description with activity details
   - Set reminders: 10-3-1 pattern

6. **Store in Database**
   ```sql
   CREATE TABLE agentic_activities (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(user_id),
     activity_type VARCHAR(20), -- BREATHING, WORKOUT, MEAL
     title TEXT,
     description TEXT,
     start_time TIMESTAMPTZ,
     end_time TIMESTAMPTZ,
     duration_sec INTEGER,
     status VARCHAR(20), -- PENDING, IN_PROGRESS, COMPLETED, SKIPPED
     calendar_event_id TEXT, -- Google Calendar event ID if synced
     created_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   );
   ```

## Adaptive Logic Examples

### High Stress + High Schedule Intensity
```
→ Insert 5-10 min breathing breaks only
→ No workouts or long activities
→ Example: "2-min Box Breathing" at 10:45, 14:15, 16:30
```

### Medium Stress + Medium Intensity
```
→ Breathing breaks + movement snacks + meal
→ Balanced approach
→ Example: "5-min Calm Break" (9:30), "Lunch" (12:30), "Stretch" (15:00)
```

### Low Stress + Low Intensity
```
→ Full range of activities
→ Include longer workouts (30+ min)
→ Example: "Morning Walk" (9:00), "Lunch Prep" (12:00), "Meditation" (16:00), "Evening Yoga" (18:00)
```

### Low Energy (regardless of stress)
```
→ Gentle activities only
→ Shorter durations (5-15 min)
→ More sitting/lying activities
→ Example: "Gentle Breathing" (10:00), "Light Snack" (14:00)
```

## Testing

### Test Case 1: Busy Schedule, High Stress
```bash
curl -X POST http://localhost:3001/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "high",
    "moodScore": 4.5,
    "energyLevel": "low",
    "stressLevel": "high",
    "timeWindow": {
      "start": "2025-11-09T08:00:00Z",
      "end": "2025-11-09T20:00:00Z"
    },
    "existingEvents": [
      { "start": "2025-11-09T09:00:00Z", "end": "2025-11-09T10:30:00Z" },
      { "start": "2025-11-09T11:00:00Z", "end": "2025-11-09T12:00:00Z" },
      { "start": "2025-11-09T14:00:00Z", "end": "2025-11-09T16:00:00Z" }
    ]
  }'

# Expected: 2-3 short breathing breaks in gaps
```

### Test Case 2: Light Schedule, Medium Stress
```bash
curl -X POST http://localhost:3001/agentic/generate-activities \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "scheduleIntensity": "low",
    "moodScore": 6.5,
    "energyLevel": "medium",
    "stressLevel": "medium",
    "timeWindow": {
      "start": "2025-11-09T08:00:00Z",
      "end": "2025-11-09T20:00:00Z"
    },
    "existingEvents": [
      { "start": "2025-11-09T14:00:00Z", "end": "2025-11-09T15:00:00Z" }
    ]
  }'

# Expected: 3-4 activities including workout, meal, breathing
```

## Client Integration

The Today tab (`client/app/(tabs)/today.tsx`) already has the structure to merge agentic activities with calendar events:

```typescript
// Fetch BOTH sources
const calendarEvents = await fetchCalendarEvents();
const agenticActivities = await fetchAgenticActivities(); // TODO: Implement

// Merge and sort by time
const allTasks = [...calendarEvents, ...agenticActivities].sort(...);

// Apply filtering (max 4, 15-min buffer)
const filteredTasks = filterTasksWithTimeConstraints(allTasks);
```

## Next Steps

1. Create `server/src/routes/agentic.routes.js`
2. Implement activity generation logic
3. Integrate NeuralSeek mAIstro API
4. Add database table for storing activities
5. Optional: Google Calendar sync for generated activities
6. Update client to call `/agentic/generate-activities` endpoint
7. Test with various schedule intensities and mood scores

## Notes

- Activities should be **additive** (enhance the day), not **restrictive**
- Always respect user's existing commitments (never overlap)
- Activities can be skipped without guilt (no streak shaming)
- Types should match `DayTask` interface from `client/types/neuro-profile.ts`
- Consider user's `PersonalNeuroProfile` for customization (energy windows, sensory prefs)
