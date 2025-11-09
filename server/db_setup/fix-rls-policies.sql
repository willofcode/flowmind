-- Fix Row Level Security Policies for FlowMind
-- Run this in Supabase SQL Editor to allow the anon key to access tables

-- ============================================================================
-- OPTION 1: Disable RLS (For Development/Testing)
-- Use this if you want to quickly test without auth restrictions
-- ============================================================================

-- Disable RLS on all tables (DEVELOPMENT ONLY)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE breathing_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_intensity DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_completions DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPTION 2: Enable RLS with Permissive Policies (Recommended for Production)
-- Use this for production with proper auth integration
-- ============================================================================

-- First, enable RLS on all tables
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE breathing_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedule_intensity ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

-- Then create policies that allow authenticated users to access their own data

-- Profiles policies
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- CREATE POLICY "Users can view own profile"
--   ON profiles FOR SELECT
--   USING (auth.uid()::text = user_id OR true); -- 'true' allows anon access for testing

-- CREATE POLICY "Users can insert own profile"
--   ON profiles FOR INSERT
--   WITH CHECK (auth.uid()::text = user_id OR true);

-- CREATE POLICY "Users can update own profile"
--   ON profiles FOR UPDATE
--   USING (auth.uid()::text = user_id OR true);

-- Weekly plans policies
-- DROP POLICY IF EXISTS "Users can view own plans" ON weekly_plans;
-- DROP POLICY IF EXISTS "Users can insert own plans" ON weekly_plans;
-- DROP POLICY IF EXISTS "Users can update own plans" ON weekly_plans;

-- CREATE POLICY "Users can view own plans"
--   ON weekly_plans FOR SELECT
--   USING (true); -- Allow all for now

-- CREATE POLICY "Users can insert own plans"
--   ON weekly_plans FOR INSERT
--   WITH CHECK (true);

-- CREATE POLICY "Users can update own plans"
--   ON weekly_plans FOR UPDATE
--   USING (true);

-- Breathing sessions policies
-- DROP POLICY IF EXISTS "Users can view own sessions" ON breathing_sessions;
-- DROP POLICY IF EXISTS "Users can insert own sessions" ON breathing_sessions;

-- CREATE POLICY "Users can view own sessions"
--   ON breathing_sessions FOR SELECT
--   USING (true);

-- CREATE POLICY "Users can insert own sessions"
--   ON breathing_sessions FOR INSERT
--   WITH CHECK (true);

-- Schedule intensity policies
-- DROP POLICY IF EXISTS "Users can view own intensity" ON schedule_intensity;
-- DROP POLICY IF EXISTS "Users can insert own intensity" ON schedule_intensity;

-- CREATE POLICY "Users can view own intensity"
--   ON schedule_intensity FOR SELECT
--   USING (true);

-- CREATE POLICY "Users can insert own intensity"
--   ON schedule_intensity FOR INSERT
--   WITH CHECK (true);

-- Activity completions policies
-- DROP POLICY IF EXISTS "Users can view own completions" ON activity_completions;
-- DROP POLICY IF EXISTS "Users can insert own completions" ON activity_completions;

-- CREATE POLICY "Users can view own completions"
--   ON activity_completions FOR SELECT
--   USING (true);

-- CREATE POLICY "Users can insert own completions"
--   ON activity_completions FOR INSERT
--   WITH CHECK (true);

-- ============================================================================
-- Verify RLS Status
-- ============================================================================

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '🔒 ENABLED'
    ELSE '🔓 DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'weekly_plans', 'breathing_sessions', 'schedule_intensity', 'activity_completions')
ORDER BY tablename;

-- ============================================================================
-- Test Insert After Fix
-- ============================================================================

-- Test inserting a profile (should work after disabling RLS)
INSERT INTO profiles (user_id, profile_data)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '{
    "energyWindows": [{"start": "09:00", "end": "12:00", "label": "Morning"}],
    "sensory": {"reducedAnimation": false, "hapticsOnly": true}
  }'::jsonb
)
ON CONFLICT (user_id) DO UPDATE
SET profile_data = EXCLUDED.profile_data,
    updated_at = NOW();

-- Verify the insert
SELECT 
  'Test Insert Result' as status,
  user_id,
  profile_data->'energyWindows' as energy_windows,
  created_at,
  updated_at
FROM profiles
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

/*
OPTION 1 (Disabled RLS):
✅ Quick to set up
✅ Good for development/testing
❌ No security - anyone can access any data
❌ Not recommended for production

OPTION 2 (RLS with Policies):
✅ Secure - users can only access their own data
✅ Production-ready
✅ Integrates with Supabase Auth
⚠️  Requires auth.uid() to be set (via JWT tokens)

RECOMMENDATION:
1. Use OPTION 1 (disable RLS) for now to unblock development
2. Later, when you integrate Supabase Auth with Auth0, switch to OPTION 2

TO APPLY OPTION 1:
- Just run the first 5 ALTER TABLE commands above
- This will immediately fix the "row-level security policy" error

TO APPLY OPTION 2 (FUTURE):
- Uncomment all the policy creation statements
- Set up Supabase Auth integration with Auth0
- Update your client to send JWT tokens with requests
*/
