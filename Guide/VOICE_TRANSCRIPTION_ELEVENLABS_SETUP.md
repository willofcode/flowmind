# Voice Transcription & ElevenLabs TTS Setup Guide

## Complete Implementation Status ✅

Both voice transcription (Whisper) and ElevenLabs TTS are now fully implemented! This guide will walk you through getting your API keys and testing.

---

## Part 1: ElevenLabs TTS Setup (Already Integrated!)

### Step 1: Get Your ElevenLabs API Key

1. **Sign up for ElevenLabs**
   - Go to https://elevenlabs.io
   - Click "Sign Up" (or "Log In" if you have an account)
   - You get **10,000 characters/month FREE** on the free tier

2. **Get Your API Key**
   - Once logged in, click your profile icon (top right)
   - Go to "Profile Settings"
   - Click on "API Keys" tab
   - Click "Generate API Key" or copy existing key
   - It looks like: `sk_1234567890abcdef...`

3. **Add to Your Environment**
   - Open `server/.env`
   - Add this line:
     ```env
     ELEVENLABS_API_KEY=sk_your_actual_key_here
     ```

### Step 2: Choose Your Voice (Optional)

**Current Voice:** Rachel (calm, empathetic female voice)
- Voice ID: `21m00Tcm4TlvDq8ikWAM`

**Other Great Options:**
1. **Callum** - `N2lVS1w4EtoT3dr4eOWO` (calm male)
2. **Domi** - `AZnzlk1XvdvUeBnXmlld` (warm female)
3. **Bella** - `EXAVITQu4vr4xnSDxMaL` (soft, gentle female)

To browse all voices:
- Go to https://elevenlabs.io/voice-library
- Listen to samples
- Copy the voice ID

To change voice, add to `server/.env`:
```env
ELEVENLABS_VOICE_ID=N2lVS1w4EtoT3dr4eOWO
```

### Step 3: Test ElevenLabs

Your backend already has TTS integrated! It will:
1. Take AI response text
2. Send to ElevenLabs API
3. Receive audio file
4. Upload to Supabase Storage
5. Return public URL to client
6. Client plays audio automatically

**Test it:**
1. Start your server: `cd server && npm start`
2. Send a conversation message from the app
3. Look for logs: `🔊 TTS audio generated: https://...`

---

## Part 2: OpenAI Whisper Transcription Setup

### Step 1: Get OpenAI API Key

1. **Sign up for OpenAI**
   - Go to https://platform.openai.com/signup
   - Create an account
   - You get **$5 FREE credits** for new accounts

2. **Get Your API Key**
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it "FlowMind Whisper"
   - Copy the key (starts with `sk-proj-...`)
   - **IMPORTANT:** Save it immediately! You can't see it again

3. **Add to Client Environment**
   - Open `client/.env`
   - Add this line:
     ```env
     EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your_actual_key_here
     ```

### Step 2: Pricing & Usage

**Whisper API Pricing:**
- **$0.006 per minute** of audio
- Example: 100 conversations × 30 seconds = **$0.30**
- Your $5 credit = ~833 minutes = **~1,666 conversations**

**Tips to Save Credits:**
- Use mock transcription during development
- Only enable Whisper for production
- Limit recording to 60 seconds max

### Step 3: Test Voice Transcription

1. **With API Key (Real Transcription):**
   ```bash
   # In client/.env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your_key_here
   
   # Rebuild app
   cd client
   npx expo run:ios
   ```
   
   - Tap microphone button
   - Speak: "I'm feeling stressed today"
   - Watch console logs:
     ```
     🎤 Sending audio to Whisper API...
     ✅ Transcription successful: I'm feeling stressed today
     ```

2. **Without API Key (Mock Transcription):**
   - If no key, it automatically uses mock data
   - Picks random realistic transcription
   - Perfect for testing UI/UX

---

## Part 3: Implementation Details

### What's Already Built

#### Backend (Server)
✅ **ElevenLabs Integration** (`server/src/services/conversational-agent.service.js`)
```javascript
// Lines 503-555: Complete TTS generation
export async function generateTTSResponse(text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.6,      // Calm, not robotic
          similarity_boost: 0.8,
          style: 0.2           // Subtle emotion
        }
      })
    }
  );
  
  // Saves to Supabase Storage
  // Returns public URL
}
```

✅ **TTS Endpoint** (`server/src/routes/conversation.routes.js` lines 323-420)
- POST `/conversation/generate-tts`
- Generates audio for breathing guidance
- Stores in `tts-audio` bucket

#### Frontend (Client)
✅ **Voice Transcription Service** (`client/lib/voice-transcription.ts`)
```typescript
export async function transcribeAudio(audioUri: string) {
  // Sends to OpenAI Whisper API
  // Returns transcribed text
  // Falls back to mock if no API key
}
```

✅ **Welcome Screen Integration** (`client/app/welcome.tsx`)
```typescript
const sendVoiceMessage = async (audioUri: string) => {
  // 1. Validate audio file
  validateAudioFile(audioUri);
  
  // 2. Transcribe with Whisper
  const result = await transcribeAudio(audioUri);
  
  // 3. Send to AI conversation
  await sendConversationMessage(result.text, 'voice');
};
```

✅ **Audio Recording** (expo-av)
- High quality m4a format
- Real-time duration display
- Stop/start controls
- Permission handling

---

## Part 4: Complete User Flow

### Conversation with Voice Input

```
User taps mic button
    ↓
[🎤 Recording...] 3s → [⏹️ Stop]
    ↓
Recording stops → Get audio URI
    ↓
Validate audio file (.m4a)
    ↓
┌─────────────────────────────────┐
│ OpenAI Whisper API              │
│ • Transcribes audio → text      │
│ • Returns: "I'm stressed"       │
│ • Cost: $0.006/minute           │
└─────────────────────────────────┘
    ↓
Send to Backend: POST /conversation/analyze-sentiment
    ↓
┌─────────────────────────────────┐
│ mAIstro AI Analysis             │
│ • Sentiment analysis            │
│ • Schedule correlation          │
│ • Mood score: 6/10              │
│ • Recommendations               │
└─────────────────────────────────┘
    ↓
Generate AI Response: "I understand that feeling..."
    ↓
┌─────────────────────────────────┐
│ ElevenLabs TTS                  │
│ • Text → Audio (Rachel voice)   │
│ • Calm, empathetic tone         │
│ • Saves to Supabase Storage     │
└─────────────────────────────────┘
    ↓
Return to Client:
• conversationalResponse (text)
• moodScore (number)
• recommendations (array)
• ttsAudioUrl (string)
    ↓
Client displays modal + plays audio
```

---

## Part 5: Environment Variables Checklist

### Server (backend/.env)
```env
# Required for backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
NS_EMBED_CODE=your_neuralseek_code

# ElevenLabs TTS
ELEVENLABS_API_KEY=sk_your_elevenlabs_key     # ← ADD THIS
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM      # Optional (default: Rachel)

# Google Calendar (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Client (client/.env)
```env
# Required for client
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001

# OpenAI Whisper
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your_key   # ← ADD THIS
```

---

## Part 6: Testing Checklist

### Test ElevenLabs (Backend)

1. **Start server:**
   ```bash
   cd server
   npm start
   ```

2. **Test TTS endpoint:**
   ```bash
   curl -X POST http://localhost:3001/conversation/generate-tts \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello, this is a test of the text to speech system."}'
   ```

3. **Expected response:**
   ```json
   {
     "audioUrl": "https://your-project.supabase.co/storage/v1/object/public/tts-audio/..."
   }
   ```

4. **Check logs:**
   ```
   🔊 Generating TTS for 11 characters...
   ✅ TTS audio uploaded to Supabase
   📤 Audio URL: https://...
   ```

### Test Whisper (Frontend)

1. **Rebuild app with API key:**
   ```bash
   cd client
   npx expo run:ios
   ```

2. **Test voice recording:**
   - Open app → Browse → Mood Conversation
   - Tap floating icon to expand input
   - Tap microphone button
   - Speak clearly: "I'm feeling great today"
   - Tap stop button

3. **Check console logs:**
   ```
   🎤 Recording started
   🎤 Recording stopped, URI: file:///...
   🎤 Processing voice message...
   🎤 Sending audio to Whisper API...
   ✅ Transcription successful: I'm feeling great today
   ⏱️  Duration: 2.3 seconds
   💬 AI Response: {...}
   ```

4. **Verify modal shows:**
   - Mood score displayed
   - AI response text
   - Recommendations list

### Test Without API Keys (Mock Mode)

1. **Remove API keys from .env files**
2. **Restart app**
3. **Test voice recording:**
   - Console shows: `⚠️  OpenAI API key not configured, using mock transcription`
   - Random realistic transcription used
   - Everything else works normally

---

## Part 7: Troubleshooting

### ElevenLabs Issues

**Problem:** "ElevenLabs API key not configured"
- **Solution:** Add `ELEVENLABS_API_KEY` to `server/.env`
- Restart server: `npm start`

**Problem:** "ElevenLabs API error: 401 Unauthorized"
- **Solution:** Check API key is correct (starts with `sk_`)
- Regenerate key if needed

**Problem:** "ElevenLabs API error: 429 Too Many Requests"
- **Solution:** You hit the free tier limit (10k characters/month)
- Upgrade plan or wait for monthly reset

**Problem:** No audio plays on client
- **Solution:** 
  1. Check Supabase Storage bucket `tts-audio` exists
  2. Bucket must be public (RLS disabled for reads)
  3. Check console for audio URL
  4. Test URL in browser

### Whisper Issues

**Problem:** "401 Unauthorized"
- **Solution:** Check API key in `client/.env`
- Key should start with `sk-proj-`
- Rebuild app: `npx expo run:ios`

**Problem:** "Invalid audio format"
- **Solution:** iOS records in m4a (supported)
- Check recording URI ends in `.m4a`

**Problem:** "Recording failed"
- **Solution:** 
  1. Check microphone permission granted
  2. Try on real device (simulator sometimes buggy)
  3. Check Audio.setAudioModeAsync succeeded

**Problem:** Transcription is inaccurate
- **Solution:**
  1. Speak clearly and slowly
  2. Reduce background noise
  3. Keep recordings under 30 seconds
  4. Add language hint in API call

---

## Part 8: Cost Management

### Free Tier Limits

**ElevenLabs FREE:**
- 10,000 characters/month
- ~20-30 conversations (500 chars each)
- Perfect for testing

**OpenAI Whisper:**
- $5 free credit for new accounts
- $0.006/minute = ~833 minutes
- ~1,666 conversations (30s each)

### Staying Within Free Tier

**Development:**
```typescript
// Use mock mode during development
const USE_MOCK = process.env.NODE_ENV === 'development';

if (USE_MOCK) {
  return mockTranscription(duration);
} else {
  return await transcribeAudio(audioUri);
}
```

**Production:**
- Enable real APIs only for production builds
- Add usage analytics to track costs
- Implement rate limiting (max 3 recordings/minute)

---

## Part 9: Next Steps

### Immediate (Get It Working)
1. ✅ Get ElevenLabs API key → Add to `server/.env`
2. ✅ Get OpenAI API key → Add to `client/.env`
3. ✅ Restart server: `cd server && npm start`
4. ✅ Rebuild client: `cd client && npx expo run:ios`
5. ✅ Test voice recording → Check logs

### Optional Enhancements
- [ ] Add audio waveform visualization during recording
- [ ] Add playback controls for TTS (pause/resume/speed)
- [ ] Cache transcriptions to avoid re-processing
- [ ] Add speaker diarization (multiple speakers)
- [ ] Support more languages (Spanish, French, etc.)
- [ ] Add voice activity detection (auto-stop on silence)

### Production Checklist
- [ ] Move API keys to secure environment variables
- [ ] Add error tracking (Sentry)
- [ ] Add usage analytics
- [ ] Implement rate limiting
- [ ] Add retry logic for API failures
- [ ] Test on real devices (iPhone)
- [ ] Add loading states for better UX
- [ ] Compress audio before upload (reduce Whisper costs)

---

## Summary

✅ **ElevenLabs TTS:** Fully integrated, just needs API key
✅ **Whisper Transcription:** Fully integrated, just needs API key
✅ **Fallback System:** Works without API keys (mock mode)
✅ **Error Handling:** Graceful degradation on failures
✅ **Cost Efficient:** Free tiers cover testing & early users

**You're ready to go!** Just add your API keys and start testing. 🚀
