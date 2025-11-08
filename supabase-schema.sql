-- FlowMind Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table - stores user PersonalNeuroProfile
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly plans table - stores generated WeeklyPlan data
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_week UNIQUE(user_id, week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_id ON weekly_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_dates ON weekly_plans(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_profiles_updated ON profiles(updated_at DESC);

-- ============================================================================
-- Breathing Sessions - TTS-guided meditation/breathing exercises
-- ============================================================================
CREATE TABLE IF NOT EXISTS breathing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  duration_min INTEGER NOT NULL CHECK (duration_min IN (5, 10, 15)),
  script_text TEXT NOT NULL,
  audio_url TEXT, -- ElevenLabs generated audio URL (cached)
  session_type VARCHAR(50) DEFAULT 'breathing', -- 'breathing', 'meditation', 'grounding'
  voice_id VARCHAR(100), -- ElevenLabs voice ID used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_breathing_sessions_user_id ON breathing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_breathing_sessions_duration ON breathing_sessions(duration_min);
CREATE INDEX IF NOT EXISTS idx_breathing_sessions_type ON breathing_sessions(session_type);

-- ============================================================================
-- Schedule Intensity Cache - Avoid recalculating calendar analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule_intensity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  intensity_level VARCHAR(20) NOT NULL CHECK (intensity_level IN ('low', 'medium', 'high')),
  busy_minutes INTEGER NOT NULL,
  total_minutes INTEGER NOT NULL,
  gap_windows JSONB, -- Store available gaps for quick lookup: [{"start": "10:00", "end": "11:30", "minutes": 90}]
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_schedule_intensity_user_date ON schedule_intensity(user_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_intensity_level ON schedule_intensity(intensity_level);

-- ============================================================================
-- Activity Completions - Track user engagement and patterns
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  block_id VARCHAR(100) NOT NULL, -- Reference to TodayBlock ID from weekly_plans
  block_type VARCHAR(50) NOT NULL, -- 'workout', 'meal', 'breathing', 'movement_snack'
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  skipped BOOLEAN DEFAULT FALSE,
  micro_steps_completed INTEGER DEFAULT 0,
  total_micro_steps INTEGER,
  duration_actual_min INTEGER, -- How long user actually spent
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_completions_user_id ON activity_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_completions_date ON activity_completions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_completions_type ON activity_completions(block_type);
CREATE INDEX IF NOT EXISTS idx_activity_completions_skipped ON activity_completions(skipped);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE profiles IS 'Stores PersonalNeuroProfile data for each user';
COMMENT ON TABLE weekly_plans IS 'Stores AI-generated weekly workout and dinner plans';
COMMENT ON TABLE breathing_sessions IS 'ElevenLabs TTS-guided breathing/meditation sessions with cached audio';
COMMENT ON TABLE schedule_intensity IS 'Cached calendar analysis to avoid repeated Google Calendar API calls';
COMMENT ON TABLE activity_completions IS 'User activity tracking for insights and habit formation';

COMMENT ON COLUMN profiles.profile_data IS 'JSONB containing complete PersonalNeuroProfile object';
COMMENT ON COLUMN weekly_plans.plan_data IS 'JSONB containing WeeklyPlan with timePlan, workoutPlan, dinnerPlan, groceryList';
COMMENT ON COLUMN breathing_sessions.audio_url IS 'Cached ElevenLabs audio URL to avoid regenerating TTS';
COMMENT ON COLUMN schedule_intensity.gap_windows IS 'Pre-calculated available time windows for quick scheduling';
COMMENT ON COLUMN activity_completions.micro_steps_completed IS 'Number of micro-steps user actually completed out of total';

-- ============================================================================
-- Row Level Security (RLS) - Enable for production
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE breathing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_intensity ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
-- Note: Replace auth.uid() with your auth system's user ID function

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Weekly plans policies
CREATE POLICY "Users can view own plans"
  ON weekly_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own plans"
  ON weekly_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own plans"
  ON weekly_plans FOR UPDATE
  USING (user_id = auth.uid());

-- Breathing sessions policies
CREATE POLICY "Users can view own breathing sessions"
  ON breathing_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own breathing sessions"
  ON breathing_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own breathing sessions"
  ON breathing_sessions FOR UPDATE
  USING (user_id = auth.uid());

-- Schedule intensity policies
CREATE POLICY "Users can view own schedule intensity"
  ON schedule_intensity FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own schedule intensity"
  ON schedule_intensity FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own schedule intensity"
  ON schedule_intensity FOR UPDATE
  USING (user_id = auth.uid());

-- Activity completions policies
CREATE POLICY "Users can view own activity completions"
  ON activity_completions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity completions"
  ON activity_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own activity completions"
  ON activity_completions FOR UPDATE
  USING (user_id = auth.uid());

-- Sample data for testing (optional - remove in production)
-- INSERT INTO profiles (user_id, profile_data) VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   '{
--     "workoutLikes": ["walks", "stretching", "yoga"],
--     "diet": {"style": "Mediterranean", "avoid": ["fried", "very spicy"]},
--     "sleep": {"usualBed": "23:30", "usualWake": "07:30"},
--     "energyWindows": [{"start": "10:00", "end": "12:00"}, {"start": "16:30", "end": "18:00"}],
--     "focusBlockMin": 25,
--     "breakMin": 5,
--     "maxWorkoutMin": 40,
--     "sensory": {
--       "reducedAnimation": true,
--       "hapticsOnly": true,
--       "lowContrastText": false,
--       "silentMode": false
--     },
--     "nudgeStyle": "gentle",
--     "bufferPolicy": {"before": 10, "after": 10}
--   }'
-- );

-- Verification queries
-- SELECT * FROM profiles;
-- SELECT * FROM weekly_plans ORDER BY created_at DESC LIMIT 5;
