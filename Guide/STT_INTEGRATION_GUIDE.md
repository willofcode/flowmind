# Speech-to-Text (STT) Integration Guide

## Overview

FlowMind uses voice-based mood check-ins to capture user emotional state through natural conversation. The STT component records audio, transcribes it, and sends it to the backend for AI analysis via NeuralSeek mAIstro.

## Architecture

```
User Voice Input
       ↓
expo-av Audio Recording
       ↓
Audio File (local URI)
       ↓
STT Service (OpenAI Whisper / Google Cloud Speech)
       ↓
Transcription Text
       ↓
Backend API (/mood-checkin)
       ↓
NeuralSeek mAIstro Analysis
       ↓
Mood Score + Energy + Recommendations
       ↓
Saved to Database (mood_check_ins table)
       ↓
Pattern Discovery (async)
```

## Components

### 1. MoodCheckInSTT Component
**File:** `client/components/mood-checkin-stt.tsx`

**Features:**
- ✅ Audio recording with `expo-av`
- ✅ Visual feedback (pulsing circle, sound waves)
- ✅ Timer display during recording
- ✅ Haptic feedback on interactions
- ✅ Respects sensory preferences (reduced animation)
- ✅ Mock transcription (ready for STT service integration)

**Props:**
```typescript
interface MoodCheckInProps {
  userId: string;
  onComplete?: (data: MoodCheckInResult) => void;
  onCancel?: () => void;
}
```

**Usage:**
```tsx
import MoodCheckInSTT from '@/components/mood-checkin-stt';

<MoodCheckInSTT
  userId="user-uuid"
  onComplete={(data) => {
    console.log('Mood check-in:', data.moodScore);
    console.log('Recommendations:', data.recommendations);
  }}
  onCancel={() => router.back()}
/>
```

### 2. Mood Check-in Screen
**File:** `client/app/mood-checkin.tsx`

Full-screen implementation with results display showing:
- Transcription of what user said
- Mood score (1-10)
- Energy level
- AI-generated recommendations

## Backend API

### POST /mood-checkin

**Request:**
```json
{
  "userId": "uuid",
  "transcription": "I'm feeling overwhelmed...",
  "audioUrl": "file:///path/to/audio.m4a",
  "durationSeconds": 15
}
```

**Response:**
```json
{
  "success": true,
  "checkIn": {
    "id": "uuid",
    "mood_score": 4,
    "energy_level": "low",
    "stress_level": "high",
    "emotional_state": {
      "primary": "overwhelmed",
      "intensity": 7
    },
    "schedule_density": "high",
    "ai_analysis": {
      "recommendations": [
        "Take a 5-minute breathing break",
        "Consider rescheduling non-urgent tasks"
      ],
      "triggers": ["high schedule density", "multiple meetings"],
      "confidence": 0.85
    }
  },
  "recommendations": [
    "Take a 5-minute breathing break",
    "Consider rescheduling non-urgent tasks"
  ]
}
```

**Backend Flow:**
1. Receives transcription
2. Fetches user's current schedule intensity
3. Calls NeuralSeek mAIstro with context
4. Extracts mood score, energy, stress level
5. Saves to `mood_check_ins` table
6. Triggers async pattern discovery
7. Returns analysis + recommendations

## STT Service Integration (TODO)

Currently, the component uses **mock transcription**. To integrate a real STT service:

### Option 1: OpenAI Whisper API

```typescript
async function transcribeAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.text;
}
```

**Cost:** $0.006 / minute (~$0.36/hour)

### Option 2: Google Cloud Speech-to-Text

```typescript
import { SpeechClient } from '@google-cloud/speech';

async function transcribeAudio(audioUri: string): Promise<string> {
  const client = new SpeechClient();
  const audio = {
    uri: audioUri,
  };
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
  };

  const [response] = await client.recognize({ audio, config });
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  
  return transcription;
}
```

**Cost:** $0.006 / 15 seconds (~$1.44/hour)

### Option 3: Azure Speech Services

```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

async function transcribeAudio(audioUri: string): Promise<string> {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    AZURE_SPEECH_KEY,
    AZURE_REGION
  );
  const audioConfig = sdk.AudioConfig.fromWavFileInput(audioUri);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  return new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      result => resolve(result.text),
      error => reject(error)
    );
  });
}
```

**Cost:** $1/hour (Standard tier)

## Implementation Steps

### 1. Install STT SDK
```bash
cd client
npm install @openai/api  # or google-cloud/speech or microsoft-cognitiveservices-speech-sdk
```

### 2. Add API Keys
```bash
# client/.env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
# OR
EXPO_PUBLIC_GOOGLE_CLOUD_KEY=...
# OR
EXPO_PUBLIC_AZURE_SPEECH_KEY=...
EXPO_PUBLIC_AZURE_REGION=eastus
```

### 3. Create STT Service
**File:** `client/lib/stt-service.ts`

```typescript
import { Platform } from 'react-native';

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (Platform.OS === 'ios') {
    // Use native iOS Speech Recognition (free, on-device)
    // Requires expo-speech-recognition (community package)
  } else {
    // Use cloud STT (OpenAI Whisper, Google, Azure)
    return await transcribeWithWhisper(audioUri);
  }
}

async function transcribeWithWhisper(audioUri: string): Promise<string> {
  // Implementation from Option 1 above
}
```

### 4. Update Component
**File:** `client/components/mood-checkin-stt.tsx`

```typescript
import { transcribeAudio } from '@/lib/stt-service';

const processRecording = async (audioUri: string, duration: number) => {
  setIsProcessing(true);

  try {
    // Replace mock with real transcription
    const transcription = await transcribeAudio(audioUri);
    
    // Send to backend...
    const response = await fetch(`${API_BASE_URL}/mood-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        transcription,
        audioUrl: audioUri,
        durationSeconds: duration,
      }),
    });
    // ... rest of implementation
  } catch (err) {
    console.error('Processing error:', err);
  }
};
```

## iOS Native Speech Recognition (Recommended)

For **free, on-device transcription** on iOS, use native Speech Recognition:

### 1. Add to Info.plist
```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>FlowMind needs speech recognition to transcribe your mood check-ins</string>
```

### 2. Create Native Module (Swift)
**File:** `client/ios/FlowMind/SpeechRecognizer.swift`

```swift
import Speech

@objc(SpeechRecognizer)
class SpeechRecognizer: NSObject {
  private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))!
  
  @objc
  func transcribe(_ audioURL: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let url = URL(fileURLWithPath: audioURL)
    let request = SFSpeechURLRecognitionRequest(url: url)
    
    speechRecognizer.recognitionTask(with: request) { result, error in
      if let error = error {
        rejecter("TRANSCRIPTION_ERROR", error.localizedDescription, error)
        return
      }
      
      if let result = result, result.isFinal {
        resolver(result.bestTranscription.formattedString)
      }
    }
  }
}
```

### 3. Bridge to React Native
**File:** `client/ios/FlowMind/SpeechRecognizerBridge.m`

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SpeechRecognizer, NSObject)

RCT_EXTERN_METHOD(transcribe:(NSString *)audioURL
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

### 4. Use in React Native
```typescript
import { NativeModules } from 'react-native';

const { SpeechRecognizer } = NativeModules;

async function transcribeAudio(audioUri: string): Promise<string> {
  return await SpeechRecognizer.transcribe(audioUri);
}
```

**Pros:**
- ✅ Free (no API costs)
- ✅ Works offline
- ✅ Fast (on-device processing)
- ✅ Privacy-friendly (no cloud upload)

**Cons:**
- ❌ iOS only (Android needs Google Cloud Speech)
- ❌ Requires native module setup
- ❌ Limited language support

## Database Schema

### mood_check_ins Table

```sql
CREATE TABLE mood_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_in_time TIME NOT NULL,
  transcription TEXT NOT NULL,
  audio_url TEXT,
  duration_seconds INTEGER,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  energy_level VARCHAR(20),
  stress_level VARCHAR(20),
  emotional_state JSONB,
  schedule_density VARCHAR(20),
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_mood_check_ins_user_date ON mood_check_ins(user_id, check_in_date DESC);
CREATE INDEX idx_mood_check_ins_mood_score ON mood_check_ins(mood_score);
```

## Testing

### Test Mock Transcription
```bash
cd server
node server-new-schema.js &
cd ../client
npm run ios

# Navigate to /mood-checkin screen
# Tap mic → record → stop
# Should see mock transcription + AI analysis
```

### Test API Directly
```bash
curl -X POST http://localhost:3001/mood-checkin \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "transcription": "I feel great today!",
    "durationSeconds": 5
  }'
```

### Run Full Test Suite
```bash
cd server
node test-new-api.js
```

## Security Considerations

1. **Audio Storage:** Store audio files in encrypted storage (Supabase Storage with encryption)
2. **Transcription Privacy:** Consider on-device transcription (iOS Speech Recognition)
3. **Data Retention:** Auto-delete audio files after 30 days (GDPR compliance)
4. **User Consent:** Show clear permission dialog explaining audio usage

## Performance Optimization

1. **Audio Compression:** Use `expo-av` low bitrate (32kbps) for smaller files
2. **Lazy Loading:** Only load STT SDK when user accesses mood check-in
3. **Background Upload:** Queue audio uploads for failed network requests
4. **Caching:** Cache transcriptions locally before backend sync

## Next Steps

- [ ] Choose STT provider (Whisper recommended for cost/quality)
- [ ] Implement STT service in `client/lib/stt-service.ts`
- [ ] Add API keys to environment variables
- [ ] Test transcription accuracy with real user audio
- [ ] Implement audio file cleanup (auto-delete after sync)
- [ ] Add retry logic for failed transcriptions
- [ ] Monitor STT API costs and usage
- [ ] Consider iOS native Speech Recognition for production

## Resources

- **OpenAI Whisper:** https://platform.openai.com/docs/guides/speech-to-text
- **Google Cloud Speech:** https://cloud.google.com/speech-to-text
- **Azure Speech:** https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text/
- **expo-av Docs:** https://docs.expo.dev/versions/latest/sdk/audio/
- **iOS Speech Framework:** https://developer.apple.com/documentation/speech
