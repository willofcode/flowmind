# Auth0 + Google Calendar OAuth Setup

## The Flow
When users sign in, they automatically get Google Calendar access - **no separate button needed!**

```
User opens app → Sign in with Google → Grants calendar permissions → Calendar connected ✅
```

## The Problem You Saw
`Error 400: redirect_uri_mismatch` happens because Auth0 needs to be configured as an intermediary between your app and Google's OAuth.

## Architecture Flow
```
FlowMind App → Auth0 (forces google-oauth2) → Google OAuth → Tokens with calendar access ✅
```

---

## Step 1: Configure Google Cloud Console

### A) Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your existing project (or create new one)
3. Go to **APIs & Services** → **Credentials**

### B) Find Your OAuth 2.0 Client ID
You should see the iOS client ID you created earlier:
```
940109485523-podr192et86foo0jl92nh1dn4pnveinf.apps.googleusercontent.com
```

### C) Add Auth0 Redirect URIs
**CRITICAL:** You need to add Auth0's callback URLs to your Google OAuth client.

Click on your OAuth 2.0 Client ID and add these **Authorized redirect URIs**:

```
https://dev-3ye3j4yrks1dqfm7.us.auth0.com/login/callback
```

**Format:** `https://{YOUR_AUTH0_DOMAIN}/login/callback`

Click **Save**.

---

## Step 2: Configure Auth0 Dashboard

### A) Enable Google Social Connection

1. Go to https://manage.auth0.com/
2. Navigate to **Authentication** → **Social**
3. Click **+ Create Connection**
4. Select **Google**

### B) Configure Google Connection

In the Google connection settings:

**Client ID:**
```
940109485523-podr192et86foo0jl92nh1dn4pnveinf.apps.googleusercontent.com
```

**Client Secret:**
- Go back to Google Cloud Console
- Click on your OAuth client
- Copy the **Client Secret** (not in your current .env)
- Paste it into Auth0

**Attributes:**
- ✅ Email
- ✅ Profile
- ✅ Basic Profile

**Permissions (CRITICAL - This is the key!):**
- ✅ `email`
- ✅ `profile`
- ✅ `https://www.googleapis.com/auth/calendar.readonly`
- ✅ `https://www.googleapis.com/auth/calendar.events`

Click **Create**.

### C) Enable for Your Application

1. Go to **Applications** tab in the Google connection
2. Find "FlowMind" (your Auth0 app)
3. Toggle it **ON** (enable the connection)
4. Click **Save**

---

## Step 3: Update Auth0 Application Settings

### A) Go to Your Application

1. Navigate to **Applications** → **Applications**
2. Click on **FlowMind**
3. Go to **Settings** tab

### B) Verify Callback URLs

Make sure these are in **Allowed Callback URLs**:
```
com.willofcode.flowmind.auth0://dev-3ye3j4yrks1dqfm7.us.auth0.com/ios/com.willofcode.flowmind/callback
```

### C) Grant Types

Scroll down to **Advanced Settings** → **Grant Types**

Ensure these are checked:
- ✅ Authorization Code
- ✅ Refresh Token
- ✅ Implicit (for social connections)

Click **Save Changes**.

---

## Step 4: Test the Seamless Flow

### A) Restart Your App

```bash
# Kill the Expo process
# Then restart:
cd client
npx expo run:ios
```

### B) Test Sign-In (Calendar is Automatic!)

1. Open app in simulator
2. **Sign in with any method** (the app forces Google OAuth)
3. Auth0 Universal Login appears
4. Click **Continue with Google**
5. Google sign-in UI appears
6. **Approve calendar permissions** (this is the key moment!)
7. Redirects back to app ✅
8. Calendar is automatically connected - no button needed!

### C) Verify Connection

1. Navigate to **Explore** tab
2. You should see a green status card:
   ```
   ✓ Google Calendar connected - AI planning active
   ```

### D) Expected Console Output

```
✅ Signed in with Google + Calendar access granted
```

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Fix:** Make sure you added `https://dev-3ye3j4yrks1dqfm7.us.auth0.com/login/callback` to Google Cloud Console OAuth client.

### Error: "access_denied - Google has not been enabled"
**Fix:** In Auth0, go to Google Social Connection → Applications tab → Enable FlowMind.

### Error: "insufficient_scope"
**Fix:** In Auth0 Google connection, add calendar scopes:
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events`

### User sees Auth0 login but not Google button
**Fix:** Make sure Google connection is enabled for your FlowMind application in Auth0.

---

## What Happens Behind the Scenes

1. User taps "Connect Google Calendar"
2. App calls `connectGoogleCalendar()` in `use-auth0.ts`
3. Auth0 SDK opens Universal Login with `connection: 'google-oauth2'`
4. User clicks "Continue with Google"
5. Auth0 redirects to Google OAuth with calendar scopes
6. User approves permissions
7. Google sends authorization code to Auth0 callback
8. Auth0 exchanges code for tokens (including Google access token)
9. Auth0 redirects back to app with tokens
10. App stores tokens in SecureStore
11. Backend can now use tokens to call Google Calendar API

---

## Files Involved

- `client/lib/auth0-config.ts` - Already has correct scopes ✅
- `client/lib/use-auth0.ts` - Has `connectGoogleCalendar()` function ✅
- `client/components/google-calendar-connect.tsx` - UI component ✅

**Everything is ready in the code - you just need to configure Auth0 dashboard!**

---

## Quick Checklist

- [ ] Add Auth0 callback to Google Cloud Console redirect URIs
- [ ] Create Google Social Connection in Auth0
- [ ] Add Google Client ID + Secret to Auth0 connection
- [ ] Add calendar scopes to Auth0 Google connection
- [ ] Enable connection for FlowMind application
- [ ] Verify Grant Types in Auth0 app settings
- [ ] Restart app and test

---

## Next Steps After Setup

Once Google Calendar is connected:
1. Backend can fetch user's schedule via `/google-calendar/free-busy`
2. AI calculates schedule intensity
3. Plan generation adapts to available time slots
4. Events are created with 10-3-1 reminders

**Ready to configure? Follow Step 1 first!**
