/**
 * Auth0 Sign-In Screen
 * Simple, neurodivergent-friendly authentication
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth0 } from '@/lib/use-auth0';

export default function Auth0SignInScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const { login, isLoading } = useAuth0();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSignIn = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsAuthenticating(true);

      const result = await login();

      if (result.success) {
        // Navigate to welcome screen for profile setup
        router.replace('/welcome');
      } else if (!result.cancelled) {
        // Show error only if user didn't cancel
        Alert.alert(
          'Sign In Failed',
          result.error || 'Unable to sign in. Please try again.',
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={handleBack}>
        <IconSymbol name="chevron.left" size={28} color={colors.text} />
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <IconSymbol name="brain.head.profile" size={60} color="#FFFFFF" />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Welcome to FlowMind
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sign in to access your neurodivergent-friendly planning tools
        </Text>

        {/* Sign In Button */}
        <Pressable
          style={({ pressed }) => [
            styles.signInButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isAuthenticating ? 0.8 : 1,
            },
          ]}
          onPress={handleSignIn}
          disabled={isAuthenticating || isLoading}
        >
          {isAuthenticating || isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <IconSymbol name="lock.shield" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Sign In with Auth0</Text>
            </>
          )}
        </Pressable>

        {/* Info Text */}
        <Text style={[styles.infoText, { color: colors.textTertiary }]}>
          Secure authentication powered by Auth0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: CalmSpacing.lg,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CalmSpacing.xl,
    gap: CalmSpacing.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CalmSpacing.md,
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: CalmSpacing.md,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CalmSpacing.md,
    paddingVertical: CalmSpacing.lg,
    paddingHorizontal: CalmSpacing.xl,
    borderRadius: 16,
    marginTop: CalmSpacing.xl,
    minWidth: 240,
    minHeight: 56,
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: CalmSpacing.md,
  },
});
