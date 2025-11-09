/**
 * Setup Google Calendar Webhook
 * 
 * This script sets up a webhook to receive push notifications
 * when calendar events change, and stores it in the database.
 * 
 * Usage:
 *   node setup-webhook.js <ACCESS_TOKEN> <NGROK_URL> [USER_EMAIL]
 * 
 * Example:
 *   node setup-webhook.js ya29.a0... https://your-subdomain.ngrok-free.dev user@example.com
 */

import fetch from 'node-fetch';
import { supabase } from './src/config/database.js';

const accessToken = process.argv[2];
const ngrokUrl = process.argv[3];
const userEmail = process.argv[4]; // Optional

if (!accessToken || !ngrokUrl) {
  console.error('❌ Usage: node setup-webhook.js <ACCESS_TOKEN> <NGROK_URL> [USER_EMAIL]');
  console.error('   Example: node setup-webhook.js ya29.a0... https://xyz.ngrok-free.dev user@example.com');
  process.exit(1);
}

const webhookUrl = `${ngrokUrl}/calendar-sync/webhook`;
const channelId = `flowmind-${Date.now()}`;

console.log('🔧 Setting up Google Calendar webhook...\n');
console.log('📍 Webhook URL:', webhookUrl);
console.log('🆔 Channel ID:', channelId);
console.log('');

async function setupWatch() {
  try {
    console.log('🔄 Calling Google Calendar API...');
    
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',
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
          // Expire in 7 days (max allowed)
          expiration: Date.now() + (7 * 24 * 60 * 60 * 1000)
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google API Error: ${JSON.stringify(error, null, 2)}`);
    }

    const data = await response.json();
    
    console.log('✅ Webhook setup successful!\n');
    console.log('📊 Watch Details:');
    console.log('   Channel ID:', data.id);
    console.log('   Resource ID:', data.resourceId);
    console.log('   Expires:', new Date(parseInt(data.expiration)).toLocaleString());
    console.log('');
    
    // Store in database
    if (userEmail) {
      console.log('💾 Storing webhook in database...');
      
      // Get user ID from email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      if (userError || !user) {
        console.warn('⚠️  User not found in database:', userEmail);
        console.warn('   Webhook will work but won\'t auto-renew');
      } else {
        // Store webhook info
        const { error: insertError } = await supabase
          .from('calendar_watch_channels')
          .insert({
            user_id: user.id,
            channel_id: data.id,
            resource_id: data.resourceId,
            calendar_id: 'primary',
            webhook_url: webhookUrl,
            expiration: new Date(parseInt(data.expiration))
          });
        
        if (insertError) {
          console.error('❌ Failed to store in database:', insertError.message);
        } else {
          console.log('✅ Webhook stored in database');
        }
      }
    }
    
    console.log('');
    console.log('🎉 Your calendar is now being watched!');
    console.log('   Any changes to your Google Calendar will trigger webhook notifications.');
    console.log('');
    console.log('⚠️  Important:');
    console.log('   - Keep ngrok running');
    console.log('   - Watch expires in 7 days');
    if (userEmail) {
      console.log('   - Auto-renewal enabled (run: node renew-webhooks.js)');
    } else {
      console.log('   - No auto-renewal (provide email to enable)');
    }
    console.log('   - Test by adding/editing an event in Google Calendar');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupWatch();
