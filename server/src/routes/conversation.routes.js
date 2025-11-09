/**
 * Conversational Mood Check-in Routes
 * 
 * Purpose: Handle voice-based conversational mood tracking with mAIstro
 *          Sentiment analysis + schedule correlation + TTS responses
 * 
 * Base Path: /conversation
 * 
 * Routes:
 *   POST   /conversation/start              - Start new conversation session
 *   POST   /conversation/analyze-sentiment  - Analyze transcription with schedule context
 *   GET    /conversation/:conversationId    - Get conversation history
 *   POST   /conversation/store-mood         - Store final mood check-in result
 * 
 * @module routes/conversation
 */

import express from "express";
import { 
  analyzeSentimentWithSchedule, 
  getConversationHistory,
  startConversationSession 
} from "../services/conversational-agent.service.js";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * @route   POST /conversation/start
 * @desc    Start a new conversational mood tracking session
 * @access  Public
 * @body    {userId}
 * @returns {Object} {conversationId, greeting}
 */
router.post("/start", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // Generate conversation ID
    const conversationId = await startConversationSession(userId);
    
    // Get user's name for personalized greeting
    const { data: user } = await supabase
      .from("users")
      .select("name, display_name")
      .eq("id", userId)
      .single();
    
    const userName = user?.display_name || user?.name?.split(' ')[0] || "there";
    
    const greeting = {
      text: `Hi ${userName}! I'm here to listen. How are you feeling right now?`,
      intent: "opening",
      suggestions: [
        "Tell me about your day",
        "I'm feeling stressed",
        "Things are going well"
      ]
    };
    
    res.json({
      success: true,
      conversationId,
      greeting
    });
    
  } catch (error) {
    console.error("❌ Start conversation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /conversation/analyze-sentiment
 * @desc    Analyze user's voice transcription with schedule-aware sentiment analysis
 * @access  Public
 * @body    {userId, conversationId, transcription, todayEvents?}
 * @returns {Object} Sentiment analysis + conversational response + TTS audio
 */
router.post("/analyze-sentiment", async (req, res) => {
  try {
    const { userId, conversationId, transcription, todayEvents } = req.body;
    
    if (!userId || !conversationId || !transcription) {
      return res.status(400).json({ 
        error: "userId, conversationId, and transcription are required" 
      });
    }
    
    console.log(`\n📝 Analyzing sentiment for conversation: ${conversationId}`);
    console.log(`Transcription: "${transcription}"`);
    
    // Get conversation history for context
    const conversationHistory = await getConversationHistory(userId, conversationId);
    
    // Get today's calendar events if not provided
    let events = todayEvents || [];
    if (!events.length) {
      const { data: calendarEvents } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", new Date().setHours(0, 0, 0, 0))
        .lte("start_time", new Date().setHours(23, 59, 59, 999))
        .order("start_time", { ascending: true });
      
      events = calendarEvents || [];
    }
    
    // Analyze sentiment with schedule correlation
    const analysis = await analyzeSentimentWithSchedule({
      userId,
      transcription,
      conversationId,
      todayEvents: events,
      conversationHistory
    });
    
    if (!analysis.success) {
      return res.status(500).json({ 
        error: "Sentiment analysis failed",
        details: analysis.error 
      });
    }
    
    console.log(`✅ Analysis complete. Mood: ${analysis.moodScore}/10, Response: "${analysis.conversationalResponse.text}"`);
    
    res.json({
      success: true,
      conversationId,
      analysis: {
        moodScore: analysis.moodScore,
        energyLevel: analysis.energyLevel,
        stressLevel: analysis.stressLevel,
        emotionalState: analysis.emotionalState,
        scheduleCorrelation: analysis.scheduleCorrelation,
        triggers: analysis.analysis.triggers,
        patterns: analysis.analysis.patterns,
        confidence: analysis.analysis.confidence
      },
      response: analysis.conversationalResponse,
      recommendations: analysis.analysis.recommendations
    });
    
  } catch (error) {
    console.error("❌ Sentiment analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /conversation/:conversationId
 * @desc    Get conversation history
 * @access  Public
 * @params  conversationId
 * @query   userId, limit?
 * @returns {Array} Conversation turns
 */
router.get("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }
    
    const history = await getConversationHistory(
      userId, 
      conversationId, 
      parseInt(limit) || 20
    );
    
    res.json({
      success: true,
      conversationId,
      turns: history.length,
      history
    });
    
  } catch (error) {
    console.error("❌ Get conversation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /conversation/store-mood
 * @desc    Store final mood check-in result after conversation completes
 * @access  Public
 * @body    {userId, conversationId, finalMoodScore, duration, summary}
 * @returns {Object} Stored mood check-in record
 */
router.post("/store-mood", async (req, res) => {
  try {
    const { 
      userId, 
      conversationId, 
      finalMoodScore, 
      energyLevel,
      stressLevel,
      emotionalState,
      duration,
      summary,
      scheduleContext
    } = req.body;
    
    if (!userId || !conversationId || !finalMoodScore) {
      return res.status(400).json({ 
        error: "userId, conversationId, and finalMoodScore are required" 
      });
    }
    
    // Get full conversation history
    const conversationHistory = await getConversationHistory(userId, conversationId);
    
    // Combine all transcriptions
    const fullTranscription = conversationHistory
      .filter(turn => turn.role === "user")
      .map(turn => turn.message)
      .join(" | ");
    
    // Store in mood_check_ins table
    const { data, error } = await supabase
      .from("mood_check_ins")
      .insert({
        user_id: userId,
        check_in_date: new Date().toISOString().split('T')[0],
        check_in_time: new Date().toTimeString().split(' ')[0],
        transcription: fullTranscription,
        mood_score: finalMoodScore,
        energy_level: energyLevel || 'moderate',
        stress_level: stressLevel || 'moderate',
        emotional_state: emotionalState || {},
        schedule_density: scheduleContext?.scheduleIntensity || 'medium',
        upcoming_events_count: scheduleContext?.upcomingEventsCount || 0,
        ai_analysis: {
          conversationId,
          conversationTurns: conversationHistory.length,
          duration,
          summary,
          scheduleCorrelation: scheduleContext
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error("❌ Store mood error:", error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Mood check-in stored for conversation: ${conversationId}`);
    
    res.json({
      success: true,
      moodCheckIn: data,
      conversationId
    });
    
  } catch (error) {
    console.error("❌ Store mood check-in error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /conversation/test
 * @desc    Test endpoint for conversational flow
 * @access  Public
 */
router.post("/test", async (req, res) => {
  try {
    const testUserId = "test-user-123";
    const testTranscription = "I'm feeling pretty overwhelmed today. I have back-to-back meetings and barely had time for lunch.";
    const testEvents = [
      { start: new Date(Date.now() - 3600000).toISOString(), end: new Date(Date.now() - 1800000).toISOString(), summary: "Team Standup" },
      { start: new Date(Date.now() + 1800000).toISOString(), end: new Date(Date.now() + 5400000).toISOString(), summary: "Client Presentation" },
      { start: new Date(Date.now() + 7200000).toISOString(), end: new Date(Date.now() + 9000000).toISOString(), summary: "Sprint Planning" }
    ];
    
    console.log("\n🧪 Testing conversational sentiment analysis...");
    
    // Start conversation
    const conversationId = await startConversationSession(testUserId);
    console.log(`✅ Conversation started: ${conversationId}`);
    
    // Analyze sentiment
    const analysis = await analyzeSentimentWithSchedule({
      userId: testUserId,
      transcription: testTranscription,
      conversationId,
      todayEvents: testEvents,
      conversationHistory: []
    });
    
    console.log("\n📊 Analysis Results:");
    console.log(`Mood Score: ${analysis.moodScore}/10`);
    console.log(`Energy: ${analysis.energyLevel}, Stress: ${analysis.stressLevel}`);
    console.log(`Response: "${analysis.conversationalResponse.text}"`);
    console.log(`Schedule Correlation: ${JSON.stringify(analysis.scheduleCorrelation, null, 2)}`);
    
    res.json({
      success: true,
      test: "conversational_mood_tracking",
      conversationId,
      transcription: testTranscription,
      analysis
    });
    
  } catch (error) {
    console.error("❌ Test error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /conversation/generate-tts
 * @desc    Generate TTS audio for breathing guidance (no conversation context needed)
 * @access  Public
 * @body    {text}
 * @returns {Object} {audioUrl}
 */
router.post("/generate-tts", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
    
    if (!ELEVENLABS_API_KEY) {
      console.warn("⚠️  ElevenLabs API key not configured");
      return res.json({ audioUrl: null, cached: false });
    }
    
    console.log(`🎙️  Generating TTS for: "${text.substring(0, 50)}..."`);
    
    // Generate TTS with ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2, // Calm, meditative
            use_speaker_boost: true
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    // Store in Supabase Storage
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const fileName = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("session-audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg"
      });
    
    if (uploadError) {
      console.error("⚠️  Failed to upload TTS audio:", uploadError);
      return res.json({ audioUrl: null, cached: false });
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from("session-audio")
      .getPublicUrl(fileName);
    
    console.log("✅ TTS audio generated:", urlData.publicUrl);
    
    res.json({
      success: true,
      audioUrl: urlData.publicUrl,
      cached: false
    });
    
  } catch (error) {
    console.error("❌ TTS generation error:", error);
    res.status(500).json({ error: error.message, audioUrl: null });
  }
});

export default router;
