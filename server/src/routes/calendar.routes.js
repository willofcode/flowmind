/**
 * Calendar Optimization Routes
 * 
 * Purpose: Expose agentic calendar optimization endpoints
 * Dependencies: express, calendar-optimizer.service
 * 
 * Endpoints:
 *   POST /calendar/optimize - Run calendar optimization for user
 *   GET /calendar/optimization-history - Get past optimizations
 *   GET /calendar/schedule-analysis - Analyze schedule without optimization
 * 
 * @module routes/calendar
 */

import express from "express";
import calendarOptimizerService from "../services/calendar-optimizer.service.js";
import { supabase } from "../config/database.js";

const { 
  optimizeCalendar, 
  getOptimizationHistory,
  calculateScheduleIntensity,
  findAvailableGaps
} = calendarOptimizerService;

const router = express.Router();

/**
 * POST /calendar/optimize
 * 
 * Run agentic calendar optimization workflow
 * 
 * Request Body:
 *   - userId: string (required)
 *   - accessToken: string (required) - Google Calendar OAuth token
 *   - targetDate: string (optional) - ISO date string, defaults to today
 * 
 * Response:
 *   - success: boolean
 *   - optimizationId: string
 *   - summary: object with schedule analysis
 *   - createdEvents: array of created calendar events
 *   - recommendations: array of AI-generated suggestions
 */
router.post("/optimize", async (req, res) => {
  try {
    const { userId, accessToken, targetDate } = req.body;
    
    // Validate inputs
    if (!userId) {
      return res.status(400).json({ 
        error: "Missing required field: userId" 
      });
    }
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: "Missing required field: accessToken. User must connect Google Calendar first." 
      });
    }
    
    // Parse target date
    const dateToOptimize = targetDate ? new Date(targetDate) : new Date();
    
    console.log(`📅 Optimizing calendar for user ${userId} on ${dateToOptimize.toDateString()}`);
    
    // Run optimization
    const result = await optimizeCalendar({
      userId,
      accessToken,
      targetDate: dateToOptimize
    });
    
    res.json(result);
    
  } catch (err) {
    console.error("Calendar optimization error:", err);
    
    // Handle Google Calendar API errors
    if (err.message.includes('Google Calendar API')) {
      return res.status(401).json({
        error: "Google Calendar access failed. Please reconnect your calendar.",
        details: err.message
      });
    }
    
    res.status(500).json({ 
      error: err.message,
      details: "Calendar optimization failed. See server logs for details."
    });
  }
});

/**
 * GET /calendar/optimization-history
 * 
 * Get past calendar optimizations for user
 * 
 * Query Parameters:
 *   - userId: string (required)
 *   - limit: number (optional, default 10)
 * 
 * Response:
 *   - history: array of optimization sessions
 */
router.get("/optimization-history", async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        error: "Missing required parameter: userId" 
      });
    }
    
    const history = await getOptimizationHistory(userId, parseInt(limit));
    
    res.json({ 
      history,
      count: history.length
    });
    
  } catch (err) {
    console.error("Optimization history error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /calendar/analyze
 * 
 * Analyze schedule without making changes
 * Useful for previewing optimization recommendations
 * 
 * Request Body:
 *   - userId: string (required)
 *   - accessToken: string (required)
 *   - targetDate: string (optional)
 * 
 * Response:
 *   - scheduleIntensity: object with intensity analysis
 *   - gaps: array of available time gaps
 *   - recommendations: AI-generated suggestions (preview only)
 */
router.post("/analyze", async (req, res) => {
  try {
    const { userId, accessToken, targetDate } = req.body;
    
    if (!userId || !accessToken) {
      return res.status(400).json({ 
        error: "Missing required fields: userId, accessToken" 
      });
    }
    
    const dateToAnalyze = targetDate ? new Date(targetDate) : new Date();
    const dayStart = new Date(dateToAnalyze);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dateToAnalyze);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Fetch FreeBusy data
    const freeBusyResponse = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: "primary" }]
      })
    });
    
    if (!freeBusyResponse.ok) {
      throw new Error(`Google Calendar API error: ${freeBusyResponse.statusText}`);
    }
    
    const freeBusyData = await freeBusyResponse.json();
    const busyBlocks = freeBusyData.calendars?.primary?.busy || [];
    
    // Get user profile
    const { data: userData } = await supabase
      .from('user_current_state')
      .select('neuro_preferences')
      .eq('id', userId)
      .single();
    
    const neuroProfile = userData?.neuro_preferences || {};
    const sleepSchedule = neuroProfile.sleepSchedule;
    const energyWindows = neuroProfile.energyWindows || [];
    
    // Calculate intensity
    const scheduleIntensity = calculateScheduleIntensity(
      busyBlocks,
      dayStart,
      dayEnd,
      sleepSchedule
    );
    
    // Find gaps
    const gaps = findAvailableGaps(busyBlocks, dayStart, dayEnd, energyWindows);
    
    // Generate basic recommendations
    const recommendations = [];
    
    if (scheduleIntensity.level === 'high') {
      recommendations.push('⚠️ High schedule density detected. Consider adding breathing breaks.');
      recommendations.push(`You have ${scheduleIntensity.busyMinutes} busy minutes today (${Math.round(scheduleIntensity.ratio * 100)}%)`);
    } else if (scheduleIntensity.level === 'medium') {
      recommendations.push('📊 Moderate schedule. Good balance of busy time and breaks.');
      recommendations.push('Consider adding meals and movement snacks in available gaps.');
    } else {
      recommendations.push('✅ Light schedule today. Great opportunity for workouts and self-care.');
      recommendations.push('You have ample time for longer activities during energy peaks.');
    }
    
    if (gaps.length === 0) {
      recommendations.push('🔴 No gaps found. Consider moving or shortening some events.');
    } else if (gaps.length < 3) {
      recommendations.push('🟡 Limited gaps available. Focus on quick activities.');
    } else {
      recommendations.push(`🟢 ${gaps.length} gaps available for optimization.`);
    }
    
    res.json({
      date: dateToAnalyze.toDateString(),
      scheduleIntensity,
      gaps: gaps.map(g => ({
        ...g,
        startTime: new Date(g.start).toLocaleTimeString(),
        endTime: new Date(g.end).toLocaleTimeString()
      })),
      recommendations,
      summary: {
        totalBusyBlocks: busyBlocks.length,
        totalGaps: gaps.length,
        totalAvailableMinutes: gaps.reduce((sum, g) => sum + g.minutes, 0),
        energyPeakGaps: gaps.filter(g => g.inEnergyWindow).length
      }
    });
    
  } catch (err) {
    console.error("Schedule analysis error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /calendar/manual-activity
 * 
 * Manually create a specific activity in calendar
 * 
 * Request Body:
 *   - accessToken: string (required)
 *   - activityType: 'breathing'|'movement'|'meal'|'workout' (required)
 *   - startISO: string (required) - ISO datetime
 *   - duration: number (optional) - minutes, defaults based on activity type
 * 
 * Response:
 *   - event: created Google Calendar event
 */
router.post("/manual-activity", async (req, res) => {
  try {
    const { accessToken, activityType, startISO, duration } = req.body;
    
    if (!accessToken || !activityType || !startISO) {
      return res.status(400).json({ 
        error: "Missing required fields: accessToken, activityType, startISO" 
      });
    }
    
    // Set default durations
    const durations = {
      breathing: 5,
      movement: 15,
      meal: 30,
      workout: 45
    };
    
    const eventDuration = duration || durations[activityType] || 10;
    const startDate = new Date(startISO);
    const endDate = new Date(startDate.getTime() + eventDuration * 60000);
    
    // Create event config
    const configs = {
      breathing: {
        summary: `🫁 Breathing Break (${eventDuration} min)`,
        description: 'Calm your nervous system with guided breathing',
        colorId: '7'
      },
      movement: {
        summary: `🚶 Movement Break (${eventDuration} min)`,
        description: 'Quick movement to reset energy',
        colorId: '10'
      },
      meal: {
        summary: `🍽️ Meal Time (${eventDuration} min)`,
        description: 'Time to nourish your body',
        colorId: '6'
      },
      workout: {
        summary: `💪 Workout (${eventDuration} min)`,
        description: 'Full workout session',
        colorId: '11'
      }
    };
    
    const config = configs[activityType];
    if (!config) {
      return res.status(400).json({ 
        error: `Invalid activityType. Must be one of: ${Object.keys(configs).join(', ')}` 
      });
    }
    
    // Create in Google Calendar
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: config.summary,
          description: config.description,
          start: { 
            dateTime: startDate.toISOString(), 
            timeZone: "America/New_York" 
          },
          end: { 
            dateTime: endDate.toISOString(), 
            timeZone: "America/New_York" 
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 10 },
              { method: 'popup', minutes: 3 },
              { method: 'popup', minutes: 1 }
            ]
          },
          colorId: config.colorId
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }
    
    const event = await response.json();
    
    res.json({
      success: true,
      event: {
        id: event.id,
        htmlLink: event.htmlLink,
        summary: event.summary,
        start: event.start,
        end: event.end
      }
    });
    
  } catch (err) {
    console.error("Manual activity creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /calendar/get-calendar-events
 * 
 * Fetch calendar events for a given time range
 * Used by the mobile app to display calendar events
 * 
 * Request Body:
 *   - accessToken: string (required) - Google Calendar OAuth token
 *   - timeMin: string (required) - ISO date string
 *   - timeMax: string (required) - ISO date string
 * 
 * Response:
 *   - events: array of calendar events
 */
router.post("/get-calendar-events", async (req, res) => {
  try {
    const { accessToken, timeMin, timeMax } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ 
        error: "Missing required field: accessToken" 
      });
    }
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({ 
        error: "Missing required fields: timeMin and timeMax" 
      });
    }
    
    console.log(`📅 Fetching calendar events from ${timeMin} to ${timeMax}`);
    
    // Fetch events from Google Calendar API
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Calendar API error: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Found ${data.items?.length || 0} calendar events`);
    
    res.json({
      success: true,
      events: data.items || []
    });
    
  } catch (err) {
    console.error("❌ Fetch calendar events error:", err);
    res.status(500).json({ 
      error: err.message,
      details: "Failed to fetch calendar events"
    });
  }
});

export default router;
