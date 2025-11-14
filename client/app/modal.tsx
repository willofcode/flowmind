/**
 * Profile Modal
 * User profile with Google Sign-In info, active hours settings, and account management
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CalmColors, CalmSpacing } from '@/constants/calm-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCurrentCalendarUser, signOutFromGoogleCalendar, isSignedInToGoogleCalendar } from '@/lib/google-calendar-auth';
import { loadProfile, saveProfile } from '@/lib/profile-store';
import { PersonalNeuroProfile } from '@/types/neuro-profile';

export default function ProfileModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? CalmColors.dark : CalmColors.light;
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  
  // Active hours state
  const [profile, setProfile] = useState<PersonalNeuroProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeHours, setActiveHours] = useState(16);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [bedTime, setBedTime] = useState('23:00');

  // Load user data on mount
  useEffect(() => {
    loadUserData();
    checkCalendarConnection();
    loadUserProfile();
  }, []);

  // Calculate active hours from wake/bed time
  useEffect(() => {
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [bedHour, bedMin] = bedTime.split(':').map(Number);
    
    let totalMinutes = (bedHour * 60 + bedMin) - (wakeHour * 60 + wakeMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
    
    const hours = Math.round(totalMinutes / 60);
    setActiveHours(hours);
  }, [wakeTime, bedTime]);

  const loadUserData = async () => {
    try {
      const isSignedIn = await isSignedInToGoogleCalendar();
      if (isSignedIn) {
        const userData = await getCurrentCalendarUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const savedProfile = await loadProfile();
      if (savedProfile) {
        setProfile(savedProfile);
        
        // Load from sleep schedule if available
        if (savedProfile.sleep) {
          setWakeTime(savedProfile.sleep.usualWake || '07:00');
          setBedTime(savedProfile.sleep.usualBed || '23:00');
        } else if (savedProfile.activeHours?.dailyActiveHours) {
          setActiveHours(savedProfile.activeHours.dailyActiveHours);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const checkCalendarConnection = async () => {
    const connected = await SecureStore.getItemAsync('google_calendar_connected');
    setCalendarConnected(connected === 'true');
  };

  const handleSaveActiveHours = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      const updatedProfile: PersonalNeuroProfile = {
        ...profile!,
        sleep: {
          usualWake: wakeTime,
          usualBed: bedTime,
        },
        activeHours: {
          dailyActiveHours: activeHours,
          customSchedule: {
            enabled: false,
          },
        },
      };

      // Save locally
      await saveProfile(updatedProfile);
      setProfile(updatedProfile);

      // TODO: Sync to server when profile API endpoint is implemented
      // if (profile.userId) {
      //   await apiClient.saveProfile(updatedProfile);
      // }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Settings Saved ✓',
        `Your active hours (${activeHours}h, ${wakeTime}-${bedTime}) have been updated. Activities will now be scheduled during your waking hours.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Could not save your settings. Please try again.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

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
            try {
              setLoggingOut(true);
              await signOutFromGoogleCalendar();
              router.replace('/landing');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
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
      'Manage Account',
      'To change your password or manage your account, please visit your Google Account settings at myaccount.google.com',
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

      {/* Calendar Status */}
      {calendarConnected && (
        <View style={[styles.calendarStatusCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
          <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
          <Text style={[styles.calendarStatusText, { color: colors.text }]}>
            ✓ Google Calendar connected - AI planning active
          </Text>
        </View>
      )}

      {/* Active Hours Settings */}
      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Your Schedule
        </Text>

        {/* Active Hours Card */}
        <View style={[styles.activeHoursCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            ⏰ Active Hours
          </Text>
          <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
            Set your wake and bed times for accurate scheduling
          </Text>

          {/* Time Pickers */}
          <View style={styles.timePickerRow}>
            <View style={styles.timePicker}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Wake Time
              </Text>
              <Pressable
                style={[styles.timeButton, { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    'Set Wake Time',
                    'Choose your typical wake time',
                    [
                      { text: '5:00 AM', onPress: () => setWakeTime('05:00') },
                      { text: '6:00 AM', onPress: () => setWakeTime('06:00') },
                      { text: '7:00 AM', onPress: () => setWakeTime('07:00') },
                      { text: '8:00 AM', onPress: () => setWakeTime('08:00') },
                      { text: '9:00 AM', onPress: () => setWakeTime('09:00') },
                      { text: '10:00 AM', onPress: () => setWakeTime('10:00') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={[styles.timeButtonText, { color: colors.text }]}>
                  {wakeTime}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.timeSeparator, { color: colors.textSecondary }]}>
              →
            </Text>

            <View style={styles.timePicker}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Bed Time
              </Text>
              <Pressable
                style={[styles.timeButton, { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    'Set Bed Time',
                    'Choose your typical bed time',
                    [
                      { text: '9:00 PM', onPress: () => setBedTime('21:00') },
                      { text: '10:00 PM', onPress: () => setBedTime('22:00') },
                      { text: '11:00 PM', onPress: () => setBedTime('23:00') },
                      { text: '12:00 AM', onPress: () => setBedTime('00:00') },
                      { text: '1:00 AM', onPress: () => setBedTime('01:00') },
                      { text: '2:00 AM', onPress: () => setBedTime('02:00') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={[styles.timeButtonText, { color: colors.text }]}>
                  {bedTime}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Calculated Active Hours */}
          <View style={[styles.activeHoursPreview, { backgroundColor: colors.background }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              Active hours per day:
            </Text>
            <Text style={[styles.previewValue, { color: colors.primary }]}>
              {activeHours} hours
            </Text>
          </View>

          {/* Quick Presets */}
          <Text style={[styles.presetsLabel, { color: colors.textSecondary }]}>
            Quick Presets:
          </Text>
          <View style={styles.presetGrid}>
            {[
              { label: 'Early Bird', wake: '06:00', bed: '22:00' },
              { label: 'Standard', wake: '07:00', bed: '23:00' },
              { label: 'Night Owl', wake: '09:00', bed: '01:00' },
            ].map((preset) => (
              <Pressable
                key={preset.label}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: 
                      wakeTime === preset.wake && bedTime === preset.bed
                        ? colors.primary
                        : colors.background,
                    borderColor: 
                      wakeTime === preset.wake && bedTime === preset.bed
                        ? colors.primary
                        : colors.border,
                  },
                ]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWakeTime(preset.wake);
                  setBedTime(preset.bed);
                }}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    {
                      color: 
                        wakeTime === preset.wake && bedTime === preset.bed
                          ? '#FFFFFF'
                          : colors.text,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                opacity: saving ? 0.6 : 1,
              },
            ]}
            onPress={handleSaveActiveHours}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Active Hours'}
            </Text>
          </Pressable>
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
  calendarStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalmSpacing.md,
    padding: CalmSpacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: CalmSpacing.lg,
  },
  calendarStatusText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
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
  // Active Hours Settings Styles
  activeHoursCard: {
    padding: CalmSpacing.lg,
    borderRadius: 16,
    marginBottom: CalmSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: CalmSpacing.xs,
  },
  cardSubtext: {
    fontSize: 14,
    marginBottom: CalmSpacing.lg,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: CalmSpacing.lg,
  },
  timePicker: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: CalmSpacing.xs,
  },
  timeButton: {
    paddingVertical: CalmSpacing.md,
    paddingHorizontal: CalmSpacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  timeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    marginHorizontal: CalmSpacing.md,
  },
  activeHoursPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: CalmSpacing.md,
    borderRadius: 12,
    marginBottom: CalmSpacing.lg,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  presetsLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: CalmSpacing.sm,
  },
  presetGrid: {
    flexDirection: 'row',
    gap: CalmSpacing.sm,
    marginBottom: CalmSpacing.lg,
  },
  presetButton: {
    flex: 1,
    paddingVertical: CalmSpacing.sm,
    paddingHorizontal: CalmSpacing.md,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: CalmSpacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

