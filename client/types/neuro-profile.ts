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

/**
 * Task types for the 3-tab UX
 */
export type TaskType = 'WORKOUT' | 'MEAL' | 'BREATHING' | 'OTHER';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface DayTask {
  id: string;
  type: TaskType;
  title: string;
  startTime: string; // "HH:mm" format
  endTime: string;
  status: TaskStatus;
  durationSec: number;
  isBreathing?: boolean; // true for breathing/calm tasks
  description?: string;
  icon?: string; // icon name for display
}

/**
 * Navigation types for Bottom Tabs
 */
export type RootTabParamList = {
  index: undefined; // Home
  today: undefined;
  explore: undefined;
  'plan-week': undefined;
};

/**
 * Schedule grid types
 */
export interface DayCell {
  date: string; // YYYY-MM-DD
  label: string; // 'Mon', 'Tue', etc.
  events: ScheduleEvent[];
}

export interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;
  type: TaskType;
  date: string; // YYYY-MM-DD
}

/**
 * Streak tracking
 */
export interface StreakData {
  currentStreak: number; // consecutive days
  longestStreak: number;
  lastCompletedDate: string; // YYYY-MM-DD
  totalCompleted: number;
}
