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
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";

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
    const { 
      userId, 
      conversationId, 
      transcription, 
      todayEvents, 
      calculatedMetrics,
      scheduleContext 
    } = req.body;
    
    if (!userId || !conversationId || !transcription) {
      return res.status(400).json({ 
        error: "userId, conversationId, and transcription are required" 
      });
    }
    
    console.log(`\n📝 Analyzing sentiment for conversation: ${conversationId}`);
    console.log(`Transcription: "${transcription}"`);
    
    // Use pre-calculated metrics from client if available
    if (calculatedMetrics) {
      console.log('📊 Using pre-calculated mood metrics from schedule:', calculatedMetrics);
    }
    if (scheduleContext) {
      console.log('📅 Schedule context:', scheduleContext);
    }
    
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
      conversationHistory,
      calculatedMetrics, // Pass pre-calculated metrics
      scheduleContext
    });
    
    if (!analysis.success) {
      return res.status(500).json({ 
        error: "Sentiment analysis failed",
        details: analysis.error 
      });
    }
    
    console.log(`✅ Analysis complete. Mood: ${analysis.moodScore}/10, Energy: ${analysis.energyLevel}, Stress: ${analysis.stressLevel}`);
    
    res.json({
      success: true,
      conversationId,
      moodScore: analysis.moodScore,
      energyLevel: analysis.energyLevel,
      stressLevel: analysis.stressLevel,
      emotionalState: analysis.emotionalState,
      conversationalResponse: analysis.conversationalResponse?.text || analysis.conversationalResponse,
      recommendations: analysis.analysis?.recommendations || [],
      scheduleCorrelation: analysis.scheduleCorrelation,
      reasoning: calculatedMetrics?.reasoning,
      ttsAudioUrl: analysis.conversationalResponse?.ttsAudioUrl,
      analysis: {
        triggers: analysis.analysis?.triggers || [],
        patterns: analysis.analysis?.patterns || [],
        confidence: analysis.analysis?.confidence || 0.5
      }
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
    const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // Default voice
    const MOCK_MODE = process.env.TTS_MOCK_MODE === 'true';
    
    if (!ELEVENLABS_API_KEY || MOCK_MODE) {
      console.warn(`⚠️  TTS in mock mode (${MOCK_MODE ? 'TTS_MOCK_MODE=true' : 'no API key'})`);
      // Return a tiny silent MP3 data URI (1 second of silence)
      const silentMp3Base64 = "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7////////////////////////////////////////////AAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAAAAwAAAAAAMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zFGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
      return res.json({ 
        audioUrl: `data:audio/mpeg;base64,${silentMp3Base64}`, 
        cached: false, 
        mock: true 
      });
    }
    
    console.log(`🎙️  Generating TTS for: "${text.substring(0, 50)}..."`);
    
    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({
      apiKey: ELEVENLABS_API_KEY
    });
    
    // Generate audio stream
    const audioStream = await elevenlabs.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.8,
      }
    });
    
    // Convert stream to buffer
    const chunks = [];
    const reader = audioStream.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const audioBuffer = Buffer.concat(chunks);
    console.log(`✅ Generated ${audioBuffer.length} bytes of audio`);
    
    // Try to store in Supabase Storage (optional - fallback to base64 if fails)
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
      console.warn("⚠️  Storage bucket not found, returning base64 audio");
      console.warn("   Run server/db_setup/create-storage-buckets.sql in Supabase");
      
      // Fallback: return base64-encoded audio
      const base64Audio = audioBuffer.toString('base64');
      const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
      
      return res.json({
        success: true,
        audioUrl: dataUri,
        cached: false,
        fallback: true
      });
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from("session-audio")
      .getPublicUrl(fileName);
    
    console.log("✅ TTS audio uploaded:", urlData.publicUrl);
    
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
