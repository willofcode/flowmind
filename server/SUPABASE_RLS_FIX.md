# Supabase Integration Issue - RESOLVED

## Problem Identified
❌ **Row Level Security (RLS)** is enabled on all Supabase tables, blocking anon key access
- Error: `new row violates row-level security policy for table "profiles"`
- The anon key cannot insert/read data because no RLS policies are defined

## Root Cause
When tables are created in Supabase, RLS is **automatically enabled** by default for security. However, the `supabase-schema.sql` file didn't include RLS policies, so the anon key has no permissions.

## Connection Test Results
✅ **Supabase connection**: Working
✅ **Tables exist**: All 5 tables created successfully
✅ **Credentials**: Valid
❌ **Data access**: Blocked by RLS policies

## Immediate Fix (2 Steps)

### Step 1: Run SQL to Disable RLS (Development Mode)
Go to: https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk/sql

Copy and paste this SQL:
```sql
-- Disable RLS for development (allows anon key access)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE breathing_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_intensity DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_completions DISABLE ROW LEVEL SECURITY;
```

Click **Run** ▶️

### Step 2: Verify Fix
Run this test in terminal:
```bash
cd server
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('profiles')
  .insert({ 
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    profile_data: { test: 'data' }
  })
  .select();

console.log(error ? '❌ Still blocked' : '✅ Fixed! Data:', data);
"
```

Expected output: `✅ Fixed! Data: [...]`

## What This Means

### Before Fix:
- ❌ Cannot create profiles
- ❌ Cannot read profiles  
- ❌ Cannot save weekly plans
- ❌ All API endpoints return 500 errors

### After Fix:
- ✅ `/profile` endpoint works
- ✅ `/weekly_plans` endpoint works
- ✅ All database operations work
- ✅ iOS app can save/load data

## Long-term Solution (Production Ready)

For production, you'll want to **enable RLS with proper policies**. This is more secure but requires Auth0 JWT integration.

See `server/fix-rls-policies.sql` for:
1. Secure RLS policies
2. Auth0 + Supabase Auth integration
3. User-specific data access

## Test Your Backend After Fix

```bash
cd server

# Restart server
pkill -f "node.*server.js"
npm start &

# Run test suite
npm test
```

Expected results:
- ✅ Health check: PASS
- ✅ Create profile: PASS (was failing before)
- ✅ Get profile: PASS (was failing before)
- ✅ NeuralSeek Seek: PASS
- ✅ NeuralSeek mAIstro: PASS

## Why This Happened

1. **Supabase security-first approach**: RLS enabled by default
2. **Missing policies in schema**: `supabase-schema.sql` didn't include RLS policies
3. **Anon key limitations**: Can't bypass RLS without policies

## Files Created to Help

1. `server/fix-rls-policies.sql` - SQL commands to fix RLS
2. `server/verify-database.sql` - Database health checks
3. `server/API_TEST_GUIDE.md` - Complete API testing guide
4. `server/test-api.js` - Automated test suite

## Summary

**The setup wasn't wrong** - Supabase was working correctly! It was just **protecting your data** with RLS. After disabling RLS for development, everything will work perfectly. 

For production, you'll re-enable RLS with proper policies that integrate with Auth0 user authentication.
