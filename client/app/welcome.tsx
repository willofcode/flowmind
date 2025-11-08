/**
 * Welcome Screen - Animated Profile Creation
 * Shows after successful sign-in with psychic circle animation
 * Voice-enabled profile setup
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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  const [userName, setUserName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Animation values
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserName();
    startAnimations();
    requestAudioPermissions();
  }, []);

  const loadUserName = async () => {
    const name = await SecureStore.getItemAsync('user_name');
    if (name) {
      setUserName(name);
    }
  };

  const requestAudioPermissions = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (err) {
      console.log('Audio permission error:', err);
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
    ]).start();

    // Content fade in
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Continuous pulse animation
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

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(74, 155, 175, 0.2)', 'rgba(122, 207, 125, 0.4)'],
  });

  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Recording Error', 'Please enable microphone access');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('🎤 Recording stopped:', uri);
      
      // TODO: Send to speech-to-text API
      Alert.alert(
        'Voice Recorded',
        'Voice profile creation coming soon! Please use text input for now.',
        [{ text: 'OK', onPress: () => setShowTextInput(true) }]
      );
      
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleContinue = async () => {
    if (!userName.trim()) {
      Alert.alert('Name Required', 'Please tell us your name to continue');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Save profile completion flag
    await SecureStore.setItemAsync('profile_completed', 'true');
    await SecureStore.setItemAsync('user_name', userName);

    // Navigate to main app
    router.replace('/(tabs)');
  };

  const toggleTextInput = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTextInput(!showTextInput);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Psychic Circle */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: glowColor,
              transform: [{ scale: pulseAnim }],
              opacity: circleOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.mainCircle,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: circleScale }],
              opacity: circleOpacity,
            },
          ]}
        >
          <IconSymbol name="brain.head.profile" size={80} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Welcome Text */}
      <Animated.View style={[styles.textContainer, { opacity: contentOpacity }]}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>
          Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Let's create your neurodivergent-friendly profile
        </Text>
      </Animated.View>

      {/* Voice Recording Button */}
      {!showTextInput && (
        <Animated.View style={[styles.voiceSection, { opacity: contentOpacity }]}>
          <Pressable
            style={({ pressed }) => [
              styles.voiceButton,
              {
                backgroundColor: isRecording ? colors.error : colors.primary,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <IconSymbol 
              name={isRecording ? "mic.fill" : "mic"} 
              size={48} 
              color="#FFFFFF" 
            />
          </Pressable>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {isRecording ? 'Release to stop' : 'Hold to speak'}
          </Text>
        </Animated.View>
      )}

      {/* Text Input (Floating) */}
      {showTextInput && (
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
            style={[styles.textInput, { color: colors.text }]}
            placeholder="What's your name?"
            placeholderTextColor={colors.textTertiary}
            value={userName}
            onChangeText={setUserName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          <Pressable
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            onPress={handleContinue}
          >
            <IconSymbol name="arrow.right" size={24} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      {/* Text Input Toggle Button (Floating Bottom Right) */}
      <Animated.View style={[styles.floatingButton, { opacity: contentOpacity }]}>
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={toggleTextInput}
        >
          <IconSymbol 
            name={showTextInput ? "mic" : "keyboard"} 
            size={24} 
            color={colors.text} 
          />
        </Pressable>
      </Animated.View>

      {/* Skip Button */}
      <Animated.View style={[styles.skipContainer, { opacity: contentOpacity }]}>
        <Pressable onPress={handleContinue}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip for now →
          </Text>
        </Pressable>
      </Animated.View>
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
  voiceSection: {
    alignItems: 'center',
    gap: CalmSpacing.lg,
  },
  voiceButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
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
  floatingButton: {
    position: 'absolute',
    bottom: CalmSpacing.xl + 60,
    right: CalmSpacing.xl,
  },
  toggleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  skipContainer: {
    position: 'absolute',
    bottom: CalmSpacing.xl,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
