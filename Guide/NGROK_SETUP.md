# ngrok Setup Guide for FlowMind

## What is ngrok?

ngrok creates a secure tunnel from a public URL to your local server. This is **essential** for FlowMind's calendar sync because Google Calendar needs a public HTTPS URL to send webhook notifications when events change.

## Quick Setup (Already Done! ✅)

### 1. Install ngrok
```bash
brew install ngrok/ngrok/ngrok
```

### 2. Authenticate (One-time setup)
```bash
# Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### 3. Start ngrok Tunnel
```bash
cd server
ngrok http 3001
```

**Your current tunnel:**
```
https://unchemical-subglacially-kimbra.ngrok-free.dev
```

This URL is now configured in `server/.env` as `GOOGLE_CALENDAR_WEBHOOK_URL`

## Usage

### Start Development Workflow

**Terminal 1 - ngrok (keep running):**
```bash
cd server
ngrok http 3001
```

**Terminal 2 - FlowMind backend:**
```bash
cd server
npm start
```

**Terminal 3 - iOS app:**
```bash
cd client
npm run ios
```

### Verify ngrok is Working

```bash
# Check ngrok web interface
open http://127.0.0.1:4040

# Test webhook endpoint
curl https://unchemical-subglacially-kimbra.ngrok-free.dev/health
```

Should return:
```json
{
  "status": "healthy",
  "supabase": "connected",
  "neuralseek": "configured"
}
```

## Important Notes

### ⚠️ URL Changes on Restart
Every time you restart ngrok, you get a **new URL**. You'll need to:

1. Copy the new URL from ngrok terminal output
2. Update `server/.env`:
   ```bash
   GOOGLE_CALENDAR_WEBHOOK_URL=https://new-url.ngrok-free.dev/calendar-sync/webhook
   ```
3. Re-register webhooks with Google Calendar

### 🆓 Free Plan Limitations
- URL changes on every restart
- Limited to 40 connections/minute
- Session expires after 2 hours of inactivity

**Upgrade to paid ($8/month) for:**
- Fixed custom domain (e.g., `flowmind.ngrok.io`)
- No session limits
- Better for testing

## Webhook Testing

### 1. Start Everything
```bash
# Terminal 1
cd server && ngrok http 3001

# Terminal 2
cd server && npm start

# Terminal 3
cd server && node test/test-calendar-sync.js
```

### 2. Test Webhook Registration
```bash
curl -X POST http://localhost:3001/calendar-sync/watch \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "accessToken": "YOUR_GOOGLE_TOKEN",
    "webhookUrl": "https://unchemical-subglacially-kimbra.ngrok-free.dev/calendar-sync/webhook"
  }'
```

### 3. Simulate Webhook Notification
```bash
curl -X POST https://unchemical-subglacially-kimbra.ngrok-free.dev/calendar-sync/webhook \
  -H "X-Goog-Channel-ID: test-channel-123" \
  -H "X-Goog-Resource-ID: test-resource-456" \
  -H "X-Goog-Resource-State: exists"
```

### 4. Monitor Requests
Open ngrok web interface:
```bash
open http://127.0.0.1:4040
```

This shows:
- All incoming requests
- Request/response bodies
- Timing information
- Errors

## Troubleshooting

### ngrok command not found
```bash
# Reinstall
brew install ngrok/ngrok/ngrok

# Check installation
which ngrok
# Should show: /opt/homebrew/bin/ngrok
```

### "Account is limited to 1 ngrok agent session"
You have ngrok running somewhere else. Find and kill it:
```bash
# Find ngrok process
ps aux | grep ngrok

# Kill it
killall ngrok

# Or use Activity Monitor (GUI)
```

### ngrok tunnel not accepting connections
1. Check backend is running: `curl http://localhost:3001/health`
2. Check ngrok is running: Look for "Forwarding" in terminal
3. Verify URL in `.env` matches ngrok output

### Google webhook returns 404
Make sure:
1. Backend server is running on port 3001
2. Route is mounted: Check `server/index.js` has `app.use("/calendar-sync", calendarSyncRoutes)`
3. Endpoint exists: `server/src/routes/calendar-sync.routes.js` has webhook route

## Production Deployment

For production, **don't use ngrok**. Instead:

### Option 1: Deploy to Cloud (Recommended)
- Heroku
- Railway
- Render
- Fly.io

Then update `.env`:
```bash
GOOGLE_CALENDAR_WEBHOOK_URL=https://your-app.herokuapp.com/calendar-sync/webhook
```

### Option 2: Use ngrok Paid Plan
- Get fixed domain: `flowmind.ngrok.io`
- No restarts needed
- Better reliability

## Quick Reference

| Command | Purpose |
|---------|---------|
| `ngrok http 3001` | Start tunnel on port 3001 |
| `ngrok http 3001 --region eu` | Use EU region |
| `ngrok http 3001 --log stdout` | Show detailed logs |
| `open http://127.0.0.1:4040` | Open web interface |
| `killall ngrok` | Stop all ngrok processes |

## Current Status ✅

- [x] ngrok installed via Homebrew
- [x] Auth token configured
- [x] Tunnel running on port 3001
- [x] Public URL: `https://unchemical-subglacially-kimbra.ngrok-free.dev`
- [x] `.env` updated with webhook URL
- [x] Ready to test calendar sync webhooks!

## Next Steps

1. **Start backend server:**
   ```bash
   cd server && npm start
   ```

2. **Test webhook endpoint:**
   ```bash
   curl https://unchemical-subglacially-kimbra.ngrok-free.dev/health
   ```

3. **Run sync tests:**
   ```bash
   cd server && node test/test-calendar-sync.js
   ```

4. **Connect Google Calendar in app** and test end-to-end flow!
