/**
 * Mood Check-in Routes
 * 
 * Purpose: Handle STT mood check-ins with AI analysis
 * Base Path: /mood
 * 
 * Routes:
 *   POST   /mood/checkin              - Submit mood check-in with transcription
 *   GET    /mood/:userId/history      - Get mood check-in history
 *   GET    /mood/:userId/patterns     - Get discovered mood patterns
 * 
 * Dependencies: express, config/database, services/maistro
 * 
 * @module routes/mood
 */

import express from "express";
import { supabase } from "../config/database.js";
import {
  analyzeMoodWithMaistro,
  discoverMoodPatterns,
} from "../services/maistro.service.js";

const router = express.Router();

/**
 * @route   POST /mood/checkin
 * @desc    Submit mood check-in with STT transcription for AI analysis
 * @access  Public
 * @body    {userId: string, transcription: string, audioUrl?: string, durationSeconds?: number}
 * @returns {Object} Check-in record with mood analysis and recommendations
 * 
 * @example
 * POST /mood/checkin
 * {
 *   "userId": "user-uuid",
 *   "transcription": "I'm feeling stressed with 3 meetings today",
 *   "durationSeconds": 12
 * }
 */
router.post("/checkin", async (req, res) => {
  try {
    const { userId, transcription, audioUrl, durationSeconds } = req.body;

    if (!userId || !transcription) {
      return res
        .status(400)
        .json({ error: "userId and transcription are required" });
    }

    const now = new Date();
    const checkInDate = now.toISOString().split("T")[0];
    const checkInTime = now.toTimeString().split(" ")[0];

    // Step 1: Get user's current schedule context
    const { data: scheduleData } = await supabase
      .from("weekly_schedules")
      .select("avg_daily_density, daily_breakdown")
      .eq("user_id", userId)
      .gte("week_end", checkInDate)
      .lte("week_start", checkInDate)
      .single();

    const scheduleDensity =
      scheduleData?.avg_daily_density > 0.7
        ? "high"
        : scheduleData?.avg_daily_density > 0.4
        ? "medium"
        : "low";

    // Step 2: Call mAIstro to analyze mood from transcription
    const moodAnalysis = await analyzeMoodWithMaistro({
      transcription,
      userId,
      scheduleDensity,
      scheduleContext: scheduleData,
    });

    // Step 3: Save check-in with AI analysis
    const { data, error } = await supabase
      .from("mood_check_ins")
      .insert({
        user_id: userId,
        check_in_date: checkInDate,
        check_in_time: checkInTime,
        transcription,
        audio_url: audioUrl,
        duration_seconds: durationSeconds,
        mood_score: moodAnalysis.moodScore,
        energy_level: moodAnalysis.energyLevel,
        stress_level: moodAnalysis.stressLevel,
        emotional_state: moodAnalysis.emotionalState,
        schedule_density: scheduleDensity,
        ai_analysis: moodAnalysis.analysis,
      })
      .select()
      .single();

    if (error) throw error;

    // Step 4: Trigger pattern discovery (async, don't wait)
    discoverMoodPatterns(userId).catch((err) =>
      console.error("Pattern discovery error:", err)
    );

    res.json({
      success: true,
      checkIn: data,
      recommendations: moodAnalysis.analysis.recommendations,
    });
  } catch (err) {
    console.error("❌ Mood check-in error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /mood/:userId/history
 * @desc    Get mood check-in history for a user
 * @access  Public
 * @param   {string} userId - User's UUID
 * @query   {number} days - Number of days to fetch (default: 30)
 * @returns {Array} Array of mood check-in records
 */
router.get("/:userId/history", async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await supabase
      .from("mood_check_ins")
      .select("*")
      .eq("user_id", userId)
      .gte("check_in_date", startDate.toISOString().split("T")[0])
      .order("check_in_date", { ascending: false });

    if (error) throw error;

    res.json({ moodHistory: data });
  } catch (err) {
    console.error("❌ Mood history fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /mood/:userId/patterns
 * @desc    Get AI-discovered mood patterns for a user
 * @access  Public
 * @param   {string} userId - User's UUID
 * @returns {Array} Array of discovered patterns with confidence scores
 */
router.get("/:userId/patterns", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("mood_patterns")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("confidence_score", { ascending: false });

    if (error) throw error;

    res.json({ patterns: data });
  } catch (err) {
    console.error("❌ Patterns fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
