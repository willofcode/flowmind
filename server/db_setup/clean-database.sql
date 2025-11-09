-- Complete database reset - run this FIRST in Supabase SQL Editor
-- This will drop EVERYTHING and prepare for fresh schema

-- Drop all constraints first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all constraints
    FOR r IN (SELECT constraint_name, table_name 
              FROM information_schema.table_constraints 
              WHERE constraint_schema = 'public' 
              AND constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK'))
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all triggers
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name, event_object_table 
              FROM information_schema.triggers 
              WHERE trigger_schema = 'public')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || 
                ' ON ' || quote_ident(r.event_object_table) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all views
DROP VIEW IF EXISTS mood_trends CASCADE;
DROP VIEW IF EXISTS user_current_state CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_user_last_active() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS ai_orchestration_sessions CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS mood_patterns CASCADE;
DROP TABLE IF EXISTS weekly_schedules CASCADE;
DROP TABLE IF EXISTS mood_check_ins CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Verify everything is clean
SELECT 'Database cleaned. Ready for fresh schema.' as status;
