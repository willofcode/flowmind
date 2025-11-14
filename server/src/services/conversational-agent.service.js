/**
 * Conversational Agentic Workflow Service
 * 
 * Purpose: Leverage mAIstro for sentiment analysis and conversational mood tracking
 *          Cross-references schedule events to provide better mood scoring and recommendations
 * 
 * Features:
 *   - STT transcription analysis with mAIstro sentiment detection
 *   - Schedule-aware mood scoring (correlates events with emotional state)
 *   - Multi-turn conversation management with context retention
 *   - ElevenLabs TTS for natural response delivery
 *   - Continuous improvement through conversation history analysis
 * 
 * Flow:
 *   User (STT) → Backend (Transcription) → mAIstro (Sentiment + Schedule Analysis) 
 *   → Backend (Score Calculation) → mAIstro (Conversational Response) 
 *   → ElevenLabs (TTS) → User (Audio Response)
 * 
 * @module services/conversational-agent
 */

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const NS_MAISTRO_ENDPOINT = "https://neuralseekai.azurewebsites.net/maistro";
const NS_EMBED_CODE = process.env.NS_EMBED_CODE;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice (calm, empathetic)

/**
 * Analyze user's voice transcription with sentiment analysis and schedule correlation
 * 
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.transcription - STT transcription of user's voice
 * @param {string} params.conversationId - Current conversation session ID
 * @param {Array} params.todayEvents - Today's calendar events for correlation
 * @param {Object} params.conversationHistory - Previous conversation turns
 * @returns {Promise<Object>} Sentiment analysis with mood score and conversational response
 */
export async function analyzeSentimentWithSchedule({
  userId,
  transcription,
  conversationId,
  todayEvents = [],
  conversationHistory = [],
  calculatedMetrics = null, // Pre-calculated metrics from client
  scheduleContext = null // Pre-calculated schedule context from client
}) {
  try {
    console.log(`\n🧠 Starting sentiment analysis for user: ${userId}`);
    
    // Use pre-calculated schedule context if available, otherwise calculate
    let finalScheduleContext = scheduleContext;
    if (!finalScheduleContext) {
      finalScheduleContext = await calculateScheduleContext(userId, todayEvents);
      console.log(`📊 Calculated Schedule Context:`, finalScheduleContext);
    } else {
      console.log(`📊 Using pre-calculated Schedule Context:`, finalScheduleContext);
    }
    
    // STEP 2: Get user's neuro profile for personalization
    const userProfile = await getUserNeuroProfile(userId);
    
    // STEP 3: Build mAIstro sentiment analysis prompt
    const sentimentPrompt = buildSentimentAnalysisPrompt({
      transcription,
      scheduleContext: finalScheduleContext,
      userProfile,
      conversationHistory,
      calculatedMetrics // Pass pre-calculated metrics for context
    });
    
    // STEP 4: Call mAIstro for sentiment analysis
    const sentimentAnalysis = await callMaistroForSentiment(sentimentPrompt, conversationHistory);
    
    // STEP 5: Calculate mood score - blend pre-calculated with sentiment if available
    let finalMoodScore;
    let finalEnergyLevel;
    let finalStressLevel;
    
    if (calculatedMetrics) {
      // Blend schedule-based metrics with sentiment analysis
      console.log(`📊 Blending pre-calculated metrics with sentiment analysis`);
      
      // Weight: 60% schedule-based, 40% sentiment-based
      finalMoodScore = Math.round(
        calculatedMetrics.moodScore * 0.6 + sentimentAnalysis.rawMoodScore * 0.4
      );
      
      // Use sentiment to adjust energy/stress if they indicate high intensity
      finalEnergyLevel = sentimentAnalysis.energyLevel || calculatedMetrics.energyLevel;
      finalStressLevel = sentimentAnalysis.stressLevel || calculatedMetrics.stressLevel;
      
      console.log(`✅ Final blended metrics: Mood=${finalMoodScore}, Energy=${finalEnergyLevel}, Stress=${finalStressLevel}`);
    } else {
      // Use original calculation method
      finalMoodScore = calculateScheduleAwareMoodScore(
        sentimentAnalysis.rawMoodScore,
        finalScheduleContext,
        sentimentAnalysis.stressIndicators
      );
      finalEnergyLevel = sentimentAnalysis.energyLevel;
      finalStressLevel = sentimentAnalysis.stressLevel;
    }
    
    // STEP 6: Generate conversational response with mAIstro
    const conversationalResponse = await generateConversationalResponse({
      sentimentAnalysis,
      moodScore: finalMoodScore,
      scheduleContext: finalScheduleContext,
      userProfile,
      conversationHistory,
      transcription
    });
    
    // STEP 7: Store conversation turn in database
    await storeConversationTurn({
      userId,
      conversationId,
      userMessage: transcription,
      agentMessage: conversationalResponse.text,
      moodScore: finalMoodScore,
      energyLevel: finalEnergyLevel,
      stressLevel: finalStressLevel,
      sentimentAnalysis,
      scheduleContext: finalScheduleContext
    });
    
    // STEP 8: Update user profile with latest mood metrics
    await updateUserProfileMetrics({
      userId,
      moodScore: finalMoodScore,
      energyLevel: finalEnergyLevel,
      stressLevel: finalStressLevel
    });
    
    // STEP 9: Generate TTS audio with ElevenLabs
    const audioUrl = await generateTTSResponse(conversationalResponse.text);
    
    console.log(`✅ Sentiment analysis complete. Mood Score: ${finalMoodScore}/10`);
    
    return {
      success: true,
      moodScore: finalMoodScore,
      energyLevel: finalEnergyLevel,
      stressLevel: finalStressLevel,
      emotionalState: sentimentAnalysis.emotionalState,
      scheduleCorrelation: sentimentAnalysis.scheduleCorrelation,
      conversationalResponse: {
        text: conversationalResponse.text,
        audioUrl,
        intent: conversationalResponse.intent,
        suggestions: conversationalResponse.suggestions
      },
      analysis: {
        triggers: sentimentAnalysis.triggers,
        patterns: sentimentAnalysis.patterns,
        recommendations: conversationalResponse.recommendations,
        confidence: sentimentAnalysis.confidence
      }
    };
    
  } catch (error) {
    console.error("❌ Sentiment analysis error:", error);
    return {
      success: false,
      error: error.message,
      moodScore: 5, // Neutral fallback
      conversationalResponse: {
        text: "I'm having trouble processing that right now. Could you tell me more about how you're feeling?",
        audioUrl: null,
        intent: "clarification"
      }
    };
  }
}

/**
 * Calculate schedule context for mood correlation
 */
async function calculateScheduleContext(userId, todayEvents) {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));
  
  // Analyze today's events
  const totalEvents = todayEvents.length;
  const upcomingEvents = todayEvents.filter(e => new Date(e.start) > now);
  const recentEvents = todayEvents.filter(e => {
    const eventEnd = new Date(e.end);
    const hoursSince = (now - eventEnd) / (1000 * 60 * 60);
    return hoursSince >= 0 && hoursSince <= 2; // Events in last 2 hours
  });
  
  // Calculate schedule density
  const totalMinutes = 16 * 60; // Assuming 8am-12am active day
  const busyMinutes = todayEvents.reduce((sum, event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return sum + (end - start) / (1000 * 60);
  }, 0);
  
  const density = busyMinutes / totalMinutes;
  let intensityLevel = 'low';
  if (density > 0.7) intensityLevel = 'high';
  else if (density > 0.4) intensityLevel = 'medium';
  
  // Find current activity
  const currentEvent = todayEvents.find(e => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return now >= start && now <= end;
  });
  
  // Calculate time to next event
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const minutesToNext = nextEvent 
    ? Math.round((new Date(nextEvent.start) - now) / (1000 * 60))
    : null;
  
  return {
    totalEvents,
    upcomingEventsCount: upcomingEvents.length,
    recentEvents: recentEvents.map(e => ({
      title: e.summary || e.title,
      startTime: new Date(e.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(e.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    })),
    currentActivity: currentEvent ? {
      title: currentEvent.summary || currentEvent.title,
      endsIn: Math.round((new Date(currentEvent.end) - now) / (1000 * 60))
    } : null,
    nextEvent: nextEvent ? {
      title: nextEvent.summary || nextEvent.title,
      startsIn: minutesToNext
    } : null,
    scheduleIntensity: intensityLevel,
    density: Math.round(density * 100),
    busyHours: Math.round(busyMinutes / 60 * 10) / 10
  };
}

/**
 * Get user's neurodivergent profile for personalized analysis
 */
async function getUserNeuroProfile(userId) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("neuro_preferences, personality_traits")
    .eq("user_id", userId)
    .single();
  
  return profile || {
    neuro_preferences: {},
    personality_traits: {}
  };
}

/**
 * Build sentiment analysis prompt for mAIstro
 */
function buildSentimentAnalysisPrompt({ transcription, scheduleContext, userProfile, conversationHistory, calculatedMetrics }) {
  const conversationContext = conversationHistory.length > 0
    ? `\nPrevious conversation context:\n${conversationHistory.slice(-3).map(turn => 
        `${turn.role}: ${turn.message}`
      ).join('\n')}`
    : '';
  
  const preCalculatedContext = calculatedMetrics
    ? `\nPRE-CALCULATED SCHEDULE-BASED METRICS (from client):
- Mood Score (schedule pattern): ${calculatedMetrics.moodScore}/10
- Energy Level: ${calculatedMetrics.energyLevel}
- Stress Level: ${calculatedMetrics.stressLevel}
- Pattern: ${calculatedMetrics.reasoning}

These metrics were calculated from yesterday's and today's schedule patterns. Your sentiment analysis will be blended with these.`
    : '';
  
  return `You are a compassionate mental health assistant analyzing a user's emotional state from their voice transcription.

USER TRANSCRIPTION:
"${transcription}"

TODAY'S SCHEDULE CONTEXT:
- Total events today: ${scheduleContext.totalEvents || 'Unknown'}
- Schedule intensity: ${scheduleContext.todayIntensity || scheduleContext.scheduleIntensity || 'Unknown'}
- Ratio: ${scheduleContext.todayRatio || scheduleContext.density || 'Unknown'}%
${scheduleContext.currentActivity ? `- Currently in: ${scheduleContext.currentActivity.title} (ends in ${scheduleContext.currentActivity.endsIn} min)` : '- No current activity'}
${scheduleContext.nextEvent ? `- Next event: ${scheduleContext.nextEvent.title} (in ${scheduleContext.nextEvent.startsIn} min)` : '- No upcoming events'}
${scheduleContext.recentEvents && scheduleContext.recentEvents.length > 0 ? `- Recent events: ${scheduleContext.recentEvents.map(e => e.title).join(', ')}` : ''}
${preCalculatedContext}

USER PROFILE:
- Neurodivergent traits: ${JSON.stringify(userProfile?.personality_traits || {})}
${conversationContext}

TASK:
Analyze the user's emotional state from their transcription. ${calculatedMetrics ? 'Consider the pre-calculated schedule-based metrics as a baseline and adjust based on what the user actually said.' : 'Identify correlations with their schedule.'}

Return a JSON object with:

{
  "rawMoodScore": <1-10, where 1=very distressed, 10=excellent>,
  "energyLevel": <"very_low" | "low" | "moderate" | "high" | "very_high">,
  "stressLevel": <"calm" | "mild" | "moderate" | "high" | "overwhelming">,
  "emotionalState": {
    "primary": <main emotion: "happy" | "anxious" | "overwhelmed" | "calm" | "frustrated" | "excited" | etc>,
    "secondary": <secondary emotion if present>,
    "intensity": <1-10>
  },
  "stressIndicators": [<list of stress markers from transcription>],
  "scheduleCorrelation": {
    "eventsAffectingMood": [<list of schedule items that may be influencing mood>],
    "correlationType": <"schedule_overload" | "lack_of_breaks" | "event_anxiety" | "post_event_relief" | "anticipatory_stress" | "balanced">,
    "confidence": <0.0-1.0>
  },
  "triggers": [<identified mood triggers from schedule + transcription>],
  "patterns": [<observable patterns, e.g. "energy drop after consecutive meetings">],
  "confidence": <0.0-1.0, your confidence in this analysis>
}

Be empathetic and neurodivergent-aware in your analysis. Consider ADHD task-switching costs, autistic sensory overload, and executive function challenges.`;
}

/**
 * Call mAIstro API for sentiment analysis
 */
async function callMaistroForSentiment(prompt, conversationHistory) {
  try {
    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "embedcode": NS_EMBED_CODE
      },
      body: JSON.stringify({
        ntl: prompt,
        context: conversationHistory.slice(-5), // Last 5 turns for context
        parameters: {
          temperature: 0.7,
          max_tokens: 1000
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`mAIstro API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const analysisText = data.answer || data.response || JSON.stringify(data);
    
    // Parse JSON from mAIstro response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback parsing if no JSON found
    console.warn("⚠️  Could not parse JSON from mAIstro, using fallback");
    return {
      rawMoodScore: 5,
      energyLevel: "moderate",
      stressLevel: "moderate",
      emotionalState: { primary: "uncertain", intensity: 5 },
      stressIndicators: [],
      scheduleCorrelation: { eventsAffectingMood: [], correlationType: "balanced", confidence: 0.5 },
      triggers: [],
      patterns: [],
      confidence: 0.5
    };
    
  } catch (error) {
    console.error("❌ mAIstro sentiment call error:", error);
    throw error;
  }
}

/**
 * Calculate schedule-aware mood score
 * Adjusts raw mood score based on schedule intensity and stress indicators
 */
function calculateScheduleAwareMoodScore(rawMoodScore, scheduleContext, stressIndicators) {
  let adjustedScore = rawMoodScore;
  
  // Penalty for high-intensity schedules if user shows stress
  if (scheduleContext.scheduleIntensity === 'high' && stressIndicators.length > 2) {
    adjustedScore -= 1;
  }
  
  // Bonus for balanced schedules with positive mood
  if (scheduleContext.scheduleIntensity === 'low' && rawMoodScore >= 7) {
    adjustedScore += 0.5;
  }
  
  // Penalty for back-to-back events (no breaks)
  if (scheduleContext.recentEvents.length >= 2 && scheduleContext.nextEvent?.startsIn < 15) {
    adjustedScore -= 0.5;
  }
  
  // Normalize to 1-10 range
  return Math.max(1, Math.min(10, Math.round(adjustedScore * 10) / 10));
}

/**
 * Generate conversational response with mAIstro
 */
async function generateConversationalResponse({
  sentimentAnalysis,
  moodScore,
  scheduleContext,
  userProfile,
  conversationHistory,
  transcription
}) {
  const conversationalPrompt = `You are FlowMind's compassionate AI assistant helping a neurodivergent user manage their day.

USER'S CURRENT STATE:
- Mood Score: ${moodScore}/10
- Energy Level: ${sentimentAnalysis.energyLevel}
- Stress Level: ${sentimentAnalysis.stressLevel}
- Primary Emotion: ${sentimentAnalysis.emotionalState.primary}
- Schedule Intensity: ${scheduleContext.scheduleIntensity}

SCHEDULE CORRELATION:
${JSON.stringify(sentimentAnalysis.scheduleCorrelation, null, 2)}

USER SAID:
"${transcription}"

CONVERSATION HISTORY:
${conversationHistory.slice(-3).map(turn => `${turn.role}: ${turn.message}`).join('\n')}

TASK:
Generate a compassionate, neurodivergent-friendly response that:
1. Acknowledges their emotional state empathetically
2. References specific schedule challenges if relevant
3. Offers 1-2 concrete, actionable suggestions
4. Maintains conversational flow (ask follow-up questions if needed)
5. Uses gentle, non-judgmental language

Return JSON:
{
  "text": "<your conversational response, 2-3 sentences max>",
  "intent": "<"supportive" | "probing" | "recommending" | "celebrating" | "clarifying">",
  "suggestions": [<1-2 specific micro-actions they can take now>],
  "recommendations": [<wellness activities to consider based on schedule gaps>]
}

Examples of good responses:
- "I hear you're feeling overwhelmed. With 3 back-to-back meetings this morning, that makes sense. Would a 5-minute breathing break before your next call help?"
- "It sounds like you're in a good flow! Your schedule has some nice gaps today. Want me to suggest some energizing activities for later?"
- "That's a lot on your plate. I notice you're between events right now - could we find 10 minutes for something restorative?"

Keep it warm, brief, and actionable.`;

  try {
    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "embedcode": NS_EMBED_CODE
      },
      body: JSON.stringify({
        ntl: conversationalPrompt,
        context: conversationHistory.slice(-5),
        parameters: {
          temperature: 0.8, // More creative for natural conversation
          max_tokens: 500
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`mAIstro conversation API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const responseText = data.answer || data.response || JSON.stringify(data);
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback response
    return {
      text: responseText.substring(0, 300),
      intent: "supportive",
      suggestions: ["Take a moment to breathe", "Check in with yourself"],
      recommendations: []
    };
    
  } catch (error) {
    console.error("❌ Conversational response error:", error);
    return {
      text: "I'm here with you. What would help you most right now?",
      intent: "clarifying",
      suggestions: [],
      recommendations: []
    };
  }
}

/**
 * Store conversation turn in database
 */
async function storeConversationTurn({
  userId,
  conversationId,
  userMessage,
  agentMessage,
  moodScore,
  energyLevel,
  stressLevel,
  sentimentAnalysis,
  scheduleContext
}) {
  try {
    // Store user message
    const { error: userError } = await supabase.from("conversations").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "user",
      message: userMessage,
      mood_score: moodScore,
      context: {
        sentiment: sentimentAnalysis,
        schedule: scheduleContext,
        energyLevel,
        stressLevel
      },
      created_at: new Date().toISOString()
    });
    
    if (userError) {
      console.error("⚠️  Failed to store user message:", userError);
      throw userError;
    }
    
    // Store agent response
    const { error: agentError } = await supabase.from("conversations").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "assistant",
      message: agentMessage,
      mood_score: moodScore,
      intent: "response",
      context: {
        energyLevel,
        stressLevel
      },
      created_at: new Date().toISOString()
    });
    
    if (agentError) {
      console.error("⚠️  Failed to store agent message:", agentError);
      throw agentError;
    }
    
    console.log("✅ Conversation turn stored successfully");
  } catch (error) {
    console.error("❌ Failed to store conversation:", error);
    throw error; // Re-throw to handle upstream
  }
}

/**
 * Generate TTS audio with ElevenLabs
 */
async function generateTTSResponse(text) {
  if (!ELEVENLABS_API_KEY) {
    console.warn("⚠️  ElevenLabs API key not configured, skipping TTS");
    return null;
  }
  
  try {
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
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3, // Gentle, conversational
            use_speaker_boost: true
          }
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    
    // Store in Supabase Storage (optional - for caching)
    const fileName = `tts_${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("session-audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg"
      });
    
    if (uploadError) {
      console.error("⚠️  Failed to upload TTS audio:", uploadError);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from("session-audio")
      .getPublicUrl(fileName);
    
    console.log("✅ TTS audio generated and stored");
    return urlData.publicUrl;
    
  } catch (error) {
    console.error("❌ TTS generation error:", error);
    return null;
  }
}

/**
 * Get conversation history for context
 */
export async function getConversationHistory(userId, conversationId, limit = 10) {
  const { data, error } = await supabase
    .from("conversations")
    .select("role, message, mood_score, context, created_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error("❌ Failed to fetch conversation history:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Update user profile with latest mood metrics
 */
async function updateUserProfileMetrics({ userId, moodScore, energyLevel, stressLevel }) {
  try {
    // First, check if user profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // Not a "not found" error
      console.error("⚠️  Error fetching user profile:", fetchError);
      return;
    }
    
    // Prepare mood metrics update
    const currentMoodMetrics = {
      moodScore,
      energyLevel,
      stressLevel,
      lastUpdated: new Date().toISOString()
    };
    
    if (existingProfile) {
      // Update existing profile - merge with existing neuro_preferences
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          neuro_preferences: {
            ...(existingProfile.neuro_preferences || {}),
            currentMood: currentMoodMetrics
          },
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
      
      if (updateError) {
        console.error("⚠️  Failed to update user profile:", updateError);
      } else {
        console.log(`✅ Updated user profile with mood metrics: ${moodScore}/10`);
      }
    } else {
      // Create new profile if doesn't exist
      const { error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: userId,
          neuro_preferences: {
            currentMood: currentMoodMetrics
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error("⚠️  Failed to create user profile:", insertError);
      } else {
        console.log(`✅ Created user profile with mood metrics: ${moodScore}/10`);
      }
    }
  } catch (error) {
    console.error("❌ Error updating user profile metrics:", error);
  }
}

/**
 * Start a new conversation session
 */
export async function startConversationSession(userId) {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store session metadata
  await supabase.from("ai_orchestration_sessions").insert({
    user_id: userId,
    session_type: "conversational_mood_tracking",
    session_id: conversationId,
    created_at: new Date().toISOString()
  });
  
  return conversationId;
}

export default {
  analyzeSentimentWithSchedule,
  getConversationHistory,
  startConversationSession
};
