/**
 * Manages 10-3-1 minute nudge notifications
 * Respects sensory preferences (haptics-only, silent mode)
 */

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { NudgeSchedule, PersonalNeuroProfile } from '@/types/neuro-profile';

// Configure notification behavior
interface SensoryPreferences {
    silentMode?: boolean;
    hapticsOnly?: boolean;
}

interface NotificationContentData {
    sensory?: SensoryPreferences;
    eventId?: string;
    eventType?: string;
    minutesBefore?: number;
}

Notifications.setNotificationHandler({
    handleNotification: async (
        notification: Notifications.Notification
    ): Promise<Notifications.NotificationBehavior> => {
        const sensory = (notification.request.content.data as NotificationContentData)?.sensory;

        return {
            shouldShowAlert: !Boolean(sensory?.silentMode),
            shouldPlaySound: !Boolean(sensory?.hapticsOnly) && !Boolean(sensory?.silentMode),
            shouldSetBadge: false,
            shouldShowBanner: !Boolean(sensory?.silentMode),
            shouldShowList: !Boolean(sensory?.silentMode),
        };
    },
});

export class NotificationManager {
  private static instance: NotificationManager;
  private nudgeSchedules: Map<string, NudgeSchedule> = new Map();

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Schedule 10-3-1 minute nudges for an event
   */
  async scheduleNudges(
    eventId: string,
    eventType: 'workout' | 'dinner',
    eventTitle: string,
    eventStartISO: string,
    microSteps: string[],
    sensory: PersonalNeuroProfile['sensory']
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    const eventStart = new Date(eventStartISO);
    const nudgeTimes = [10, 3, 1]; // minutes before
    const nudges: NudgeSchedule['nudges'] = [];

    for (const minutesBefore of nudgeTimes) {
      const nudgeTime = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);
      
      // Don't schedule past nudges
      if (nudgeTime <= new Date()) {
        continue;
      }

      const message = this.createNudgeMessage(
        minutesBefore,
        eventType,
        eventTitle,
        microSteps
      );

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: sensory.silentMode ? '' : `${minutesBefore} min: ${eventTitle}`,
          body: sensory.silentMode ? '' : message,
          data: {
            eventId,
            eventType,
            minutesBefore,
            sensory,
          },
          sound: sensory.hapticsOnly || sensory.silentMode ? undefined : 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nudgeTime,
        },
      });

      nudges.push({
        time: nudgeTime.toISOString(),
        minutesBefore,
        message,
        delivered: false,
      });

      console.log(`Scheduled nudge for ${eventTitle} at ${nudgeTime.toISOString()}`);
    }

    this.nudgeSchedules.set(eventId, {
      eventId,
      eventType,
      nudges,
    });
  }

  private createNudgeMessage(
    minutesBefore: number,
    eventType: 'workout' | 'dinner',
    eventTitle: string,
    microSteps: string[]
  ): string {
    const step = microSteps[0] || 'Get ready';
    
    if (minutesBefore === 10) {
      return `Starting soon. ${step}`;
    } else if (minutesBefore === 3) {
      return `3 minutes. ${step}`;
    } else {
      return `1 minute. ${step}`;
    }
  }

  async cancelNudges(eventId: string): Promise<void> {
    // Cancel all scheduled notifications for this event
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (n) => n.content.data?.eventId === eventId
    );

    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    this.nudgeSchedules.delete(eventId);
  }

  async cancelAllNudges(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.nudgeSchedules.clear();
  }

  /**
   * Trigger haptic feedback for nudges
   */
  async triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      if (style === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (style === 'heavy') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }

  /**
   * Listen to notification responses
   */
  addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationManager = NotificationManager.getInstance();
