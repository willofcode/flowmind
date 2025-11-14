-- Fix conversations table schema
-- Run this if you get "column conversations.role does not exist" error

-- First, backup existing data if any
CREATE TABLE IF NOT EXISTS conversations_backup AS
SELECT * FROM conversations;

-- Drop and recreate with correct schema
DROP TABLE IF EXISTS conversations CASCADE;

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conversation session tracking
  conversation_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  
  -- Message content
  message TEXT NOT NULL,
  
  -- Context at message time
  context JSONB,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  intent VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT idx_conversations_unique_turn UNIQUE(conversation_id, created_at)
);

-- Create indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_session ON conversations(conversation_id);
CREATE INDEX idx_conversations_user_session ON conversations(user_id, conversation_id);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- Add comments
COMMENT ON TABLE conversations IS 'Multi-turn conversational mood tracking with mAIstro';
COMMENT ON COLUMN conversations.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN conversations.conversation_id IS 'Session identifier for conversation thread';

-- Grant permissions
GRANT ALL ON conversations TO postgres;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversations TO service_role;

SELECT 'Conversations table fixed successfully!' as status;
