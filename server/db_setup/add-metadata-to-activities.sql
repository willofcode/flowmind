-- Add metadata column to agentic_activities table
-- This enables storing user context (task name, activity label) for analytics

-- Add metadata column (JSONB for flexibility)
ALTER TABLE agentic_activities 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_agentic_activities_metadata 
ON agentic_activities USING GIN (metadata);

-- Add comment
COMMENT ON COLUMN agentic_activities.metadata IS 'User-provided context: task name, activity label, manually_added flag for analytics';

-- Grant permissions
GRANT ALL ON agentic_activities TO postgres;
GRANT ALL ON agentic_activities TO authenticated;
GRANT ALL ON agentic_activities TO service_role;

-- Example metadata structure:
-- {
--   "user_task_name": "Deep focus session",
--   "user_activity_label": "Help me concentrate for important work",
--   "manually_added": true
-- }

SELECT 'Metadata column added successfully!' as status;
