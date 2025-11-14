/**
 * Mood Calculator - Adaptive mood metrics based on schedule intensity
 * Calculates mood score, energy level, and stress level by comparing
 * yesterday's and today's schedule intensity patterns
 */

interface ScheduleIntensityData {
  level: 'high' | 'medium' | 'low';
  ratio: number; // 0.0 to 1.0
  busyMinutes: number;
  totalMinutes: number;
}

interface MoodMetrics {
  moodScore: number; // 1-10
  energyLevel: 'high' | 'moderate' | 'low';
  stressLevel: 'high' | 'moderate' | 'low';
  reasoning: string;
}

/**
 * Calculate mood metrics based on schedule intensity patterns
 * 
 * Logic:
 * - High intensity yesterday + high today = Low mood, low energy, high stress (burnout pattern)
 * - Low intensity yesterday + high today = Moderate mood, high energy, moderate stress (ready to work)
 * - High intensity yesterday + low today = High mood, moderate energy, low stress (recovery day)
 * - Low intensity consistently = High mood, high energy, low stress (optimal state)
 * - Medium intensity = Balanced metrics
 */
export function calculateMoodFromSchedule(
  yesterdayIntensity: ScheduleIntensityData | null,
  todayIntensity: ScheduleIntensityData
): MoodMetrics {
  
  // Default baseline (no historical data)
  if (!yesterdayIntensity) {
    return calculateMoodFromSingleDay(todayIntensity);
  }
  
  const yesterdayRatio = yesterdayIntensity.ratio;
  const todayRatio = todayIntensity.ratio;
  
  // Pattern detection
  const isConsistentHigh = yesterdayIntensity.level === 'high' && todayIntensity.level === 'high';
  const isConsistentLow = yesterdayIntensity.level === 'low' && todayIntensity.level === 'low';
  const isRecoveryDay = yesterdayIntensity.level === 'high' && todayIntensity.level === 'low';
  const isRampingUp = yesterdayIntensity.level === 'low' && todayIntensity.level === 'high';
  const isBalanced = yesterdayIntensity.level === 'medium' && todayIntensity.level === 'medium';
  
  let moodScore: number;
  let energyLevel: 'high' | 'moderate' | 'low';
  let stressLevel: 'high' | 'moderate' | 'low';
  let reasoning: string;
  
  if (isConsistentHigh) {
    // BURNOUT PATTERN: High intensity 2 days in a row
    moodScore = Math.max(3, 7 - Math.floor((yesterdayRatio + todayRatio) * 5)); // 3-5 range
    energyLevel = 'low';
    stressLevel = 'high';
    reasoning = 'Consistent high schedule intensity detected. Burnout risk - need rest and breathing breaks.';
    
  } else if (isRecoveryDay) {
    // RECOVERY PATTERN: High yesterday, light today
    moodScore = Math.min(10, 6 + Math.floor((1 - todayRatio) * 4)); // 6-9 range
    energyLevel = 'moderate';
    stressLevel = 'low';
    reasoning = 'Recovery day after busy period. Good opportunity for self-care and wellness activities.';
    
  } else if (isRampingUp) {
    // READY PATTERN: Light yesterday, busy today
    moodScore = Math.min(9, 6 + Math.floor((1 - yesterdayRatio) * 3)); // 6-8 range
    energyLevel = 'high';
    stressLevel = 'moderate';
    reasoning = 'Well-rested from lighter schedule. Good energy to tackle busy day ahead.';
    
  } else if (isConsistentLow) {
    // OPTIMAL PATTERN: Light schedule consistently
    moodScore = Math.min(10, 7 + Math.floor((2 - yesterdayRatio - todayRatio) * 3)); // 7-10 range
    energyLevel = 'high';
    stressLevel = 'low';
    reasoning = 'Balanced, light schedule. Optimal state for productivity and wellness.';
    
  } else if (isBalanced) {
    // STABLE PATTERN: Medium intensity consistently
    moodScore = 6 + Math.floor(Math.random() * 2); // 6-7 range (stable)
    energyLevel = 'moderate';
    stressLevel = 'moderate';
    reasoning = 'Steady, moderate schedule. Maintaining consistent pace.';
    
  } else {
    // MIXED PATTERN: Calculate based on average
    const avgRatio = (yesterdayRatio + todayRatio) / 2;
    moodScore = Math.round(8 - (avgRatio * 6)); // 2-8 range based on average
    energyLevel = avgRatio > 0.6 ? 'low' : avgRatio > 0.35 ? 'moderate' : 'high';
    stressLevel = avgRatio > 0.6 ? 'high' : avgRatio > 0.35 ? 'moderate' : 'low';
    reasoning = `Mixed schedule pattern. Average intensity: ${Math.round(avgRatio * 100)}%`;
  }
  
  // Clamp mood score to 1-10 range
  moodScore = Math.max(1, Math.min(10, moodScore));
  
  return {
    moodScore,
    energyLevel,
    stressLevel,
    reasoning
  };
}

/**
 * Calculate mood metrics from single day's schedule (no historical data)
 */
function calculateMoodFromSingleDay(todayIntensity: ScheduleIntensityData): MoodMetrics {
  const ratio = todayIntensity.ratio;
  
  // Simple mapping: lower intensity = better mood
  const moodScore = Math.round(9 - (ratio * 7)); // 2-9 range
  
  let energyLevel: 'high' | 'moderate' | 'low';
  let stressLevel: 'high' | 'moderate' | 'low';
  
  if (todayIntensity.level === 'high') {
    energyLevel = 'moderate'; // Assuming neutral state without history
    stressLevel = 'high';
  } else if (todayIntensity.level === 'medium') {
    energyLevel = 'moderate';
    stressLevel = 'moderate';
  } else {
    energyLevel = 'high';
    stressLevel = 'low';
  }
  
  return {
    moodScore: Math.max(1, Math.min(10, moodScore)),
    energyLevel,
    stressLevel,
    reasoning: `Based on today's ${todayIntensity.level} schedule intensity (${Math.round(ratio * 100)}% busy).`
  };
}

/**
 * Calculate schedule intensity from events
 */
export function calculateScheduleIntensity(
  events: Array<{ durationSec: number }>,
  activeHoursMinutes: number = 960 // Default: 16 hours
): ScheduleIntensityData {
  if (events.length === 0) {
    return {
      level: 'low',
      ratio: 0,
      busyMinutes: 0,
      totalMinutes: activeHoursMinutes
    };
  }
  
  const busyMinutes = events.reduce((sum, event) => sum + (event.durationSec / 60), 0);
  const ratio = busyMinutes / activeHoursMinutes;
  
  let level: 'high' | 'medium' | 'low';
  if (ratio > 0.7) level = 'high';
  else if (ratio > 0.4) level = 'medium';
  else level = 'low';
  
  return {
    level,
    ratio,
    busyMinutes,
    totalMinutes: activeHoursMinutes
  };
}

/**
 * Adjust mood metrics based on user's text input sentiment
 * Combines calculated metrics with NLP sentiment analysis
 */
export function adjustMoodWithSentiment(
  calculatedMetrics: MoodMetrics,
  sentimentScore: number, // -1.0 to 1.0 from NLP
  confidence: number = 0.5 // 0.0 to 1.0
): MoodMetrics {
  // Convert sentiment to mood adjustment (-3 to +3)
  const sentimentAdjustment = Math.round(sentimentScore * 3 * confidence);
  
  // Blend calculated mood with sentiment
  const adjustedMoodScore = Math.max(1, Math.min(10, 
    calculatedMetrics.moodScore + sentimentAdjustment
  ));
  
  // Sentiment can override energy/stress if confidence is high
  let energyLevel = calculatedMetrics.energyLevel;
  let stressLevel = calculatedMetrics.stressLevel;
  
  if (confidence > 0.7) {
    // Strong positive sentiment = boost energy, reduce stress
    if (sentimentScore > 0.5) {
      energyLevel = 'high';
      stressLevel = calculatedMetrics.stressLevel === 'high' ? 'moderate' : 'low';
    }
    // Strong negative sentiment = reduce energy, increase stress
    else if (sentimentScore < -0.5) {
      energyLevel = calculatedMetrics.energyLevel === 'high' ? 'moderate' : 'low';
      stressLevel = 'high';
    }
  }
  
  return {
    moodScore: adjustedMoodScore,
    energyLevel,
    stressLevel,
    reasoning: `${calculatedMetrics.reasoning} Adjusted by sentiment analysis (${sentimentScore > 0 ? 'positive' : 'negative'} tone detected).`
  };
}
