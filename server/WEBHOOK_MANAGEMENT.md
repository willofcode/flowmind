# Google Calendar Webhook Management

## Overview

This system manages Google Calendar webhooks for real-time calendar sync. Webhooks expire after 7 days, so we need automatic renewal.

## Setup

### 1. Create Database Table

Run this in Supabase SQL Editor:
```bash
cd server
psql $DATABASE_URL < db_setup/webhook-table.sql
```

Or copy the contents of `db_setup/webhook-table.sql` into Supabase SQL Editor.

### 2. Initial Webhook Setup

```bash
node setup-webhook.js <ACCESS_TOKEN> <NGROK_URL> <USER_EMAIL>
```

Example:
```bash
node setup-webhook.js ya29.a0... https://xyz.ngrok-free.dev user@example.com
```

This will:
- Create a webhook with Google Calendar API
- Store it in the `calendar_watch_channels` table
- Enable auto-renewal

### 3. Enable Auto-Renewal (Optional but Recommended)

#### Option A: Cron Job (Production)

```bash
chmod +x setup-cron.sh
./setup-cron.sh
```

This creates a daily cron job at 3 AM to check and renew expiring webhooks.

#### Option B: Manual Renewal (Development)

Run manually when needed:
```bash
node renew-webhooks.js
```

#### Option C: Heroku Scheduler / Cloud

Add this as a scheduled task:
```bash
cd /path/to/server && node renew-webhooks.js
```

Schedule: Daily at 3 AM

## How It Works

### Webhook Lifecycle

1. **Setup**: User signs in → Create webhook → Store in DB → Expires in 7 days
2. **Active**: Google sends notifications when calendar changes → Server receives them
3. **Renewal**: 24 hours before expiry → Auto-renewal script runs → New webhook created
4. **Expiry**: If not renewed → Webhook stops → No more notifications (manual sync still works)

### Database Schema

```sql
calendar_watch_channels
- id: UUID
- user_id: UUID (references users)
- channel_id: TEXT (Google's channel ID)
- resource_id: TEXT (Google's resource ID)
- calendar_id: TEXT (usually 'primary')
- webhook_url: TEXT (your ngrok/server URL)
- expiration: TIMESTAMPTZ (when it expires)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Monitoring

### Check Active Webhooks

```sql
SELECT 
  u.email,
  cwc.channel_id,
  cwc.expiration,
  cwc.expiration - NOW() as time_until_expiry
FROM calendar_watch_channels cwc
JOIN users u ON u.id = cwc.user_id
ORDER BY cwc.expiration;
```

### Check Renewal Logs

```bash
tail -f logs/webhook-renewal.log
```

### Manual Webhook Check

```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/calendar-sync/webhook \
  -H "X-Goog-Channel-ID: test" \
  -H "X-Goog-Resource-State: exists"
```

## Troubleshooting

### Webhook Not Receiving Notifications

1. Check if webhook exists in database:
   ```sql
   SELECT * FROM calendar_watch_channels WHERE channel_id = 'your-channel-id';
   ```

2. Check if expired:
   ```sql
   SELECT * FROM calendar_watch_channels WHERE expiration < NOW();
   ```

3. Check ngrok is running:
   ```bash
   curl https://your-ngrok-url.ngrok-free.dev/calendar-sync/webhook
   ```

### Renewal Failing

1. Check user has valid tokens in database
2. Check logs: `tail -f logs/webhook-renewal.log`
3. Run renewal manually: `node renew-webhooks.js`

### Multiple Webhooks for Same User

Clean up old webhooks:
```sql
DELETE FROM calendar_watch_channels 
WHERE expiration < NOW();
```

## Production Considerations

### 1. Store Refresh Tokens

Currently, the renewal script needs refresh tokens. Add to `user_profiles` table:

```sql
ALTER TABLE user_profiles 
ADD COLUMN google_refresh_token TEXT;
```

### 2. Use Production Webhook URL

Replace ngrok with your production domain:
```bash
node setup-webhook.js <TOKEN> https://api.yourdomain.com llcflowmind@gmail.com
```

### 3. Monitor Renewal Success Rate

Add monitoring to track:
- Number of webhooks renewed daily
- Renewal failures
- Expired webhooks not renewed

### 4. Handle Multiple Users

The system is designed for multi-user:
- Each user gets their own webhook
- Renewal script processes all users
- Database tracks per-user webhooks

## Files

- `setup-webhook.js` - Initial webhook setup
- `renew-webhooks.js` - Auto-renewal script
- `setup-cron.sh` - Install cron job
- `db_setup/webhook-table.sql` - Database schema
- `src/routes/calendar-sync.routes.js` - Webhook endpoint

## Next Steps

1. ✅ Run `db_setup/webhook-table.sql` in Supabase
2. ✅ Test webhook setup with user email
3. ⏳ Implement refresh token storage
4. ⏳ Set up cron job for auto-renewal
5. ⏳ Add monitoring/alerts for failed renewals
