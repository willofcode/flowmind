-- Update agentic_activities table to support new activity types
-- LIGHT_WALK: Short walks for movement/transition
-- HYDRATION: Water breaks for wellness
-- CREATIVE: Creative activities for open schedules
-- SOCIAL: Social connection activities
-- PROJECT: Personal projects/hobbies

-- Drop old constraint
ALTER TABLE agentic_activities 
DROP CONSTRAINT IF EXISTS agentic_activities_activity_type_check;

-- Add new constraint with expanded types
ALTER TABLE agentic_activities 
ADD CONSTRAINT agentic_activities_activity_type_check 
CHECK (activity_type IN (
  'BREATHING',    -- Meditation, breathing exercises, mindfulness
  'WORKOUT',      -- Exercise, yoga, fitness activities
  'MEAL',         -- Meal prep, eating, nutrition
  'LIGHT_WALK',   -- Short walks, movement breaks
  'HYDRATION',    -- Water breaks, hydration reminders
  'CREATIVE',     -- Creative projects, art, music
  'SOCIAL',       -- Social connection, calls, meetups
  'PROJECT'       -- Personal projects, hobbies, learning
));

-- Update comment to reflect new types
COMMENT ON COLUMN agentic_activities.activity_type IS 
'Activity types: BREATHING (meditation), WORKOUT (exercise), MEAL (nutrition), LIGHT_WALK (movement), HYDRATION (water), CREATIVE (art/music), SOCIAL (connection), PROJECT (hobbies/learning)';

-- Success message
SELECT 'Activity types updated successfully! Now supports: BREATHING, WORKOUT, MEAL, LIGHT_WALK, HYDRATION, CREATIVE, SOCIAL, PROJECT' AS message;
