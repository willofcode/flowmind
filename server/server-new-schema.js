/**
 * FlowMind Server - User-Centric API with mAIstro Orchestration
 * Updated to use new user schema with mood tracking and STT integration
 */

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// NeuralSeek Configuration
const NS_EMBED_CODE = process.env.NS_EMBED_CODE || "370207002";
const NS_SEEK_ENDPOINT = process.env.NS_SEEK_ENDPOINT || "https://stagingapi.neuralseek.com/v1/stony23/seek";
const NS_MAISTRO_ENDPOINT = process.env.NS_MAISTRO_ENDPOINT || "https://stagingapi.neuralseek.com/v1/stony23/maistro";

// ============================================================================
// User Management
// ============================================================================

// Create or update user
app.post("/users", async (req, res) => {
  try {
    const { email, name, auth0_sub } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .upsert({ 
        email, 
        name,
        auth0_sub,
        updated_at: new Date().toISOString() 
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) {
    console.error("User create/update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user by email
app.get("/users/:email", async (req, res) => {
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
    console.error("User fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
app.get("/users/:userId/profile", async (req, res) => {
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
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put("/users/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;
    const { display_name, neuro_preferences, personality_traits } = req.body;

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        display_name,
        neuro_preferences,
        personality_traits,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, profile: data });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Mood Check-ins (STT Integration)
// ============================================================================

// Submit mood check-in (with STT transcription)
app.post("/mood-checkin", async (req, res) => {
  try {
    const { 
      userId, 
      transcription, 
      audioUrl,
      durationSeconds 
    } = req.body;

    if (!userId || !transcription) {
      return res.status(400).json({ error: "userId and transcription are required" });
    }

    const now = new Date();
    const checkInDate = now.toISOString().split('T')[0];
    const checkInTime = now.toTimeString().split(' ')[0];

    // Step 1: Get user's current schedule context
    const { data: scheduleData } = await supabase
      .from("weekly_schedules")
      .select("avg_daily_density, daily_breakdown")
      .eq("user_id", userId)
      .gte("week_end", checkInDate)
      .lte("week_start", checkInDate)
      .single();

    const scheduleDensity = scheduleData?.avg_daily_density > 0.7 ? 'high' : 
                            scheduleData?.avg_daily_density > 0.4 ? 'medium' : 'low';

    // Step 2: Call mAIstro to analyze mood from transcription
    const moodAnalysis = await analyzeMoodWithMaistro({
      transcription,
      userId,
      scheduleDensity,
      scheduleContext: scheduleData
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
        ai_analysis: moodAnalysis.analysis
      })
      .select()
      .single();

    if (error) throw error;

    // Step 4: Trigger pattern discovery (async)
    discoverMoodPatterns(userId).catch(err => 
      console.error("Pattern discovery error:", err)
    );

    res.json({ 
      success: true, 
      checkIn: data,
      recommendations: moodAnalysis.analysis.recommendations 
    });
  } catch (err) {
    console.error("Mood check-in error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get mood history
app.get("/users/:userId/mood-history", async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await supabase
      .from("mood_check_ins")
      .select("*")
      .eq("user_id", userId)
      .gte("check_in_date", startDate.toISOString().split('T')[0])
      .order("check_in_date", { ascending: false });

    if (error) throw error;
    res.json({ moodHistory: data });
  } catch (err) {
    console.error("Mood history fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// mAIstro Orchestration for Mood Analysis
// ============================================================================

async function analyzeMoodWithMaistro({ transcription, userId, scheduleDensity, scheduleContext }) {
  const prompt = `Analyze this user's mood check-in and extract emotional state, energy level, and provide recommendations.

User said: "${transcription}"

Context:
- Schedule density today: ${scheduleDensity}
- User has ADHD and anxiety
${scheduleContext ? `- Schedule: ${JSON.stringify(scheduleContext)}` : ''}

Please provide:
1. Mood score (1-10, where 1=very low, 10=excellent)
2. Energy level (very_low, low, moderate, high, very_high)
3. Stress level (calm, mild, moderate, high, overwhelming)
4. Primary emotion
5. Specific recommendations for today

Return as JSON with keys: moodScore, energyLevel, stressLevel, emotion, recommendations (array)`;

  try {
    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: "POST",
      headers: {
        "embedcode": NS_EMBED_CODE,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ntl: prompt,
        context: { userId, scheduleDensity },
        parameters: { temperature: 0.7, response_format: "json" }
      })
    });

    const data = await response.json();
    
    // Parse mAIstro response
    const analysis = typeof data.answer === 'string' ? JSON.parse(data.answer) : data.answer;

    return {
      moodScore: analysis.moodScore || 5,
      energyLevel: analysis.energyLevel || 'moderate',
      stressLevel: analysis.stressLevel || 'mild',
      emotionalState: {
        primary: analysis.emotion || 'neutral',
        intensity: analysis.moodScore || 5
      },
      analysis: {
        recommendations: analysis.recommendations || [],
        triggers: analysis.triggers || [],
        confidence: 0.85
      }
    };
  } catch (err) {
    console.error("mAIstro mood analysis error:", err);
    // Fallback to basic analysis
    return {
      moodScore: 5,
      energyLevel: 'moderate',
      stressLevel: 'mild',
      emotionalState: { primary: 'neutral', intensity: 5 },
      analysis: {
        recommendations: ["Take a short break", "Try a 5-minute breathing session"],
        triggers: [],
        confidence: 0.3
      }
    };
  }
}

// ============================================================================
// Pattern Discovery (mAIstro Orchestration)
// ============================================================================

async function discoverMoodPatterns(userId) {
  console.log(`🔍 Discovering patterns for user ${userId}...`);

  // Get recent mood check-ins
  const { data: moodData } = await supabase
    .from("mood_check_ins")
    .select("*")
    .eq("user_id", userId)
    .order("check_in_date", { ascending: false })
    .limit(30);

  if (!moodData || moodData.length < 5) {
    console.log("Not enough data for pattern discovery");
    return;
  }

  // Get schedule data for correlation
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

  try {
    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: "POST",
      headers: {
        "embedcode": NS_EMBED_CODE,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ntl: prompt,
        context: { userId, analysisType: "pattern_discovery" },
        parameters: { temperature: 0.5 }
      })
    });

    const data = await response.json();
    const patterns = typeof data.answer === 'string' ? JSON.parse(data.answer) : data.answer;

    // Save discovered patterns
    if (Array.isArray(patterns)) {
      for (const pattern of patterns) {
        await supabase
          .from("mood_patterns")
          .upsert({
            user_id: userId,
            pattern_type: pattern.pattern_type,
            pattern_name: pattern.pattern_name,
            description: pattern.description,
            trigger_conditions: pattern.trigger_conditions,
            observed_effect: pattern.observed_effect,
            confidence_score: pattern.confidence_score,
            recommendations: pattern.recommendations,
            occurrence_count: 1,
            last_observed_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,pattern_type,pattern_name',
            ignoreDuplicates: false
          });
      }
      console.log(`✅ Discovered ${patterns.length} patterns`);
    }
  } catch (err) {
    console.error("Pattern discovery failed:", err);
  }
}

// Get discovered patterns
app.get("/users/:userId/patterns", async (req, res) => {
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
    console.error("Patterns fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Weekly Schedule Management
// ============================================================================

// Create/update weekly schedule
app.post("/schedules", async (req, res) => {
  try {
    const { 
      userId, 
      weekStart, 
      weekEnd, 
      totalEvents,
      totalMinutes,
      avgDailyDensity,
      dailyBreakdown 
    } = req.body;

    if (!userId || !weekStart || !weekEnd) {
      return res.status(400).json({ error: "userId, weekStart, and weekEnd are required" });
    }

    const { data, error } = await supabase
      .from("weekly_schedules")
      .upsert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        total_events: totalEvents || 0,
        total_minutes: totalMinutes || 0,
        avg_daily_density: avgDailyDensity || 0,
        daily_breakdown: dailyBreakdown || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,week_start'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, schedule: data });
  } catch (err) {
    console.error("Schedule create/update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get weekly schedule
app.get("/users/:userId/schedule/:weekStart", async (req, res) => {
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
    console.error("Schedule fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get schedule intensity for date range
app.get("/users/:userId/schedule-intensity", async (req, res) => {
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
    console.error("Schedule intensity fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Conversation History
// ============================================================================

// Save conversation message
app.post("/conversations", async (req, res) => {
  try {
    const { 
      userId, 
      role, 
      message, 
      context,
      moodScore,
      intent 
    } = req.body;

    if (!userId || !role || !message) {
      return res.status(400).json({ error: "userId, role, and message are required" });
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        role,
        message,
        context: context || {},
        mood_score: moodScore,
        intent
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, conversation: data });
  } catch (err) {
    console.error("Conversation save error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get conversation history
app.get("/users/:userId/conversations", async (req, res) => {
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
    res.json({ conversations: data.reverse() }); // Return in chronological order
  } catch (err) {
    console.error("Conversation fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AI Orchestration Sessions
// ============================================================================

// Create orchestration session
app.post("/orchestration-sessions", async (req, res) => {
  try {
    const { 
      userId, 
      sessionType, 
      moodScore,
      scheduleDensity,
      aiDecisions,
      recommendations,
      userSelectedAction 
    } = req.body;

    if (!userId || !sessionType) {
      return res.status(400).json({ error: "userId and sessionType are required" });
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
        user_selected_action: userSelectedAction
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, session: data });
  } catch (err) {
    console.error("Orchestration session create error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get orchestration history
app.get("/users/:userId/orchestration-sessions", async (req, res) => {
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
    console.error("Orchestration sessions fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// User Feedback
// ============================================================================

// Submit feedback
app.post("/feedback", async (req, res) => {
  try {
    const { 
      userId, 
      feedbackType, 
      targetId,
      rating,
      comment,
      context 
    } = req.body;

    if (!userId || !feedbackType) {
      return res.status(400).json({ error: "userId and feedbackType are required" });
    }

    const { data, error } = await supabase
      .from("user_feedback")
      .insert({
        user_id: userId,
        feedback_type: feedbackType,
        target_id: targetId,
        rating,
        comment,
        context: context || {}
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, feedback: data });
  } catch (err) {
    console.error("Feedback submission error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user feedback history
app.get("/users/:userId/feedback", async (req, res) => {
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
    console.error("Feedback fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", async (req, res) => {
  try {
    // Test Supabase connection
    const { data: supabaseTest } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    // Test NeuralSeek
    const nsResponse = await fetch(NS_SEEK_ENDPOINT, {
      method: "POST",
      headers: { "embedcode": NS_EMBED_CODE, "Content-Type": "application/json" },
      body: JSON.stringify({ question: "test" })
    });

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseTest !== undefined ? "connected" : "error",
        neuralseek: nsResponse.ok ? "connected" : "error"
      }
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      error: err.message
    });
  }
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 FlowMind server running on http://localhost:${PORT}`);
  console.log(`✅ Supabase configured`);
  console.log(`✅ NeuralSeek mAIstro orchestration enabled`);
});

export default app;
