# FlowMind Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- ✅ Node.js 18+ installed
- ✅ Xcode (for iOS development)
- ✅ Expo CLI (`npm install -g expo-cli`)
- ✅ Supabase account
- ✅ NeuralSeek account (embed code: 370207002)

### Step 1: Fix Database Access (2 minutes)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: `wipfxrpiuwqtsaummrwk`
3. Click **SQL Editor** in left sidebar
4. Copy and paste this SQL:

```sql
-- Disable RLS for development (re-enable with policies for production)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_check_ins DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_orchestration_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback DISABLE ROW LEVEL SECURITY;
```

5. Click **Run** (bottom right)
6. Should see: "Success. No rows returned"

### Step 2: Create Database Tables (2 minutes)

1. Still in **SQL Editor**
2. Open new query tab
3. Copy entire contents of `server/user-schema.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Should see: "Success. No rows returned"
7. Verify: Go to **Table Editor** → Should see 8 new tables

### Step 3: Start Backend (30 seconds)

```bash
cd server
npm start  # or: node index.js
```

**Expected Output:**
```
🚀 Starting FlowMind API Server...
📊 Testing database connection...
✅ Database connected
🧠 Testing NeuralSeek connection...
✅ NeuralSeek connected
🎉 FlowMind API Server running on http://localhost:3001
```

**Note:** The server now uses a modular architecture. See `server/ARCHITECTURE.md` for details.

**Expected output:**
```
🚀 FlowMind server running on http://localhost:3001
✅ Supabase configured
✅ NeuralSeek mAIstro orchestration enabled
```

### Step 4: Test API (30 seconds)

Open new terminal:

```bash
cd server
node test-new-api.js
```

**Expected output:**
```
✅ Health check passed
✅ User created successfully
✅ Profile updated successfully
✅ Mood check-in saved
... (17 tests total, all should pass)
```

### Step 5: Start iOS App (1 minute)

Open new terminal:

```bash
cd client
npm run ios
```

**Expected:**
- Simulator launches
- App loads with welcome screen
- Sign in with Auth0 works

### Step 6: Test Mood Check-in

1. In app, navigate to mood check-in (or open URL: `/mood-checkin`)
2. Tap microphone button
3. Speak: "I'm feeling pretty good today"
4. Tap stop button
5. See processing spinner
6. View results:
   - Your transcription
   - Mood score (1-10)
   - Energy level
   - AI recommendations

**Note:** Currently uses mock transcription. See `STT_INTEGRATION_GUIDE.md` to add real STT service.

## ✅ You're Ready!

### What Works Now:
- ✅ User creation and profiles
- ✅ Voice mood check-in (mock transcription)
- ✅ AI mood analysis via mAIstro
- ✅ Pattern discovery (async)
- ✅ Schedule intensity tracking
- ✅ Conversation history
- ✅ Feedback system

### Next Steps:
1. **Add Real STT** → See `STT_INTEGRATION_GUIDE.md`
   - Recommended: OpenAI Whisper ($0.006/min)
   - Free option: iOS Speech Recognition
2. **Customize Profile** → Update neuro preferences in app
3. **Connect Google Calendar** → See `GOOGLE_OAUTH_SETUP.md`
4. **Test Pattern Discovery** → Record 5+ mood check-ins over several days
5. **Build Today View** → Integrate mood data with daily planning

## 🐛 Troubleshooting

### "Network request failed"
- Check backend is running on port 3001
- Verify `client/.env` has `EXPO_PUBLIC_API_BASE_URL=http://localhost:3001`

### "Row violates row-level security policy"
- Run Step 1 (disable RLS) in Supabase SQL Editor
- Check Supabase logs for RLS errors

### "Table does not exist"
- Run Step 2 (create tables) in Supabase SQL Editor
- Go to Table Editor → Verify 8 tables exist

### Test suite fails
- Check `server/.env` has all required variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `NS_EMBED_CODE`
- Verify Supabase connection in dashboard

### Mood check-in doesn't save
- Check backend console for errors
- Verify user_id exists in `users` table
- Check mAIstro endpoint response in logs

## 📚 Documentation

- **Complete Implementation**: `IMPLEMENTATION_COMPLETE.md`
- **STT Integration**: `STT_INTEGRATION_GUIDE.md`
- **API Testing**: `server/test-new-api.js`
- **Database Schema**: `server/user-schema.sql`
- **Design Patterns**: `DESIGN_PATTERNS.md`

## 🆘 Need Help?

1. Check backend logs for errors
2. Run test suite: `node server/test-new-api.js`
3. Verify Supabase tables exist
4. Check API health: `curl http://localhost:3001/health`

## 🎉 What's Next?

Once you have the basics working:

1. **Implement Real STT** → Replace mock transcription
2. **Add Pattern UI** → Visualize discovered mood patterns
3. **Build Recommendations** → Display AI suggestions in Today view
4. **Connect Calendar** → Integrate Google Calendar for schedule intensity
5. **Deploy** → Production deployment with RLS policies

---

**Total setup time: ~5 minutes** ⏱️

Everything is ready to go! Just follow the steps above and you'll have a working mood tracking system with AI analysis. 🚀
