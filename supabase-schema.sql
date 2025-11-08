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
COMMENT ON COLUMN profiles.profile_data IS 'JSONB containing complete PersonalNeuroProfile object';
COMMENT ON COLUMN weekly_plans.plan_data IS 'JSONB containing WeeklyPlan with timePlan, workoutPlan, dinnerPlan, groceryList';

-- Row Level Security (RLS) - Enable for production
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

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
