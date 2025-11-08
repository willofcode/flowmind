/**
 * Google OAuth Sign-In Screen
 * Handles authentication flow with Google
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
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

export default function SignInScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID,
    scopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });

  React.useEffect(() => {
    handleSignInResponse();
  }, [response]);

  const handleSignInResponse = async () => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        setLoading(true);
        try {
          // Store tokens
          await SecureStore.setItemAsync('google_access_token', authentication.accessToken);
          if (authentication.refreshToken) {
            await SecureStore.setItemAsync('google_refresh_token', authentication.refreshToken);
          }

          // Fetch user info
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${authentication.accessToken}` },
          });
          const userInfo = await userInfoResponse.json();

          // Store user info
          await SecureStore.setItemAsync('user_email', userInfo.email);
          await SecureStore.setItemAsync('user_name', userInfo.name || userInfo.email);
          await SecureStore.setItemAsync('user_id', userInfo.id);

          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Navigate to welcome/profile creation
          router.replace('/welcome');
        } catch (err) {
          console.error('Sign in error:', err);
          Alert.alert('Sign In Failed', 'Please try again');
          setLoading(false);
        }
      }
    } else if (response?.type === 'error') {
      Alert.alert('Authentication Error', 'Please try again');
    }
  };

  const handleGoogleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      console.error('Prompt error:', err);
      Alert.alert('Sign In Failed', 'Please try again');
      setLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <Pressable onPress={handleBack} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={28} color={colors.text} />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <IconSymbol name="person.crop.circle.fill" size={64} color="#FFFFFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sign in to continue your journey
        </Text>
      </View>

      {/* Sign In Button */}
      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            {
              backgroundColor: '#FFFFFF',
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading || !request}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <IconSymbol name="g.circle.fill" size={24} color="#4285F4" />
              <Text style={[styles.googleButtonText, { color: '#000000' }]}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.infoText, { color: colors.textTertiary }]}>
          We'll access your Google Calendar to help schedule your day
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CalmSpacing.xl,
  },
  backButton: {
    paddingTop: CalmSpacing.xl + 20,
    paddingBottom: CalmSpacing.lg,
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: CalmSpacing.xxl,
    paddingBottom: CalmSpacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: CalmSpacing.lg,
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: CalmSpacing.sm,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: CalmSpacing.lg,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CalmSpacing.md,
    paddingVertical: CalmSpacing.lg,
    paddingHorizontal: CalmSpacing.xl,
    borderRadius: 16,
    minHeight: CalmSpacing.comfortableTouchTarget,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: CalmSpacing.lg,
  },
  footer: {
    paddingBottom: CalmSpacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
