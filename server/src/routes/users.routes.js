/**
 * User Management Routes
 * 
 * Purpose: Handle user CRUD operations and profile management
 * Base Path: /users
 * 
 * Routes:
 *   POST   /users               - Create or update user
 *   GET    /users/:email        - Get user by email
 *   GET    /users/:userId/profile - Get user profile
 *   PUT    /users/:userId/profile - Update user profile
 * 
 * Dependencies: express, config/database
 * 
 * @module routes/users
 */

import express from "express";
import { supabase } from "../config/database.js";

const router = express.Router();

/**
 * @route   POST /users
 * @desc    Create or update user
 * @access  Public
 * @body    {email: string, name: string, auth0_sub?: string}
 * @returns {Object} Created/updated user object
 */
router.post("/", async (req, res) => {
  try {
    const { email, name, auth0_sub } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          email,
          name,
          auth0_sub,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
        }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ User create/update error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /users/:email
 * @desc    Get user by email (returns complete user state from view)
 * @access  Public
 * @param   {string} email - User's email address
 * @returns {Object} User object with profile data
 */
router.get("/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const { data, error } = await supabase
      .from("user_current_state")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "User not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("❌ User fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   GET /users/:userId/profile
 * @desc    Get user profile (neurodivergent preferences & personality)
 * @access  Public
 * @param   {string} userId - User's UUID
 * @returns {Object} User profile with neuro preferences
 */
router.get("/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Profile not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Profile fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route   PUT /users/:userId/profile
 * @desc    Update user profile (upsert)
 * @access  Public
 * @param   {string} userId - User's UUID
 * @body    {display_name?: string, neuro_preferences?: object, personality_traits?: object}
 * @returns {Object} Updated profile object
 */
router.put("/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;
    const { display_name, neuro_preferences, personality_traits } = req.body;

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: userId,
          display_name,
          neuro_preferences,
          personality_traits,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, profile: data });
  } catch (err) {
    console.error("❌ Profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
