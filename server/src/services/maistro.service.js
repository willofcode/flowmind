/**
 * NeuralSeek mAIstro Service
 * 
 * Purpose: Handle AI-powered mood analysis and pattern discovery using NeuralSeek mAIstro
 * Dependencies: node-fetch, config/neuralseek
 * 
 * Key Functions:
 *   - analyzeMoodWithMaistro: Analyze user mood from STT transcription
 *   - discoverMoodPatterns: Find correlations between mood and schedule
 * 
 * Usage:
 *   import { analyzeMoodWithMaistro } from './services/maistro.service.js';
 *   const analysis = await analyzeMoodWithMaistro({
 *     transcription: "I'm feeling stressed...",
 *     userId: "uuid",
 *     scheduleDensity: "high"
 *   });
 * 
 * @module services/maistro
 */

import fetch from "node-fetch";
import { NS_CONFIG, getNeuralSeekHeaders } from "../config/neuralseek.js";
import { supabase } from "../config/database.js";

/**
 * Analyze user mood from transcription using mAIstro
 * 
 * @param {Object} params - Analysis parameters
 * @param {string} params.transcription - User's spoken mood check-in
 * @param {string} params.userId - User's unique identifier
 * @param {string} params.scheduleDensity - Schedule intensity (low/medium/high)
 * @param {Object} [params.scheduleContext] - Additional schedule context
 * @returns {Promise<Object>} Mood analysis with score, energy, stress, recommendations
 * 
 * @example
 * const result = await analyzeMoodWithMaistro({
 *   transcription: "I'm feeling overwhelmed with 3 meetings today",
 *   userId: "user-123",
 *   scheduleDensity: "high"
 * });
 * // Returns: { moodScore: 4, energyLevel: "low", stressLevel: "high", ... }
 */
export async function analyzeMoodWithMaistro({
  transcription,
  userId,
  scheduleDensity,
  scheduleContext,
}) {
  const prompt = `Analyze this user's mood check-in and extract emotional state, energy level, and provide recommendations.

User said: "${transcription}"

Context:
- Schedule density today: ${scheduleDensity}
- User has ADHD and anxiety
${scheduleContext ? `- Schedule: ${JSON.stringify(scheduleContext)}` : ""}

Please provide:
1. Mood score (1-10, where 1=very low, 10=excellent)
2. Energy level (very_low, low, moderate, high, very_high)
3. Stress level (calm, mild, moderate, high, overwhelming)
4. Primary emotion
5. Specific recommendations for today

Return as JSON with keys: moodScore, energyLevel, stressLevel, emotion, recommendations (array)`;

  try {
    const response = await fetch(NS_CONFIG.MAISTRO_ENDPOINT, {
      method: "POST",
      headers: getNeuralSeekHeaders(),
      body: JSON.stringify({
        ntl: prompt, // Critical: mAIstro uses 'ntl' not 'prompt'
        context: { userId, scheduleDensity },
        parameters: { temperature: 0.7, response_format: "json" },
      }),
    });

    if (!response.ok) {
      throw new Error(`mAIstro API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse mAIstro response
    const analysis =
      typeof data.answer === "string" ? JSON.parse(data.answer) : data.answer;

    return {
      moodScore: analysis.moodScore || 5,
      energyLevel: analysis.energyLevel || "moderate",
      stressLevel: analysis.stressLevel || "mild",
      emotionalState: {
        primary: analysis.emotion || "neutral",
        intensity: analysis.moodScore || 5,
      },
      analysis: {
        recommendations: analysis.recommendations || [],
        triggers: analysis.triggers || [],
        confidence: 0.85,
      },
    };
  } catch (err) {
    console.error("❌ mAIstro mood analysis error:", err);

    // Fallback to basic analysis
    return {
      moodScore: 5,
      energyLevel: "moderate",
      stressLevel: "mild",
      emotionalState: { primary: "neutral", intensity: 5 },
      analysis: {
        recommendations: [
          "Take a short break",
          "Try a 5-minute breathing session",
        ],
        triggers: [],
        confidence: 0.3,
      },
    };
  }
}

/**
 * Discover mood patterns by correlating mood history with schedule data
 * 
 * This function runs asynchronously after mood check-ins to find patterns like:
 * - High schedule density correlates with low energy
 * - Morning check-ins show higher mood scores
 * - Certain event types trigger stress
 * 
 * @param {string} userId - User's unique identifier
 * @returns {Promise<void>} Saves discovered patterns to database
 * 
 * @example
 * await discoverMoodPatterns("user-123");
 * // Patterns saved to mood_patterns table
 */
export async function discoverMoodPatterns(userId) {
  console.log(`🔍 Discovering patterns for user ${userId}...`);

  try {
    // Get recent mood check-ins (last 30 days)
    const { data: moodData } = await supabase
      .from("mood_check_ins")
      .select("*")
      .eq("user_id", userId)
      .order("check_in_date", { ascending: false })
      .limit(30);

    if (!moodData || moodData.length < 5) {
      console.log("ℹ️  Not enough data for pattern discovery (need 5+ check-ins)");
      return;
    }

    // Get schedule data for correlation (last 4 weeks)
    const { data: scheduleData } = await supabase
      .from("weekly_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(4);

    // Call mAIstro to discover patterns
    const prompt = `Analyze this user's mood and schedule data to discover patterns.

Mood Check-ins (last 30 days):
${JSON.stringify(moodData, null, 2)}

Schedule Data:
${JSON.stringify(scheduleData, null, 2)}

Find correlations between:
1. Schedule density and mood/energy levels
2. Time of day patterns
3. Day of week patterns
4. Event types and emotional responses

Return discovered patterns as JSON array with:
- pattern_type
- pattern_name
- description
- trigger_conditions
- observed_effect
- confidence_score
- recommendations`;

    const response = await fetch(NS_CONFIG.MAISTRO_ENDPOINT, {
      method: "POST",
      headers: getNeuralSeekHeaders(),
      body: JSON.stringify({
        ntl: prompt,
        context: { userId, analysisType: "pattern_discovery" },
        parameters: { temperature: 0.5 },
      }),
    });

    if (!response.ok) {
      throw new Error(`mAIstro pattern discovery error: ${response.statusText}`);
    }

    const data = await response.json();
    const patterns =
      typeof data.answer === "string" ? JSON.parse(data.answer) : data.answer;

    // Save discovered patterns to database
    if (Array.isArray(patterns)) {
      for (const pattern of patterns) {
        await supabase.from("mood_patterns").upsert(
          {
            user_id: userId,
            pattern_type: pattern.pattern_type,
            pattern_name: pattern.pattern_name,
            description: pattern.description,
            trigger_conditions: pattern.trigger_conditions,
            observed_effect: pattern.observed_effect,
            confidence_score: pattern.confidence_score,
            recommendations: pattern.recommendations,
            occurrence_count: 1,
            last_observed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,pattern_type,pattern_name",
            ignoreDuplicates: false,
          }
        );
      }

      console.log(`✅ Discovered ${patterns.length} patterns for user ${userId}`);
    }
  } catch (err) {
    console.error("❌ Pattern discovery failed:", err);
  }
}

export default {
  analyzeMoodWithMaistro,
  discoverMoodPatterns,
};
