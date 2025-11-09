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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth0 } from '@/lib/use-auth0';
import { apiClient } from '@/lib/api-client';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const { user } = useAuth0();

  const [userName, setUserName] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [thoughtInput, setThoughtInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(true);

  // Animation values
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;  useEffect(() => {
    checkReturningUser();
    startAnimations();
  }, []);

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

  const handleContinue = async () => {
    if (isReturningUser) {
      // Returning user - save thought/feeling and navigate
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (thoughtInput.trim()) {
        // TODO: Save thought to database for AI analysis
        console.log('User thought:', thoughtInput);
      }
      
      // Navigate to main app
      router.replace('/(tabs)');
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

      // Sync name to Auth0 user metadata
      try {
        const accessToken = await SecureStore.getItemAsync('auth0_access_token');
        if (accessToken) {
          await apiClient.updateUserName(accessToken, userName);
          console.log('✅ User name synced to Auth0');
        }
      } catch (error) {
        console.error('Failed to sync name to Auth0:', error);
        // Continue anyway - name is saved locally
      }
      
      // Navigate to main app
      router.replace('/(tabs)');
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

      {/* Welcome Text */}
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

      {/* Text Input */}
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
          placeholder={isReturningUser ? "Share what's on your mind..." : "What's your name?"}
          placeholderTextColor={colors.textTertiary}
          value={isReturningUser ? thoughtInput : userName}
          onChangeText={isReturningUser ? setThoughtInput : setUserName}
          autoFocus
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

      {/* Skip Button */}
      <Animated.View style={[styles.skipContainer, { opacity: contentOpacity }]}>
        <Pressable onPress={handleContinue}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {isReturningUser ? 'Continue to app →' : 'Skip for now →'}
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
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
