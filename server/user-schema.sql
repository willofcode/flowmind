-- FlowMind User-Centric Schema with Agentic AI Orchestration
-- This schema stores user data, mood tracking, and enables mAIstro context analysis

-- ============================================================================
-- Core User Table (Replaces Auth0-dependent structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth0_sub VARCHAR(255) UNIQUE, -- Optional: Link to Auth0 if using it
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth0_sub ON users(auth0_sub);

-- ============================================================================
-- User Profile (Neurodivergent settings + preferences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Personal information
  display_name VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  language VARCHAR(10) DEFAULT 'en',
  
  -- Neurodivergent preferences (stored as JSONB for flexibility)
  neuro_preferences JSONB DEFAULT '{}'::jsonb,
  -- Example structure:
  -- {
  --   "energyWindows": [{"start": "09:00", "end": "12:00", "label": "Morning Peak"}],
  --   "sensory": {"reducedAnimation": false, "hapticsOnly": true, "silentMode": false},
  --   "bufferPolicy": {"before": 10, "after": 5},
  --   "workoutPreferences": {"duration": 20, "intensity": "moderate"},
  --   "mealPreferences": {"complexity": "simple", "dietaryRestrictions": []}
  -- }
  
  -- AI personalization data
  personality_traits JSONB DEFAULT '{}'::jsonb,
  -- Example: {"adhdType": "inattentive", "anxietyLevel": "moderate", "sensoryProfile": "hypersensitive"}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_profile UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- Daily Mood Check-ins (From STT transcriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mood_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Check-in data
  check_in_date DATE NOT NULL,
  check_in_time TIME NOT NULL,
  
  -- Voice input (STT transcription)
  transcription TEXT NOT NULL,
  audio_url TEXT, -- Optional: Store audio file URL
  duration_seconds INTEGER,
  
  -- Extracted mood data (processed by mAIstro)
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10), -- 1=very low, 10=excellent
  energy_level VARCHAR(20) CHECK (energy_level IN ('very_low', 'low', 'moderate', 'high', 'very_high')),
  stress_level VARCHAR(20) CHECK (stress_level IN ('calm', 'mild', 'moderate', 'high', 'overwhelming')),
  emotional_state JSONB, -- {"primary": "anxious", "secondary": "hopeful", "intensity": 7}
  
  -- Context at time of check-in
  schedule_density VARCHAR(20) CHECK (schedule_density IN ('low', 'medium', 'high')),
  upcoming_events_count INTEGER DEFAULT 0,
  
  -- AI analysis (from mAIstro)
  ai_analysis JSONB, 
  -- {
  --   "triggers": ["busy schedule", "lack of breaks"],
  --   "recommendations": ["add 5-min breathing session", "reduce workout intensity"],
  --   "patterns": ["energy drops after 3pm on busy days"],
  --   "confidence": 0.85
  -- }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_daily_checkin UNIQUE(user_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_mood_check_ins_user_date ON mood_check_ins(user_id, check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_mood_score ON mood_check_ins(mood_score);
CREATE INDEX IF NOT EXISTS idx_mood_check_ins_energy ON mood_check_ins(energy_level);

-- ============================================================================
-- Weekly Schedule Context (For mAIstro correlation analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Schedule metadata (calculated from calendar)
  total_events INTEGER DEFAULT 0,
  total_busy_hours DECIMAL(5,2), -- e.g., 35.5 hours
  avg_daily_density DECIMAL(3,2), -- 0.0 (empty) to 1.0 (fully packed)
  longest_gap_minutes INTEGER, -- Longest available time block
  
  -- Daily breakdowns
  daily_breakdown JSONB,
  -- {
  --   "2025-11-04": {
  --     "events": 5,
  --     "busyHours": 6.5,
  --     "density": 0.65,
  --     "gaps": [{"start": "10:00", "end": "11:30", "minutes": 90}]
  --   }
  -- }
  
  -- Generated plan (micro-steps for each activity)
  plan_data JSONB,
  -- Same structure as before but enriched with AI recommendations
  
  -- AI orchestration metadata
  generated_by VARCHAR(50) DEFAULT 'maistro', -- 'maistro', 'manual', 'hybrid'
  generation_context JSONB, -- Store the context used for generation
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_week UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_schedules_user_week ON weekly_schedules(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_density ON weekly_schedules(avg_daily_density);

-- ============================================================================
-- Mood-Schedule Correlations (Discovered by mAIstro)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mood_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pattern metadata
  pattern_type VARCHAR(50) NOT NULL, 
  -- 'schedule_density', 'time_of_day', 'activity_type', 'day_of_week'
  
  pattern_name VARCHAR(255) NOT NULL,
  -- e.g., "Low energy on high-density days", "Stress spike before meetings"
  
  -- Pattern details
  description TEXT,
  trigger_conditions JSONB,
  -- {
  --   "scheduleCondition": {"density": ">0.7", "events": ">5"},
  --   "timeWindow": {"start": "14:00", "end": "17:00"},
  --   "dayOfWeek": [1, 2, 5]
  -- }
  
  observed_effect JSONB,
  -- {
  --   "moodScore": {"avg": 4.2, "change": -3.5},
  --   "energyLevel": "low",
  --   "stressLevel": "high"
  -- }
  
  -- Statistical confidence
  occurrence_count INTEGER DEFAULT 1,
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  last_observed_at TIMESTAMPTZ,
  
  -- AI recommendations based on pattern
  recommendations JSONB,
  -- [
  --   {"action": "add_breathing_session", "timing": "before_busy_block", "duration": 5},
  --   {"action": "reduce_workout", "intensity": "light", "reason": "preserve_energy"}
  -- ]
  
  -- Pattern status
  active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false, -- User confirmed this pattern is accurate
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_patterns_user ON mood_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_patterns_type ON mood_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_mood_patterns_active ON mood_patterns(active, confidence_score DESC);

-- ============================================================================
-- Conversation History (For STT context and mAIstro memory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  conversation_date DATE NOT NULL,
  message_type VARCHAR(20) CHECK (message_type IN ('checkin', 'feedback', 'question', 'reflection')),
  
  -- Message content
  user_message TEXT NOT NULL, -- STT transcription
  ai_response TEXT, -- mAIstro response
  
  -- Context at time of conversation
  mood_at_time INTEGER CHECK (mood_at_time BETWEEN 1 AND 10),
  schedule_context JSONB, -- Snapshot of schedule state
  
  -- Conversation analysis
  sentiment_score DECIMAL(3,2), -- -1.0 (negative) to 1.0 (positive)
  key_topics TEXT[], -- ['sleep', 'work_stress', 'exercise']
  action_items JSONB, -- Extracted tasks or recommendations
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_date ON conversations(user_id, conversation_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(message_type);

-- ============================================================================
-- mAIstro Orchestration Sessions (Track AI decision-making)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session info
  session_type VARCHAR(50) NOT NULL,
  -- 'weekly_planning', 'mood_analysis', 'pattern_discovery', 'adaptive_scheduling'
  
  trigger VARCHAR(50),
  -- 'scheduled', 'user_request', 'pattern_detected', 'mood_change'
  
  -- Input context
  input_data JSONB NOT NULL,
  -- All data passed to mAIstro: user profile, schedule, mood history, patterns
  
  -- mAIstro response
  output_data JSONB,
  -- Generated plan, recommendations, analysis results
  
  -- Execution metrics
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  model_version VARCHAR(50),
  
  -- Results
  actions_taken JSONB, -- What changes were made based on AI output
  user_accepted BOOLEAN, -- Did user accept the recommendations?
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_date ON ai_orchestration_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_type ON ai_orchestration_sessions(session_type);

-- ============================================================================
-- User Feedback Loop (For continuous improvement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- What was the feedback about?
  feedback_type VARCHAR(50) NOT NULL,
  -- 'schedule_quality', 'mood_accuracy', 'recommendation', 'pattern_relevance'
  
  reference_id UUID, -- ID of the thing being rated (schedule, pattern, recommendation)
  reference_table VARCHAR(50), -- Table name for reference_id
  
  -- Feedback content
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- Star rating
  helpful BOOLEAN, -- Simple yes/no
  comment TEXT,
  
  -- Action taken based on feedback
  adjustment_made JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);

-- ============================================================================
-- Database Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_schedules_updated_at BEFORE UPDATE ON weekly_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mood_patterns_updated_at BEFORE UPDATE ON mood_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_active_at when user does anything
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_active_at = NOW() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to track user activity
CREATE TRIGGER track_mood_checkin_activity AFTER INSERT ON mood_check_ins
  FOR EACH ROW EXECUTE FUNCTION update_user_last_active();

CREATE TRIGGER track_conversation_activity AFTER INSERT ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_user_last_active();

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- View: User with latest mood and schedule context
CREATE OR REPLACE VIEW user_current_state AS
SELECT 
  u.id,
  u.email,
  u.name,
  up.display_name,
  up.neuro_preferences,
  
  -- Latest mood check-in
  mc.mood_score as current_mood,
  mc.energy_level as current_energy,
  mc.check_in_date as last_checkin_date,
  
  -- Current week schedule
  ws.avg_daily_density as week_schedule_density,
  ws.total_events as week_total_events,
  
  -- Active patterns
  (SELECT COUNT(*) FROM mood_patterns mp WHERE mp.user_id = u.id AND mp.active = true) as active_patterns_count
  
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN LATERAL (
  SELECT * FROM mood_check_ins 
  WHERE user_id = u.id 
  ORDER BY check_in_date DESC 
  LIMIT 1
) mc ON true
LEFT JOIN LATERAL (
  SELECT * FROM weekly_schedules 
  WHERE user_id = u.id 
  ORDER BY week_start DESC 
  LIMIT 1
) ws ON true;

-- View: Mood trends over time
CREATE OR REPLACE VIEW mood_trends AS
SELECT 
  user_id,
  DATE_TRUNC('week', check_in_date) as week,
  AVG(mood_score) as avg_mood,
  AVG(CASE 
    WHEN energy_level = 'very_low' THEN 1
    WHEN energy_level = 'low' THEN 2
    WHEN energy_level = 'moderate' THEN 3
    WHEN energy_level = 'high' THEN 4
    WHEN energy_level = 'very_high' THEN 5
  END) as avg_energy_numeric,
  COUNT(*) as checkin_count,
  AVG(upcoming_events_count) as avg_events
FROM mood_check_ins
GROUP BY user_id, DATE_TRUNC('week', check_in_date);

-- ============================================================================
-- Sample Data for Testing
-- ============================================================================

-- Insert test user
INSERT INTO users (id, email, name)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'monica@flowmind.app', 'Monica')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name;

-- Insert user profile
INSERT INTO user_profiles (user_id, display_name, neuro_preferences, personality_traits)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Monica',
  '{
    "energyWindows": [{"start": "09:00", "end": "12:00", "label": "Morning Peak"}],
    "sensory": {"reducedAnimation": false, "hapticsOnly": true, "silentMode": false},
    "bufferPolicy": {"before": 10, "after": 5}
  }'::jsonb,
  '{
    "adhdType": "inattentive",
    "anxietyLevel": "moderate",
    "workStyle": "prefers_structure"
  }'::jsonb
)
ON CONFLICT (user_id) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    neuro_preferences = EXCLUDED.neuro_preferences,
    personality_traits = EXCLUDED.personality_traits;

-- Insert sample mood check-in
INSERT INTO mood_check_ins (
  user_id, 
  check_in_date, 
  check_in_time,
  transcription,
  mood_score,
  energy_level,
  stress_level,
  schedule_density
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  CURRENT_DATE,
  CURRENT_TIME,
  'Feeling overwhelmed today. My schedule is packed and I have back-to-back meetings all afternoon.',
  4,
  'low',
  'high',
  'high'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check all tables were created
SELECT 
  'Tables Created' as status,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'users', 'user_profiles', 'mood_check_ins', 
  'weekly_schedules', 'mood_patterns', 'conversations',
  'ai_orchestration_sessions', 'user_feedback'
);

-- View test user state
SELECT * FROM user_current_state 
WHERE email = 'monica@flowmind.app';
