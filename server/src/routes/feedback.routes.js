/**
 * User Feedback Routes
 * 
 * Purpose: Collect user feedback for continuous improvement
 * Base Path: /feedback
 * 
 * Routes:
 *   POST   /feedback              - Submit feedback
 *   GET    /feedback/:userId      - Get feedback history
 * 
 * Dependencies: express, config/database
 * 
 * @module routes/feedback
 */

import express from "express";
import { supabase } from "../config/database.js";

const router = express.Router();

/**
 * @route   POST /feedback
 * @desc    Submit user feedback (ratings, comments on recommendations)
 * @access  Public
 * @body    {userId, feedbackType, targetId?, rating?, comment?, context?}
 * @returns {Object} Created feedback record
 */
router.post("/", async (req, res) => {
  try {
    const { userId, feedbackType, targetId, rating, comment, context } =
      req.body;

    if (!userId || !feedbackType) {
      return res
        .status(400)
        .json({ error: "userId and feedbackType are required" });
    }

    const { data, error } = await supabase
      .from("user_feedback")
      .insert({
        user_id: userId,
        feedback_type: feedbackType,
        target_id: targetId,
        rating,
        comment,
        context: context || {},
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, feedback: data });
  } catch (err) {
    console.error("❌ Feedback submission error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /feedback/:userId
 * @desc    Get user feedback history
 * @access  Public
 * @param   {string} userId - User's UUID
 * @query   {string} feedbackType - Filter by feedback type
 * @query   {number} limit - Max records to return (default: 50)
 * @returns {Array} Array of feedback records
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { feedbackType, limit = 50 } = req.query;

    let query = supabase
      .from("user_feedback")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (feedbackType) {
      query = query.eq("feedback_type", feedbackType);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ feedback: data });
  } catch (err) {
    console.error("❌ Feedback fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
