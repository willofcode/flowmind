/**
 * Schedule Management Routes
 * 
 * Purpose: Handle weekly schedule CRUD and intensity tracking
 * Base Path: /schedules
 * 
 * Routes:
 *   POST   /schedules                        - Create/update weekly schedule
 *   GET    /schedules/:userId/:weekStart     - Get specific week schedule
 *   GET    /schedules/:userId/intensity      - Get schedule intensity over time
 * 
 * Dependencies: express, config/database
 * 
 * @module routes/schedules
 */

import express from "express";
import { supabase } from "../config/database.js";

const router = express.Router();

/**
 * @route   POST /schedules
 * @desc    Create or update weekly schedule with density metrics
 * @access  Public
 * @body    {userId, weekStart, weekEnd, totalEvents, totalMinutes, avgDailyDensity, dailyBreakdown}
 * @returns {Object} Created/updated schedule record
 */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      weekStart,
      weekEnd,
      totalEvents,
      totalMinutes,
      avgDailyDensity,
      dailyBreakdown,
    } = req.body;

    if (!userId || !weekStart || !weekEnd) {
      return res
        .status(400)
        .json({ error: "userId, weekStart, and weekEnd are required" });
    }

    const { data, error } = await supabase
      .from("weekly_schedules")
      .upsert(
        {
          user_id: userId,
          week_start: weekStart,
          week_end: weekEnd,
          total_events: totalEvents || 0,
          total_minutes: totalMinutes || 0,
          avg_daily_density: avgDailyDensity || 0,
          daily_breakdown: dailyBreakdown || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,week_start",
        }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, schedule: data });
  } catch (err) {
    console.error("❌ Schedule create/update error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /schedules/:userId/:weekStart
 * @desc    Get weekly schedule for specific week
 * @access  Public
 * @param   {string} userId - User's UUID
 * @param   {string} weekStart - Week start date (YYYY-MM-DD)
 * @returns {Object} Schedule record for the specified week
 */
router.get("/:userId/:weekStart", async (req, res) => {
  try {
    const { userId, weekStart } = req.params;

    const { data, error } = await supabase
      .from("weekly_schedules")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Schedule not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Schedule fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /schedules/:userId/intensity
 * @desc    Get schedule intensity over date range
 * @access  Public
 * @param   {string} userId - User's UUID
 * @query   {string} startDate - Start date (YYYY-MM-DD)
 * @query   {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Array of schedule records with density metrics
 */
router.get("/:userId/intensity", async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    let query = supabase
      .from("weekly_schedules")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false });

    if (startDate) {
      query = query.gte("week_end", startDate);
    }
    if (endDate) {
      query = query.lte("week_start", endDate);
    }

    const { data, error } = await query.limit(12); // ~3 months max

    if (error) throw error;

    res.json({ schedules: data });
  } catch (err) {
    console.error("❌ Schedule intensity fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
