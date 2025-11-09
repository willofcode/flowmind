# ElevenLabs TTS Integration Guide

## Overview
ElevenLabs Text-to-Speech (TTS) is used to generate guided audio for breathing exercises and meditation sessions. Audio is cached in Supabase Storage to avoid regenerating the same scripts.

## Setup

### Environment Variables
```bash
# server/.env
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel (default calm voice)
```

### Supabase Storage Bucket
```sql
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('breathing-audio', 'breathing-audio', true);

-- Set up RLS for audio bucket
CREATE POLICY "Users can view audio" ON storage.objects FOR SELECT USING (bucket_id = 'breathing-audio');
CREATE POLICY "Server can upload audio" ON storage.objects FOR INSERT USING (bucket_id = 'breathing-audio');
```

## Server Implementation

### Generate Breathing Session Audio
```javascript
// server/server.js

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

app.post('/generate-session-audio', async (req, res) => {
  try {
    const { userId, scriptText, duration, sessionType } = req.body;
    
    // Check if audio already exists (cache check)
    const scriptHash = hashScript(scriptText); // Simple hash for lookup
    const { data: existingSession } = await supabase
      .from('breathing_sessions')
      .select('audio_url')
      .eq('user_id', userId)
      .eq('duration_min', duration)
      .eq('session_type', sessionType)
      .not('audio_url', 'is', null)
      .single();
    
    if (existingSession?.audio_url) {
      return res.json({ audioUrl: existingSession.audio_url, cached: true });
    }
    
    // Generate new audio via ElevenLabs
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scriptText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.0, // Neutral, calm tone
            use_speaker_boost: true
          }
        })
      }
    );
    
    if (!ttsResponse.ok) {
      throw new Error(`ElevenLabs API error: ${ttsResponse.statusText}`);
    }
    
    // Get audio buffer
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `${userId}/${sessionType}_${duration}min_${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('breathing-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // Cache for 1 year
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('breathing-audio')
      .getPublicUrl(fileName);
    
    const audioUrl = urlData.publicUrl;
    
    // Save to database
    await supabase.from('breathing_sessions').insert({
      user_id: userId,
      duration_min: duration,
      script_text: scriptText,
      audio_url: audioUrl,
      session_type: sessionType,
      voice_id: ELEVENLABS_VOICE_ID
    });
    
    res.json({ audioUrl, cached: false });
    
  } catch (err) {
    console.error('Generate session audio error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to hash script for deduplication
function hashScript(text) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(text).digest('hex');
}
```

## Breathing Scripts Library

### 5-Minute Box Breathing
```javascript
const SCRIPT_5MIN_BOX = `
Welcome to your 5-minute box breathing session.
Find a comfortable position, either sitting or lying down.
Close your eyes, or soften your gaze.

We'll breathe together using the box pattern:
Inhale for 4 counts, hold for 4, exhale for 4, hold for 4.

Let's begin.

[Pause 2 seconds]

Breathe in... 2... 3... 4...
Hold... 2... 3... 4...
Breathe out... 2... 3... 4...
Hold... 2... 3... 4...

[Repeat cycle 12 times with gentle guidance]

Breathe in... 2... 3... 4...
Hold... 2... 3... 4...
Breathe out... 2... 3... 4...
Hold... 2... 3... 4...

Good. Continue at your own pace.

[Long pause 30 seconds]

Now, when you're ready, take one more deep breath in...
And slowly release.

Gently open your eyes.
Notice how you feel.
You've completed your breathing practice.
`;
```

### 10-Minute Calm Reset
```javascript
const SCRIPT_10MIN_CALM = `
Welcome to your 10-minute calm reset.
This session will help you release tension and refocus.

Find a comfortable position.
Let your body settle.

[Pause 3 seconds]

We'll start with body awareness.
Notice your feet on the floor.
Your back against the chair.
Your hands resting gently.

[Pause 5 seconds]

Now, bring attention to your breath.
Don't change it, just observe.
Notice the natural rhythm.

[Pause 10 seconds]

Let's deepen the breath slightly.
Inhale through your nose for 4 counts.
Exhale through your mouth for 6 counts.

[Guide through 10 breath cycles]

Breathe in... 2... 3... 4...
Breathe out... 2... 3... 4... 5... 6...

[Continue pattern]

Beautiful. Keep this gentle rhythm.

[Long guided section with body scan]

Now scan your body from head to toe.
Notice your forehead... is it relaxed?
Your jaw... let it soften.
Your shoulders... let them drop.

[Continue body scan]

[Final 2 minutes of silent breathing with occasional gentle prompts]

You're doing wonderfully.
Just breathe.

[Pause 30 seconds]

When you're ready, begin to deepen your breath.
Wiggle your fingers and toes.
Slowly open your eyes.

Take this calm with you into your day.
`;
```

### Script Template Generator
```javascript
function generateBreathingScript(duration, intensity, userName = 'there') {
  const scripts = {
    5: {
      high: SCRIPT_5MIN_BOX,
      medium: SCRIPT_5MIN_CALM,
      low: SCRIPT_5MIN_ENERGIZING
    },
    10: {
      high: SCRIPT_10MIN_CALM,
      medium: SCRIPT_10MIN_BODY_SCAN,
      low: SCRIPT_10MIN_FOCUS
    },
    15: {
      high: SCRIPT_15MIN_DEEP_RELAX,
      medium: SCRIPT_15MIN_MINDFUL,
      low: SCRIPT_15MIN_ENERGIZING
    }
  };
  
  let script = scripts[duration][intensity] || scripts[5].medium;
  
  // Personalize with user's name if available
  script = script.replace(/Welcome/g, `Welcome, ${userName}`);
  
  return script;
}
```

## Client Integration

### Audio Playback Component
```typescript
// client/components/breathing-session-player.tsx

import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface BreathingSessionPlayerProps {
  duration: 5 | 10 | 15;
  userId: string;
  onComplete: () => void;
}

export function BreathingSessionPlayer({ 
  duration, 
  userId, 
  onComplete 
}: BreathingSessionPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  async function loadAudio() {
    try {
      // Get or generate audio
      const { audioUrl } = await apiClient.generateSessionAudio(
        userId,
        duration,
        'breathing'
      );
      
      // Load audio
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      
      setSound(audioSound);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load audio:', error);
    }
  }

  function onPlaybackStatusUpdate(status: any) {
    if (status.didJustFinish) {
      setPlaying(false);
      onComplete();
    }
  }

  async function handlePlayPause() {
    if (!sound) return;
    
    if (playing) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setPlaying(!playing);
  }

  return (
    <View>
      <Text>{duration}-Minute Breathing Session</Text>
      <Pressable 
        onPress={handlePlayPause}
        disabled={loading}
      >
        <Text>{loading ? 'Loading...' : playing ? 'Pause' : 'Play'}</Text>
      </Pressable>
    </View>
  );
}
```

### API Client Method
```typescript
// client/lib/api-client.ts

async generateSessionAudio(
  userId: string,
  duration: number,
  sessionType: string
): Promise<{ audioUrl: string; cached: boolean }> {
  const response = await fetch(`${this.baseURL}/generate-session-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, duration, sessionType }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate audio: ${response.statusText}`);
  }

  return response.json();
}
```

## Adaptive Session Triggering

### Auto-Generate When High Intensity Detected
```javascript
// In /plan-week endpoint after intensity calculation

if (intensity.level === 'high') {
  // Auto-generate 5-min breathing session for gaps
  for (const gap of gaps.filter(g => g.minutes >= 5 && g.minutes < 15)) {
    const script = generateBreathingScript(5, 'high', userProfile.name);
    
    // Generate audio in background (don't wait for response)
    generateSessionAudio({
      userId: userProfile.userId,
      scriptText: script,
      duration: 5,
      sessionType: 'breathing'
    }).catch(err => console.error('Background audio generation failed:', err));
    
    // Add to schedule immediately (audio will be cached when needed)
    activities.push({
      type: 'breathing',
      duration: 5,
      startTime: gap.start,
      hasAudio: true,
      microSteps: [
        'Find a quiet spot',
        'Open breathing session',
        'Follow audio guide'
      ]
    });
  }
}
```

## Voice Options

### Available ElevenLabs Voices
```javascript
const CALM_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',  // Female, warm, calming
  josh: 'TxGEqnHWrfWFTfGW9XjX',    // Male, steady, reassuring
  bella: 'EXAVITQu4vr4xnSDxMaL',   // Female, gentle, soothing
  antoni: 'ErXwobaYiN019PkySvjV',  // Male, soft, meditative
};

// Let user choose in profile
export interface VoicePreference {
  provider: 'elevenlabs';
  voiceId: string;
  gender: 'male' | 'female' | 'neutral';
  rate: number; // 0.75 - 1.25 (slower for breathing, faster for energizing)
}
```

## Cost Optimization

### Character Limits
```javascript
// ElevenLabs pricing: ~$0.30 per 1000 characters (paid tier)
// Average 5-min script: ~800 characters
// Average 10-min script: ~1500 characters
// Average 15-min script: ~2200 characters

// Cache aggressively to minimize regeneration
// Reuse scripts across users when possible (generic versions)
```

### Cache Strategy
1. **User-specific cache**: Store audio URLs in `breathing_sessions` table
2. **Script hash**: Check if identical script already generated
3. **Pre-generate**: Create common sessions (5/10/15 min) during off-peak hours
4. **TTL**: Audio cached indefinitely in Supabase Storage (user can delete)

## Testing

```javascript
// Test audio generation
curl -X POST http://localhost:3001/generate-session-audio \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "scriptText": "Test breathing session...",
    "duration": 5,
    "sessionType": "breathing"
  }'

// Expected response:
{
  "audioUrl": "https://your-project.supabase.co/storage/v1/object/public/breathing-audio/...",
  "cached": false
}
```
