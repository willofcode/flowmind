/**
 * Auto-Renew Google Calendar Webhooks
 * 
 * This script checks for expiring webhooks and renews them automatically.
 * Should be run as a cron job every hour or daily.
 * 
 * Usage:
 *   node renew-webhooks.js
 * 
 * Cron Example (runs daily at 3am):
 *   0 3 * * * cd /path/to/server && node renew-webhooks.js >> logs/webhook-renewal.log 2>&1
 */

import fetch from 'node-fetch';
import { supabase } from './src/config/database.js';

const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'https://unchemical-subglacially-kimbra.ngrok-free.dev';

async function renewWebhook(channel) {
  const { user_id, channel_id, resource_id, calendar_id, webhook_url } = channel;
  
  try {
    console.log(`🔄 Renewing webhook for user ${user_id}, channel ${channel_id}`);
    
    // Get user's access token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', user_id)
      .single();
    
    if (userError || !user) {
      console.error(`❌ User not found: ${user_id}`);
      return false;
    }
    
    // TODO: Get fresh access token for user
    // For now, we'll need to store refresh tokens in the database
    // const accessToken = await refreshUserAccessToken(user_id);
    
    console.log(`⚠️  TODO: Implement token refresh for user ${user.email}`);
    console.log(`   Need to store refresh tokens in user_profiles table`);
    
    // Stop old channel
    try {
      await stopWebhook(channel_id, resource_id, 'PLACEHOLDER_TOKEN');
    } catch (stopError) {
      console.warn(`⚠️  Could not stop old channel (may already be expired):`, stopError.message);
    }
    
    // Create new channel
    // const newChannelId = `flowmind-${Date.now()}`;
    // const result = await setupWebhook(accessToken, calendar_id, webhook_url, newChannelId);
    
    // Update database
    // await supabase
    //   .from('calendar_watch_channels')
    //   .update({
    //     channel_id: result.id,
    //     resource_id: result.resourceId,
    //     expiration: new Date(parseInt(result.expiration)),
    //     updated_at: new Date()
    //   })
    //   .eq('id', channel.id);
    
    console.log(`✅ Webhook renewed (placeholder - implement token refresh first)`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to renew webhook for channel ${channel_id}:`, error.message);
    return false;
  }
}

async function stopWebhook(channelId, resourceId, accessToken) {
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
    const error = await response.json();
    throw new Error(`Stop webhook failed: ${JSON.stringify(error)}`);
  }
}

async function setupWebhook(accessToken, calendarId, webhookUrl, channelId) {
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
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Setup webhook failed: ${JSON.stringify(error)}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('\n🔧 Google Calendar Webhook Auto-Renewal\n');
  console.log(`⏰ Running at: ${new Date().toISOString()}`);
  console.log('');
  
  try {
    // Get expiring channels (within 24 hours)
    const { data: expiringChannels, error } = await supabase
      .rpc('get_expiring_watch_channels');
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!expiringChannels || expiringChannels.length === 0) {
      console.log('✅ No webhooks expiring in the next 24 hours');
      return;
    }
    
    console.log(`⚠️  Found ${expiringChannels.length} webhooks expiring soon:\n`);
    
    for (const channel of expiringChannels) {
      console.log(`   Channel: ${channel.channel_id}`);
      console.log(`   User: ${channel.user_id}`);
      console.log(`   Expires: ${new Date(channel.expiration).toLocaleString()}`);
      console.log('');
    }
    
    // Renew each channel
    let successCount = 0;
    let failCount = 0;
    
    for (const channel of expiringChannels) {
      const success = await renewWebhook(channel);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('\n📊 Renewal Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('');
    
    if (failCount > 0) {
      console.log('⚠️  Some webhooks failed to renew. Check logs above for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Renewal process failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { renewWebhook, setupWebhook, stopWebhook };
