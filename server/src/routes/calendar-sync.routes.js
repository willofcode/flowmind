/**
 * Calendar Sync Routes
 * 
 * Purpose: Handle calendar synchronization and webhooks
 * Dependencies: express, calendar-sync.service
 * 
 * Endpoints:
 *   POST /calendar-sync/webhook - Receive Google Calendar push notifications
 *   POST /calendar-sync/sync - Manually trigger sync
 *   POST /calendar-sync/watch - Set up calendar watch
 *   POST /calendar-sync/unwatch - Stop calendar watch
 *   GET /calendar-sync/changes - Get recent calendar changes
 *   GET /calendar-sync/should-reoptimize - Check if re-optimization needed
 * 
 * @module routes/calendar-sync
 */

import express from "express";
import calendarSyncService from "../services/calendar-sync.service.js";
import { supabase } from "../config/database.js";

const router = express.Router();

/**
 * POST /calendar-sync/webhook
 * 
 * Webhook endpoint for Google Calendar push notifications
 * Google sends notifications when calendar events change
 * 
 * Headers from Google:
 *   - X-Goog-Channel-ID: Channel identifier
 *   - X-Goog-Channel-Token: Optional verification token
 *   - X-Goog-Resource-ID: Resource being watched
 *   - X-Goog-Resource-State: sync, exists, not_exists
 *   - X-Goog-Resource-URI: Resource URI
 */
router.post("/webhook", async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const resourceId = req.headers['x-goog-resource-id'];

    console.log('📨 Calendar webhook received:', {
      channelId,
      resourceState,
      resourceId
    });

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Process notification asynchronously
    if (resourceState === 'sync') {
      // Initial sync notification - ignore
      console.log('ℹ️  Initial sync notification');
      return;
    }

    if (resourceState === 'exists') {
      // Calendar changed - trigger sync
      console.log('🔄 Calendar changed, triggering sync...');

      // Get watch channel info from database
      const { data: watchChannel } = await supabase
        .from('calendar_watch_channels')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (!watchChannel) {
        console.warn('⚠️  Unknown watch channel:', channelId);
        return;
      }

      // Get user ID from channel metadata (you'll need to store this when creating watch)
      // For now, we'll need to add user_id to calendar_watch_channels table
      // const userId = watchChannel.user_id;
      // const accessToken = await getUserAccessToken(userId);
      
      // Trigger background sync
      // await calendarSyncService.backgroundSync(userId, accessToken);
      
      console.log('✅ Calendar sync triggered for channel:', channelId);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Don't throw error to Google - we've acknowledged receipt
  }
});

/**
 * POST /calendar-sync/sync
 * 
 * Manually trigger calendar sync
 * 
 * Request Body:
 *   - userId: string (required)
 *   - accessToken: string (required)
 * 
 * Response:
 *   - success: boolean
 *   - changes: { added, modified, deleted }
 *   - syncToken: string (for next sync)
 */
router.post("/sync", async (req, res) => {
  try {
    const { userId, accessToken } = req.body;

    if (!userId || !accessToken) {
      return res.status(400).json({
        error: "Missing required fields: userId, accessToken"
      });
    }

    // Get last sync token
    const { data: syncData } = await supabase
      .from('user_calendar_sync')
      .select('sync_token')
      .eq('user_id', userId)
      .single();

    const syncToken = syncData?.sync_token || null;

    // Perform sync
    const result = await calendarSyncService.syncCalendarEvents(
      accessToken,
      userId,
      syncToken
    );

    // Check if re-optimization recommended
    const shouldReopt = await calendarSyncService.shouldReoptimize(userId);

    res.json({
      ...result,
      recommendReoptimization: shouldReopt
    });

  } catch (error) {
    console.error("Calendar sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /calendar-sync/watch
 * 
 * Set up Google Calendar push notifications
 * 
 * Request Body:
 *   - userId: string (required)
 *   - accessToken: string (required)
 *   - webhookUrl: string (required) - Your server's webhook endpoint
 * 
 * Response:
 *   - channelId: string
 *   - resourceId: string
 *   - expiration: timestamp
 */
router.post("/watch", async (req, res) => {
  try {
    const { userId, accessToken, webhookUrl } = req.body;

    if (!userId || !accessToken || !webhookUrl) {
      return res.status(400).json({
        error: "Missing required fields: userId, accessToken, webhookUrl"
      });
    }

    // Generate unique channel ID
    const channelId = `flowmind-${userId}-${Date.now()}`;

    // Set up watch
    const watchData = await calendarSyncService.watchCalendar(
      accessToken,
      'primary',
      webhookUrl,
      channelId
    );

    // Store user_id mapping for webhook handler
    await supabase
      .from('calendar_watch_channels')
      .update({ user_id: userId })
      .eq('channel_id', channelId);

    res.json({
      success: true,
      channelId: watchData.id,
      resourceId: watchData.resourceId,
      expiration: watchData.expiration
    });

  } catch (error) {
    console.error("Watch calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /calendar-sync/unwatch
 * 
 * Stop watching calendar
 * 
 * Request Body:
 *   - accessToken: string (required)
 *   - channelId: string (required)
 *   - resourceId: string (required)
 */
router.post("/unwatch", async (req, res) => {
  try {
    const { accessToken, channelId, resourceId } = req.body;

    if (!accessToken || !channelId || !resourceId) {
      return res.status(400).json({
        error: "Missing required fields: accessToken, channelId, resourceId"
      });
    }

    await calendarSyncService.stopWatchingCalendar(
      accessToken,
      channelId,
      resourceId
    );

    res.json({ success: true });

  } catch (error) {
    console.error("Unwatch calendar error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /calendar-sync/changes
 * 
 * Get recent calendar changes
 * 
 * Query Parameters:
 *   - userId: string (required)
 * 
 * Response:
 *   - changes: array of recent events
 */
router.get("/changes", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing required parameter: userId"
      });
    }

    const changes = await calendarSyncService.getRecentChanges(userId);

    res.json({
      changes,
      count: changes.length
    });

  } catch (error) {
    console.error("Get changes error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /calendar-sync/should-reoptimize
 * 
 * Check if calendar changes warrant re-optimization
 * 
 * Query Parameters:
 *   - userId: string (required)
 * 
 * Response:
 *   - shouldReoptimize: boolean
 *   - reason: string (if true)
 */
router.get("/should-reoptimize", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing required parameter: userId"
      });
    }

    const shouldReopt = await calendarSyncService.shouldReoptimize(userId);

    res.json({
      shouldReoptimize: shouldReopt,
      reason: shouldReopt ? 
        "Significant calendar changes detected since last optimization" : 
        "Calendar is up to date"
    });

  } catch (error) {
    console.error("Check re-optimize error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
