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

// ============================================================================
// Profile Management (Supabase)
// ============================================================================

app.post("/profile", async (req, res) => {
  try {
    const { userId, profile } = req.body;
    
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, profile_data: profile, updated_at: new Date().toISOString() })
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error("Profile save error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("profile_data")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Profile not found" });
      }
      throw error;
    }

    res.json(data.profile_data);
  } catch (err) {
    console.error("Profile load error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Auth0 User Management
// ============================================================================

app.post("/update-user-name", async (req, res) => {
  try {
    const { name } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const accessToken = authHeader.split(' ')[1];
    
    // Get user info from Auth0 to get the user ID
    const userInfoResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/userinfo`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      throw new Error(`Failed to get user info: ${userInfoResponse.statusText}`);
    }

    const userInfo = await userInfoResponse.json();
    
    // Get Management API token
    const tokenResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get management token: ${tokenResponse.statusText}`);
    }

    const { access_token: managementToken } = await tokenResponse.json();

    // Update user name using Management API
    const updateResponse = await fetch(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userInfo.sub)}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${managementToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          user_metadata: { display_name: name }
        })
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.text();
      throw new Error(`Failed to update user: ${errorData}`);
    }

    res.json({ success: true, name });
  } catch (err) {
    console.error("Update user name error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Google Calendar Integration
// ============================================================================

app.post("/freebusy", async (req, res) => {
  try {
    const { accessToken, timeMin, timeMax } = req.body;
    
    const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }]
      })
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("FreeBusy error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/create-events", async (req, res) => {
  try {
    const { accessToken, events } = req.body;
    const results = [];

    for (const event of events) {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: event.summary,
            description: event.description,
            start: { dateTime: event.startISO, timeZone: "America/New_York" },
            end: { dateTime: event.endISO, timeZone: "America/New_York" },
            reminders: {
              useDefault: false,
              overrides: event.reminders || [
                { method: "popup", minutes: 10 },
                { method: "popup", minutes: 3 },
                { method: "popup", minutes: 1 }
              ]
            }
          })
        }
      );

      if (!response.ok) {
        console.error(`Failed to create event: ${event.summary}`);
        results.push({ error: response.statusText, event: event.summary });
      } else {
        const created = await response.json();
        results.push(created);
      }
    }

    res.json(results);
  } catch (err) {
    console.error("Create events error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// NeuralSeek Direct API Integration (Seek & mAIstro)
// ============================================================================

// Embed code for NeuralSeek API access
const NS_EMBED_CODE = process.env.NS_EMBED_CODE || "370207002";
const NS_SEEK_ENDPOINT = process.env.NS_SEEK_ENDPOINT || "https://stagingapi.neuralseek.com/v1/stony23/seek";
const NS_MAISTRO_ENDPOINT = process.env.NS_MAISTRO_ENDPOINT || "https://stagingapi.neuralseek.com/v1/stony23/maistro";

/**
 * NeuralSeek Seek endpoint - For knowledge base queries
 */
app.post("/seek", async (req, res) => {
  try {
    const { question, context } = req.body;

    const response = await fetch(NS_SEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "embedcode": NS_EMBED_CODE,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        context: context || {}
      })
    });

    if (!response.ok) {
      throw new Error(`NeuralSeek Seek API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Seek error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * NeuralSeek mAIstro endpoint - For AI agent interactions
 */
app.post("/maistro", async (req, res) => {
  try {
    const { prompt, context, parameters } = req.body;

    const response = await fetch(NS_MAISTRO_ENDPOINT, {
      method: "POST",
      headers: {
        "embedcode": NS_EMBED_CODE,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        context: context || {},
        parameters: parameters || {}
      })
    });

    if (!response.ok) {
      throw new Error(`NeuralSeek mAIstro API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("mAIstro error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Weekly Planning with NeuralSeek mAIstro
// ============================================================================

app.post("/plan-week", async (req, res) => {
  try {
    const { userProfile, weekStartISO, weekEndISO, accessToken } = req.body;

    // Step 1: Get busy blocks from Google Calendar if access token provided
    let busyBlocks = [];
    if (accessToken) {
      const freeBusyResponse = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          timeMin: weekStartISO,
          timeMax: weekEndISO,
          items: [{ id: "primary" }]
        })
      });

      if (freeBusyResponse.ok) {
        const freeBusyData = await freeBusyResponse.json();
        busyBlocks = freeBusyData.calendars?.primary?.busy || [];
      }
    }

    // Step 2: Build NeuralSeek mAIstro prompt
    const agentPrompt = buildNeuroAgentPrompt(userProfile, weekStartISO, weekEndISO, busyBlocks);

    // Step 3: Call NeuralSeek mAIstro directly using embed code
    const nsResponse = await fetch(NS_MAISTRO_ENDPOINT, {
      method: "POST",
      headers: {
        "embedcode": NS_EMBED_CODE,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: agentPrompt.instructions,
        context: {
          userProfile: agentPrompt.userProfile,
          weekRange: agentPrompt.weekRange,
          busyBlocks: agentPrompt.busyBlocks,
          constraints: agentPrompt.constraints
        },
        parameters: {
          temperature: 0.7,
          max_tokens: 4000,
          response_format: "json"
        }
      })
    });

    if (!nsResponse.ok) {
      throw new Error(`NeuralSeek mAIstro API error: ${nsResponse.statusText}`);
    }

    const planData = await nsResponse.json();
    
    // Step 4: Parse and structure the response
    const weeklyPlan = parseNeuralSeekResponse(planData, weekStartISO, weekEndISO);

    // Step 5: Save plan to Supabase for retrieval
    if (userProfile.userId) {
      await supabase
        .from("weekly_plans")
        .insert({
          user_id: userProfile.userId,
          week_start: weekStartISO,
          week_end: weekEndISO,
          plan_data: weeklyPlan,
          created_at: new Date().toISOString()
        });
    }

    res.json(weeklyPlan);
  } catch (err) {
    console.error("Plan week error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Build the prompt for NeuralSeek agent with neurodivergent-friendly constraints
 */
function buildNeuroAgentPrompt(profile, weekStart, weekEnd, busyBlocks) {
  return {
    userProfile: profile,
    weekRange: { start: weekStart, end: weekEnd },
    busyBlocks,
    constraints: {
      // Neurodivergent-friendly rules
      workoutDuration: profile.maxWorkoutMin || 40,
      energyWindows: profile.energyWindows,
      buffers: profile.bufferPolicy,
      consistencyPreference: "same-time-daily", // Help with habit formation
      fallbackEnabled: true, // Always provide micro-workout if day is packed
      microStepsRequired: true,
      alternativeOptionsRequired: true,
      maxDecisionPoints: 2, // Two choices max to reduce overwhelm
    },
    instructions: `
      You are planning a neurodivergent-friendly week for a user with ADHD/autism support needs.
      
      CRITICAL RULES:
      1. Prefer the SAME 60-90 minute time window daily for workouts (habit formation).
      2. Only schedule during declared energy windows: ${JSON.stringify(profile.energyWindows)}.
      3. Add ${profile.bufferPolicy.before}min BEFORE and ${profile.bufferPolicy.after}min AFTER each event.
      4. If a day is too packed, schedule a 10-15 min "movement snack" instead.
      5. Never schedule within 60 min of usual bedtime (${profile.sleep.usualBed}).
      6. Generate 3-5 micro-steps per activity (concrete, actionable).
      7. Provide ONE alternative option per day (A/B choice only).
      8. Dinner recipes: ≤45 min total, low sensory load (avoid ${profile.diet.avoid.join(", ")}).
      9. Output strict JSON with these keys: timePlan, workoutPlan, dinnerPlan, groceryList.
      
      Activities user enjoys: ${profile.workoutLikes.join(", ")}
      Diet style: ${profile.diet.style}
    `
  };
}

/**
 * Parse NeuralSeek response into structured WeeklyPlan
 */
function parseNeuralSeekResponse(nsData, weekStart, weekEnd) {
  // NeuralSeek should return Virtual KB output
  // This is a simplified parser - adjust based on actual NS response format
  
  const output = nsData.virtualKB || nsData.output || {};
  
  return {
    weekStart,
    weekEnd,
    timePlan: output.timePlan || { workoutBlocks: [], dinnerBlocks: [] },
    workoutPlan: output.workoutPlan || [],
    dinnerPlan: output.dinnerPlan || [],
    groceryList: output.groceryList || [],
    generatedAt: new Date().toISOString()
  };
}

// ============================================================================
// Weekly Plans Retrieval
// ============================================================================

app.get("/weekly-plan/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "No plan found" });
      }
      throw error;
    }

    res.json(data.plan_data);
  } catch (err) {
    console.error("Weekly plan retrieval error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    services: {
      neuralseek: {
        embedCode: NS_EMBED_CODE ? '✓ configured' : '✗ missing',
        seekEndpoint: NS_SEEK_ENDPOINT,
        maistroEndpoint: NS_MAISTRO_ENDPOINT
      },
      supabase: process.env.SUPABASE_URL ? '✓ configured' : '✗ missing'
    }
  });
});

// Get calendar events (list view, not just freebusy)
app.post("/get-calendar-events", async (req, res) => {
  try {
    const { accessToken, timeMin, timeMax } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.append("timeMin", timeMin);
    url.searchParams.append("timeMax", timeMax);
    url.searchParams.append("singleEvents", "true");
    url.searchParams.append("orderBy", "startTime");
    url.searchParams.append("maxResults", "100");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google Calendar API error:", response.status, errorData);
      
      // Check if it's an auth error (401/403)
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ 
          error: "Invalid or expired Google Calendar access token. Please reconnect Google Calendar.",
          details: errorData 
        });
      }
      
      throw new Error(`Google Calendar API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    res.json({ events: data.items || [] });
  } catch (err) {
    console.error("Get calendar events error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 FlowMind server running on http://localhost:${PORT}`);
  console.log(`   - NeuralSeek Embed Code: ${NS_EMBED_CODE ? '✓ configured' : '✗ missing'}`);
  console.log(`   - NeuralSeek Seek: ${NS_SEEK_ENDPOINT}`);
  console.log(`   - NeuralSeek mAIstro: ${NS_MAISTRO_ENDPOINT}`);
  console.log(`   - Supabase: ${process.env.SUPABASE_URL ? '✓ configured' : '✗ missing'}`);
});

