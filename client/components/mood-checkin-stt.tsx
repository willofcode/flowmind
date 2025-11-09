/**
 * Mood Check-in with STT (Speech-to-Text)
 * Conversational voice-based mood tracking
 * Inspired by welcome.tsx voice interaction pattern
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MoodCheckInProps {
  userId: string;
  onComplete?: (data: MoodCheckInResult) => void;
  onCancel?: () => void;
}

interface MoodCheckInResult {
  transcription: string;
  audioUrl?: string;
  durationSeconds: number;
  moodScore?: number;
  energyLevel?: string;
  recommendations?: string[];
}

export default function MoodCheckInSTT({ userId, onComplete, onCancel }: MoodCheckInProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    requestPermissions();
    startEntranceAnimation();
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission',
          'FlowMind needs microphone access to record your mood check-in. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Permission request error:', err);
    }
  };

  const startEntranceAnimation = () => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Sound wave effect during recording
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();
    waveAnim.stopAnimation();
    
    Animated.parallel([
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.timing(waveAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const startRecording = async () => {
    if (!permissionGranted) {
      await requestPermissions();
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);
      startPulseAnimation();

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      setIsRecording(false);
      stopPulseAnimation();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        throw new Error('No recording URI');
      }

      // Process the recording
      await processRecording(uri, recordingTime);

    } catch (err) {
      console.error('Failed to stop recording:', err);
      Alert.alert('Recording Error', 'Could not save recording. Please try again.');
      setIsRecording(false);
      stopPulseAnimation();
    }
  };

  const processRecording = async (audioUri: string, duration: number) => {
    setIsProcessing(true);

    try {
      // TODO: Implement actual STT service (OpenAI Whisper, Google Cloud Speech, etc.)
      // For now, simulate transcription
      await simulateTranscription(audioUri, duration);
      
    } catch (err) {
      console.error('Processing error:', err);
      Alert.alert('Processing Error', 'Could not process your recording. Please try again.');
      setIsProcessing(false);
    }
  };

  const simulateTranscription = async (audioUri: string, duration: number) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock transcription (in production, this would come from STT API)
    const mockTranscription = "I'm feeling a bit overwhelmed today. There's a lot on my schedule and I'm having trouble focusing.";

    // Send to backend for mood analysis
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/mood-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transcription: mockTranscription,
          audioUrl: audioUri,
          durationSeconds: duration,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (onComplete) {
        onComplete({
          transcription: mockTranscription,
          audioUrl: audioUri,
          durationSeconds: duration,
          moodScore: result.checkIn?.mood_score,
          energyLevel: result.checkIn?.energy_level,
          recommendations: result.recommendations,
        });
      }

      setIsProcessing(false);

    } catch (err) {
      console.error('Backend submission error:', err);
      Alert.alert('Sync Error', 'Could not save your mood check-in. Please try again.');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(74, 155, 175, 0.2)', 'rgba(255, 107, 107, 0.5)'],
  });

  if (isProcessing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.text }]}>
            Analyzing your mood...
          </Text>
          <Text style={[styles.processingSubtext, { color: colors.textSecondary }]}>
            This may take a moment
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            How are you feeling?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isRecording 
              ? 'Share what\'s on your mind...' 
              : 'Tap the mic to start recording'}
          </Text>
        </View>

        {/* Recording Circle */}
        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.glowCircle,
              {
                backgroundColor: isRecording ? glowColor : colors.surface,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          
          {/* Sound waves (visible when recording) */}
          {isRecording && (
            <>
              <Animated.View
                style={[
                  styles.soundWave,
                  {
                    backgroundColor: colors.primary,
                    opacity: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0],
                    }),
                    transform: [
                      {
                        scale: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.soundWave,
                  {
                    backgroundColor: colors.primary,
                    opacity: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 0],
                    }),
                    transform: [
                      {
                        scale: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </>
          )}

          <Pressable
            style={[
              styles.recordButton,
              {
                backgroundColor: isRecording ? '#FF6B6B' : colors.primary,
              },
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <IconSymbol
              name={isRecording ? 'stop.circle.fill' : 'mic.fill'}
              size={isRecording ? 60 : 70}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Recording Timer */}
        {isRecording && (
          <View style={styles.timerContainer}>
            <View style={[styles.recordingIndicator, { backgroundColor: '#FF6B6B' }]} />
            <Text style={[styles.timerText, { color: colors.text }]}>
              {formatTime(recordingTime)}
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          {!isRecording && (
            <>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                💭 Share your thoughts freely
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                🎯 Talk about your energy and schedule
              </Text>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                🧠 AI will understand and suggest helpful actions
              </Text>
            </>
          )}
          {isRecording && (
            <Text style={[styles.recordingHint, { color: colors.textTertiary }]}>
              Tap the red button to finish
            </Text>
          )}
        </View>

        {/* Cancel Button */}
        {!isRecording && onCancel && (
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Skip for now →
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: CalmSpacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: CalmSpacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: CalmSpacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  circleContainer: {
    position: 'relative',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CalmSpacing.xl,
  },
  glowCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  soundWave: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  recordButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CalmSpacing.lg,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: CalmSpacing.sm,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  instructionsContainer: {
    alignItems: 'center',
    gap: CalmSpacing.sm,
    marginBottom: CalmSpacing.xl,
  },
  instructionText: {
    fontSize: 15,
    textAlign: 'center',
  },
  recordingHint: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingVertical: CalmSpacing.md,
  },
  cancelText: {
    fontSize: 16,
  },
  processingContainer: {
    alignItems: 'center',
    gap: CalmSpacing.md,
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: CalmSpacing.lg,
  },
  processingSubtext: {
    fontSize: 15,
  },
});
