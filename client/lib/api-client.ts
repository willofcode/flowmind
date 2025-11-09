/**
 * API client for backend communication
 */

import { PersonalNeuroProfile, WeeklyPlan } from '@/types/neuro-profile';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export interface PlanWeekRequest {
  userProfile: PersonalNeuroProfile;
  weekStartISO: string;
  weekEndISO: string;
  accessToken?: string; // Google Calendar access token
}

export interface CalendarEvent {
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
  reminders?: {
    method: 'popup' | 'email';
    minutes: number;
  }[];
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async planWeek(request: PlanWeekRequest): Promise<WeeklyPlan> {
    const response = await fetch(`${this.baseURL}/plan-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to plan week: ${response.statusText}`);
    }

    return response.json();
  }

  async getFreeBusy(
    accessToken: string,
    timeMin: string,
    timeMax: string
  ): Promise<any> {
    const response = await fetch(`${this.baseURL}/freebusy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, timeMin, timeMax }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get free/busy: ${response.statusText}`);
    }

    return response.json();
  }

  async createCalendarEvents(
    accessToken: string,
    events: CalendarEvent[]
  ): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/create-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, events }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create events: ${response.statusText}`);
    }

    return response.json();
  }

  async saveProfileToServer(profile: PersonalNeuroProfile, userId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, profile }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save profile: ${response.statusText}`);
    }
  }

  async loadProfileFromServer(userId: string): Promise<PersonalNeuroProfile | null> {
    const response = await fetch(`${this.baseURL}/profile/${userId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load profile: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Call NeuralSeek Seek endpoint for knowledge base queries
   */
  async seek(question: string, context?: any): Promise<any> {
    const response = await fetch(`${this.baseURL}/seek`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    });

    if (!response.ok) {
      throw new Error(`Failed to call Seek: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Call NeuralSeek mAIstro endpoint for AI agent interactions
   */
  async mAIstro(prompt: string, context?: any, parameters?: any): Promise<any> {
    const response = await fetch(`${this.baseURL}/maistro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context, parameters }),
    });

    if (!response.ok) {
      throw new Error(`Failed to call mAIstro: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update user name in Auth0 user metadata
   */
  async updateUserName(accessToken: string, name: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/update-user-name`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user name: ${response.statusText}`);
    }
  }

  /**
   * Create or update user in Supabase database
   */
  async createOrUpdateUser(email: string, name: string, auth0_sub: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name, auth0_sub }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create/update user: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update user profile (display name and preferences)
   */
  async updateUserProfile(userId: string, displayName: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/users/${userId}/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ display_name: displayName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user profile: ${response.statusText}`);
    }

    return response.json();
  }
  
  // ============================================================================
  // Calendar Optimization API
  // ============================================================================
  
  /**
   * Run agentic calendar optimization workflow
   * Analyzes schedule, mood, and generates optimized activities
   */
  async optimizeCalendar(
    userId: string,
    accessToken: string,
    targetDate?: Date
  ): Promise<{
    success: boolean;
    optimizationId: string;
    summary: {
      assessment: string;
      scheduleIntensity: {
        level: 'low' | 'medium' | 'high';
        ratio: number;
        busyMinutes: number;
        totalMinutes: number;
      };
      moodScore: number;
      energyLevel: string;
      totalGaps: number;
      actionsPlanned: number;
      eventsCreated: number;
      errors: number;
    };
    createdEvents: any[];
    recommendations: string[];
    errors?: any[];
  }> {
    const response = await fetch(`${this.baseURL}/calendar/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        accessToken, 
        targetDate: targetDate?.toISOString() 
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Calendar optimization failed: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Analyze schedule without making changes
   * Preview what optimization would do
   */
  async analyzeSchedule(
    userId: string,
    accessToken: string,
    targetDate?: Date
  ): Promise<{
    date: string;
    scheduleIntensity: {
      level: 'low' | 'medium' | 'high';
      ratio: number;
      busyMinutes: number;
      totalMinutes: number;
    };
    gaps: Array<{
      start: string;
      end: string;
      minutes: number;
      startTime: string;
      endTime: string;
      inEnergyWindow: boolean;
    }>;
    recommendations: string[];
    summary: {
      totalBusyBlocks: number;
      totalGaps: number;
      totalAvailableMinutes: number;
      energyPeakGaps: number;
    };
  }> {
    const response = await fetch(`${this.baseURL}/calendar/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        accessToken, 
        targetDate: targetDate?.toISOString() 
      }),
    });

    if (!response.ok) {
      throw new Error(`Schedule analysis failed: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Get optimization history
   */
  async getOptimizationHistory(
    userId: string,
    limit: number = 10
  ): Promise<{
    history: any[];
    count: number;
  }> {
    const response = await fetch(
      `${this.baseURL}/calendar/optimization-history?userId=${userId}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get optimization history: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Manually create a specific activity in calendar
   */
  async createManualActivity(
    accessToken: string,
    activityType: 'breathing' | 'movement' | 'meal' | 'workout',
    startISO: string,
    duration?: number
  ): Promise<{
    success: boolean;
    event: any;
  }> {
    const response = await fetch(`${this.baseURL}/calendar/manual-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        accessToken, 
        activityType, 
        startISO, 
        duration 
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create manual activity: ${response.statusText}`);
    }

    return response.json();
  }
  
  // ============================================================================
  // Calendar Sync API
  // ============================================================================
  
  /**
   * Manually trigger calendar sync
   * Detects changes from external sources (user edits, other apps)
   */
  async syncCalendar(
    userId: string,
    accessToken: string
  ): Promise<{
    success: boolean;
    changes: {
      added: Array<{ id: string; summary: string }>;
      modified: Array<{ id: string; summary: string }>;
      deleted: Array<{ id: string }>;
    };
    syncToken: string;
    hasMore: boolean;
    recommendReoptimization: boolean;
  }> {
    const response = await fetch(`${this.baseURL}/calendar-sync/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, accessToken }),
    });

    if (!response.ok) {
      throw new Error(`Calendar sync failed: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Set up Google Calendar push notifications
   */
  async watchCalendar(
    userId: string,
    accessToken: string,
    webhookUrl: string
  ): Promise<{
    success: boolean;
    channelId: string;
    resourceId: string;
    expiration: number;
  }> {
    const response = await fetch(`${this.baseURL}/calendar-sync/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, accessToken, webhookUrl }),
    });

    if (!response.ok) {
      throw new Error(`Watch calendar failed: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Stop watching calendar
   */
  async unwatchCalendar(
    accessToken: string,
    channelId: string,
    resourceId: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseURL}/calendar-sync/unwatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, channelId, resourceId }),
    });

    if (!response.ok) {
      throw new Error(`Unwatch calendar failed: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Get recent calendar changes
   */
  async getCalendarChanges(userId: string): Promise<{
    changes: any[];
    count: number;
  }> {
    const response = await fetch(
      `${this.baseURL}/calendar-sync/changes?userId=${userId}`
    );

    if (!response.ok) {
      throw new Error(`Get changes failed: ${response.statusText}`);
    }

    return response.json();
  }
  
  /**
   * Check if re-optimization is recommended
   */
  async checkReoptimization(userId: string): Promise<{
    shouldReoptimize: boolean;
    reason: string;
  }> {
    const response = await fetch(
      `${this.baseURL}/calendar-sync/should-reoptimize?userId=${userId}`
    );

    if (!response.ok) {
      throw new Error(`Check re-optimize failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
