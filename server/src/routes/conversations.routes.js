/**
 * Conversation History Routes
 * 
 * Purpose: Track conversation messages for mAIstro context
 * Base Path: /conversations
 * 
 * Routes:
 *   POST   /conversations              - Save conversation message
 *   GET    /conversations/:userId      - Get conversation history
 * 
 * Dependencies: express, config/database
 * 
 * @module routes/conversations
 */

import express from "express";
import { supabase } from "../config/database.js";

const router = express.Router();

/**
 * @route   POST /conversations
 * @desc    Save conversation message with context
 * @access  Public
 * @body    {userId, role, message, context?, moodScore?, intent?}
 * @returns {Object} Created conversation record
 */
router.post("/", async (req, res) => {
  try {
    const { userId, role, message, context, moodScore, intent } = req.body;

    if (!userId || !role || !message) {
      return res
        .status(400)
        .json({ error: "userId, role, and message are required" });
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        role,
        message,
        context: context || {},
        mood_score: moodScore,
        intent,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, conversation: data });
  } catch (err) {
    console.error("❌ Conversation save error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /conversations/:userId
 * @desc    Get conversation history (paginated)
 * @access  Public
 * @param   {string} userId - User's UUID
 * @query   {number} limit - Max records to return (default: 50)
 * @query   {string} before - Cursor for pagination (timestamp)
 * @returns {Array} Array of conversation messages in chronological order
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, before } = req.query;

    let query = supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Return in chronological order (oldest first)
    res.json({ conversations: data.reverse() });
  } catch (err) {
    console.error("❌ Conversation fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
