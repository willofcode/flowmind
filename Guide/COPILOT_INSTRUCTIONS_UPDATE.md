# Copilot Instructions Update Summary

## What Was Updated

### 1. `.github/copilot-instructions.md` - Main AI Agent Guide
**New comprehensive instructions added:**

#### Detailed Data Flow with Intelligent Scheduling
- Step-by-step algorithm for analyzing Google Calendar schedule
- Schedule intensity calculation (high/medium/low)
- Adaptive activity generation based on available time gaps
- Buffer rules application
- Event creation with 10-3-1 reminders

#### Enhanced Type System
- Added `BreathingSession` type for TTS-guided sessions
- Added `ScheduleIntensity` for calendar analysis caching

#### Schedule Intensity Logic
```
High Intensity (>70% busy): 5-10 min breathing breaks only
Medium Intensity (40-70% busy): Movement snacks + meals + breathing
Low Intensity (<40% busy): Full workouts + meal prep + optional activities
```

#### ElevenLabs TTS Integration
- Voice generation for breathing/meditation guidance
- Audio caching in Supabase Storage
- Script templates (5/10/15 min sessions)
- Playback via expo-av

#### Testing Strategy
- Unit test requirements for intensity calculation
- Mock API patterns for offline development
- Schedule scenario testing (high/medium/low)
- Breathing session audio verification

#### Database Schema Organization
- JSONB for evolving data (profiles, plans)
- Explicit tables for analytics (completions, intensity)
- Caching strategy for expensive operations
- Index optimization guidelines
- Soft delete patterns

### 2. `supabase-schema.sql` - Enhanced Database Schema

**New Tables Added:**

#### `breathing_sessions`
- Stores ElevenLabs TTS-guided sessions with cached audio URLs
- Fields: duration_min, script_text, audio_url, session_type, voice_id
- Prevents regenerating identical audio

#### `schedule_intensity`
- Caches Google Calendar analysis to avoid repeated API calls
- Fields: date, intensity_level, busy_minutes, total_minutes, gap_windows
- Unique constraint on (user_id, date)

#### `activity_completions`
- Tracks user engagement and completion patterns
- Fields: block_id, block_type, completed_at, skipped, micro_steps_completed
- Enables habit formation insights

**All tables include:**
- Row Level Security (RLS) policies
- Proper indexes for performance
- Foreign key constraints
- Comments for documentation
- Cascade delete for user cleanup

### 3. `server/SCHEDULE_INTENSITY_ALGORITHM.md` - Implementation Guide

**Complete algorithm documentation:**

#### Step-by-Step Implementation
1. Fetch calendar data via Google Calendar FreeBusy API
2. Calculate intensity ratio (busyMinutes / totalWakingMinutes)
3. Identify available gaps (10+ minutes)
4. Generate adaptive activities based on intensity level
5. Apply buffer policies (10 min before/after)

#### Code Examples
- `calculateScheduleIntensity()` function
- `findAvailableGaps()` with energy window overlap detection
- Activity generators for each intensity level
- Cache strategy with Supabase

#### Test Scenarios
- High intensity: 80% busy schedule → breathing breaks only
- Medium intensity: 50% busy → mixed activities
- Low intensity: 25% busy → full workouts + meal prep

### 4. `server/ELEVENLABS_TTS_INTEGRATION.md` - Voice Guide Implementation

**Complete TTS integration guide:**

#### Setup Instructions
- Environment variables (API key, voice ID)
- Supabase Storage bucket configuration
- RLS policies for audio files

#### Server Implementation
- `/generate-session-audio` endpoint
- Audio generation with ElevenLabs API
- Upload to Supabase Storage
- Cache management (check existing before generating)

#### Breathing Scripts Library
- 5-minute box breathing script
- 10-minute calm reset script
- Script template generator with personalization
- Voice options (Rachel, Josh, Bella, Antoni)

#### Client Integration
- `BreathingSessionPlayer` component
- Audio playback with expo-av
- Loading states and error handling

#### Cost Optimization
- Character limits and pricing awareness
- Aggressive caching strategy
- Pre-generation during off-peak hours
- Script hash deduplication

### 5. `server/.env.example` - Updated Configuration

**Added ElevenLabs variables:**
```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel (calm voice)
```

## Key Implementation Priorities

### Phase 1: Schedule Intensity (Highest Priority)
1. Implement `calculateScheduleIntensity()` in server
2. Create `/analyze-schedule` endpoint
3. Cache results in `schedule_intensity` table
4. Test with high/medium/low scenarios

### Phase 2: Adaptive Activity Generation
1. Implement gap analysis (`findAvailableGaps()`)
2. Create activity generators for each intensity level
3. Integrate with NeuralSeek mAIstro for AI enhancement
4. Apply buffer policies

### Phase 3: ElevenLabs TTS Integration
1. Set up Supabase Storage bucket for audio
2. Create `/generate-session-audio` endpoint
3. Implement breathing script templates
4. Build client playback component
5. Add cache management

### Phase 4: Activity Tracking
1. Create `/complete-activity` endpoint
2. Track micro-step completion
3. Store in `activity_completions` table
4. Generate insights dashboard

## Testing Checklist

- [ ] Schedule intensity calculation with mock calendars
- [ ] Gap identification with various busy block patterns
- [ ] Activity generation for high/medium/low intensity
- [ ] Buffer application around events
- [ ] ElevenLabs audio generation (with test API key)
- [ ] Audio caching verification
- [ ] Supabase Storage upload/download
- [ ] Client audio playback on iOS
- [ ] RLS policies (users can only access own data)
- [ ] Performance with cached vs fresh data

## Documentation Created

1. `.github/copilot-instructions.md` - Main AI agent guide (updated)
2. `server/SCHEDULE_INTENSITY_ALGORITHM.md` - Algorithm implementation
3. `server/ELEVENLABS_TTS_INTEGRATION.md` - TTS voice guide
4. `supabase-schema.sql` - Complete database schema (updated)
5. `server/.env.example` - Environment template (updated)

## Next Steps for Development

1. **Run database migrations**: Execute updated `supabase-schema.sql` in Supabase
2. **Implement schedule intensity endpoint**: Start with basic calculation
3. **Test with real Google Calendar data**: Use personal calendar for testing
4. **Set up ElevenLabs account**: Get API key and test voice generation
5. **Create Supabase Storage bucket**: Configure for audio files
6. **Build client components**: Breathing session player with expo-av
7. **Integrate with existing `/plan-week`**: Enhance with intensity logic

## Questions Answered

✅ **Schedule Flow**: Detailed algorithm for fetching calendar, analyzing intensity, and filling gaps
✅ **Testing Strategy**: Unit tests, API mocking, scenario testing, audio verification
✅ **ElevenLabs TTS**: Complete implementation guide with caching and playback
✅ **Database Schema**: Organized structure with 3 new tables and proper indexing
