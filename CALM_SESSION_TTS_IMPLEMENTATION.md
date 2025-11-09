# Calm Session with TTS Integration - Implementation Summary

## Overview
Implemented a conversational breathing/meditation session with ElevenLabs TTS voice guidance, accessible from:
1. **Welcome screen** - Direct link for calm breathing
2. **Today tab breathing activities** - Auto-launches when accepting breathing tasks

## Key Features

### 🎨 Visual Design
- **Calming gradient backgrounds** that change with breathing phases:
  - Inhale: Purple to indigo gradient
  - Hold: Blue gradient
  - Exhale: Pink to yellow gradient
  - Rest: Teal to deep purple gradient
- **No text input** - Pure visual/audio experience
- **Animated breathing circle** - Expands/contracts with breathing phases
- **Smooth animations** synced to breath timing

### 🎙️ Voice Guidance (ElevenLabs TTS)
- **Backend endpoint**: `POST /conversation/generate-tts`
- **Voice**: Rachel (calm, empathetic female voice)
- **Settings**: Low style (0.2), medium stability (0.6) for meditative tone
- **Audio storage**: Uploaded to Supabase `session-audio` bucket
- **Phase transitions**: Voice guidance plays at each phase change

### 🧘 Breathing Protocols
1. **Meditation** (default from welcome.tsx)
   - 5 seconds in, 5 seconds out
   - Simple, calming pattern
   
2. **Box Breathing** (detected from task titles with "box")
   - 4-4-4-4 pattern (inhale-hold-exhale-hold)
   - Great for focus and stress reduction
   
3. **Rescue Breathing** (detected from task titles with "rescue")
   - 4-7-8 pattern (inhale-hold-exhale)
   - Anxiety relief and deep relaxation

### 🔗 Integration Points

#### From Welcome Screen
```tsx
// welcome.tsx - Added calm session link
<Pressable 
  onPress={() => router.push('/calm-session?protocol=meditation&duration=5&fromWelcome=true')}
>
  <Text>🧘 Start a calm breathing session</Text>
</Pressable>
```

#### From Today Tab Breathing Activities
```tsx
// task-bubble.tsx - Auto-detects breathing tasks
if (task.type === 'BREATHING' || task.isBreathing) {
  const duration = extractDurationFromTitle(task.title); // e.g., "10-min" → 10
  const protocol = detectProtocol(task.title); // "box", "rescue", or "meditation"
  router.push(`/calm-session?protocol=${protocol}&duration=${duration}`);
}
```

## File Structure

### New Files
```
client/app/calm-session.tsx (490 lines)
  - Main calm session screen with TTS integration
  - Animated breathing circle
  - Phase-based gradient backgrounds
  - Audio playback management

server/src/routes/conversation.routes.js
  - Added POST /conversation/generate-tts endpoint
  - ElevenLabs API integration
  - Supabase audio storage
```

### Modified Files
```
client/app/welcome.tsx
  - Added "Start calm breathing session" link
  - Links to meditation protocol with 5-min duration

client/components/task-bubble.tsx
  - Added router import
  - Enhanced handleAccept() to detect breathing tasks
  - Auto-launches calm session for breathing activities
  - Extracts duration and protocol from task title
```

## Backend API

### Endpoint: Generate TTS Audio
```http
POST /conversation/generate-tts
Content-Type: application/json

{
  "text": "Breathe in slowly through your nose for four counts"
}
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "https://supabase.co/storage/v1/object/public/session-audio/tts_xxx.mp3",
  "cached": false
}
```

### ElevenLabs Configuration
- **API**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Voice ID**: `21m00Tcm4TlvDq8ikWAM` (Rachel - calm, empathetic)
- **Model**: `eleven_monolingual_v1`
- **Voice Settings**:
  - Stability: 0.6 (moderate consistency)
  - Similarity: 0.8 (high voice match)
  - Style: 0.2 (minimal stylization for calm tone)
  - Speaker boost: enabled

### Audio Storage
- **Bucket**: `session-audio` (Supabase Storage)
- **Format**: MP3
- **Naming**: `tts_<timestamp>_<random>.mp3`
- **Access**: Public URL for client playback

## User Experience Flow

### Flow 1: From Welcome Screen
1. User lands on welcome screen
2. Sees animated psychic circle
3. Clicks "🧘 Start a calm breathing session"
4. → Navigates to calm-session.tsx
5. Session auto-starts with meditation protocol
6. Voice guidance: "Let's begin. Find a comfortable position..."
7. 5-minute meditation with phase guidance
8. Completion alert with cycle count

### Flow 2: From Today Tab Breathing Activity
1. User sees "10-min Guided Meditation" in Today tab
2. Swipes right to accept
3. TaskBubble detects `type === 'BREATHING'`
4. → Auto-launches calm-session.tsx
5. Extracts: duration=10, protocol=meditation
6. Session starts with appropriate protocol
7. Voice guidance throughout
8. Returns to Today tab on completion

## Environment Requirements

### Required Environment Variables
```bash
# server/.env
ELEVENLABS_API_KEY=sk_xxxxx  # ElevenLabs API key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Optional (defaults to Rachel)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
```

### Supabase Storage Setup
```sql
-- Create session-audio bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-audio', 'session-audio', true);

-- Set storage policy (allow public read)
CREATE POLICY "Public audio access"
ON storage.objects FOR SELECT
USING (bucket_id = 'session-audio');
```

## Testing Guide

### Test 1: Welcome Screen Integration
```bash
# 1. Navigate to welcome screen
# 2. Click "Start calm breathing session"
# 3. Verify:
#    - Calm gradient background appears
#    - Breathing circle animates
#    - Voice says "Let's begin..."
#    - Session runs for 5 minutes
```

### Test 2: Today Tab Breathing Activity
```bash
# 1. Generate breathing activity in Today tab (via agentic endpoint)
# 2. Swipe right on "10-min Guided Meditation"
# 3. Verify:
#    - Auto-launches calm session
#    - Duration = 10 minutes
#    - Voice guidance plays
#    - Gradient transitions work
```

### Test 3: TTS Endpoint
```bash
curl -X POST http://localhost:3001/conversation/generate-tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Breathe in slowly"}'

# Expected response:
# {
#   "success": true,
#   "audioUrl": "https://...supabase.co/.../tts_xxx.mp3"
# }
```

## Known Issues & Future Enhancements

### Current Limitations
1. **No offline mode** - Requires internet for TTS generation
2. **No audio caching** - Each phrase generates new audio (could cache common phrases)
3. **Fixed voice** - Rachel voice hardcoded (could make configurable)
4. **No background audio** - Session pauses if app backgrounds

### Future Enhancements
1. **Audio caching layer** - Pre-generate and cache common breathing phrases
2. **Multiple voices** - User choice of male/female/accent
3. **Custom protocols** - User-defined breathing patterns
4. **Background audio** - Continue playing when app minimized
5. **Session history** - Track completed sessions with mood correlation
6. **Biometric integration** - Connect to Apple Health for heart rate monitoring
7. **Ambient sounds** - Optional nature sounds/white noise background

## Architecture Alignment

### Neurodivergent-Friendly Design ✅
- **No text input during session** - Pure audiovisual experience
- **Clear visual feedback** - Animated circle shows breathing pace
- **Gentle voice guidance** - Calm, non-judgmental tone
- **Haptic feedback** - Subtle haptics on phase transitions
- **Escape hatch** - Close button always visible
- **Progress tracking** - Shows cycles completed

### Calm UI Principles ✅
- **Smooth animations** - No jarring transitions
- **Calming colors** - Gradient backgrounds
- **Minimal distractions** - Focus on breathing
- **Large touch targets** - 44pt+ buttons
- **Accessible contrast** - White text on gradients

## Deployment Notes

1. **Install ElevenLabs dependency** (if not already):
   ```bash
   cd server && npm install node-fetch
   ```

2. **Configure environment variables**:
   - Add `ELEVENLABS_API_KEY` to server/.env
   - Ensure Supabase storage bucket exists

3. **Restart server**:
   ```bash
   cd server && pkill -f "node index.js" && node index.js &
   ```

4. **Test TTS generation**:
   ```bash
   curl -X POST http://localhost:3001/conversation/generate-tts \
     -H "Content-Type: application/json" \
     -d '{"text": "Test"}'
   ```

5. **Build iOS app**:
   ```bash
   cd client && npx expo run:ios
   ```

---

## Status: ✅ COMPLETE

**Features Implemented:**
- ✅ Calm session screen with gradient backgrounds
- ✅ ElevenLabs TTS integration
- ✅ Backend TTS generation endpoint
- ✅ Welcome screen link to calm session
- ✅ Today tab breathing activity auto-launch
- ✅ Protocol detection (box/rescue/meditation)
- ✅ Duration extraction from task titles
- ✅ Animated breathing circle
- ✅ Phase-based voice guidance
- ✅ Haptic feedback
- ✅ Session completion tracking

**User Impact:**
Users can now access guided breathing sessions with voice guidance from both the welcome screen and Today tab breathing activities. The experience is immersive, calming, and neurodivergent-friendly with no text input required during the session.
