# FlowMind - Setup Guide

## Quick Setup Instructions

Follow these steps to get FlowMind running locally:

### Step 1: Install Dependencies

```bash
# In server directory
cd server
npm install

# In client directory
cd ../client
npm install
```

### Step 2: Install Expo Notifications

The client needs `expo-notifications` which isn't in package.json yet:

```bash
cd client
npx expo install expo-notifications expo-av expo-speech
```

### Step 3: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run:

```sql
-- Profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly plans table
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id),
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX idx_weekly_plans_dates ON weekly_plans(week_start, week_end);
```

3. Copy your **Project URL** and **anon public key** from Settings > API

### Step 4: Configure Environment Variables

**server/.env:**
```env
PORT=3001
NS_API_KEY=your_neuralseek_api_key_here
NS_API_ENDPOINT=https://api.neuralseek.com/maistro_stream
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**client/.env:**
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Step 5: Run the App

**Terminal 1 - Start Server:**
```bash
cd server
npm start
```

**Terminal 2 - Start Expo:**
```bash
cd client
npm run ios
```

---

## NeuralSeek Agent Configuration

### Create the Agent

In your NeuralSeek dashboard:

1. **Name:** `neuro-weekly-planner`
2. **Type:** Virtual KB Agent
3. **Nodes:**
   - **Seek** (entry point)
   - **LLM Node 1** - "Analyze Profile & Schedule"
   - **LLM Node 2** - "Generate Workouts"
   - **LLM Node 3** - "Generate Dinners & Groceries"
   - **VirtualKB-Out** (exit with JSON)

### Agent Prompt Template

```
You are a neurodivergent-friendly weekly planner.

INPUT:
- User Profile: {userProfile}
- Week Range: {weekRange}
- Busy Blocks: {busyBlocks}

CONSTRAINTS:
1. Schedule workouts only during energy windows: {energyWindows}
2. Add {bufferBefore} min before and {bufferAfter} min after each event
3. Prefer same time slot daily for habit formation
4. Max workout duration: {maxWorkoutMin} minutes
5. If day is packed, schedule 10-15 min "movement snack"
6. Generate 3-5 micro-steps per activity
7. Provide ONE alternative option per day
8. Dinners: ≤45 min, avoid {dietAvoid}

OUTPUT JSON:
{
  "timePlan": {
    "workoutBlocks": [{"date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM"}],
    "dinnerBlocks": [...]
  },
  "workoutPlan": [
    {
      "date": "YYYY-MM-DD",
      "title": "...",
      "durationMin": 30,
      "steps": ["Put on shoes", "Fill water bottle", "Start route"],
      "alternativeOption": {"title": "...", "steps": [...]}
    }
  ],
  "dinnerPlan": [
    {
      "date": "YYYY-MM-DD",
      "name": "...",
      "ingredients": [{"item": "...", "qty": 2, "unit": "cups"}],
      "steps": ["Preheat oven", ...],
      "prepTimeMin": 15,
      "cookTimeMin": 30
    }
  ],
  "groceryList": [{"item": "...", "totalQty": 4, "unit": "cups", "category": "Produce"}]
}
```

---

## Testing the Flow

1. **Launch App** - Should see Welcome screen
2. **Go to Today Tab** - See mock workout with micro-steps
3. **Tap "Start"** - Should get haptic feedback, status changes to "in-progress"
4. **Check Notifications** - Should see scheduled nudges (10, 3, 1 min before)
5. **Tap "Complete"** - Haptic feedback, loads next block

---

## Troubleshooting

### TypeScript Errors

If you see import errors for `today-view` or `calm-theme`, the files might not have been created yet. Check:

```bash
ls client/components/today-view.tsx
ls client/constants/calm-theme.ts
```

### Expo Notifications Not Working

Make sure you've installed them:
```bash
cd client
npx expo install expo-notifications
```

### Server Won't Start

Check that Supabase env vars are set:
```bash
cat server/.env
```

Should show SUPABASE_URL and SUPABASE_ANON_KEY.

### NeuralSeek 401 Error

Your NS_API_KEY might be wrong. Double-check in NeuralSeek dashboard.

---

## Next Steps

1. ✅ Test the Today view mock data
2. ✅ Install dependencies in both client & server
3. ✅ Set up Supabase tables
4. ✅ Configure NeuralSeek agent
5. 🔄 Connect Plan Week screen to backend
6. 🔄 Add Profile setup screen
7. 🔄 Implement Google Calendar OAuth

---

Need help? Open an issue: [GitHub Issues](https://github.com/willofcode/flowmind/issues)
