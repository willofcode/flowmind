# Fix Activity Types Database Constraint

## The Problem
The database only allows 3 activity types: `BREATHING`, `WORKOUT`, `MEAL`  
But mAIstro is generating: `LIGHT_WALK`, `HYDRATION`, `CREATIVE`, `SOCIAL`, `PROJECT`

This causes database errors when trying to save activities.

## The Solution
Run this SQL migration to add the new activity types to the database.

## Steps

### 1. Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk/editor

### 2. Run This SQL
Copy and paste the SQL from `server/db_setup/update-activity-types.sql`:

```sql
-- Update agentic_activities table to support new activity types

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

-- Update comment
COMMENT ON COLUMN agentic_activities.activity_type IS 
'Activity types: BREATHING (meditation), WORKOUT (exercise), MEAL (nutrition), LIGHT_WALK (movement), HYDRATION (water), CREATIVE (art/music), SOCIAL (connection), PROJECT (hobbies/learning)';
```

### 3. Click "Run" (or press Cmd+Enter)

You should see: ✅ Success. No rows returned

### 4. Test Activity Generation
Run the test again:
```bash
cd server
node test-agentic-endpoint.js
```

You should now see activities successfully saved to the database! 🎉

## What This Changes
- **Before**: Only 3 types allowed (BREATHING, WORKOUT, MEAL)
- **After**: 8 types allowed (adds LIGHT_WALK, HYDRATION, CREATIVE, SOCIAL, PROJECT)

This allows mAIstro to generate diverse activities based on schedule intensity:
- **High intensity (>75%)**: BREATHING, HYDRATION, LIGHT_WALK (essentials only)
- **Medium intensity (50-75%)**: + MEAL (quick recharge)
- **Low intensity (<50%)**: + WORKOUT, CREATIVE, SOCIAL, PROJECT (comprehensive)
