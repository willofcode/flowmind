# ElevenLabs TTS Integration Guide

## Overview
FlowMind now includes comprehensive Text-to-Speech (TTS) integration using ElevenLabs for natural voice guidance across key user experiences.

## ✅ Completed Integration

### 1. Core TTS Library (`lib/elevenlabs-tts.ts`)

**Features:**
- ✅ Singleton TTS service with audio streaming
- ✅ URL caching to avoid regenerating same audio
- ✅ Synchronized playback with animations
- ✅ Haptic feedback on completion
- ✅ Progress callbacks for UI updates
- ✅ Background audio support configuration

**API:**
```typescript
// Singleton instance
import { ttsService } from '@/lib/elevenlabs-tts';

// Basic usage
await ttsService.speak({
  text: "Welcome to FlowMind",
  onComplete: () => console.log('Done'),
  enableHaptics: true
});

// With progress tracking
await ttsService.speak({
  text: "Breathe in slowly",
  onProgress: (progress) => updateUI(progress),
  onComplete: nextPhase
});

// Control playback
await ttsService.pause();
await ttsService.resume();
await ttsService.stop();
```

**Convenience Functions:**
```typescript
import { 
  speakWelcome, 
  speakBreathingPhase,
  speakMoodPrompt,
  speakAIResponse 
} from '@/lib/elevenlabs-tts';

// Welcome message
await speakWelcome("Sarah");

// Breathing guidance
await speakBreathingPhase("Inhale", "Breathe in slowly through your nose");

// Mood check-in
await speakMoodPrompt(true); // First time prompt

// AI conversation
await speakAIResponse("I'm here to listen. Tell me more about that.");
```

## 🎯 Integration Points

### 1. Welcome Screen (`app/welcome.tsx`)

**Use Case:** Greet new users with warm, spoken introduction

**Integration Steps:**
```tsx
import { speakWelcome, ttsService } from '@/lib/elevenlabs-tts';

// On profile creation complete
const handleProfileComplete = async () => {
  // Speak welcome message
  await speakWelcome(userName);
  
  // Then navigate or show next steps
  router.push('/(tabs)/today');
};

// Add speaker icon button for repeating welcome
<Pressable onPress={() => speakWelcome(userName)}>
  <IconSymbol name="speaker.wave.2" size={24} />
</Pressable>
```

### 2. Breathing Sessions (`app/breathing-session.tsx`)

**Use Case:** Voice-guided breathing with synchronized animations

**Integration Steps:**
```tsx
import { speakBreathingPhase, ttsService } from '@/lib/elevenlabs-tts';

const startBreathingPhase = async (phase: BreathingPhase) => {
  setCurrentPhase(phase);
  
  // Speak instruction as animation starts
  await speakBreathingPhase(
    phase.name,
    phase.instruction,
    () => {
      // Move to next phase after audio completes
      nextPhase();
    }
  );
  
  // Start visual animation simultaneously
  startPhaseAnimation(phase);
};

// Phase progression
const PROTOCOLS = {
  box: [
    { 
      name: 'Inhale', 
      duration: 4, 
      instruction: 'Breathe in slowly through your nose' 
    },
    { 
      name: 'Hold', 
      duration: 4, 
      instruction: 'Hold your breath gently' 
    },
    { 
      name: 'Exhale', 
      duration: 4, 
      instruction: 'Breathe out slowly through your mouth' 
    },
    { 
      name: 'Hold', 
      duration: 4, 
      instruction: 'Rest before the next breath' 
    },
  ],
};
```

**Timer Sync Pattern:**
```tsx
const [phaseProgress, setPhaseProgress] = useState(0);

// Start phase with audio + timer
useEffect(() => {
  if (isActive) {
    // Speak instruction
    speakBreathingPhase(currentPhase.name, currentPhase.instruction);
    
    // Run timer animation
    const interval = setInterval(() => {
      setPhaseProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          moveToNextPhase();
          return 0;
        }
        return prev + (1 / (currentPhase.duration * 10)); // 100ms ticks
      });
    }, 100);
    
    return () => clearInterval(interval);
  }
}, [currentPhase, isActive]);
```

### 3. Calm Sessions (`app/calm-session.tsx`)

**Use Case:** Guided meditation/breathing with TTS voiceover

**Current Implementation:** Already has TTS integrated!
```tsx
// calm-session.tsx already uses:
- ElevenLabs TTS for phase guidance
- Synchronized animations
- Gradient background transitions

// Just ensure API endpoint is active:
POST /conversation/generate-tts
```

**Enhancements:**
- ✅ Already streams audio from backend
- ✅ Has calming gradient animations
- ✅ Syncs TTS with breath phases
- ⚠️ Verify backend `/conversation/generate-tts` endpoint is running

### 4. Mood Check-in (`components/mood-checkin-stt.tsx`)

**Use Case:** Two-way conversation with STT (user) → AI → TTS (response)

**Integration Steps:**
```tsx
import { speakMoodPrompt, speakAIResponse } from '@/lib/elevenlabs-tts';

// 1. Start with TTS prompt
const startMoodCheckin = async () => {
  await speakMoodPrompt(true); // "How are you feeling?"
  
  // Then start recording
  startRecording();
};

// 2. Process user's speech (STT)
const handleRecordingComplete = async (audioUri: string) => {
  setIsProcessing(true);
  
  // Transcribe audio
  const transcription = await transcribeAudio(audioUri);
  
  // Send to AI for analysis
  const response = await apiClient.analyzeMoodWithAI({
    userId,
    transcription,
    conversationHistory
  });
  
  // 3. Speak AI response (TTS)
  await speakAIResponse(response.aiResponse, () => {
    setIsProcessing(false);
    // Ready for next user input
  });
};

// Continue conversation loop
const continueConversation = async () => {
  await speakMoodPrompt(false); // "Tell me more..."
  startRecording();
};
```

**Full Conversation Flow:**
```
1. TTS Prompt → "How are you feeling right now?"
2. User speaks (STT recording)
3. Transcription → Backend
4. AI Analysis → Response generated
5. TTS Response → "I hear that you're feeling stressed..."
6. Loop back to step 2 for follow-up
```

## 🔧 Backend Requirements

### ElevenLabs API Endpoint

**Already implemented:** `server/src/routes/conversation.routes.js`

```javascript
POST /conversation/generate-tts
Body: { 
  text: "Text to speak",
  voiceId: "optional-voice-id" // Default: "21m00Tcm4TlvDq8ikWAM" (Rachel)
}

Response: {
  audioUrl: "https://cdn.elevenlabs.io/audio/..."
}
```

**Environment Variables (server/.env):**
```bash
ELEVENLABS_API_KEY=sk_861fecdba1b941a17161a62cbb93ae1735ab38cc5dc4a07d
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Optional, has default
```

### Voice Options

**Recommended Voices for FlowMind:**
- `21m00Tcm4TlvDq8ikWAM` - Rachel (warm, empathetic, default)
- `EXAVITQu4vr4xnSDxMaL` - Bella (calm, soothing)
- `pNInz6obpgDQGcFmaJgB` - Adam (neutral, professional)

## 📱 UI Integration Patterns

### 1. Welcome Screen Enhancement

```tsx
// Add TTS toggle in welcome screen
const [enableVoice, setEnableVoice] = useState(true);

return (
  <View>
    {/* Voice toggle */}
    <Pressable onPress={() => setEnableVoice(!enableVoice)}>
      <IconSymbol 
        name={enableVoice ? "speaker.wave.2" : "speaker.slash"} 
        size={24} 
      />
    </Pressable>
    
    {/* Auto-speak on appear */}
    <useEffect(() => {
      if (enableVoice && userName) {
        speakWelcome(userName);
      }
    }, [userName, enableVoice]);
  </View>
);
```

### 2. Breathing Session with TTS

```tsx
// breathing-session.tsx enhancements
const BreathingSession = () => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const startPhase = async (phaseIndex: number) => {
    const phase = PROTOCOLS.box[phaseIndex];
    setCurrentPhase(phaseIndex);
    
    // Visual animation
    animateBreathCircle(phase);
    
    // Audio guidance (if enabled)
    if (isAudioEnabled) {
      await speakBreathingPhase(
        phase.name,
        phase.instruction,
        () => {
          // Move to next phase after audio completes
          const nextIndex = (phaseIndex + 1) % PROTOCOLS.box.length;
          startPhase(nextIndex);
        }
      );
    } else {
      // Timer-based progression
      setTimeout(() => {
        const nextIndex = (phaseIndex + 1) % PROTOCOLS.box.length;
        startPhase(nextIndex);
      }, phase.duration * 1000);
    }
  };
  
  return (
    <View>
      {/* Audio toggle */}
      <Pressable onPress={() => setIsAudioEnabled(!isAudioEnabled)}>
        <IconSymbol 
          name={isAudioEnabled ? "speaker.wave.2" : "speaker.slash"} 
        />
      </Pressable>
      
      {/* Breathing circle animation */}
      <BreathingCircle phase={currentPhase} />
    </View>
  );
};
```

### 3. Mood Check-in Conversation

```tsx
// mood-checkin.tsx with full STT/TTS loop
const MoodCheckinConversation = ({ userId }: { userId: string }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const startConversation = async () => {
    setIsSpeaking(true);
    
    // AI speaks first
    await speakMoodPrompt(messages.length === 0, () => {
      setIsSpeaking(false);
      startRecording(); // Then user speaks
    });
  };
  
  const handleUserSpeech = async (transcription: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: transcription }]);
    
    // Get AI response
    const aiResponse = await apiClient.sendConversationMessage({
      userId,
      message: transcription
    });
    
    // Add AI message
    setMessages(prev => [...prev, { role: 'assistant', text: aiResponse.message }]);
    
    // Speak AI response
    setIsSpeaking(true);
    await speakAIResponse(aiResponse.message, () => {
      setIsSpeaking(false);
      // Ready for next user turn
    });
  };
  
  return (
    <View>
      {isSpeaking && <SpeakingIndicator />}
      {isRecording && <RecordingIndicator />}
      
      <MessageList messages={messages} />
      
      <Pressable 
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isSpeaking}
      >
        <IconSymbol name={isRecording ? "stop.circle" : "mic.circle"} />
      </Pressable>
    </View>
  );
};
```

## 🎨 Accessibility & UX

### 1. Always Provide Visual Alternatives
```tsx
// Show text alongside audio
<Text>{currentInstruction}</Text>
{audioEnabled && <SpeakerIcon />}
```

### 2. User Control
```tsx
// Allow users to disable TTS
<Setting label="Voice Guidance" value={audioEnabled} />
```

### 3. Haptic Feedback
```tsx
// TTS library automatically provides haptics on completion
await ttsService.speak({
  text: "...",
  enableHaptics: true // ✅ Vibrates when done
});
```

### 4. Progress Indicators
```tsx
// Show audio playback progress
const [audioProgress, setAudioProgress] = useState(0);

await ttsService.speak({
  text: "...",
  onProgress: (progress) => setAudioProgress(progress)
});

<ProgressBar progress={audioProgress} />
```

## 🧪 Testing Checklist

### Backend
- [ ] ElevenLabs API key is configured in `server/.env`
- [ ] `/conversation/generate-tts` endpoint returns audio URLs
- [ ] Audio URLs are accessible from mobile app
- [ ] Response time is < 2 seconds for typical phrases

### Client
- [ ] `ttsService.speak()` plays audio successfully
- [ ] Audio streams from remote URL without caching errors
- [ ] Haptic feedback triggers on completion
- [ ] Multiple calls don't overlap (auto-stops previous)
- [ ] Progress callbacks update UI smoothly

### Integration
- [ ] Welcome screen speaks greeting on load
- [ ] Breathing session syncs voice with animation phases
- [ ] Calm session plays continuous guided meditation
- [ ] Mood check-in has STT → AI → TTS conversation loop

## 🚀 Next Steps

1. **Test backend endpoint:**
   ```bash
   curl -X POST http://localhost:3001/conversation/generate-tts \
     -H "Content-Type: application/json" \
     -d '{"text":"Welcome to FlowMind"}'
   ```

2. **Integrate into each screen:**
   - Add TTS calls at appropriate moments
   - Test audio + animation synchronization
   - Verify user can disable voice guidance

3. **Polish UX:**
   - Add speaker icons for TTS controls
   - Show "Speaking..." indicators
   - Handle interruptions gracefully

## 📚 Related Files

**Client:**
- `lib/elevenlabs-tts.ts` - Core TTS service
- `app/welcome.tsx` - Welcome screen (needs integration)
- `app/breathing-session.tsx` - Breathing timer (needs integration)
- `app/calm-session.tsx` - Already integrated!
- `components/mood-checkin-stt.tsx` - Mood check-in (needs integration)

**Server:**
- `src/routes/conversation.routes.js` - TTS endpoint
- `src/services/conversational-agent.service.js` - AI + TTS orchestration

**Environment:**
- `server/.env` - ElevenLabs API key
- `client/.env` - API base URL

---

**Status:** ✅ TTS Library Complete | ⏳ Integration Pending
**Next:** Integrate TTS into welcome.tsx, breathing-session.tsx, and mood-checkin-stt.tsx
