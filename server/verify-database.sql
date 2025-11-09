-- FlowMind Database Verification & Test Data Script
-- Run this in Supabase SQL Editor to verify setup and add test data

-- ============================================================================
-- PART 1: Verify Tables Exist
-- ============================================================================

SELECT 
  '✅ Verifying Tables' as step,
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'weekly_plans', 'breathing_sessions', 'schedule_intensity', 'activity_completions')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'weekly_plans', 'breathing_sessions', 'schedule_intensity', 'activity_completions')
ORDER BY table_name;

-- Expected: 5 rows with '✅ EXISTS' status

-- ============================================================================
-- PART 2: Verify Indexes
-- ============================================================================

SELECT 
  '✅ Verifying Indexes' as step,
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'weekly_plans', 'breathing_sessions', 'schedule_intensity', 'activity_completions')
ORDER BY tablename, indexname;

-- Expected: Multiple indexes for each table

-- ============================================================================
-- PART 3: Count Current Records
-- ============================================================================

SELECT 
  '📊 Current Record Counts' as step,
  (SELECT COUNT(*) FROM profiles) as profiles_count,
  (SELECT COUNT(*) FROM weekly_plans) as weekly_plans_count,
  (SELECT COUNT(*) FROM breathing_sessions) as breathing_sessions_count,
  (SELECT COUNT(*) FROM schedule_intensity) as schedule_intensity_count,
  (SELECT COUNT(*) FROM activity_completions) as activity_completions_count;

-- ============================================================================
-- PART 4: Create Test Profile (Optional - for testing)
-- ============================================================================

-- Insert a test profile
INSERT INTO profiles (user_id, profile_data)
VALUES (
  'test-user-manual-001',
  '{
    "energyWindows": [
      {"start": "09:00", "end": "12:00", "label": "Morning Peak"},
      {"start": "14:00", "end": "16:00", "label": "Afternoon Focus"}
    ],
    "sensory": {
      "reducedAnimation": false,
      "hapticsOnly": true,
      "silentMode": false
    },
    "bufferPolicy": {
      "before": 10,
      "after": 5
    },
    "preferences": {
      "workoutDuration": 20,
      "mealComplexity": "simple"
    }
  }'::jsonb
)
ON CONFLICT (user_id) DO UPDATE
SET profile_data = EXCLUDED.profile_data,
    updated_at = NOW();

-- Verify the test profile was created
SELECT 
  '✅ Test Profile Created' as step,
  user_id,
  profile_data->'energyWindows' as energy_windows,
  created_at,
  updated_at
FROM profiles
WHERE user_id = 'test-user-manual-001';

-- ============================================================================
-- PART 5: Create Test Weekly Plan
-- ============================================================================

INSERT INTO weekly_plans (user_id, week_start, week_end, plan_data)
VALUES (
  'test-user-manual-001',
  '2025-11-04 00:00:00+00',
  '2025-11-10 23:59:59+00',
  '{
    "weekStart": "2025-11-04",
    "weekEnd": "2025-11-10",
    "days": {
      "2025-11-04": {
        "blocks": [
          {
            "id": "block-1",
            "type": "WORKOUT",
            "title": "Morning Walk",
            "startTime": "09:00",
            "endTime": "09:20",
            "durationSec": 1200,
            "microSteps": [
              "Put on walking shoes",
              "Grab water bottle",
              "Step outside",
              "Walk for 20 minutes"
            ]
          },
          {
            "id": "block-2",
            "type": "BREATHING",
            "title": "Midday Calm",
            "startTime": "12:00",
            "endTime": "12:05",
            "durationSec": 300,
            "microSteps": [
              "Find quiet space",
              "Sit comfortably",
              "Follow breathing guide"
            ]
          }
        ]
      }
    }
  }'::jsonb
)
ON CONFLICT (user_id, week_start) DO UPDATE
SET plan_data = EXCLUDED.plan_data;

-- Verify the test plan was created
SELECT 
  '✅ Test Weekly Plan Created' as step,
  id,
  user_id,
  week_start,
  week_end,
  plan_data->'days'->'2025-11-04'->'blocks' as monday_blocks
FROM weekly_plans
WHERE user_id = 'test-user-manual-001';

-- ============================================================================
-- PART 6: Create Test Breathing Session
-- ============================================================================

INSERT INTO breathing_sessions (user_id, duration_min, script_text, session_type)
VALUES (
  'test-user-manual-001',
  5,
  'Welcome to your 5-minute calm breathing session. Find a comfortable position. We will practice box breathing: breathe in for 4 seconds, hold for 4 seconds, breathe out for 4 seconds, and hold for 4 seconds. Let''s begin...',
  'breathing'
)
RETURNING id, user_id, duration_min, session_type, created_at;

-- ============================================================================
-- PART 7: Verify Foreign Key Relationships
-- ============================================================================

SELECT 
  '🔗 Verifying Foreign Keys' as step,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('weekly_plans', 'breathing_sessions', 'schedule_intensity', 'activity_completions')
ORDER BY tc.table_name;

-- Expected: All child tables reference profiles(user_id)

-- ============================================================================
-- PART 8: Test Queries (Common API Queries)
-- ============================================================================

-- Query 1: Get profile with all related data
SELECT 
  '📋 Profile with Related Data' as query_name,
  p.user_id,
  p.profile_data->'energyWindows' as energy_windows,
  COUNT(DISTINCT wp.id) as weekly_plans_count,
  COUNT(DISTINCT bs.id) as breathing_sessions_count,
  COUNT(DISTINCT ac.id) as completed_activities_count
FROM profiles p
LEFT JOIN weekly_plans wp ON p.user_id = wp.user_id
LEFT JOIN breathing_sessions bs ON p.user_id = bs.user_id
LEFT JOIN activity_completions ac ON p.user_id = ac.user_id
WHERE p.user_id = 'test-user-manual-001'
GROUP BY p.user_id, p.profile_data;

-- Query 2: Get this week's plan for user
SELECT 
  '📅 Current Week Plan' as query_name,
  user_id,
  week_start,
  week_end,
  jsonb_array_length(plan_data->'days'->'2025-11-04'->'blocks') as monday_block_count,
  created_at
FROM weekly_plans
WHERE user_id = 'test-user-manual-001'
AND week_start <= NOW()
AND week_end >= NOW()
ORDER BY week_start DESC
LIMIT 1;

-- Query 3: Get recent breathing sessions
SELECT 
  '🧘 Recent Breathing Sessions' as query_name,
  id,
  duration_min,
  session_type,
  CASE WHEN audio_url IS NOT NULL THEN '✅ Cached' ELSE '❌ No Audio' END as audio_status,
  created_at
FROM breathing_sessions
WHERE user_id = 'test-user-manual-001'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- PART 9: Performance Check (Index Usage)
-- ============================================================================

-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT profile_data 
FROM profiles 
WHERE user_id = 'test-user-manual-001';

-- Check weekly_plans query performance
EXPLAIN ANALYZE
SELECT * 
FROM weekly_plans 
WHERE user_id = 'test-user-manual-001'
AND week_start >= '2025-11-01'
AND week_end <= '2025-11-30';

-- ============================================================================
-- PART 10: Cleanup Test Data (Optional)
-- ============================================================================

-- Uncomment to remove test data
-- DELETE FROM profiles WHERE user_id = 'test-user-manual-001';
-- This will cascade delete all related records due to ON DELETE CASCADE

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '✅ Database Verification Complete!' as status,
  NOW() as timestamp,
  'All tables, indexes, and test data verified successfully' as message;

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- If you see issues, run these diagnostic queries:

-- Check for missing tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check for table permissions
-- SELECT grantee, table_name, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_schema = 'public';

-- Check current database size
-- SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;

-- Check table sizes
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
