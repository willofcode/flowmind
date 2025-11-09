-- FlowMind: Drop existing tables and recreate fresh schema
-- ⚠️ WARNING: This will delete ALL existing data!
-- Only run this in development

-- ============================================================================
-- Drop all tables in correct order (reverse of dependencies)
-- ============================================================================

DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS ai_orchestration_sessions CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS mood_patterns CASCADE;
DROP TABLE IF EXISTS weekly_schedules CASCADE;
DROP TABLE IF EXISTS mood_check_ins CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop views
DROP VIEW IF EXISTS mood_trends CASCADE;
DROP VIEW IF EXISTS user_current_state CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_last_active() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- Now run the full schema from user-schema.sql
-- ============================================================================

-- You can either:
-- 1. Copy and paste the contents of user-schema.sql after this, OR
-- 2. Run this file first, then run user-schema.sql separately

SELECT 'All tables dropped. Ready for fresh schema.' as status;
