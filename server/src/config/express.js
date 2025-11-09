/**
 * Express Application Configuration
 * 
 * Purpose: Configure Express app with middleware and settings
 * Dependencies: express, cors
 * 
 * Usage:
 *   import { app } from './config/express.js';
 *   app.listen(PORT, () => console.log('Server running'));
 * 
 * Middleware Applied:
 *   - CORS: Enable cross-origin requests
 *   - JSON Parser: Parse JSON request bodies
 *   - Error Handler: Global error handling
 * 
 * @module config/express
 */

import express from "express";
import cors from "cors";

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // Enable CORS for all origins (restrict in production)
  app.use(cors());

  // Parse JSON bodies
  app.use(express.json());

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });

  return app;
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  console.error("❌ Global error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

export default createApp;
