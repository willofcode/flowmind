/**
 * AI Orchestration Routes
 * 
 * Purpose: Track mAIstro orchestration sessions and decisions
 * Base Path: /orchestration
 * 
 * Routes:
 *   POST   /orchestration/sessions         - Create orchestration session
 *   GET    /orchestration/:userId/sessions - Get session history
 * 
 * Dependencies: express, config/database
 * 
 * @module routes/orchestration
 */

import express from "express";
import { supabase } from "../config/database.js";

const router = express.Router();

/**
 * @route   POST /orchestration/sessions
 * @desc    Create AI orchestration session to track mAIstro decisions
 * @access  Public
 * @body    {userId, sessionType, moodScore?, scheduleDensity?, aiDecisions, recommendations, userSelectedAction?}
 * @returns {Object} Created orchestration session record
 */
router.post("/sessions", async (req, res) => {
  try {
    const {
      userId,
      sessionType,
      moodScore,
      scheduleDensity,
      aiDecisions,
      recommendations,
      userSelectedAction,
    } = req.body;

    if (!userId || !sessionType) {
      return res
        .status(400)
        .json({ error: "userId and sessionType are required" });
    }

    const { data, error } = await supabase
      .from("ai_orchestration_sessions")
      .insert({
        user_id: userId,
        session_type: sessionType,
        mood_score: moodScore,
        schedule_density: scheduleDensity,
        ai_decisions: aiDecisions || {},
        recommendations: recommendations || {},
        user_selected_action: userSelectedAction,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, session: data });
  } catch (err) {
    console.error("❌ Orchestration session create error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /orchestration/:userId/sessions
 * @desc    Get orchestration session history
 * @access  Public
 * @param   {string} userId - User's UUID
 * @query   {number} limit - Max records to return (default: 20)
 * @query   {string} sessionType - Filter by session type
 * @returns {Array} Array of orchestration sessions
 */
router.get("/:userId/sessions", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, sessionType } = req.query;

    let query = supabase
      .from("ai_orchestration_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (sessionType) {
      query = query.eq("session_type", sessionType);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ sessions: data });
  } catch (err) {
    console.error("❌ Orchestration sessions fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
