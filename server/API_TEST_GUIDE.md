# FlowMind Backend API - Complete Test Guide

## Overview
This guide walks through all backend API endpoints with database integration, test cases, and troubleshooting.

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Test Cases](#test-cases)
5. [Troubleshooting](#troubleshooting)

---

## Setup & Configuration

### 1. Environment Variables
Verify your `server/.env` file has all required variables:

```bash
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://wipfxrpiuwqtsaummrwk.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...

# Auth0 Configuration
AUTH0_DOMAIN=dev-3ye3j4yrks1dqfm7.us.auth0.com
AUTH0_CLIENT_ID=UgHAzIeAVtPv5x2wnE4YOCzWQNxJm7EX
AUTH0_CLIENT_SECRET=Nn3TMLJgY...

# NeuralSeek Configuration
NS_API_KEY=6566db99-529c4a94-94e42dda-f91c7e8b
NS_EMBED_CODE=370207002
NS_SEEK_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/seek
NS_MAISTRO_ENDPOINT=https://stagingapi.neuralseek.com/v1/stony23/maistro
```

### 2. Database Setup
Run the SQL schema in Supabase SQL Editor:
1. Go to https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk/sql
2. Paste `supabase-schema.sql` contents
3. Click "Run"
4. Verify tables: `profiles`, `weekly_plans`, `breathing_sessions`, `schedule_intensity`, `activity_completions`

### 3. Start the Server
```bash
cd server
npm install
npm start
```

Expected output:
```
🚀 FlowMind server running on http://localhost:3001
✅ Supabase connected
✅ NeuralSeek configured
```

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User neurodivergent profiles | `user_id`, `profile_data` (JSONB) |
| `weekly_plans` | AI-generated weekly plans | `user_id`, `week_start`, `plan_data` (JSONB) |
| `breathing_sessions` | TTS-guided sessions cache | `duration_min`, `script_text`, `audio_url` |
| `schedule_intensity` | Calendar analysis cache | `date`, `intensity_level`, `gap_windows` |
| `activity_completions` | User engagement tracking | `block_id`, `completed_at`, `skipped` |

### Profile Data Structure (JSONB)
```json
{
  "energyWindows": [
    { "start": "09:00", "end": "12:00", "label": "Morning peak" }
  ],
  "sensory": {
    "reducedAnimation": false,
    "hapticsOnly": true,
    "silentMode": false
  },
  "bufferPolicy": {
    "before": 10,
    "after": 5
  }
}
```

---

## API Endpoints

### 1. Health Check
**GET** `/health`

Test if server is running and dependencies are configured.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T11:00:00Z",
  "supabase": "connected",
  "neuralseek": "configured"
}
```

**Test Command:**
```bash
curl http://localhost:3001/health
```

---

### 2. Save User Profile
**POST** `/profile`

Save or update user's neurodivergent profile.

**Request:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "profile": {
    "energyWindows": [
      { "start": "09:00", "end": "12:00", "label": "Morning peak" }
    ],
    "sensory": {
      "reducedAnimation": false,
      "hapticsOnly": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "profile_data": { ... },
      "updated_at": "2025-11-08T11:00:00Z"
    }
  ]
}
```

**Test Command:**
```bash
curl -X POST http://localhost:3001/profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "profile": {
      "energyWindows": [{"start": "09:00", "end": "12:00", "label": "Morning"}]
    }
  }'
```

---

### 3. Get User Profile
**GET** `/profile/:userId`

Retrieve user's saved profile.

**Response:**
```json
{
  "energyWindows": [...],
  "sensory": {...}
}
```

**Test Command:**
```bash
curl http://localhost:3001/profile/550e8400-e29b-41d4-a716-446655440000
```

**Error Cases:**
- 404: Profile not found
- 500: Database error

---

### 4. Update User Name (Auth0)
**POST** `/update-user-name`

Sync user's display name to Auth0 user metadata.

**Headers:**
```
Authorization: Bearer <auth0_access_token>
```

**Request:**
```json
{
  "name": "Monica"
}
```

**Response:**
```json
{
  "success": true,
  "name": "Monica"
}
```

**Test Command:**
```bash
# Replace <ACCESS_TOKEN> with actual Auth0 token from SecureStore
curl -X POST http://localhost:3001/update-user-name \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name": "Monica"}'
```

---

### 5. Google Calendar - Get Events
**POST** `/get-calendar-events`

Fetch Google Calendar events for a date range.

**Request:**
```json
{
  "accessToken": "<google_or_auth0_token>",
  "timeMin": "2025-11-01T00:00:00Z",
  "timeMax": "2025-11-30T23:59:59Z"
}
```

**Response:**
```json
{
  "events": [
    {
      "id": "event123",
      "summary": "Team Meeting",
      "start": { "dateTime": "2025-11-08T10:00:00Z" },
      "end": { "dateTime": "2025-11-08T11:00:00Z" }
    }
  ]
}
```

**Test Command:**
```bash
curl -X POST http://localhost:3001/get-calendar-events \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "<TOKEN>",
    "timeMin": "2025-11-01T00:00:00Z",
    "timeMax": "2025-11-30T23:59:59Z"
  }'
```

**Notes:**
- Requires Google OAuth token with Calendar scopes
- Auth0 token works only if Google social connection is configured

---

### 6. Google Calendar - FreeBusy
**POST** `/freebusy`

Get user's busy/free time blocks (for schedule intensity calculation).

**Request:**
```json
{
  "accessToken": "<token>",
  "timeMin": "2025-11-08T00:00:00Z",
  "timeMax": "2025-11-08T23:59:59Z"
}
```

**Response:**
```json
{
  "calendars": {
    "primary": {
      "busy": [
        {
          "start": "2025-11-08T09:00:00Z",
          "end": "2025-11-08T10:00:00Z"
        }
      ]
    }
  }
}
```

---

### 7. Google Calendar - Create Events
**POST** `/create-events`

Bulk create calendar events (workouts, meals, breathing sessions).

**Request:**
```json
{
  "accessToken": "<token>",
  "events": [
    {
      "summary": "Morning Workout",
      "description": "20-min walk",
      "startISO": "2025-11-08T09:00:00Z",
      "endISO": "2025-11-08T09:20:00Z",
      "reminders": [
        { "method": "popup", "minutes": 10 },
        { "method": "popup", "minutes": 3 },
        { "method": "popup", "minutes": 1 }
      ]
    }
  ]
}
```

**Response:**
```json
[
  {
    "id": "event456",
    "summary": "Morning Workout",
    "start": { "dateTime": "2025-11-08T09:00:00-05:00" }
  }
]
```

---

### 8. NeuralSeek - Seek (Knowledge Base)
**POST** `/seek`

Query NeuralSeek knowledge base for ADHD/autism-specific guidance.

**Request:**
```json
{
  "question": "What are good breathing exercises for ADHD?",
  "context": {
    "userProfile": "high anxiety, ADHD"
  }
}
```

**Response:**
```json
{
  "answer": "Box breathing (4-4-4-4) is excellent for ADHD...",
  "confidence": 0.95
}
```

**Test Command:**
```bash
curl -X POST http://localhost:3001/seek \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are good breathing exercises for ADHD?"
  }'
```

---

### 9. NeuralSeek - mAIstro (AI Agent)
**POST** `/maistro`

Generate weekly plans using AI agent with neurodivergent-aware constraints.

**Request:**
```json
{
  "prompt": "Create a 3-day plan for someone with ADHD",
  "context": {
    "energyWindows": [{"start": "09:00", "end": "12:00"}],
    "scheduleIntensity": "medium"
  }
}
```

**Response:**
```json
{
  "plan": {
    "monday": [...],
    "tuesday": [...]
  }
}
```

---

### 10. Plan Week
**POST** `/plan-week`

Generate complete weekly plan using NeuralSeek + calendar analysis.

**Request:**
```json
{
  "userProfile": {
    "energyWindows": [...],
    "sensory": {...}
  },
  "weekStartISO": "2025-11-04T00:00:00Z",
  "weekEndISO": "2025-11-10T23:59:59Z",
  "accessToken": "<google_token>"
}
```

**Response:**
```json
{
  "weekStart": "2025-11-04",
  "weekEnd": "2025-11-10",
  "days": {
    "2025-11-04": {
      "blocks": [
        {
          "id": "block1",
          "type": "WORKOUT",
          "title": "Morning Walk",
          "startTime": "09:00",
          "microSteps": [...]
        }
      ]
    }
  }
}
```

---

## Test Cases

### Test Suite 1: Profile Management

#### Test 1.1: Create New Profile
```bash
# 1. Save profile
curl -X POST http://localhost:3001/profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "profile": {
      "energyWindows": [{"start": "09:00", "end": "12:00", "label": "Morning"}],
      "sensory": {"reducedAnimation": false, "hapticsOnly": true}
    }
  }'

# Expected: {"success": true, "data": [...]}

# 2. Verify it was saved
curl http://localhost:3001/profile/test-user-123

# Expected: Returns profile data
```

#### Test 1.2: Update Existing Profile
```bash
# Update with new data
curl -X POST http://localhost:3001/profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "profile": {
      "energyWindows": [{"start": "14:00", "end": "17:00", "label": "Afternoon"}],
      "sensory": {"reducedAnimation": true, "hapticsOnly": true}
    }
  }'

# Verify update
curl http://localhost:3001/profile/test-user-123
# Expected: Shows updated afternoon window
```

#### Test 1.3: Profile Not Found
```bash
curl http://localhost:3001/profile/nonexistent-user
# Expected: 404 {"error": "Profile not found"}
```

---

### Test Suite 2: Auth0 Integration

#### Test 2.1: Update User Name (Requires Auth)
```bash
# This test requires a valid Auth0 access token
# Get token from iOS app SecureStore or Auth0 login

curl -X POST http://localhost:3001/update-user-name \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_AUTH0_TOKEN>" \
  -d '{"name": "Test User"}'

# Expected: {"success": true, "name": "Test User"}
```

#### Test 2.2: Missing Authorization Header
```bash
curl -X POST http://localhost:3001/update-user-name \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}'

# Expected: 401 {"error": "Missing or invalid authorization header"}
```

---

### Test Suite 3: NeuralSeek Integration

#### Test 3.1: Knowledge Base Query
```bash
curl -X POST http://localhost:3001/seek \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are good morning routines for people with ADHD?"
  }'

# Expected: JSON response with answer and confidence score
```

#### Test 3.2: AI Agent Planning
```bash
curl -X POST http://localhost:3001/maistro \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a 1-day plan with 2 workouts and 3 meals",
    "context": {"preference": "low-impact exercises"}
  }'

# Expected: JSON response with structured plan
```

---

### Test Suite 4: Health & Status

#### Test 4.1: Server Health Check
```bash
curl http://localhost:3001/health

# Expected:
# {
#   "status": "ok",
#   "timestamp": "2025-11-08T...",
#   "supabase": "connected",
#   "neuralseek": "configured"
# }
```

---

## Troubleshooting

### Issue: "supabaseUrl is required"
**Cause:** Missing `SUPABASE_URL` in `.env`
**Fix:**
```bash
# Add to server/.env
SUPABASE_URL=https://wipfxrpiuwqtsaummrwk.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```
Restart server: `npm start`

---

### Issue: "Network request failed" (from iOS app)
**Cause:** Backend server not running
**Fix:**
```bash
cd server
npm start
# Verify: curl http://localhost:3001/health
```

---

### Issue: "Calendar API error: 500"
**Cause:** Invalid or expired Google OAuth token
**Fix:**
1. Check if Auth0 Google social connection is set up
2. Verify token has Calendar scopes: `calendar.readonly`, `calendar.events`
3. Test with valid token from Google OAuth Playground

---

### Issue: "Failed to update user name"
**Cause:** 
- Missing `AUTH0_CLIENT_SECRET` in `.env`
- Invalid Auth0 access token

**Fix:**
```bash
# 1. Verify Auth0 config in server/.env
AUTH0_DOMAIN=dev-3ye3j4yrks1dqfm7.us.auth0.com
AUTH0_CLIENT_ID=UgHAzIeAVtPv5x2wnE4YOCzWQNxJm7EX
AUTH0_CLIENT_SECRET=<your-secret>

# 2. Get fresh access token from iOS app
# In iOS: await SecureStore.getItemAsync('auth0_access_token')

# 3. Test with curl
curl -X POST http://localhost:3001/update-user-name \
  -H "Authorization: Bearer <FRESH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
```

---

### Issue: Database query timeout
**Cause:** Supabase connection issues or missing indexes
**Fix:**
1. Check Supabase dashboard: https://supabase.com/dashboard
2. Verify tables exist: Run `supabase-schema.sql`
3. Check indexes: `idx_profiles_updated`, `idx_weekly_plans_user_id`

---

## Database Verification Scripts

### Verify Tables Exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'weekly_plans', 'breathing_sessions', 'schedule_intensity', 'activity_completions');
```

Expected: 5 rows returned

### Verify Profile Data
```sql
SELECT user_id, profile_data, created_at, updated_at 
FROM profiles 
ORDER BY updated_at DESC 
LIMIT 5;
```

### Count Records
```sql
SELECT 
  (SELECT COUNT(*) FROM profiles) as profile_count,
  (SELECT COUNT(*) FROM weekly_plans) as plans_count,
  (SELECT COUNT(*) FROM breathing_sessions) as sessions_count;
```

---

## Next Steps

1. **Test all endpoints** using the curl commands above
2. **Verify database** using SQL queries in Supabase
3. **Set up Auth0 Google connection** for Calendar access
4. **Test iOS app integration** with backend running
5. **Monitor server logs** for errors during testing

---

## Support Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk
- **Auth0 Dashboard:** https://manage.auth0.com
- **NeuralSeek API Docs:** See `server/NEURALSEEK_API.md`
- **FlowMind Design Docs:** See `DESIGN_PATTERNS.md`
