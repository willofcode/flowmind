/**
 * Profile Modal
 * User profile with Auth0 info and settings
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth0 } from '@/lib/use-auth0';

export default function ProfileModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const { user, logout, isLoading } = useAuth0();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            const result = await logout();
            
            if (result.success) {
              router.replace('/landing');
            } else {
              Alert.alert('Error', result.error || 'Failed to sign out');
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Change Password',
      'To change your password, please visit your Auth0 account settings or contact support.',
      [{ text: 'OK', style: 'cancel' }]
    );
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Profile Info */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        {/* Profile Picture */}
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          {user?.picture ? (
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <IconSymbol name="person.circle.fill" size={64} color="#FFFFFF" />
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'Guest User'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || 'No email'}
          </Text>
          {user?.email_verified && (
            <View style={styles.verifiedBadge}>
              <IconSymbol name="checkmark.seal.fill" size={16} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>
                Verified
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Account Settings
        </Text>

        {/* Change Password Button */}
        <Pressable
          style={[styles.settingButton, { backgroundColor: colors.surface }]}
          onPress={handleChangePassword}
          disabled={loggingOut}
        >
          <View style={styles.settingLeft}>
            <IconSymbol name="key.fill" size={24} color={colors.primary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              Change Password
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Logout Button */}
        <Pressable
          style={[styles.settingButton, styles.logoutButton, { backgroundColor: colors.surface }]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <View style={styles.settingLeft}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.error} />
            <Text style={[styles.settingText, { color: colors.error }]}>
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.error} />
        </Pressable>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
          FlowMind v1.0.0
        </Text>
        <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
          Neurodivergent-friendly planning app
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: CalmSpacing.lg,
    paddingBottom: CalmSpacing.xl * 2,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CalmSpacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  closeButton: {
    padding: CalmSpacing.xs,
  },
  profileCard: {
    borderRadius: 16,
    padding: CalmSpacing.xl,
    alignItems: 'center',
    marginBottom: CalmSpacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CalmSpacing.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: CalmSpacing.xs,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: CalmSpacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.xs,
    marginTop: CalmSpacing.xs,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingsSection: {
    marginBottom: CalmSpacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: CalmSpacing.md,
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: CalmSpacing.lg,
    borderRadius: 12,
    marginBottom: CalmSpacing.sm,
    minHeight: 60,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.md,
  },
  settingText: {
    fontSize: 18,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: CalmSpacing.md,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: CalmSpacing.xl,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: CalmSpacing.xs,
  },
  appDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
});

