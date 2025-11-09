/**
 * Calm Breathing Session with TTS Guidance
 * 
 * Designed for:
 * - Breathing activities from Today tab
 * - Calm session from welcome.tsx
 * 
 * Features:
 * - ElevenLabs TTS voice guidance
 * - Calming gradient background (no text input)
 * - Smooth animations synced with breath phases
 * - Haptic feedback for phase transitions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors } from '@/constants/calm-theme';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface BreathingPhase {
  name: string;
  duration: number; // seconds
  instruction: string;
  voiceGuidance: string; // Text for TTS
}

const BREATHING_PROTOCOLS = {
  box: [
    { 
      name: 'Inhale', 
      duration: 4, 
      instruction: 'Breathe in', 
      voiceGuidance: 'Breathe in slowly through your nose for four counts' 
    },
    { 
      name: 'Hold', 
      duration: 4, 
      instruction: 'Hold', 
      voiceGuidance: 'Hold your breath gently' 
    },
    { 
      name: 'Exhale', 
      duration: 4, 
      instruction: 'Breathe out', 
      voiceGuidance: 'Exhale slowly through your mouth' 
    },
    { 
      name: 'Hold', 
      duration: 4, 
      instruction: 'Rest', 
      voiceGuidance: 'Rest before the next breath' 
    },
  ],
  rescue: [
    { 
      name: 'Inhale', 
      duration: 4, 
      instruction: 'Breathe in', 
      voiceGuidance: 'Take a deep breath in through your nose' 
    },
    { 
      name: 'Hold', 
      duration: 7, 
      instruction: 'Hold', 
      voiceGuidance: 'Hold your breath comfortably for seven counts' 
    },
    { 
      name: 'Exhale', 
      duration: 8, 
      instruction: 'Breathe out', 
      voiceGuidance: 'Slowly exhale for eight counts, releasing all tension' 
    },
  ],
  meditation: [
    { 
      name: 'Inhale', 
      duration: 5, 
      instruction: 'Breathe in', 
      voiceGuidance: 'Breathe in slowly and deeply' 
    },
    { 
      name: 'Exhale', 
      duration: 5, 
      instruction: 'Breathe out', 
      voiceGuidance: 'Exhale gently, letting go' 
    },
  ],
};

// Calming gradient colors
const GRADIENT_COLORS = {
  inhale: ['#667eea', '#764ba2'], // Purple to indigo
  hold: ['#4facfe', '#00f2fe'], // Blue gradient
  exhale: ['#fa709a', '#fee140'], // Pink to yellow
  rest: ['#30cfd0', '#330867'], // Teal to deep purple
};

export default function CalmBreathingSession() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get protocol from params (default to 'meditation' for calm sessions)
  const protocol = (params.protocol as keyof typeof BREATHING_PROTOCOLS) || 'meditation';
  const duration = parseInt(params.duration as string) || 5; // minutes
  const fromWelcome = params.fromWelcome === 'true';
  
  const phases = BREATHING_PROTOCOLS[protocol];
  
  const [isActive, setIsActive] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(phases[0].duration);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(duration * 60); // total seconds
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);
  const rotation = useSharedValue(0);

  const currentPhase = phases[currentPhaseIndex];
  const targetCycles = Math.ceil((duration * 60) / phases.reduce((sum, p) => sum + p.duration, 0));

  // Animated circle style
  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  // Start session automatically if from welcome
  useEffect(() => {
    if (fromWelcome) {
      setTimeout(() => {
        startSession();
      }, 1000);
    }
  }, [fromWelcome]);

  // Countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
        setSessionTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (isActive && countdown === 0) {
      // Move to next phase
      const nextIndex = (currentPhaseIndex + 1) % phases.length;
      
      if (nextIndex === 0) {
        // Completed a full cycle
        const newCycleCount = cyclesCompleted + 1;
        setCyclesCompleted(newCycleCount);
        
        if (newCycleCount >= targetCycles || sessionTimeRemaining <= 0) {
          // Session complete
          finishSession();
          return;
        }
      }
      
      setCurrentPhaseIndex(nextIndex);
      setCountdown(phases[nextIndex].duration);
      
      // Haptic feedback on phase change
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Play TTS guidance for new phase
      playVoiceGuidance(phases[nextIndex].voiceGuidance);
    }

    return () => clearInterval(interval);
  }, [isActive, countdown, currentPhaseIndex, cyclesCompleted, sessionTimeRemaining]);

  // Animate circle based on phase
  useEffect(() => {
    if (!isActive) return;

    if (currentPhase.name === 'Inhale') {
      scale.value = withTiming(1.2, { duration: currentPhase.duration * 1000, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0.9, { duration: currentPhase.duration * 1000 });
      rotation.value = withRepeat(withTiming(rotation.value + 180, { duration: currentPhase.duration * 1000 }), 1);
    } else if (currentPhase.name === 'Exhale') {
      scale.value = withTiming(0.5, { duration: currentPhase.duration * 1000, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0.3, { duration: currentPhase.duration * 1000 });
      rotation.value = withRepeat(withTiming(rotation.value + 180, { duration: currentPhase.duration * 1000 }), 1);
    } else {
      // Hold phases - maintain current size with gentle pulse
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 1000 }),
        currentPhase.duration,
        true
      );
    }
  }, [currentPhaseIndex, isActive]);

  const startSession = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(true);
    
    // Play initial guidance
    playVoiceGuidance("Let's begin. Find a comfortable position and focus on your breath.");
  };

  const pauseSession = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(false);
    
    if (sound) {
      await sound.pauseAsync();
    }
  };

  const resumeSession = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(true);
  };

  const finishSession = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsActive(false);
    
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    
    Alert.alert(
      'Session Complete! 🎉',
      `Great job! You completed ${cyclesCompleted} breathing cycles.`,
      [
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const exitSession = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    
    if (cyclesCompleted > 0) {
      Alert.alert(
        'End Session?',
        `You've completed ${cyclesCompleted} cycles. End session?`,
        [
          { text: 'Continue', style: 'cancel' },
          { text: 'End', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // Play TTS voice guidance via ElevenLabs
  const playVoiceGuidance = async (text: string) => {
    try {
      setIsLoadingAudio(true);
      
      // Call backend to generate TTS audio
      const response = await fetch(`${API_BASE_URL}/conversation/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.warn('TTS generation failed, skipping audio');
        setIsLoadingAudio(false);
        return;
      }

      const data = await response.json();
      
      if (!data.audioUrl) {
        console.warn('No audio URL returned');
        setIsLoadingAudio(false);
        return;
      }

      // Unload previous sound
      if (sound) {
        await sound.unloadAsync();
      }

      // Load and play new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: data.audioUrl },
        { shouldPlay: true, volume: 0.7 }
      );
      
      setSound(newSound);
      
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsLoadingAudio(false);
        }
      });

    } catch (error) {
      console.error('TTS playback error:', error);
      setIsLoadingAudio(false);
    }
  };

  // Get gradient colors for current phase
  const getGradientColors = (): [string, string] => {
    if (currentPhase.name === 'Inhale') return GRADIENT_COLORS.inhale as [string, string];
    if (currentPhase.name === 'Exhale') return GRADIENT_COLORS.exhale as [string, string];
    if (currentPhase.name === 'Hold' && currentPhase.instruction === 'Rest') return GRADIENT_COLORS.rest as [string, string];
    return GRADIENT_COLORS.hold as [string, string];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Hide navigation header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        {/* Animated gradient background */}
        <LinearGradient
          colors={getGradientColors()}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Close button */}
        <Pressable onPress={exitSession} style={styles.closeButton}>
          <IconSymbol name="xmark" size={24} color="rgba(255, 255, 255, 0.9)" />
        </Pressable>

        {/* Center content */}
        <View style={styles.centerContent}>
          {/* Animated breathing circle */}
          <Animated.View style={[styles.breathingCircle, circleStyle]} />

          {/* Phase instruction */}
          <Text style={styles.phaseInstruction}>{currentPhase.instruction}</Text>
          
          {/* Countdown */}
          <Text style={styles.countdown}>{countdown}</Text>

          {/* Cycle progress */}
          <Text style={styles.progress}>
            Cycle {cyclesCompleted + 1} of {targetCycles}
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomControls}>
        <Text style={styles.timeRemaining}>
          {formatTime(sessionTimeRemaining)} remaining
        </Text>

        {!isActive ? (
          <Pressable
            onPress={cyclesCompleted > 0 ? resumeSession : startSession}
            style={styles.primaryButton}
          >
            <IconSymbol 
              name={cyclesCompleted > 0 ? 'play.fill' : 'play.circle.fill'} 
              size={32} 
              color="#FFFFFF" 
            />
            <Text style={styles.buttonText}>
              {cyclesCompleted > 0 ? 'Resume' : 'Start'}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={pauseSession} style={styles.primaryButton}>
            <IconSymbol name="pause.fill" size={32} color="#FFFFFF" />
            <Text style={styles.buttonText}>Pause</Text>
          </Pressable>
        )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 22,
    zIndex: 10,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingCircle: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 60,
  },
  phaseInstruction: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  countdown: {
    fontSize: 72,
    fontWeight: '200',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  progress: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 20,
  },
  timeRemaining: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
    minWidth: 160,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
