# 🚀 Quick Fix Guide

## Current Issues

1. ✅ **Port 3001 already in use** - FIXED (killed process)
2. ❌ **Database table 'users' not found** - NEEDS FIX

## Fix Database Issue (5 minutes)

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk/sql
   - Click "New Query"

2. **Run Database Schema**
   - Open file: `server/user-schema.sql` in VS Code
   - Copy ALL contents (CMD+A, CMD+C)
   - Paste into Supabase SQL Editor
   - Click "Run" button

3. **Disable RLS (Development)**
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE mood_check_ins DISABLE ROW LEVEL SECURITY;
   ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
   ALTER TABLE mood_patterns DISABLE ROW LEVEL SECURITY;
   ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_orchestration_sessions DISABLE ROW LEVEL SECURITY;
   ALTER TABLE user_feedback DISABLE ROW LEVEL SECURITY;
   ```
   - Run this as a separate query

4. **Verify Tables**
   - Go to "Table Editor" tab
   - Should see 8 tables: users, user_profiles, mood_check_ins, etc.

### Option 2: Command Line (Alternative)

If you have `psql` installed:

```bash
# From server directory
psql "postgresql://postgres:[YOUR-PASSWORD]@db.wipfxrpiuwqtsaummrwk.supabase.co:5432/postgres" < user-schema.sql
```

## Start Server

```bash
cd server
npm start
```

**Expected Output:**
```
🚀 Starting FlowMind API Server...

📊 Testing database connection...
✅ Database connected

🧠 Testing NeuralSeek connection...
✅ NeuralSeek connected

============================================================
🎉 FlowMind API Server running on http://localhost:3001
============================================================

📍 Available Routes:
   POST   http://localhost:3001/users
   GET    http://localhost:3001/users/:email
   GET    http://localhost:3001/users/:userId/profile
   PUT    http://localhost:3001/users/:userId/profile
   
   POST   http://localhost:3001/mood/checkin
   GET    http://localhost:3001/mood/:userId/history
   GET    http://localhost:3001/mood/:userId/patterns
   
   POST   http://localhost:3001/schedules
   GET    http://localhost:3001/schedules/:userId/:weekStart
   GET    http://localhost:3001/schedules/:userId/intensity
   
   POST   http://localhost:3001/conversations
   GET    http://localhost:3001/conversations/:userId
   
   POST   http://localhost:3001/orchestration/sessions
   GET    http://localhost:3001/orchestration/:userId/sessions
   
   POST   http://localhost:3001/feedback
   GET    http://localhost:3001/feedback/:userId
   
   GET    http://localhost:3001/health
============================================================

✨ Server ready to accept requests
```

## Test Server

```bash
# Test health endpoint
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","timestamp":"...","services":{"supabase":"connected","neuralseek":"connected"}}
```

## If Still Having Issues

### Check Environment Variables

Verify `server/.env` file exists with:

```env
SUPABASE_URL=https://wipfxrpiuwqtsaummrwk.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NS_EMBED_CODE=370207002
NS_SEEK_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/seek
NS_MAISTRO_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/maistro
PORT=3001
```

### Get Supabase Keys

1. Go to: https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk/settings/api
2. Copy the **anon public** key (NOT service_role)
3. Update `SUPABASE_ANON_KEY` in `.env`

### Clear Port 3001 Again

```bash
lsof -ti:3001 | xargs kill -9
```

## What Was Done (Summary)

### Server Reorganization ✅
- Created modular architecture (`src/config/`, `src/routes/`, `src/services/`)
- Split monolithic `server-new-schema.js` into 12 organized files
- Added comprehensive JSDoc documentation
- Updated `package.json` to use new `index.js` entry point

### Documentation Created ✅
- `server/ARCHITECTURE.md` - Complete server architecture guide
- `server/DATABASE_SETUP.md` - Database setup instructions
- `server/QUICK_FIX.md` - This file (quick troubleshooting)
- `client/CLIENT_ARCHITECTURE.md` - Client reorganization plan

### Client Reorganization 🔄 (In Progress)
- Created `client/src/` directory structure
- Subdirectories: `components/`, `services/`, `hooks/`, `types/`, `constants/`, `utils/`
- Ready to move files from `client/lib/` and `client/components/`
- Documentation prepared for modular client architecture

## Next Steps

1. ✅ Fix database (run user-schema.sql)
2. ✅ Start server (npm start)
3. ✅ Test health endpoint
4. 🔄 Continue client-side reorganization (move files to new structure)
5. 🔄 Update import paths in client code
6. 🔄 Test full application flow

## Need Help?

- Database issues: See `server/DATABASE_SETUP.md`
- Server architecture: See `server/ARCHITECTURE.md`
- Client architecture: See `client/CLIENT_ARCHITECTURE.md`
- Quick start: See `QUICKSTART.md` (updated)
