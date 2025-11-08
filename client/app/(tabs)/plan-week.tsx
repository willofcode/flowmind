import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';

type EnergyWindow = { start: string; end: string };

type UserProfile = {
  workoutLikes: string[];
  energyWindows: EnergyWindow[];
};

type PlanWeekPayload = {
  userProfile: UserProfile;
  weekStartISO: string;
  weekEndISO: string;
};

type PlanWeekResponse = Record<string, unknown>;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const STORAGE_KEY = 'plan-week:last-plan';

const defaultPayload: PlanWeekPayload = {
  userProfile: {
    workoutLikes: ['tennis', 'walks', 'weights'],
    energyWindows: [
      { start: '10:00', end: '12:00' },
      { start: '16:30', end: '18:00' },
    ],
  },
  weekStartISO: '2025-11-10T00:00:00Z',
  weekEndISO: '2025-11-17T00:00:00Z',
};

export default function PlanWeekScreen() {
  const [plan, setPlan] = useState<PlanWeekResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStoredPlan = async () => {
      const storedPlan = await SecureStore.getItemAsync(STORAGE_KEY);
      if (storedPlan) {
        try {
          setPlan(JSON.parse(storedPlan) as PlanWeekResponse);
        } catch {
          // stored state is invalid, clear it so future loads succeed
          await SecureStore.deleteItemAsync(STORAGE_KEY);
        }
      }
    };

    void loadStoredPlan();
  }, []);

  const planWeek = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/plan-week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultPayload),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as PlanWeekResponse;
      setPlan(data);
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title={isLoading ? 'Planning…' : 'Plan My Week'} onPress={planWeek} disabled={isLoading} />
      <Text style={styles.content}>
        {plan ? JSON.stringify(plan, null, 2) : 'No plan yet'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    padding: 24,
  },
  content: {
    fontFamily: 'Courier',
  },
  error: {
    color: 'red',
  },
});
