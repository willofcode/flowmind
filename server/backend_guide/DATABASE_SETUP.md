# Database Setup Guide

## ⚠️ Issue: Table 'public.users' Not Found

The error `Could not find the table 'public.users' in the schema cache` means the database schema hasn't been created yet.

## 🔧 Fix: Run Database Schema

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `wipfxrpiuwqtsaummrwk`
3. Click **SQL Editor** in the left sidebar

### Step 2: Run Schema File

1. Click **New Query** button
2. Open `server/user-schema.sql` in your code editor
3. **Copy the ENTIRE contents** of the file
4. **Paste into Supabase SQL Editor**
5. Click **Run** button (bottom right)

Expected output:
```
Success. No rows returned
```

### Step 3: Verify Tables Created

1. Go to **Table Editor** in Supabase
2. You should see these 8 tables:
   - ✅ `users`
   - ✅ `user_profiles`
   - ✅ `mood_check_ins`
   - ✅ `weekly_schedules`
   - ✅ `mood_patterns`
   - ✅ `conversations`
   - ✅ `ai_orchestration_sessions`
   - ✅ `user_feedback`

### Step 4: Disable RLS (Development Only)

Run this in SQL Editor:

```sql
-- Disable Row Level Security for development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_check_ins DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_orchestration_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback DISABLE ROW LEVEL SECURITY;
```

**⚠️ Important**: RLS should be re-enabled with proper policies before production deployment.

### Step 5: Test Connection

Run the server again:

```bash
cd server
npm start
```

Expected output:
```
🚀 Starting FlowMind API Server...

📊 Testing database connection...
✅ Database connected

🧠 Testing NeuralSeek connection...
✅ NeuralSeek connected

============================================================
🎉 FlowMind API Server running on http://localhost:3001
============================================================
```

## 🐛 Common Issues

### "Port 3001 already in use"

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Then restart server
npm start
```

### "SUPABASE_URL not found"

Check your `.env` file exists in `server/` directory:

```env
SUPABASE_URL=https://wipfxrpiuwqtsaummrwk.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
NS_EMBED_CODE=370207002
NS_SEEK_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/seek
NS_MAISTRO_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/maistro
PORT=3001
```

### "Could not authenticate with Supabase"

1. Verify your `SUPABASE_ANON_KEY` is correct
2. Go to Supabase Dashboard → Settings → API
3. Copy the `anon` `public` key (not the `service_role` key)
4. Update `.env` file

### "Table already exists"

If you've already run the schema before:

```sql
-- Drop all tables (WARNING: deletes all data)
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS ai_orchestration_sessions CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS mood_patterns CASCADE;
DROP TABLE IF EXISTS weekly_schedules CASCADE;
DROP TABLE IF EXISTS mood_check_ins CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Then run user-schema.sql again
```

## ✅ Verification Checklist

- [ ] All 8 tables exist in Table Editor
- [ ] RLS is disabled for all tables
- [ ] Server starts without errors
- [ ] Health check endpoint returns success: `curl http://localhost:3001/health`
- [ ] Can create a user: `curl -X POST http://localhost:3001/users -H "Content-Type: application/json" -d '{"email":"test@example.com","name":"Test User"}'`

## 📚 Related Files

- `server/user-schema.sql` - Complete database schema
- `server/verify-database.sql` - Database verification queries
- `server/ARCHITECTURE.md` - Server architecture documentation
- `QUICKSTART.md` - Complete setup guide
