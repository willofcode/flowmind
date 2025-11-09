/**
 * FlowMind Landing Page
 * Sign In / Sign Up Screen
 * Sleek, minimal design with calm aesthetics
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;

  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // Logo fade in and scale up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Content fade in
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      // Buttons slide up
      Animated.spring(buttonSlide, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth0-sign-in');
  };

  const handleSignUp = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth0-sign-in'); // Auth0 handles both sign in and sign up
  };

  const handleLearnMore = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('📖 Learn More pressed');
    // TODO: Open info modal or external link
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Background Accent - Using solid color with opacity */}
      <View
        style={[
          styles.gradientBackground,
          {
            backgroundColor: colorScheme === 'dark'
              ? 'rgba(74, 155, 175, 0.08)'
              : 'rgba(74, 155, 175, 0.05)',
          },
        ]}
      />

      {/* Logo Section */}
      <Animated.View
        style={[
          styles.logoSection,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <IconSymbol name="brain.head.profile" size={72} color="#FFFFFF" />
        </View>

        {/* App Name */}
        <Text style={[styles.appName, { color: colors.text }]}>FlowMind</Text>
        
        {/* Tagline */}
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Your neurodivergent-friendly
        </Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          planning companion
        </Text>
      </Animated.View>

      {/* Feature Pills */}
      <Animated.View style={[styles.featuresContainer, { opacity: contentOpacity }]}>
        <View style={[styles.featurePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
          <Text style={[styles.featureText, { color: colors.text }]}>ADHD-Aware Design</Text>
        </View>
        
        <View style={[styles.featurePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="brain" size={20} color={colors.primary} />
          <Text style={[styles.featureText, { color: colors.text }]}>AI-Powered Planning</Text>
        </View>
        
        <View style={[styles.featurePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="calendar.badge.clock" size={20} color={colors.warning} />
          <Text style={[styles.featureText, { color: colors.text }]}>Smart Scheduling</Text>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            opacity: contentOpacity,
            transform: [{ translateY: buttonSlide }],
          },
        ]}
      >
        {/* Sign Up Button (Primary) */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleSignUp}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <IconSymbol name="arrow.right.circle.fill" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Sign In Button (Secondary) */}
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleSignIn}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            I Already Have an Account
          </Text>
        </Pressable>

        {/* Learn More Link */}
        <Pressable
          style={({ pressed }) => [
            styles.learnMoreButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={handleLearnMore}
        >
          <Text style={[styles.learnMoreText, { color: colors.textSecondary }]}>
            Learn more about FlowMind
          </Text>
          <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
        </Pressable>
      </Animated.View>

      {/* Footer Note */}
      <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Designed for ADHD, autistic, and dyslexic users
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CalmSpacing.xl,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: CalmSpacing.xxl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: CalmSpacing.xl,
    // Soft shadow
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  appName: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: CalmSpacing.sm,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: CalmSpacing.sm,
    paddingHorizontal: CalmSpacing.md,
    marginBottom: CalmSpacing.xl,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.xs,
    paddingHorizontal: CalmSpacing.md,
    paddingVertical: CalmSpacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: CalmSpacing.md,
    paddingBottom: CalmSpacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CalmSpacing.sm,
    paddingVertical: CalmSpacing.lg,
    paddingHorizontal: CalmSpacing.xl,
    borderRadius: 16,
    minHeight: CalmSpacing.comfortableTouchTarget,
    // Soft shadow
    shadowColor: '#4A9BAF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: CalmSpacing.lg,
    paddingHorizontal: CalmSpacing.xl,
    borderRadius: 16,
    borderWidth: 2,
    minHeight: CalmSpacing.comfortableTouchTarget,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: CalmSpacing.xs,
    paddingVertical: CalmSpacing.md,
  },
  learnMoreText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: CalmSpacing.xl,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
