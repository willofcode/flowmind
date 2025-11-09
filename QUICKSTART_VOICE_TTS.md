# Quick Start: Voice Transcription & ElevenLabs TTS

## 🚀 Get Started in 5 Minutes

### Step 1: Get API Keys

**ElevenLabs (TTS):**
1. Go to https://elevenlabs.io → Sign up
2. Profile → API Keys → Copy key
3. Add to `server/.env`:
   ```env
   ELEVENLABS_API_KEY=sk_your_key_here
   ```

**OpenAI Whisper (Transcription):**
1. Go to https://platform.openai.com/api-keys → Sign up
2. Create new key → Copy
3. Add to `client/.env`:
   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your_key_here
   ```

### Step 2: Restart Everything

```bash
# Terminal 1: Restart server
cd server
npm start

# Terminal 2: Rebuild app
cd client
npx expo run:ios
```

### Step 3: Test It!

1. Open app → Browse tab → Mood Conversation
2. Tap floating icon (message bubble)
3. Tap microphone 🎤
4. Speak: "I'm feeling great today!"
5. Tap stop ⏹️
6. Watch magic happen ✨

**Expected Console Output:**
```
🎤 Recording started
🎤 Recording stopped
🎤 Sending audio to Whisper API...
✅ Transcription: I'm feeling great today!
💬 Sending to AI...
🔊 Generating TTS...
✅ Response received
```

## 📋 What Works Now

✅ **Voice Recording** - expo-av with real-time timer
✅ **Whisper Transcription** - OpenAI API integration
✅ **AI Analysis** - mAIstro sentiment + schedule correlation
✅ **ElevenLabs TTS** - Rachel voice, calm tone
✅ **Response Modal** - Mood score + recommendations
✅ **History Storage** - Saved locally + cloud sync
✅ **Fallback Mode** - Works without API keys (mock data)

## 💰 Costs

**Free Tier:**
- ElevenLabs: 10,000 characters/month = ~20-30 conversations
- OpenAI Whisper: $5 credit = ~1,666 conversations (30s each)

**Perfect for:**
- Testing & development
- Early MVP launch
- First 100-200 users

## 🎯 Voice IDs (ElevenLabs)

Current: **Rachel** - `21m00Tcm4TlvDq8ikWAM` (calm female)

Alternatives:
- **Callum** - `N2lVS1w4EtoT3dr4eOWO` (calm male)
- **Domi** - `AZnzlk1XvdvUeBnXmlld` (warm female)
- **Bella** - `EXAVITQu4vr4xnSDxMaL` (soft female)

Change in `server/.env`:
```env
ELEVENLABS_VOICE_ID=N2lVS1w4EtoT3dr4eOWO
```

## 🐛 Quick Troubleshooting

**"API key not configured"**
→ Check .env file, restart server/app

**"401 Unauthorized"**
→ Verify API key is correct, no extra spaces

**"Recording failed"**
→ Check microphone permission, try real device

**"No audio plays"**
→ Check Supabase `tts-audio` bucket is public

## 📚 Full Documentation

See `Guide/VOICE_TRANSCRIPTION_ELEVENLABS_SETUP.md` for:
- Detailed setup instructions
- API pricing & limits
- Advanced configuration
- Production deployment
- Cost optimization tips

## 🎉 You're All Set!

Voice transcription and TTS are now fully functional. Just add your API keys and start testing!
