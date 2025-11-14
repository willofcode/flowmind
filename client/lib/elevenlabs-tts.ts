/**
 * ElevenLabs Text-to-Speech Integration
 * 
 * Provides natural voice guidance for:
 * - Welcome screen onboarding
 * - Breathing/calm sessions
 * - Mood check-in conversations
 * - Activity instructions
 * 
 * Features:
 * - Audio streaming from backend
 * - Synchronized playback with animations
 * - Background audio support
 * - Haptic feedback on completion
 */

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface TTSOptions {
  text: string;
  voiceId?: string; // Optional voice selection
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  enableHaptics?: boolean; // Vibrate on completion
}

class ElevenLabsTTS {
  private sound: Audio.Sound | null = null;
  private audioCache: Map<string, string> = new Map(); // text -> audioUrl
  private isPlaying = false;
  private currentPlaybackId: string | null = null;

  constructor() {
    this.setupAudio();
  }

  /**
   * Configure audio session for TTS playback
   */
  private async setupAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('❌ Audio setup error:', error);
    }
  }

  /**
   * Generate audio URL from backend (with caching)
   */
  private async getAudioUrl(text: string, voiceId?: string): Promise<string> {
    // Check cache first
    const cacheKey = `${text}_${voiceId || 'default'}`;
    if (this.audioCache.has(cacheKey)) {
      console.log('✅ Using cached TTS URL');
      return this.audioCache.get(cacheKey)!;
    }

    console.log('🎙️ Generating TTS audio...');
    console.log(`📍 API URL: ${API_BASE_URL}/conversation/generate-tts`);

    try {
      // Request TTS generation from backend
      const response = await fetch(`${API_BASE_URL}/conversation/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TTS API error response:', errorText);
        throw new Error(`TTS API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Response data:', data);
      
      const { audioUrl, mock } = data;
      
      if (!audioUrl) {
        console.warn('⚠️ No audioUrl returned, TTS may be disabled');
        throw new Error('No audio URL returned from server');
      }
      
      if (mock) {
        console.log('🔇 TTS in mock mode - using silent audio');
      }
      
      // Cache the URL
      this.audioCache.set(cacheKey, audioUrl);
      
      console.log('✅ TTS audio generated');
      return audioUrl;
    } catch (error) {
      console.error('❌ TTS generation error:', error);
      throw error;
    }
  }

  /**
   * Speak text with TTS
   */
  async speak(options: TTSOptions): Promise<void> {
    const {
      text,
      voiceId,
      onProgress,
      onComplete,
      onError,
      enableHaptics = true,
    } = options;

    if (this.isPlaying) {
      console.warn('⚠️  TTS already playing, stopping previous...');
      await this.stop();
    }

    const playbackId = Date.now().toString();
    this.currentPlaybackId = playbackId;

    try {
      // Get audio URL (cached or generated)
      const audioUrl = await this.getAudioUrl(text, voiceId);

      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          if (status.isLoaded && status.isPlaying && onProgress && status.durationMillis) {
            const progress = status.positionMillis / status.durationMillis;
            onProgress(progress);
          }

          if (status.isLoaded && status.didJustFinish) {
            this.isPlaying = false;
            
            // Haptic feedback on completion
            if (enableHaptics) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Cleanup
            sound.unloadAsync();
            
            if (playbackId === this.currentPlaybackId) {
              onComplete?.();
            }
          }
        }
      );

      this.sound = sound;
      this.isPlaying = true;
      console.log('🔊 Playing TTS audio...');

    } catch (error) {
      console.error('❌ TTS playback error:', error);
      this.isPlaying = false;
      onError?.(error as Error);
    }
  }

  /**
   * Stop current playback
   */
  async stop(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.isPlaying = false;
        this.currentPlaybackId = null;
        console.log('⏹️ TTS stopped');
      } catch (error) {
        console.error('❌ Stop error:', error);
      }
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (this.sound && this.isPlaying) {
      try {
        await this.sound.pauseAsync();
        console.log('⏸️ TTS paused');
      } catch (error) {
        console.error('❌ Pause error:', error);
      }
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      try {
        await this.sound.playAsync();
        this.isPlaying = true;
        console.log('▶️ TTS resumed');
      } catch (error) {
        console.error('❌ Resume error:', error);
      }
    }
  }

  /**
   * Clear audio cache
   */
  async clearCache(): Promise<void> {
    this.audioCache.clear();
    console.log('🗑️ TTS cache cleared');
  }

  /**
   * Check if currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance
export const ttsService = new ElevenLabsTTS();

/**
 * Convenience functions for common use cases
 */

/**
 * Speak welcome message with calming tone
 */
export async function speakWelcome(userName: string): Promise<void> {
  try {
    const message = `Welcome to FlowMind, ${userName}. I'm here to help you find calm and focus. Let's take a moment to breathe together.`;
    
    await ttsService.speak({
      text: message,
      enableHaptics: true,
    });
  } catch (error) {
    // Silently fail - TTS is optional
    console.log('🔇 TTS not available (graceful fallback)');
  }
}

/**
 * Speak breathing instruction synced with phase
 */
export async function speakBreathingPhase(
  phaseName: string,
  instruction: string,
  onComplete?: () => void
): Promise<void> {
  try {
    await ttsService.speak({
      text: instruction,
      enableHaptics: false, // Let breathing animation handle haptics
      onComplete,
    });
  } catch (error) {
    // Silently fail - TTS is optional
    console.log('🔇 TTS not available (graceful fallback)');
    onComplete?.(); // Still call completion callback
  }
}

/**
 * Speak mood check-in prompt
 */
export async function speakMoodPrompt(isFirstTime: boolean = true): Promise<void> {
  try {
    const message = isFirstTime
      ? "How are you feeling right now? Take your time to share what's on your mind."
      : "I'm listening. Tell me more about how you're feeling.";
    
    await ttsService.speak({
      text: message,
      enableHaptics: true,
    });
  } catch (error) {
    console.log('🔇 TTS not available (graceful fallback)');
  }
}

/**
 * Speak AI response in conversation
 */
export async function speakAIResponse(
  responseText: string,
  onComplete?: () => void
): Promise<void> {
  try {
    await ttsService.speak({
      text: responseText,
      enableHaptics: true,
      onComplete,
    });
  } catch (error) {
    console.log('🔇 TTS not available (graceful fallback)');
    onComplete?.();
  }
}

export default ttsService;
