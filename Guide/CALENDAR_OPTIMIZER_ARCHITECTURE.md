# Calendar Optimizer - System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLOWMIND CALENDAR OPTIMIZER                        │
│                     Agentic AI Workflow for Neurodivergent Users            │
└─────────────────────────────────────────────────────────────────────────────┘

                                   ┌─────────────┐
                                   │  iOS App    │
                                   │  (Expo)     │
                                   └──────┬──────┘
                                          │
                                          │ User taps
                                          │ "Optimize Calendar"
                                          ↓
                        ┌─────────────────────────────────┐
                        │  CalendarOptimizer Component    │
                        │  (calendar-optimizer.tsx)       │
                        │                                 │
                        │  1. Analyze (preview)           │
                        │  2. Optimize (create events)    │
                        └────────────┬────────────────────┘
                                     │
                                     │ API calls via apiClient
                                     ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                            NODE.JS BACKEND                                  │
│                         (http://localhost:3001)                             │
└────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────┐
    │                    Calendar Routes                                │
    │              (calendar.routes.js)                                 │
    │                                                                   │
    │  POST /calendar/analyze      → Preview optimization              │
    │  POST /calendar/optimize     → Run full workflow                 │
    │  POST /calendar/manual-activity → Create single activity         │
    │  GET  /calendar/optimization-history → Get past runs             │
    └────────────────────────┬──────────────────────────────────────────┘
                             │
                             │ Calls service methods
                             ↓
    ┌───────────────────────────────────────────────────────────────────┐
    │            Calendar Optimizer Service                             │
    │          (calendar-optimizer.service.js)                          │
    │                                                                   │
    │  ┌─────────────────────────────────────────────────────────────┐ │
    │  │  AGENTIC WORKFLOW                                           │ │
    │  │                                                             │ │
    │  │  Step 1: Fetch Calendar State                              │ │
    │  │  ├─ Google Calendar FreeBusy API                           │ │
    │  │  ├─ Get existing events                                    │ │
    │  │  └─ Parse busy blocks                                      │ │
    │  │                                                             │ │
    │  │  Step 2: Get User Context                                  │ │
    │  │  ├─ Supabase: user_current_state view                     │ │
    │  │  ├─ Neuro profile (energy windows, sleep)                 │ │
    │  │  └─ Latest mood check-in                                  │ │
    │  │                                                             │ │
    │  │  Step 3: Analyze Schedule                                  │ │
    │  │  ├─ calculateScheduleIntensity()                          │ │
    │  │  │   → busyMinutes / totalMinutes                         │ │
    │  │  │   → low (<40%) | medium (40-70%) | high (>70%)        │ │
    │  │  └─ findAvailableGaps()                                   │ │
    │  │      → Gaps ≥10 min between events                        │ │
    │  │      → Mark energy peak windows                           │ │
    │  │                                                             │ │
    │  │  Step 4: AI Decision (mAIstro)                            │ │
    │  │  ├─ Build context prompt                                  │ │
    │  │  ├─ Call NeuralSeek mAIstro API                          │ │
    │  │  ├─ Parse strategy JSON                                   │ │
    │  │  └─ Fallback to rules if API fails                       │ │
    │  │                                                             │ │
    │  │  Step 5: Execute Changes                                   │ │
    │  │  ├─ For each action:                                      │ │
    │  │  │   ├─ createBreathingActivity()                        │ │
    │  │  │   ├─ createMovementActivity()                         │ │
    │  │  │   ├─ createMealActivity()                             │ │
    │  │  │   └─ Create in Google Calendar                        │ │
    │  │  └─ Collect results & errors                             │ │
    │  │                                                             │ │
    │  │  Step 6: Save & Report                                     │ │
    │  │  ├─ Save to ai_orchestration_sessions                    │ │
    │  │  └─ Return optimization summary                           │ │
    │  └─────────────────────────────────────────────────────────────┘ │
    └────────────────────┬──────────────┬──────────────┬──────────────┘
                         │              │              │
                         ↓              ↓              ↓
        ┌────────────────────┐  ┌─────────────┐  ┌──────────────────┐
        │  Google Calendar   │  │ NeuralSeek  │  │   Supabase DB    │
        │       API          │  │  mAIstro    │  │                  │
        │                    │  │             │  │  • users         │
        │  • FreeBusy        │  │  AI Agent   │  │  • user_profiles │
        │  • Create Events   │  │  Decisions  │  │  • mood_check_ins│
        │  • List Events     │  │             │  │  • orchestration │
        └────────────────────┘  └─────────────┘  └──────────────────┘


┌────────────────────────────────────────────────────────────────────────────┐
│                          ADAPTIVE ACTIVITY LOGIC                            │
└────────────────────────────────────────────────────────────────────────────┘

    Schedule Intensity: HIGH (>70% busy)
    ────────────────────────────────────
    Gap: 10 min  →  🫁 Breathing Break (5 min)
    Gap: 15 min  →  🫁 Breathing Break (10 min)
    
    Rationale: Minimize additions, focus on stress reduction


    Schedule Intensity: MEDIUM (40-70% busy)
    ────────────────────────────────────────
    Gap: 10 min  →  🫁 Breathing Break (5 min)
    Gap: 20 min  →  🚶 Movement Snack (15 min)
    Gap: 35 min  →  🍽️ Meal Time (30 min)
    
    Rationale: Balanced approach with variety


    Schedule Intensity: LOW (<40% busy)
    ────────────────────────────────────
    Gap: 15 min             →  🚶 Movement Snack (15 min)
    Gap: 35 min             →  🍽️ Meal Time (30 min)
    Gap: 60 min (energy peak) →  💪 Full Workout (45 min)
    
    Rationale: Maximize self-care opportunities


┌────────────────────────────────────────────────────────────────────────────┐
│                        NEURALSEEK mAIstro PROMPT                            │
└────────────────────────────────────────────────────────────────────────────┘

    You are an AI agent helping a neurodivergent individual (ADHD/Anxiety)
    optimize their calendar for today.
    
    **Current State:**
    - Time: 2:30 PM
    - Mood Score: 7/10
    - Energy Level: high
    - Stress Level: mild
    - Schedule Intensity: medium (55% busy)
    - Busy Minutes: 330 / 600 waking minutes
    
    **Available Gaps:**
    - 30 min at 10:30 AM (PEAK ENERGY)
    - 15 min at 2:00 PM
    - 45 min at 5:30 PM
    
    **User Preferences:**
    - Energy Windows: 09:00-11:00, 14:00-16:00
    - Buffer Before: 10 min
    - Buffer After: 5 min
    
    **Your Task:**
    Analyze this data and provide optimization recommendations.
    
    Return JSON:
    {
      "assessment": "Brief analysis of current schedule",
      "actions": [
        {
          "type": "create",
          "activity": "breathing",
          "reason": "Why this helps",
          "gapIndex": 0,
          "priority": "high"
        }
      ],
      "recommendations": ["Specific advice for user"]
    }


┌────────────────────────────────────────────────────────────────────────────┐
│                        ACTIVITY SPECIFICATIONS                              │
└────────────────────────────────────────────────────────────────────────────┘

    🫁 BREATHING BREAK
    ──────────────────
    Duration: 5-10 minutes
    Color: Peacock Blue (#7)
    Reminders: 10-3-1 minutes before
    Micro-steps:
      1. Find a quiet, comfortable spot
      2. Put on headphones (optional)
      3. Start breathing session
      4. Follow the audio guide
    
    Use Case: High stress, transition between meetings


    🚶 MOVEMENT SNACK
    ─────────────────
    Duration: 15 minutes
    Color: Green (#10)
    Reminders: 5-1 minutes before
    Micro-steps:
      1. Stand up and stretch
      2. Take a 10-minute walk
      3. Fill water bottle
      4. Return refreshed
    
    Use Case: Energy dip, sedentary period


    🍽️ MEAL TIME
    ────────────
    Duration: 30 minutes
    Color: Orange (#6)
    Reminders: 10-3-1 minutes before
    Auto-detects: Breakfast (6-10am), Lunch (11-2pm), Dinner (5-9pm)
    Micro-steps:
      1. Get ingredients from fridge
      2. Prepare meal (15 min max)
      3. Eat mindfully (15 min)
      4. Clean up quickly (5 min)
    
    Use Case: Meal timing gaps


    💪 WORKOUT
    ──────────
    Duration: 45-60 minutes
    Color: Red (#11)
    Reminders: 10-3 minutes before
    Micro-steps:
      1. Change into workout clothes
      2. Set up workout space
      3. Start workout routine
      4. Cool down and stretch
      5. Shower and change
    
    Use Case: Low intensity + energy peak + large gap


┌────────────────────────────────────────────────────────────────────────────┐
│                          DATA FLOW DIAGRAM                                  │
└────────────────────────────────────────────────────────────────────────────┘

    User Profile                 Google Calendar              Latest Mood
    ┌──────────┐                ┌──────────────┐             ┌──────────┐
    │ Energy   │                │ Busy Blocks  │             │ Score: 7 │
    │ Windows  │                │ Free Gaps    │             │ Energy:  │
    │ Sleep    │                │ Events List  │             │ high     │
    │ Buffers  │                └──────┬───────┘             └────┬─────┘
    └────┬─────┘                       │                          │
         │                              │                          │
         └──────────────┬───────────────┴──────────────┬──────────┘
                        ↓                               │
                  ┌─────────────────┐                  │
                  │  AI ANALYZER    │ ←────────────────┘
                  │  (mAIstro)      │
                  └────────┬────────┘
                           │
                           │ Generates Strategy
                           ↓
                  ┌─────────────────┐
                  │   STRATEGY      │
                  │  • Actions      │
                  │  • Priorities   │
                  │  • Reasons      │
                  └────────┬────────┘
                           │
                           │ Execute
                           ↓
         ┌─────────────────┴─────────────────┐
         │                                    │
         ↓                                    ↓
    ┌────────────┐                    ┌──────────────┐
    │  Google    │                    │   Supabase   │
    │  Calendar  │                    │   Database   │
    │            │                    │              │
    │  Create:   │                    │  Save:       │
    │  • Events  │                    │  • Session   │
    │  • Reminders│                   │  • Results   │
    └────────────┘                    └──────────────┘


┌────────────────────────────────────────────────────────────────────────────┐
│                         USER EXPERIENCE FLOW                                │
└────────────────────────────────────────────────────────────────────────────┘

    1. User opens FlowMind app
       ↓
    2. Taps "Optimize Calendar" button
       ↓
    3. Step 1: ANALYZE
       - Shows loading spinner
       - Calls /calendar/analyze
       - Displays intensity badge (Low/Medium/High)
       - Shows available gaps
       - Lists AI recommendations
       ↓
    4. User reviews analysis
       ↓
    5. Taps "Optimize My Calendar"
       ↓
    6. Confirmation dialog appears
       "FlowMind will create breathing breaks, movement snacks,
        and meal times. You can delete these later."
       ↓
    7. User confirms
       ↓
    8. Step 2: OPTIMIZE
       - Shows loading spinner
       - Calls /calendar/optimize
       - Creates events in Google Calendar
       ↓
    9. Success message
       "✅ Created 4 activities in your calendar!"
       ↓
   10. User opens Google Calendar
       - Sees new color-coded events
       - Each has micro-steps in description
       - 10-3-1 reminders configured
       ↓
   11. User follows activities throughout day
       - Gets reminders at right times
       - Completes breathing breaks
       - Takes movement snacks
       - Eats meals on schedule
       ↓
   12. End of day: Better energy management! 🎉


┌────────────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING & FALLBACKS                             │
└────────────────────────────────────────────────────────────────────────────┘

    Error Scenario                    → Fallback Strategy
    ─────────────────────────────────────────────────────────
    
    Google Calendar API down          → Show cached analysis
    
    NeuralSeek mAIstro unavailable   → Use rule-based logic
                                        (intensity thresholds)
    
    Invalid OAuth token               → Redirect to Google Sign-In
    
    No mood data found                → Use neutral defaults
                                        (mood: 5, energy: moderate)
    
    No neuro profile                  → Use standard defaults
                                        (energy: 9-11am, 2-4pm)
    
    Calendar event creation fails     → Continue with next event
                                        Log error, don't stop workflow
    
    Database connection lost          → Cache results in memory
                                        Retry save later


┌────────────────────────────────────────────────────────────────────────────┐
│                           METRICS & ANALYTICS                               │
└────────────────────────────────────────────────────────────────────────────┘

    Tracked in: ai_orchestration_sessions table
    
    Per Optimization Run:
    • Optimization ID
    • User ID
    • Timestamp
    • Mood score at time of optimization
    • Schedule intensity (low/medium/high)
    • Actions planned
    • Events created
    • Errors encountered
    • AI strategy used
    • Recommendations provided
    
    Future Analytics:
    • Completion rate (how many activities user actually did)
    • Mood improvement (before vs after optimization)
    • Most effective activity types
    • Optimal timing patterns
    • User preferences learned over time


┌────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY & PRIVACY                                  │
└────────────────────────────────────────────────────────────────────────────┘

    ✅ OAuth tokens stored in expo-secure-store (encrypted)
    ✅ Never log OAuth tokens in backend
    ✅ User data stays in Supabase (RLS policies enforced)
    ✅ Calendar events visible only to user
    ✅ AI analysis is ephemeral (not stored in NeuralSeek)
    ✅ Mood data encrypted at rest
    ✅ HTTPS for all API communication
    ✅ No tracking of calendar contents


┌────────────────────────────────────────────────────────────────────────────┐
│                           FILE STRUCTURE                                    │
└────────────────────────────────────────────────────────────────────────────┘

    flowmind/
    ├── client/
    │   ├── components/
    │   │   └── calendar-optimizer.tsx       ← React UI component
    │   ├── lib/
    │   │   ├── api-client.ts                ← API wrapper (updated)
    │   │   └── google-auth.ts               ← OAuth handling
    │   └── app/
    │       └── calendar-optimizer.tsx       ← Screen (to be created)
    │
    ├── server/
    │   ├── src/
    │   │   ├── services/
    │   │   │   └── calendar-optimizer.service.js  ← Main workflow
    │   │   ├── routes/
    │   │   │   └── calendar.routes.js            ← API endpoints
    │   │   └── config/
    │   │       └── neuralseek.js                 ← mAIstro config
    │   ├── test/
    │   │   └── test-calendar-optimizer.js        ← Test suite
    │   └── index.js                              ← Main server (updated)
    │
    └── Guide/
        ├── CALENDAR_OPTIMIZER_GUIDE.md           ← Full documentation
        ├── CALENDAR_OPTIMIZER_IMPLEMENTATION.md   ← Implementation summary
        └── CALENDAR_OPTIMIZER_QUICK_REF.md       ← Quick reference


┌────────────────────────────────────────────────────────────────────────────┐
│                      🎉 READY TO OPTIMIZE CALENDARS! 🎉                     │
└────────────────────────────────────────────────────────────────────────────┘
```
