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
}

export const apiClient = new ApiClient(API_BASE_URL);
