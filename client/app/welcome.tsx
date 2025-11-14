/**
 * Welcome Screen - Profile Creation
 * Shows after successful sign-in with animated entrance
 * Optional voice input available
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentCalendarUser, isSignedInToGoogleCalendar, getCalendarAccessToken } from '@/lib/google-calendar-auth';
import { apiClient } from '@/lib/api-client';
import { transcribeAudio, validateAudioFile, mockTranscription } from '@/lib/voice-transcription';
import { speakWelcome, speakAIResponse } from '@/lib/elevenlabs-tts';
import { loadProfile } from '@/lib/profile-store';
import { calculateScheduleIntensity, calculateMoodFromSchedule } from '@/lib/mood-calculator';
import type { PersonalNeuroProfile } from '@/types/neuro-profile';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationMode = params.conversationMode === 'true';
  
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [thoughtInput, setThoughtInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(conversationMode); // Show in conversation mode
  const [isExpanded, setIsExpanded] = useState(conversationMode); // Auto-expand in conversation mode
  
  // Conversation state
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<any>(null);

  // TextInput ref for proper focus management
  const textInputRef = useRef<TextInput>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animation values
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const inputHeight = useRef(new Animated.Value(0)).current; // For expandable input

  useEffect(() => {
    loadUserData();
    checkReturningUser();
    startAnimations();
    
    // Auto-expand input in conversation mode
    if (conversationMode) {
      setTimeout(() => {
        Animated.spring(inputHeight, {
          toValue: 1,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();
        
        // Focus input after animation
        setTimeout(() => textInputRef.current?.focus(), 300);
      }, 600); // Wait for entrance animations
    }
  }, [conversationMode]);

  // Load Google user data
  const loadUserData = async () => {
    try {
      const isSignedIn = await isSignedInToGoogleCalendar();
      if (isSignedIn) {
        const userData = await getCurrentCalendarUser();
        setUser(userData);
        console.log('👤 Loaded user data:', userData?.email);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Delay focus to avoid iOS simulator warning (only if not in conversation mode)
  useEffect(() => {
    if (!conversationMode) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 800); // Focus after animations start

      return () => clearTimeout(timer);
    }
  }, [conversationMode]);

  const checkReturningUser = async () => {
    const profileCompleted = await SecureStore.getItemAsync('profile_completed');
    const savedName = await SecureStore.getItemAsync('user_name');
    
    if (profileCompleted === 'true' && savedName) {
      setIsReturningUser(true);
      setUserName(savedName);
    } else if (user?.name) {
      // Use Auth0 name as default
      setUserName(user.name);
    }
  };

  const startAnimations = () => {
    // Circle entrance
    Animated.parallel([
      Animated.spring(circleScale, {
        toValue: 1,
        tension: 30,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false, // JS driver for glow
      }),
    ]).start();

    // Content fade in
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Continuous pulse animation (native driver for main circle)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation (JS driver for both color and scale)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowPulse, {
            toValue: 1.08,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(74, 155, 175, 0.2)', 'rgba(122, 207, 125, 0.4)'],
  });

  const toggleTextInput = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsExpanded(!isExpanded);
    
    Animated.spring(inputHeight, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
    
    // Focus input when expanding
    if (!isExpanded) {
      setTimeout(() => textInputRef.current?.focus(), 300);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please enable microphone access to record voice messages.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Unable to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (!recording) return;

      // Stop timer
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      console.log('🎤 Recording stopped, URI:', uri);

      setRecording(null);

      // Send to transcription (mock for now)
      if (uri) {
        await sendVoiceMessage(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const sendVoiceMessage = async (audioUri: string) => {
    setIsProcessing(true);
    
    try {
      console.log('🎤 Processing voice message...');
      
      // Validate audio file
      validateAudioFile(audioUri);
      
      // Transcribe audio using OpenAI Whisper
      // Falls back to mock if API key not configured
      const transcriptionResult = await transcribeAudio(audioUri);
      
      console.log('📝 Transcription:', transcriptionResult.text);
      console.log('⏱️  Duration:', transcriptionResult.duration, 'seconds');
      
      // Send transcribed text to conversation API
      await sendConversationMessage(transcriptionResult.text, 'voice');
    } catch (error) {
      console.error('Failed to process voice message:', error);
      
      // Fallback to mock transcription on error
      console.log('⚠️  Using mock transcription as fallback');
      const fallbackResult = mockTranscription(recordingDuration);
      await sendConversationMessage(fallbackResult.text, 'voice');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendConversationMessage = async (message: string, inputType: 'text' | 'voice' = 'text') => {
    if (!message.trim()) return;

    setIsProcessing(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Get user ID (use email as fallback)
      const userId = user?.sub || user?.email || 'anonymous';

      // Start conversation if needed
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const startResponse = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/conversation/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const startData = await startResponse.json();
        currentConversationId = startData.conversationId;
        setConversationId(currentConversationId);
      }

      // Get user profile for active hours calculation
      const userProfile = await loadProfile();
      const activeMinutes = userProfile?.activeHours?.dailyActiveHours 
        ? userProfile.activeHours.dailyActiveHours * 60 
        : 16 * 60; // Default 16 hours

      // Fetch today's and yesterday's calendar events for mood calculation
      console.log('📅 Fetching calendar events for mood calculation...');
      const token = await getCalendarAccessToken();
      
      let todayEvents: any[] = [];
      let yesterdayEvents: any[] = [];
      
      if (token) {
        try {
          const now = new Date();
          
          // Today's events
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          
          const todayResponse = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/calendar/get-calendar-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: token,
              timeMin: todayStart.toISOString(),
              timeMax: todayEnd.toISOString(),
            }),
          });
          
          if (todayResponse.ok) {
            const todayData = await todayResponse.json();
            todayEvents = todayData.events || [];
          }
          
          // Yesterday's events
          const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
          
          const yesterdayResponse = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/calendar/get-calendar-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: token,
              timeMin: yesterdayStart.toISOString(),
              timeMax: yesterdayEnd.toISOString(),
            }),
          });
          
          if (yesterdayResponse.ok) {
            const yesterdayData = await yesterdayResponse.json();
            yesterdayEvents = yesterdayData.events || [];
          }
        } catch (error) {
          console.error('Error fetching calendar events:', error);
        }
      }

      // Calculate schedule intensity for both days
      const todayIntensity = calculateScheduleIntensity(
        todayEvents.map((e: any) => ({
          durationSec: (new Date(e.end?.dateTime || e.end?.date).getTime() - 
                       new Date(e.start?.dateTime || e.start?.date).getTime()) / 1000
        })),
        activeMinutes
      );
      
      const yesterdayIntensity = yesterdayEvents.length > 0 
        ? calculateScheduleIntensity(
            yesterdayEvents.map((e: any) => ({
              durationSec: (new Date(e.end?.dateTime || e.end?.date).getTime() - 
                           new Date(e.start?.dateTime || e.start?.date).getTime()) / 1000
            })),
            activeMinutes
          )
        : null;

      // Calculate initial mood metrics from schedule pattern
      const calculatedMetrics = calculateMoodFromSchedule(yesterdayIntensity, todayIntensity);
      
      console.log('📊 Calculated mood metrics:', {
        moodScore: calculatedMetrics.moodScore,
        energyLevel: calculatedMetrics.energyLevel,
        stressLevel: calculatedMetrics.stressLevel,
        reasoning: calculatedMetrics.reasoning
      });

      // Send message for analysis with pre-calculated metrics
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/conversation/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          conversationId: currentConversationId,
          transcription: message,
          inputType,
          calculatedMetrics: {
            moodScore: calculatedMetrics.moodScore,
            energyLevel: calculatedMetrics.energyLevel,
            stressLevel: calculatedMetrics.stressLevel,
            reasoning: calculatedMetrics.reasoning
          },
          scheduleContext: {
            todayIntensity: todayIntensity.level,
            todayRatio: todayIntensity.ratio,
            yesterdayIntensity: yesterdayIntensity?.level,
            yesterdayRatio: yesterdayIntensity?.ratio,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error:', response.status, errorText);
        throw new Error(`Failed to analyze message: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('💬 AI Response:', data);

      // Add to conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', message, timestamp: new Date().toISOString() },
        { 
          role: 'assistant', 
          message: data.conversationalResponse,
          moodScore: data.moodScore,
          recommendations: data.recommendations,
          timestamp: new Date().toISOString()
        },
      ];
      
      setConversationHistory(newHistory);
      setAiResponse(data);
      setShowResponse(true);

      // Save to local storage
      await saveConversationHistory(userId, newHistory);

      // Play TTS if available
      if (data.ttsAudioUrl) {
        await playTTSResponse(data.ttsAudioUrl);
      }

      // Clear input
      setThoughtInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playTTSResponse = async (audioUrl: string) => {
    try {
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play TTS:', error);
    }
  };

  const saveConversationHistory = async (userId: string, history: any[]) => {
    try {
      // Validate userId
      if (!userId || userId.trim().length === 0) {
        console.warn('⚠️  Invalid userId for saving conversation history');
        return;
      }
      
      await SecureStore.setItemAsync(
        `conversation_history_${userId}`,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  };

  const loadConversationHistory = async (userId: string) => {
    try {
      // Validate userId
      if (!userId || userId.trim().length === 0) {
        console.warn('⚠️  Invalid userId for loading conversation history');
        return;
      }
      
      const stored = await SecureStore.getItemAsync(`conversation_history_${userId}`);
      if (stored) {
        setConversationHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  // Load conversation history when in conversation mode
  useEffect(() => {
    if (conversationMode && user) {
      const userId = user?.sub || user?.email || 'anonymous';
      if (userId && userId !== 'anonymous') {
        loadConversationHistory(userId);
      }
    }
  }, [conversationMode, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  const handleContinue = async () => {
    if (isReturningUser) {
      // Returning user - save thought/feeling and navigate
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (thoughtInput.trim()) {
        // TODO: Save thought to database for AI analysis
        console.log('User thought:', thoughtInput);
      }
      
      // Navigate to main app
      router.replace('/today');
    } else {
      // New user - validate name and save profile
      if (!userName.trim()) {
        Alert.alert('Name Required', 'Please tell us your name to continue');
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Save profile completion flag and name
      await SecureStore.setItemAsync('profile_completed', 'true');
      await SecureStore.setItemAsync('user_name', userName);
      
      // Play welcome message with TTS
      try {
        await speakWelcome(userName);
      } catch (error) {
        console.log('TTS not available, continuing silently:', error);
      }
      
      // Navigate to main app
      router.replace('/today');
    }
  };  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Psychic Circle */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: glowColor,
              transform: [{ scale: glowPulse }], // JS-driven scale
              opacity: glowOpacity, // JS-driven opacity
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mainCircle,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: Animated.multiply(circleScale, pulseAnim) }], // Native-driven scale
              opacity: circleOpacity, // Native-driven opacity
            },
          ]}
        >
          <IconSymbol name="brain.head.profile" size={80} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Welcome Text - Only show if NOT in conversation mode */}
      {!conversationMode && (
        <Animated.View style={[styles.textContainer, { opacity: contentOpacity }]}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            {isReturningUser 
              ? `Welcome back, ${userName.split(' ')[0]}!`
              : `Welcome${userName ? `, ${userName.split(' ')[0]}` : ''}!`}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isReturningUser
              ? 'How are you feeling today?'
              : "Let's create your neurodivergent-friendly profile"}
          </Text>
        </Animated.View>
      )}

      {/* Text Input - Normal mode */}
      {!conversationMode && (
        <Animated.View 
          style={[
            styles.textInputContainer, 
            { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: contentOpacity,
            }
          ]}
        >
          <TextInput
            ref={textInputRef}
            style={[styles.textInput, { color: colors.text }]}
            placeholder={isReturningUser ? "Share what's on your mind..." : "What's your name?"}
            placeholderTextColor={colors.textTertiary}
            value={isReturningUser ? thoughtInput : userName}
            onChangeText={isReturningUser ? setThoughtInput : setUserName}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            multiline={isReturningUser}
            numberOfLines={isReturningUser ? 3 : 1}
          />
          <Pressable
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
          >
            <IconSymbol name="arrow.right" size={24} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      {/* Expandable Text Input - Conversation mode */}
      {conversationMode && (
        <>
          <Animated.View 
            style={[
              styles.expandableInputContainer,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                height: inputHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 180],
                }),
                opacity: inputHeight,
              }
            ]}
          >
            <View style={styles.expandableHeader}>
              <Text style={[styles.expandableTitle, { color: colors.text }]}>
                How are you feeling?
              </Text>
              <Pressable onPress={toggleTextInput}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              ref={textInputRef}
              style={[styles.expandableInput, { color: colors.text }]}
              placeholder="Share what's on your mind..."
              placeholderTextColor={colors.textTertiary}
              value={thoughtInput}
              onChangeText={setThoughtInput}
              multiline
              numberOfLines={3}
              editable={!isProcessing}
            />
            <View style={styles.inputActions}>
              {/* Voice input button */}
              <Pressable
                style={[styles.voiceButton, { 
                  backgroundColor: isRecording ? colors.error : colors.surfaceElevated 
                }]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? (
                  <View style={styles.recordingIndicator}>
                    <IconSymbol name="stop.circle.fill" size={24} color="#FFFFFF" />
                    <Text style={styles.recordingTime}>{recordingDuration}s</Text>
                  </View>
                ) : (
                  <IconSymbol name="mic.fill" size={20} color={colors.text} />
                )}
              </Pressable>

              {/* Send button */}
              <Pressable
                style={[styles.sendButton, { 
                  backgroundColor: colors.primary,
                  opacity: isProcessing || !thoughtInput.trim() ? 0.5 : 1 
                }]}
                onPress={() => sendConversationMessage(thoughtInput, 'text')}
                disabled={isProcessing || !thoughtInput.trim()}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <IconSymbol name="paperplane.fill" size={20} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </Animated.View>

          {/* Floating Icon - Only show when collapsed */}
          {!isExpanded && (
            <Animated.View 
              style={[styles.floatingIcon, { opacity: contentOpacity }]}
            >
              <Pressable 
                style={[styles.floatingButton, { backgroundColor: colors.primary }]}
                onPress={toggleTextInput}
              >
                <IconSymbol name="text.bubble" size={28} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          )}
          
          {/* Close button - Always show in conversation mode */}
          <Animated.View 
            style={[styles.closeButtonContainer, { opacity: contentOpacity }]}
          >
            <Pressable 
              style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
            </Pressable>
          </Animated.View>
        </>
      )}

      {/* Skip Button - Only show in normal mode */}
      {!conversationMode && (
        <Animated.View style={[styles.skipContainer, { opacity: contentOpacity }]}>
          <Pressable onPress={handleContinue}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              {isReturningUser ? 'Continue to app →' : 'Skip for now →'}
            </Text>
          </Pressable>
          
          {/* Calm Breathing Session */}
          <Pressable 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: '/calm-session',
                params: {
                  protocol: 'meditation',
                  duration: '5',
                  fromWelcome: 'true'
                }
              });
            }}
            style={{ marginTop: 16 }}
          >
            <Text style={[styles.calmSessionText, { color: colors.primary }]}>
              🧘 Start a calm breathing session
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* AI Response Modal */}
      <Modal
        visible={showResponse}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResponse(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                AI Insights
              </Text>
              <Pressable onPress={() => setShowResponse(false)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {aiResponse && (
                <>
                  {/* Mood Score */}
                  <View style={styles.moodSection}>
                    <Text style={[styles.moodLabel, { color: colors.textSecondary }]}>
                      Mood Score
                    </Text>
                    <View style={styles.moodScoreContainer}>
                      <Text style={[styles.moodScore, { color: colors.primary }]}>
                        {aiResponse.moodScore}/10
                      </Text>
                    </View>
                  </View>

                  {/* AI Response */}
                  <View style={styles.responseSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      Response
                    </Text>
                    <Text style={[styles.responseText, { color: colors.text }]}>
                      {aiResponse.conversationalResponse}
                    </Text>
                  </View>

                  {/* Recommendations */}
                  {aiResponse.recommendations && aiResponse.recommendations.length > 0 && (
                    <View style={styles.recommendationsSection}>
                      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        Recommendations
                      </Text>
                      {aiResponse.recommendations.map((rec: string, index: number) => (
                        <View key={index} style={styles.recommendationItem}>
                          <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                          <Text style={[styles.recommendationText, { color: colors.text }]}>
                            {rec}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Conversation History */}
                  {conversationHistory.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        Recent Conversation
                      </Text>
                      {conversationHistory.slice(-4).map((turn, index) => (
                        <View 
                          key={index} 
                          style={[
                            styles.historyItem,
                            { backgroundColor: turn.role === 'user' ? colors.primaryLight : colors.surfaceElevated }
                          ]}
                        >
                          <Text style={[styles.historyRole, { color: colors.textSecondary }]}>
                            {turn.role === 'user' ? 'You' : 'AI'}
                          </Text>
                          <Text style={[styles.historyMessage, { color: colors.text }]}>
                            {turn.message}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <Pressable
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowResponse(false)}
            >
              <Text style={styles.modalCloseButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CalmSpacing.xl,
  },
  circleContainer: {
    position: 'relative',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CalmSpacing.xxl,
  },
  glowCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  mainCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 15,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: CalmSpacing.xxl,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: CalmSpacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.md,
    paddingHorizontal: CalmSpacing.lg,
    paddingVertical: CalmSpacing.md,
    borderRadius: 20,
    borderWidth: 2,
    width: width - CalmSpacing.xl * 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    minHeight: 44,
  },
  continueButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipContainer: {
    position: 'absolute',
    bottom: CalmSpacing.xl,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  calmSessionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  expandableInputContainer: {
    position: 'absolute',
    bottom: CalmSpacing.xxl + CalmSpacing.lg,
    width: width - CalmSpacing.xl * 2,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: CalmSpacing.lg,
    paddingVertical: CalmSpacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.sm,
  },
  expandableTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  expandableInput: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: CalmSpacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  floatingIcon: {
    position: 'absolute',
    bottom: CalmSpacing.xxl,
    alignSelf: 'center',
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: CalmSpacing.xl,
    right: CalmSpacing.lg, // Move to right side
    zIndex: 1000, // Ensure it's above other elements
  },
  closeButton: {
    width: 44, // Increased from 40 for better tap target
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputActions: {
    flexDirection: 'row',
    gap: CalmSpacing.sm,
    alignItems: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  recordingTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: CalmSpacing.lg,
    paddingTop: CalmSpacing.lg,
    paddingBottom: CalmSpacing.xxl,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    marginBottom: CalmSpacing.lg,
  },
  moodSection: {
    marginBottom: CalmSpacing.lg,
    alignItems: 'center',
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: CalmSpacing.sm,
  },
  moodScoreContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: CalmColors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodScore: {
    fontSize: 32,
    fontWeight: '700',
  },
  responseSection: {
    marginBottom: CalmSpacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: CalmSpacing.sm,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
  },
  recommendationsSection: {
    marginBottom: CalmSpacing.lg,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: CalmSpacing.sm,
    paddingLeft: CalmSpacing.sm,
  },
  bullet: {
    fontSize: 20,
    marginRight: CalmSpacing.sm,
    marginTop: -2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  historySection: {
    marginBottom: CalmSpacing.lg,
  },
  historyItem: {
    padding: CalmSpacing.md,
    borderRadius: 12,
    marginBottom: CalmSpacing.sm,
  },
  historyRole: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  historyMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalCloseButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
