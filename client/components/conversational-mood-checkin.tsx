/**
 * Conversational Mood Check-in with STT + TTS
 * 
 * Multi-turn conversation with mAIstro for sentiment analysis
 * Integrates schedule correlation and ElevenLabs voice responses
 * 
 * Flow:
 *   1. User taps to start conversation → Generate greeting
 *   2. User speaks (STT) → Backend analyzes with schedule context
 *   3. mAIstro responds (text + TTS audio)
 *   4. User can continue conversation or finish
 *   5. Final mood score saved with full conversation history
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
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ConversationTurn {
  role: 'user' | 'assistant';
  message: string;
  audioUrl?: string;
  moodScore?: number;
  timestamp: Date;
}

interface ConversationalMoodCheckInProps {
  userId: string;
  todayEvents?: any[]; // Calendar events for schedule correlation
  onComplete?: (result: MoodCheckInResult) => void;
  onCancel?: () => void;
}

interface MoodCheckInResult {
  conversationId: string;
  finalMoodScore: number;
  energyLevel: string;
  stressLevel: string;
  emotionalState: any;
  conversationTurns: number;
  duration: number;
  recommendations: string[];
}

export default function ConversationalMoodCheckIn({
  userId,
  todayEvents = [],
  onComplete,
  onCancel,
}: ConversationalMoodCheckInProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  const [conversationId, setConversationId] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentMoodScore, setCurrentMoodScore] = useState<number>(5);
  const [sessionStartTime] = useState(Date.now());

  const scrollViewRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    startConversation();
    requestAudioPermissions();

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recording) recording.stopAndUnloadAsync();
      if (sound) sound.unloadAsync();
    };
  }, []);

  const requestAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Access',
          'FlowMind needs microphone access for voice mood check-ins.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Permission error:', err);
    }
  };

  const startConversation = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('Failed to start conversation');

      const data = await response.json();
      setConversationId(data.conversationId);

      // Add greeting to conversation
      setConversationHistory([
        {
          role: 'assistant',
          message: data.greeting.text,
          timestamp: new Date(),
        },
      ]);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('Start conversation error:', err);
      Alert.alert('Connection Error', 'Could not start conversation. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) throw new Error('No recording URI');

      await processRecording(uri, recordingTime);
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('Recording Error', 'Could not save recording. Please try again.');
      setIsRecording(false);
    }
  };

  const processRecording = async (audioUri: string, duration: number) => {
    setIsProcessing(true);

    try {
      // TODO: Replace with actual STT service (OpenAI Whisper, iOS Speech Recognition, etc.)
      const transcription = await simulateSTT(audioUri);

      // Add user message to history
      const userMessage: ConversationTurn = {
        role: 'user',
        message: transcription,
        timestamp: new Date(),
      };
      setConversationHistory((prev) => [...prev, userMessage]);

      // Analyze sentiment with schedule correlation
      const response = await fetch(`${API_BASE_URL}/conversation/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          conversationId,
          transcription,
          todayEvents,
        }),
      });

      if (!response.ok) throw new Error('Sentiment analysis failed');

      const data = await response.json();
      
      console.log('📊 Sentiment Analysis:', data.analysis);
      console.log('💬 AI Response:', data.response.text);

      // Update mood score
      setCurrentMoodScore(data.analysis.moodScore);

      // Add AI response to history
      const aiMessage: ConversationTurn = {
        role: 'assistant',
        message: data.response.text,
        audioUrl: data.response.audioUrl,
        moodScore: data.analysis.moodScore,
        timestamp: new Date(),
      };
      setConversationHistory((prev) => [...prev, aiMessage]);

      // Play TTS response if available
      if (data.response.audioUrl) {
        await playTTSResponse(data.response.audioUrl);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsProcessing(false);

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Processing error:', err);
      Alert.alert('Processing Error', 'Could not process your message. Please try again.');
      setIsProcessing(false);
    }
  };

  const simulateSTT = async (audioUri: string): Promise<string> => {
    // TODO: Replace with actual STT service
    // Options: OpenAI Whisper API, Google Cloud Speech-to-Text, iOS Speech Recognition
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const mockTranscriptions = [
      "I'm feeling pretty overwhelmed today with all these meetings.",
      "Actually, things are going better now. I had some time to breathe.",
      "I'm worried about the presentation later. Feeling anxious.",
      "I'm doing okay, just a bit tired from the busy schedule.",
    ];
    
    return mockTranscriptions[conversationHistory.filter(t => t.role === 'user').length % mockTranscriptions.length];
  };

  const playTTSResponse = async (audioUrl: string) => {
    try {
      setIsPlayingResponse(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlayingResponse(false);
          newSound.unloadAsync();
        }
      });
    } catch (err) {
      console.error('TTS playback error:', err);
      setIsPlayingResponse(false);
    }
  };

  const finishConversation = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const duration = Math.round((Date.now() - sessionStartTime) / 1000);
      
      // Get final analysis from last turn
      const lastAITurn = conversationHistory
        .filter(turn => turn.role === 'assistant' && turn.moodScore)
        .pop();

      // Store final mood check-in
      const response = await fetch(`${API_BASE_URL}/conversation/store-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          conversationId,
          finalMoodScore: currentMoodScore,
          duration,
          energyLevel: 'moderate', // TODO: Get from last analysis
          stressLevel: 'moderate',
          emotionalState: {},
          summary: conversationHistory.map(t => `${t.role}: ${t.message}`).join('\n'),
          scheduleContext: {
            scheduleIntensity: 'medium',
            upcomingEventsCount: todayEvents.length,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to store mood check-in');

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onComplete) {
        onComplete({
          conversationId,
          finalMoodScore: currentMoodScore,
          energyLevel: 'moderate',
          stressLevel: 'moderate',
          emotionalState: {},
          conversationTurns: conversationHistory.length,
          duration,
          recommendations: [],
        });
      }
    } catch (err) {
      console.error('Finish conversation error:', err);
      Alert.alert('Save Error', 'Could not save your mood check-in. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.text }]}>
            Analyzing your mood...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mood Check-in</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Conversation History */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.conversationContainer}
        contentContainerStyle={styles.conversationContent}
      >
        {conversationHistory.map((turn, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              turn.role === 'user' ? styles.userBubble : styles.aiBubble,
              { backgroundColor: turn.role === 'user' ? colors.primary : colors.surface },
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: turn.role === 'user' ? '#FFFFFF' : colors.text },
              ]}
            >
              {turn.message}
            </Text>
            {turn.moodScore && (
              <Text style={[styles.moodScore, { color: colors.textSecondary }]}>
                Mood: {turn.moodScore}/10
              </Text>
            )}
          </View>
        ))}
        
        {isPlayingResponse && (
          <View style={[styles.playingIndicator, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.playingText, { color: colors.textSecondary }]}>
              Playing response...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        {isRecording && (
          <Text style={[styles.recordingTime, { color: colors.error }]}>
            ⏺ {formatTime(recordingTime)}
          </Text>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? colors.error : colors.primary },
            ]}
            disabled={isProcessing || isPlayingResponse}
          >
            <IconSymbol
              name={isRecording ? 'stop.fill' : 'mic.fill'}
              size={32}
              color="#FFFFFF"
            />
          </Pressable>
        </Animated.View>

        <Pressable
          onPress={finishConversation}
          style={[styles.finishButton, { backgroundColor: colors.success }]}
          disabled={conversationHistory.length < 2 || isRecording || isProcessing}
        >
          <Text style={styles.finishButtonText}>Finish</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: CalmSpacing.md,
    paddingVertical: CalmSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  conversationContainer: {
    flex: 1,
  },
  conversationContent: {
    padding: CalmSpacing.md,
    paddingBottom: CalmSpacing.xl,
  },
  messageBubble: {
    padding: CalmSpacing.md,
    borderRadius: 16,
    marginBottom: CalmSpacing.sm,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  moodScore: {
    fontSize: 12,
    marginTop: CalmSpacing.xs,
    fontWeight: '500',
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: CalmSpacing.sm,
    borderRadius: 12,
    marginTop: CalmSpacing.xs,
  },
  playingText: {
    marginLeft: CalmSpacing.xs,
    fontSize: 14,
  },
  controlsContainer: {
    padding: CalmSpacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: CalmSpacing.sm,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: CalmSpacing.md,
  },
  finishButton: {
    paddingHorizontal: CalmSpacing.xl,
    paddingVertical: CalmSpacing.md,
    borderRadius: 12,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: CalmSpacing.md,
    fontSize: 16,
  },
});
