/**
 * Local storage manager for user neuro profile
 * Uses expo-secure-store for sensitive data
 */

import * as SecureStore from 'expo-secure-store';
import { PersonalNeuroProfile } from '@/types/neuro-profile';

const PROFILE_KEY = 'neuro-profile';

export const defaultProfile: PersonalNeuroProfile = {
  workoutLikes: ['walks', 'stretching', 'yoga'],
  diet: {
    style: 'Mediterranean',
    avoid: ['fried', 'very spicy'],
  },
  sleep: {
    usualBed: '23:30',
    usualWake: '07:30',
  },
  activeHours: {
    dailyActiveHours: 16, // Default: 16 waking hours (24 - 8 sleep)
    customSchedule: {
      enabled: false,
    },
  },
  energyWindows: [
    { start: '10:00', end: '12:00' },
    { start: '16:30', end: '18:00' },
  ],
  focusBlockMin: 25,
  breakMin: 5,
  maxWorkoutMin: 40,
  sensory: {
    reducedAnimation: true,
    hapticsOnly: true,
    lowContrastText: false,
    silentMode: false,
  },
  nudgeStyle: 'gentle',
  bufferPolicy: {
    before: 10,
    after: 10,
  },
  voicePreference: {
    enabled: true,
    gender: 'neutral',
    rate: 1.0,
  },
};

export async function saveProfile(profile: PersonalNeuroProfile): Promise<void> {
  try {
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save profile:', error);
    throw new Error('Could not save your profile');
  }
}

export async function loadProfile(): Promise<PersonalNeuroProfile | null> {
  try {
    const stored = await SecureStore.getItemAsync(PROFILE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PersonalNeuroProfile;
  } catch (error) {
    console.error('Failed to load profile:', error);
    return null;
  }
}

export async function updateProfile(
  updates: Partial<PersonalNeuroProfile>
): Promise<PersonalNeuroProfile> {
  const current = await loadProfile();
  const updated = { ...(current || defaultProfile), ...updates };
  await saveProfile(updated);
  return updated;
}

export async function clearProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}
