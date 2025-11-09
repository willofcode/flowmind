
/** @module server **/


import dotenv from "dotenv";
import { createApp, errorHandler } from "./src/config/express.js";
import { testConnection } from "./src/config/database.js";
import { validateConfig, testNeuralSeekConnection } from "./src/config/neuralseek.js";

// Import route handlers
import usersRoutes from "./src/routes/users.routes.js";
import moodRoutes from "./src/routes/mood.routes.js";
import schedulesRoutes from "./src/routes/schedules.routes.js";
import conversationsRoutes from "./src/routes/conversations.routes.js";
import orchestrationRoutes from "./src/routes/orchestration.routes.js";
import feedbackRoutes from "./src/routes/feedback.routes.js";
import healthRoutes from "./src/routes/health.routes.js";
import calendarRoutes from "./src/routes/calendar.routes.js";
import calendarSyncRoutes from "./src/routes/calendar-sync.routes.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Create Express app
const app = createApp();

// ============================================================================
// API Routes
// ============================================================================

/**
 * User Management Routes
 * Handles user CRUD operations and profile management
 */
app.use("/users", usersRoutes);

/**
 * Mood Check-in Routes
 * Handles STT mood check-ins with AI analysis and pattern discovery
 */
app.use("/mood", moodRoutes);

/**
 * Schedule Management Routes
 * Handles weekly schedule tracking and intensity calculation
 */
app.use("/schedules", schedulesRoutes);

/**
 * Conversation History Routes
 * Tracks conversation messages for mAIstro context
 */
app.use("/conversations", conversationsRoutes);

/**
 * AI Orchestration Routes
 * Tracks mAIstro orchestration sessions and decisions
 */
app.use("/orchestration", orchestrationRoutes);

/**
 * User Feedback Routes
 * Collects user feedback for continuous improvement
 */
app.use("/feedback", feedbackRoutes);

/**
 * Health Check Routes
 * Monitors API and service health
 */
app.use("/health", healthRoutes);

/**
 * Calendar Optimization Routes
 * Agentic workflow for Google Calendar optimization
 */
app.use("/calendar", calendarRoutes);

/**
 * Calendar Sync Routes
 * Handle calendar synchronization and webhooks
 */
app.use("/calendar-sync", calendarSyncRoutes);

// ============================================================================
// Error Handling
// ============================================================================

/**
 * 404 Handler - Route not found
 */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

// ============================================================================
// Server Startup
// ============================================================================

/**
 * Validate configuration and start server
 */
async function startServer() {
  console.log("\n🚀 Starting FlowMind API Server...\n");

  // Validate NeuralSeek configuration
  if (!validateConfig()) {
    console.error("❌ Invalid configuration. Please check environment variables.");
    process.exit(1);
  }

  // Test database connection
  console.log("📊 Testing database connection...");
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error("❌ Failed to connect to database. Please check SUPABASE configuration.");
    // Continue anyway, routes will handle errors
  } else {
    console.log("✅ Database connected");
  }

  // Test NeuralSeek connection
  console.log("🧠 Testing NeuralSeek connection...");
  const nsConnected = await testNeuralSeekConnection();
  if (!nsConnected) {
    console.warn("⚠️  NeuralSeek connection failed. mAIstro features may not work.");
    // Continue anyway, fallback logic in place
  } else {
    console.log("✅ NeuralSeek connected");
  }

  // Start Express server
  app.listen(PORT, () => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎉 FlowMind API Server running on http://localhost:${PORT}`);
    console.log(`${"=".repeat(60)}\n`);
    console.log("📍 Available Routes:");
    console.log(`   POST   http://localhost:${PORT}/users`);
    console.log(`   GET    http://localhost:${PORT}/users/:email`);
    console.log(`   POST   http://localhost:${PORT}/mood/checkin`);
    console.log(`   GET    http://localhost:${PORT}/mood/:userId/history`);
    console.log(`   GET    http://localhost:${PORT}/mood/:userId/patterns`);
    console.log(`   POST   http://localhost:${PORT}/schedules`);
    console.log(`   GET    http://localhost:${PORT}/schedules/:userId/:weekStart`);
    console.log(`   POST   http://localhost:${PORT}/conversations`);
    console.log(`   GET    http://localhost:${PORT}/conversations/:userId`);
    console.log(`   POST   http://localhost:${PORT}/orchestration/sessions`);
    console.log(`   GET    http://localhost:${PORT}/orchestration/:userId/sessions`);
    console.log(`   POST   http://localhost:${PORT}/feedback`);
    console.log(`   GET    http://localhost:${PORT}/feedback/:userId`);
    console.log(`   GET    http://localhost:${PORT}/health`);
    console.log(`\n${"=".repeat(60)}\n`);
    console.log("✨ Server ready to accept requests\n");
  });
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

// Start the server
startServer();

export default app;
