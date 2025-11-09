# Calendar Optimizer - Quick Reference

## 🚀 Quick Start

### Backend API
```bash
cd server && npm start
```

### Test
```bash
node test/test-calendar-optimizer.js
```

### Use in Client
```tsx
import CalendarOptimizer from '@/components/calendar-optimizer';

<CalendarOptimizer userId={userId} onComplete={handleDone} />
```

---

## 📡 API Endpoints

### Analyze (Preview)
```bash
POST /calendar/analyze
{
  "userId": "uuid",
  "accessToken": "google-token",
  "targetDate": "2025-11-09T00:00:00Z" # optional
}
```

### Optimize (Create Events)
```bash
POST /calendar/optimize
{
  "userId": "uuid",
  "accessToken": "google-token"
}
```

### Manual Activity
```bash
POST /calendar/manual-activity
{
  "accessToken": "google-token",
  "activityType": "breathing", # breathing|movement|meal|workout
  "startISO": "2025-11-09T14:30:00Z",
  "duration": 5 # optional
}
```

### History
```bash
GET /calendar/optimization-history?userId=uuid&limit=10
```

---

## 🧠 How It Works

```
User Schedule → Calculate Intensity → Get Mood Data → Ask mAIstro → Create Activities
```

### Schedule Intensity
- **High (>70%):** Breathing breaks only
- **Medium (40-70%):** Breathing + Movement + Meals
- **Low (<40%):** All activities + Workouts

### Activity Types
- 🫁 **Breathing:** 5-10 min (high stress)
- 🚶 **Movement:** 15 min (energy reset)
- 🍽️ **Meal:** 30 min (nourishment)
- 💪 **Workout:** 45-60 min (energy peaks only)

---

## 🛠️ Key Functions

### Backend Service
```javascript
import calendarOptimizerService from './services/calendar-optimizer.service.js';

// Main workflow
await calendarOptimizerService.optimizeCalendar({ userId, accessToken });

// Calculate intensity
const intensity = calendarOptimizerService.calculateScheduleIntensity(
  busyBlocks, dayStart, dayEnd, sleepSchedule
);

// Find gaps
const gaps = calendarOptimizerService.findAvailableGaps(
  busyBlocks, dayStart, dayEnd, energyWindows
);
```

### Client API
```typescript
import { apiClient } from '@/lib/api-client';

// Analyze
await apiClient.analyzeSchedule(userId, accessToken);

// Optimize
await apiClient.optimizeCalendar(userId, accessToken);

// Manual
await apiClient.createManualActivity(accessToken, 'breathing', startISO, 5);

// History
await apiClient.getOptimizationHistory(userId, 10);
```

---

## 🧪 Testing

```bash
# Run full test suite
node test/test-calendar-optimizer.js

# Manual test with curl
curl -X POST http://localhost:3001/calendar/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","accessToken":"token"}'
```

---

## 📊 Database

### Save Optimization Session
```javascript
await supabase.from('ai_orchestration_sessions').insert({
  user_id: userId,
  session_type: 'calendar_optimization',
  mood_score: 7,
  schedule_density: 'medium',
  ai_decisions: { strategy, createdEvents: 4, errors: 0 },
  recommendations: [...]
});
```

---

## 🎨 UI Component

```tsx
<CalendarOptimizer
  userId="user-uuid"
  onComplete={(result) => {
    console.log(`Created ${result.summary.eventsCreated} events`);
  }}
  colorScheme="light" // or "dark"
/>
```

**Features:**
- Two-step workflow (Analyze → Optimize)
- Haptic feedback
- Loading states
- Confirmation dialogs
- Success animations
- Error handling

---

## ⚡ Performance Tips

1. **Rate Limits:** Max 1-2 optimizations/day
2. **Cache:** Store analysis for 1 hour
3. **Batch:** Limit to 5-10 events per run
4. **Index:** Use `user_id`, `created_at` for history queries

---

## 🐛 Common Errors

| Error | Fix |
|-------|-----|
| Missing accessToken | Connect Google Calendar |
| Google API error | Reconnect Google OAuth |
| User not found | Create user in database |
| mAIstro error | Check NS_EMBED_CODE env var |

---

## 📚 Full Docs

- **Complete Guide:** `Guide/CALENDAR_OPTIMIZER_GUIDE.md`
- **Implementation:** `CALENDAR_OPTIMIZER_IMPLEMENTATION.md`
- **Server Architecture:** `server/ARCHITECTURE.md`
- **Schedule Algorithm:** `server/backend_guide/SCHEDULE_INTENSITY_ALGORITHM.md`

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `server/src/services/calendar-optimizer.service.js` | Main agentic workflow |
| `server/src/routes/calendar.routes.js` | API endpoints |
| `client/components/calendar-optimizer.tsx` | React UI |
| `client/lib/api-client.ts` | Client API methods |
| `server/test/test-calendar-optimizer.js` | Test suite |

---

## 💡 Example Flow

```typescript
// 1. User taps "Optimize Calendar" button
<Pressable onPress={handleOptimize}>

// 2. Get Google token
const token = await getAccessToken();

// 3. Call API
const result = await apiClient.optimizeCalendar(userId, token);

// 4. Show success
Alert.alert('✅ Optimized!', `Created ${result.summary.eventsCreated} activities`);

// 5. User checks Google Calendar - sees new events!
```

---

## 🔥 Quick Commands

```bash
# Start server
npm start

# Test optimize endpoint
curl -X POST http://localhost:3001/calendar/optimize \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","accessToken":"ya29..."}'

# Test analyze endpoint
curl -X POST http://localhost:3001/calendar/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","accessToken":"ya29..."}'

# Get history
curl http://localhost:3001/calendar/optimization-history?userId=test

# Manual breathing break
curl -X POST http://localhost:3001/calendar/manual-activity \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken":"ya29...",
    "activityType":"breathing",
    "startISO":"2025-11-09T14:30:00Z",
    "duration":5
  }'
```

---

## ✨ That's It!

You now have a fully functional **AI-powered calendar optimizer** for neurodivergent users! 🎉

**Next Steps:**
1. Set up Google OAuth
2. Configure NeuralSeek
3. Create test user
4. Run test suite
5. Integrate in app
6. Optimize calendars! 🚀
