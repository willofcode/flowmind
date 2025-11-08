/**
 * Core data models for neurodivergent-friendly planning
 */

export interface EnergyWindow {
  start: string; // HH:MM format
  end: string;
}

export interface SensoryPreferences {
  reducedAnimation: boolean;
  hapticsOnly: boolean;
  lowContrastText: boolean;
  silentMode: boolean;
}

export interface BufferPolicy {
  before: number; // minutes
  after: number;
}

export interface DietPreferences {
  style: string; // e.g., "Mediterranean", "Plant-based"
  avoid: string[];
  preferences?: string[];
}

export interface SleepSchedule {
  usualBed: string; // HH:MM format
  usualWake: string;
}

export interface PersonalNeuroProfile {
  userId?: string;
  workoutLikes: string[];
  diet: DietPreferences;
  sleep: SleepSchedule;
  energyWindows: EnergyWindow[];
  focusBlockMin: number;
  breakMin: number;
  maxWorkoutMin: number;
  sensory: SensoryPreferences;
  nudgeStyle: 'gentle' | 'standard' | 'minimal';
  bufferPolicy: BufferPolicy;
  voicePreference?: {
    enabled: boolean;
    gender?: 'male' | 'female' | 'neutral';
    rate?: number; // 0.5 to 2.0
  };
}

export interface WorkoutBlock {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  title: string;
  durationMin: number;
  steps: string[];
  alternativeOption?: {
    title: string;
    durationMin: number;
    steps: string[];
  };
}

export interface DinnerBlock {
  date: string;
  start: string;
  end: string;
  name: string;
  ingredients: Ingredient[];
  steps: string[];
  prepTimeMin: number;
  cookTimeMin: number;
}

export interface Ingredient {
  item: string;
  qty: number;
  unit: string;
}

export interface GroceryItem {
  item: string;
  totalQty: number;
  unit: string;
  category?: string;
}

export interface TimePlan {
  workoutBlocks: Array<{
    date: string;
    start: string;
    end: string;
  }>;
  dinnerBlocks: Array<{
    date: string;
    start: string;
    end: string;
  }>;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  timePlan: TimePlan;
  workoutPlan: WorkoutBlock[];
  dinnerPlan: DinnerBlock[];
  groceryList: GroceryItem[];
  generatedAt: string;
}

export interface MicroStep {
  id: string;
  description: string;
  estimatedMin: number;
  completed: boolean;
}

export interface NudgeSchedule {
  eventId: string;
  eventType: 'workout' | 'dinner';
  nudges: Array<{
    time: string; // ISO timestamp
    minutesBefore: number; // 10, 3, or 1
    message: string;
    delivered: boolean;
  }>;
}

export interface TodayBlock {
  id: string;
  type: 'workout' | 'dinner';
  title: string;
  start: string; // ISO timestamp
  end: string;
  microSteps: MicroStep[];
  alternativeOption?: {
    title: string;
    microSteps: MicroStep[];
  };
  status: 'upcoming' | 'in-progress' | 'completed' | 'skipped';
}
