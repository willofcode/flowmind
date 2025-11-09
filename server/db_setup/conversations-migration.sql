-- Update conversations table for multi-turn conversational mood tracking
-- This migration adds support for conversation sessions with multiple turns

-- Drop old conversations table if exists (backup first in production!)
DROP TABLE IF EXISTS conversations;

-- Create new conversations table with session support
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conversation session tracking
  conversation_id VARCHAR(255) NOT NULL, -- Session identifier (e.g., conv_1699564800_abc123)
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  
  -- Message content
  message TEXT NOT NULL,
  
  -- Context at message time
  context JSONB, -- Schedule context, sentiment, etc.
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  intent VARCHAR(50), -- 'supportive', 'probing', 'recommending', 'clarifying'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast lookups
  CONSTRAINT idx_conversations_unique_turn UNIQUE(conversation_id, created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_session ON conversations(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);

-- Add conversation_id to ai_orchestration_sessions
ALTER TABLE ai_orchestration_sessions 
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_session_id ON ai_orchestration_sessions(session_id);

COMMENT ON TABLE conversations IS 'Multi-turn conversational mood tracking with mAIstro - stores user messages and AI responses';
COMMENT ON COLUMN conversations.conversation_id IS 'Session identifier linking multiple conversation turns';
COMMENT ON COLUMN conversations.role IS 'Message sender: user (STT transcription), assistant (mAIstro), system (notifications)';
COMMENT ON COLUMN conversations.context IS 'Contextual data: schedule correlation, sentiment analysis, schedule events';
COMMENT ON COLUMN conversations.intent IS 'AI response intent: supportive, probing, recommending, celebrating, clarifying';
