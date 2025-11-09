/**         
 * Health Check Routes
 * 
 * Purpose: Monitor API and service health
 * Base Path: /health
 * 
 * Routes:
 *   GET    /health       - Check overall system health
 * 
 * Dependencies: express, config/database, config/neuralseek
 * 
 * @module routes/health
 */

import express from "express";
import { supabase } from "../config/database.js";
import { NS_CONFIG, getNeuralSeekHeaders } from "../config/neuralseek.js";

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Check overall system health (database, NeuralSeek)
 * @access  Public
 * @returns {Object} Health status of all services
 */
router.get("/", async (req, res) => {
  try {
    const services = {};

    // Test Supabase connection
    try {
      const { data: supabaseTest } = await supabase
        .from("users")
        .select("count")
        .limit(1);
      services.supabase = supabaseTest !== undefined ? "connected" : "error";
    } catch (err) {
      services.supabase = "error";
    }

    // Test NeuralSeek
    try {
      const nsResponse = await fetch(NS_CONFIG.SEEK_ENDPOINT, {
        method: "POST",
        headers: getNeuralSeekHeaders(),
        body: JSON.stringify({ question: "test" }),
      });
      services.neuralseek = nsResponse.ok ? "connected" : "error";
    } catch (err) {
      services.neuralseek = "error";
    }

    const allHealthy = Object.values(services).every((s) => s === "connected");

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services,
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
