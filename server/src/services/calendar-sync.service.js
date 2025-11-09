/**
 * Google Calendar Sync Service
 * 
 * Purpose: Detect and sync calendar changes from external sources
 *          (user manual edits, Google Calendar web/mobile, other apps)
 * 
 * Features:
 *   - Webhook notifications for real-time updates
 *   - Polling fallback for sync
 *   - Change detection and delta sync
 *   - Conflict resolution
 * 
 * @module services/calendar-sync
 */

import fetch from "node-fetch";
import { supabase } from "../config/database.js";

/**
 * Watch Google Calendar for changes using push notifications
 * 
 * Google Calendar API supports push notifications via webhooks.
 * This function sets up a watch channel that notifies our server
 * when calendar events change.
 * 
 * @param {string} accessToken - Google Calendar OAuth token
 * @param {string} calendarId - Calendar to watch (usually 'primary')
 * @param {string} webhookUrl - Our server's webhook endpoint
 * @param {string} channelId - Unique channel identifier
 * @returns {Promise<Object>} Watch channel info
 */
export async function watchCalendar(accessToken, calendarId = 'primary', webhookUrl, channelId) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          // Expire in 7 days (max allowed by Google)
          expiration: Date.now() + (7 * 24 * 60 * 60 * 1000)
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Watch calendar failed: ${JSON.stringify(error)}`);
    }

    const watchData = await response.json();
    
    console.log('✅ Calendar watch established:', {
      channelId: watchData.id,
      resourceId: watchData.resourceId,
      expiration: new Date(parseInt(watchData.expiration))
    });

    // Store watch info in database for management
    await supabase.from('calendar_watch_channels').insert({
      channel_id: watchData.id,
      resource_id: watchData.resourceId,
      calendar_id: calendarId,
      expiration: new Date(parseInt(watchData.expiration)),
      webhook_url: webhookUrl
    });

    return watchData;
  } catch (error) {
    console.error('❌ Watch calendar error:', error);
    throw error;
  }
}

/**
 * Stop watching calendar
 * 
 * @param {string} accessToken - Google Calendar OAuth token
 * @param {string} channelId - Channel to stop
 * @param {string} resourceId - Resource ID from watch response
 */
export async function stopWatchingCalendar(accessToken, channelId, resourceId) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/channels/stop',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: channelId,
          resourceId: resourceId
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Stop watch failed: ${response.statusText}`);
    }

    // Remove from database
    await supabase.from('calendar_watch_channels')
      .delete()
      .eq('channel_id', channelId);

    console.log('✅ Calendar watch stopped:', channelId);
  } catch (error) {
    console.error('❌ Stop watch error:', error);
    throw error;
  }
}

/**
 * Sync calendar events (polling method)
 * 
 * Use when webhooks aren't available or as fallback
 * 
 * @param {string} accessToken - Google Calendar OAuth token
 * @param {string} userId - User's unique identifier
 * @param {string} syncToken - Token from last sync (for delta sync)
 * @returns {Promise<Object>} Sync results with new events and syncToken
 */
export async function syncCalendarEvents(accessToken, userId, syncToken = null) {
  try {
    console.log(`🔄 Syncing calendar for user ${userId}...`);

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    
    if (syncToken) {
      // Delta sync - only get changes since last sync
      url.searchParams.append('syncToken', syncToken);
    } else {
      // Full sync - get last 30 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      url.searchParams.append('timeMin', timeMin.toISOString());
      url.searchParams.append('singleEvents', 'true');
      url.searchParams.append('orderBy', 'startTime');
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      if (response.status === 410) {
        // Sync token expired, do full sync
        console.log('⚠️  Sync token expired, doing full sync');
        return syncCalendarEvents(accessToken, userId, null);
      }
      throw new Error(`Calendar sync failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process events
    const { items = [], nextSyncToken, nextPageToken } = data;
    
    // Detect changes
    const added = [];
    const modified = [];
    const deleted = [];
    
    for (const event of items) {
      if (event.status === 'cancelled') {
        deleted.push(event);
      } else {
        // Check if event exists in our cache
        const { data: cachedEvent } = await supabase
          .from('cached_calendar_events')
          .select('*')
          .eq('user_id', userId)
          .eq('event_id', event.id)
          .single();
        
        if (!cachedEvent) {
          added.push(event);
        } else if (event.updated !== cachedEvent.updated_at) {
          modified.push(event);
        }
      }
    }

    // Update cache
    for (const event of added) {
      await supabase.from('cached_calendar_events').insert({
        user_id: userId,
        event_id: event.id,
        summary: event.summary,
        start_time: event.start.dateTime || event.start.date,
        end_time: event.end.dateTime || event.end.date,
        updated_at: event.updated,
        event_data: event
      });
    }

    for (const event of modified) {
      await supabase.from('cached_calendar_events')
        .update({
          summary: event.summary,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          updated_at: event.updated,
          event_data: event
        })
        .eq('user_id', userId)
        .eq('event_id', event.id);
    }

    for (const event of deleted) {
      await supabase.from('cached_calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', event.id);
    }

    // Store sync token
    if (nextSyncToken) {
      await supabase.from('user_calendar_sync')
        .upsert({
          user_id: userId,
          sync_token: nextSyncToken,
          last_sync_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    }

    console.log('✅ Calendar synced:', {
      added: added.length,
      modified: modified.length,
      deleted: deleted.length
    });

    return {
      success: true,
      changes: {
        added: added.map(e => ({ id: e.id, summary: e.summary })),
        modified: modified.map(e => ({ id: e.id, summary: e.summary })),
        deleted: deleted.map(e => ({ id: e.id }))
      },
      syncToken: nextSyncToken,
      hasMore: !!nextPageToken
    };

  } catch (error) {
    console.error('❌ Calendar sync error:', error);
    throw error;
  }
}

/**
 * Get calendar changes since last sync
 * 
 * @param {string} userId - User's unique identifier
 * @returns {Promise<Object>} Recent changes
 */
export async function getRecentChanges(userId) {
  const { data: changes } = await supabase
    .from('cached_calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);

  return changes || [];
}

/**
 * Detect if calendar needs re-optimization
 * 
 * Checks if external changes (user edits, other apps) have significantly
 * changed the schedule, warranting a new optimization run
 * 
 * @param {string} userId - User's unique identifier
 * @returns {Promise<boolean>} True if re-optimization recommended
 */
export async function shouldReoptimize(userId) {
  try {
    // Get last optimization time
    const { data: lastOptimization } = await supabase
      .from('ai_orchestration_sessions')
      .select('created_at, ai_decisions')
      .eq('user_id', userId)
      .eq('session_type', 'calendar_optimization')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastOptimization) {
      return false; // No previous optimization
    }

    // Get events modified since last optimization
    const { data: recentChanges } = await supabase
      .from('cached_calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', lastOptimization.created_at);

    if (!recentChanges || recentChanges.length === 0) {
      return false; // No changes
    }

    // Check if changes are significant
    const createdByAgent = lastOptimization.ai_decisions?.createdEvents || 0;
    const userChanges = recentChanges.filter(
      event => !event.summary?.includes('🫁') && 
               !event.summary?.includes('🚶') && 
               !event.summary?.includes('🍽️') && 
               !event.summary?.includes('💪')
    );

    // Recommend re-optimization if:
    // 1. User added/modified 3+ events
    // 2. Changes affect more than 20% of waking hours
    if (userChanges.length >= 3) {
      console.log('⚠️  Significant calendar changes detected, recommend re-optimization');
      return true;
    }

    return false;

  } catch (error) {
    console.error('❌ Check re-optimize error:', error);
    return false;
  }
}

/**
 * Background sync worker
 * 
 * Run this periodically (e.g., every 15 minutes) to keep calendar in sync
 * 
 * @param {string} userId - User's unique identifier
 * @param {string} accessToken - Google Calendar OAuth token
 */
export async function backgroundSync(userId, accessToken) {
  try {
    // Get sync token
    const { data: syncData } = await supabase
      .from('user_calendar_sync')
      .select('sync_token')
      .eq('user_id', userId)
      .single();

    const syncToken = syncData?.sync_token || null;

    // Sync calendar
    const result = await syncCalendarEvents(accessToken, userId, syncToken);

    // Check if re-optimization needed
    if (result.changes.added.length > 0 || result.changes.modified.length > 0) {
      const needsReopt = await shouldReoptimize(userId);
      
      if (needsReopt) {
        // Notify user (push notification, in-app banner, etc.)
        console.log('📢 Notifying user: Calendar changes detected, recommend re-optimization');
        
        // You could trigger a notification here
        // await sendPushNotification(userId, {
        //   title: 'Calendar Updated',
        //   body: 'Your schedule has changed. Want to re-optimize?'
        // });
      }
    }

    return result;

  } catch (error) {
    console.error('❌ Background sync error:', error);
  }
}

export default {
  watchCalendar,
  stopWatchingCalendar,
  syncCalendarEvents,
  getRecentChanges,
  shouldReoptimize,
  backgroundSync
};
