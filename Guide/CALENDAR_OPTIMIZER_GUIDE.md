# Calendar Optimizer - Agentic Workflow

## Overview

The **Calendar Optimizer** is an AI-powered agentic workflow that intelligently reorganizes Google Calendar events based on:
- **Mood analysis** (from STT check-ins)
- **Schedule intensity** (calculated from busy/free time ratio)
- **Neuro profile** (energy windows, buffer policies, sensory preferences)
- **NeuralSeek mAIstro** (AI-driven recommendations)

This is specifically designed for **neurodivergent individuals** (ADHD, autism, dyslexia) to reduce cognitive load and optimize energy management.

---

## Architecture

### Agentic Workflow Steps

```
1. Fetch Calendar State
   ├─ Google Calendar FreeBusy API
   ├─ Get existing events for context
   └─ Parse busy blocks

2. Get User Context
   ├─ Fetch neuro profile (energy windows, sleep schedule)
   ├─ Get latest mood check-in
   └─ Retrieve personality traits

3. Analyze Schedule
   ├─ Calculate intensity (low/medium/high)
   ├─ Find available gaps (≥10 min)
   └─ Identify energy peak windows

4. AI Decision (mAIstro)
   ├─ Send full context to NeuralSeek mAIstro
   ├─ Get optimization strategy
   └─ Fallback to rule-based if API fails

5. Execute Changes
   ├─ Create breathing breaks (5-10 min)
   ├─ Add movement snacks (15 min)
   ├─ Insert meals (30 min)
   ├─ Schedule workouts (45-60 min in energy peaks)
   └─ Apply buffer policies

6. Save & Report
   ├─ Save orchestration session to database
   ├─ Return created events with reasons
   └─ Provide AI recommendations
```

---

## API Endpoints

### 1. **POST /calendar/analyze**
**Preview mode** - Analyze schedule without making changes

**Request:**
```json
{
  "userId": "user-uuid",
  "accessToken": "google-oauth-token",
  "targetDate": "2025-11-09T00:00:00.000Z" // optional
}
```

**Response:**
```json
{
  "date": "Sat Nov 09 2025",
  "scheduleIntensity": {
    "level": "medium",
    "ratio": 0.55,
    "busyMinutes": 330,
    "totalMinutes": 600
  },
  "gaps": [
    {
      "start": "2025-11-09T10:30:00.000Z",
      "end": "2025-11-09T11:00:00.000Z",
      "minutes": 30,
      "startTime": "10:30:00 AM",
      "endTime": "11:00:00 AM",
      "inEnergyWindow": true
    }
  ],
  "recommendations": [
    "📊 Moderate schedule. Good balance.",
    "Consider adding meals and movement snacks.",
    "🟢 5 gaps available for optimization."
  ],
  "summary": {
    "totalBusyBlocks": 8,
    "totalGaps": 5,
    "totalAvailableMinutes": 180,
    "energyPeakGaps": 2
  }
}
```

---

### 2. **POST /calendar/optimize**
**Full optimization** - Creates events in Google Calendar

**Request:**
```json
{
  "userId": "user-uuid",
  "accessToken": "google-oauth-token",
  "targetDate": "2025-11-09T00:00:00.000Z" // optional
}
```

**Response:**
```json
{
  "success": true,
  "optimizationId": "opt_1699564800000",
  "summary": {
    "assessment": "Schedule is medium intensity. Mood: 7/10. Recommending 4 activities.",
    "scheduleIntensity": {
      "level": "medium",
      "ratio": 0.55,
      "busyMinutes": 330,
      "totalMinutes": 600
    },
    "moodScore": 7,
    "energyLevel": "high",
    "totalGaps": 5,
    "actionsPlanned": 4,
    "eventsCreated": 4,
    "errors": 0
  },
  "createdEvents": [
    {
      "type": "breathing",
      "summary": "🫁 Breathing Break (5 min)",
      "duration": 5,
      "eventId": "google-event-id",
      "htmlLink": "https://calendar.google.com/...",
      "reason": "Short breathing break between tasks",
      "microSteps": [
        "Find a quiet, comfortable spot",
        "Put on headphones (optional)",
        "Start breathing session",
        "Follow the audio guide"
      ]
    },
    {
      "type": "meal",
      "summary": "🍽️ Lunch (30 min)",
      "duration": 30,
      "reason": "Adequate time for a quick meal"
    }
  ],
  "recommendations": [
    "Focus on stress reduction activities today",
    "High schedule density - prioritize breathing breaks",
    "Remember to respect your energy windows"
  ]
}
```

---

### 3. **POST /calendar/manual-activity**
Create a specific activity manually

**Request:**
```json
{
  "accessToken": "google-oauth-token",
  "activityType": "breathing", // breathing|movement|meal|workout
  "startISO": "2025-11-09T14:30:00.000Z",
  "duration": 5 // optional, defaults by type
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "id": "google-event-id",
    "htmlLink": "https://calendar.google.com/...",
    "summary": "🫁 Breathing Break (5 min)",
    "start": { "dateTime": "2025-11-09T14:30:00.000Z" },
    "end": { "dateTime": "2025-11-09T14:35:00.000Z" }
  }
}
```

---

### 4. **GET /calendar/optimization-history**
Get past optimizations

**Query Params:**
- `userId`: string (required)
- `limit`: number (optional, default 10)

**Response:**
```json
{
  "history": [
    {
      "id": "session-uuid",
      "created_at": "2025-11-09T10:00:00.000Z",
      "mood_score": 7,
      "schedule_density": "medium",
      "ai_decisions": {
        "createdEvents": 4,
        "errors": 0
      }
    }
  ],
  "count": 1
}
```

---

## Schedule Intensity Algorithm

### Calculation

```javascript
intensity = busyMinutes / totalWakingMinutes

if (intensity > 0.70) → "high"
if (intensity > 0.40) → "medium"
else → "low"
```

### Adaptive Activities by Intensity

| Intensity | Activities Created | Duration | Examples |
|-----------|-------------------|----------|----------|
| **High (>70%)** | Breathing breaks only | 5-10 min | Box breathing, 4-7-8 breathing |
| **Medium (40-70%)** | Breathing + Movement + Meals | 5-30 min | Quick walks, meals, stretches |
| **Low (<40%)** | Full workouts + All activities | 15-60 min | Gym sessions, meal prep, long walks |

---

## NeuralSeek mAIstro Integration

### Prompt Structure

```
You are an AI agent helping a neurodivergent individual optimize their calendar.

**Current State:**
- Mood Score: 7/10
- Energy Level: high
- Stress Level: mild
- Schedule Intensity: medium (55% busy)

**Available Gaps:**
- 30 min at 10:30 AM (PEAK ENERGY)
- 15 min at 2:00 PM
- 45 min at 5:30 PM

**User Preferences:**
- Energy Windows: 09:00-11:00, 14:00-16:00
- Buffer Before: 10 min
- Buffer After: 5 min

**Your Task:**
Analyze and provide optimization recommendations.

Return JSON:
{
  "assessment": "Brief analysis",
  "actions": [
    {
      "type": "create|move|delete",
      "activity": "breathing|movement|meal|workout",
      "reason": "Why this helps",
      "gapIndex": 0,
      "priority": "high|medium|low"
    }
  ],
  "recommendations": ["Specific advice"]
}
```

### Fallback Strategy

If mAIstro API fails, uses rule-based logic:
- High intensity → Breathing breaks in all gaps ≥5 min
- Medium intensity → Meals (≥30 min), movement (≥15 min), breathing (≥5 min)
- Low intensity → Workouts in energy peaks (≥60 min), meals, movement

---

## Client Integration

### React Component Usage

```tsx
import CalendarOptimizer from '@/components/calendar-optimizer';

<CalendarOptimizer
  userId="user-uuid"
  onComplete={(result) => {
    console.log(`Created ${result.summary.eventsCreated} events`);
  }}
  colorScheme="light"
/>
```

### API Client Usage

```typescript
import { apiClient } from '@/lib/api-client';
import { getAccessToken } from '@/lib/google-auth';

// Analyze schedule
const accessToken = await getAccessToken();
const analysis = await apiClient.analyzeSchedule(userId, accessToken);

// Run optimization
const result = await apiClient.optimizeCalendar(userId, accessToken);

// Manual activity
await apiClient.createManualActivity(accessToken, 'breathing', startISO, 5);
```

---

## Database Schema

### `ai_orchestration_sessions` table

```sql
CREATE TABLE ai_orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_type VARCHAR(50), -- 'calendar_optimization'
  mood_score INTEGER,
  schedule_density VARCHAR(20), -- 'low'|'medium'|'high'
  ai_decisions JSONB, -- Full strategy + results
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example `ai_decisions` JSONB:**
```json
{
  "strategy": {
    "assessment": "Medium intensity schedule",
    "actions": [...]
  },
  "createdEvents": 4,
  "errors": 0
}
```

---

## Activity Types

### 1. Breathing Break (🫁)
- **Duration:** 5-10 min
- **When:** High intensity OR any gap ≥5 min
- **Color:** Peacock blue (#7)
- **Reminders:** 10-3-1 min
- **Micro-steps:**
  1. Find quiet spot
  2. Put on headphones
  3. Start breathing session
  4. Follow audio guide

### 2. Movement Snack (🚶)
- **Duration:** 15 min
- **When:** Medium/Low intensity, gap ≥15 min
- **Color:** Green (#10)
- **Reminders:** 5-1 min
- **Micro-steps:**
  1. Stand up and stretch
  2. Take 10-min walk
  3. Fill water bottle
  4. Return refreshed

### 3. Meal (🍽️)
- **Duration:** 30 min
- **When:** Gap ≥30 min, appropriate meal time
- **Color:** Orange (#6)
- **Auto-detect type:** Breakfast (6-10am), Lunch (11-2pm), Dinner (5-9pm)
- **Micro-steps:**
  1. Get ingredients
  2. Prepare (15 min)
  3. Eat mindfully (15 min)
  4. Clean up (5 min)

### 4. Workout (💪)
- **Duration:** 45-60 min
- **When:** Low intensity + energy peak window + gap ≥60 min
- **Color:** Red (#11)
- **Reminders:** 10-3 min
- **Micro-steps:**
  1. Change into workout clothes
  2. Set up space
  3. Start routine
  4. Cool down
  5. Shower

---

## Testing

### Run Test Suite

```bash
cd server
node test/test-calendar-optimizer.js
```

### Manual Testing with cURL

```bash
# Analyze schedule
curl -X POST http://localhost:3001/calendar/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "accessToken": "ya29.a0...",
    "targetDate": "2025-11-09T00:00:00.000Z"
  }'

# Run optimization
curl -X POST http://localhost:3001/calendar/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "accessToken": "ya29.a0..."
  }'
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing accessToken` | No Google OAuth token | Connect Google Calendar in app |
| `Google Calendar API error` | Invalid/expired token | Reconnect Google Calendar |
| `User not found` | Invalid userId | Create user in database |
| `mAIstro API error` | NeuralSeek down | Falls back to rule-based logic |

### Error Response Format

```json
{
  "error": "Google Calendar access failed. Please reconnect your calendar.",
  "details": "Google Calendar API error: 401 Unauthorized"
}
```

---

## Performance Considerations

1. **API Rate Limits:**
   - Google Calendar: 1,000 requests/day/user
   - NeuralSeek mAIstro: Check contract limits

2. **Optimization Frequency:**
   - Run max 1-2 times per day
   - Cache analysis results for 1 hour

3. **Event Creation:**
   - Batch create if possible
   - Limit to 5-10 events per optimization

4. **Database Queries:**
   - Use `user_current_state` view for efficient context fetching
   - Index on `user_id`, `created_at` for history queries

---

## Future Enhancements

- [ ] **Event moving:** Not just create, but move existing events to better times
- [ ] **Event deletion:** Remove conflicting low-priority events
- [ ] **Multi-day optimization:** Plan full week, not just single day
- [ ] **Learning from feedback:** Track which activities user completes
- [ ] **Integration with wearables:** Use heart rate, sleep data for better decisions
- [ ] **Smart rescheduling:** Auto-adjust when plans change
- [ ] **Collaborative calendars:** Respect shared calendars and family schedules

---

## Neurodivergent Design Principles

### Cognitive Load Reduction
- ✅ Clear micro-steps (3-5 actions per activity)
- ✅ Visual time indicators (not just timestamps)
- ✅ Color coding for activity types
- ✅ Gentle reminders (10-3-1 pattern)

### Energy Management
- ✅ Respects personal energy windows
- ✅ Adds buffer time around events
- ✅ Adapts intensity based on schedule density
- ✅ Prevents over-scheduling

### Sensory Awareness
- ✅ Silent mode support (no audio notifications)
- ✅ Reduced motion option for animations
- ✅ High contrast colors (WCAG AAA)
- ✅ Haptic feedback over sound

### Emotional Safety
- ✅ No shame/guilt in recommendations
- ✅ Always shows "skip" option
- ✅ Gentle language ("Put on shoes" not "HURRY UP!")
- ✅ Celebrates small wins

---

## Support

- **Server Issues:** Check `server/ARCHITECTURE.md`
- **API Docs:** See `server/backend_guide/`
- **Client Integration:** See `client/CLIENT_ARCHITECTURE.md`
- **General Questions:** Read `.github/copilot-instructions.md`
