# Google OAuth Authentication Flow - Implementation Guide

## Overview
Complete Google OAuth 2.0 implementation for FlowMind with animated welcome screen and voice-enabled profile creation.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    App Launch                                │
│                  app/index.tsx                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Landing Page                                │
│                 app/landing.tsx                              │
│  • Check SecureStore for google_access_token                │
│  • Check profile_completed flag                             │
├──────────────────────┬──────────────────────────────────────┤
│  IF authenticated    │  IF NOT authenticated                │
│  & profile complete  │                                       │
│         ↓            │          ↓                            │
│    /(tabs)           │    Show landing UI                    │
│                      │    • "Get Started" button             │
│                      │    • "I Already Have an Account"      │
└──────────────────────┴──────────────────────────────────────┘
                                  │
                                  ↓ (User taps sign in/up)
┌─────────────────────────────────────────────────────────────┐
│                  Sign-In Screen                              │
│                 app/sign-in.tsx                              │
│  • Google OAuth prompt with expo-auth-session                │
│  • Request scopes: calendar.readonly, calendar.events       │
│  • Store tokens in SecureStore                              │
│  • Fetch user info from Google                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ (OAuth success)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Welcome Screen                              │
│                 app/welcome.tsx                              │
│  • Animated psychic circle (pulse + glow)                   │
│  • Welcome message with user's first name                   │
│  • Voice recording (hold mic button)                        │
│  • Text input toggle (floating bottom-right)                │
│  • Save profile_completed flag                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ (User completes profile)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    Main App Tabs                             │
│                   app/(tabs)/*                               │
│  • Today: Timeline with tasks                               │
│  • Browse: Tools and streak card                            │
│  • Schedule: Google Calendar monthly view                   │
│    └─> Fetches events asynchronously using stored token     │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
app/
├── index.tsx               # Redirect to /landing
├── _layout.tsx             # Root stack navigation
├── landing.tsx             # Landing page with auth check
├── sign-in.tsx             # Google OAuth screen
├── welcome.tsx             # Animated profile creation
└── (tabs)/
    ├── today.tsx           # Today timeline
    ├── explore.tsx         # Browse tools
    └── plan-week.tsx       # Schedule (async calendar fetch)
```

## Authentication State Management

### SecureStore Keys
```typescript
// Authentication
'google_access_token'   → OAuth access token (1hr expiry)
'google_refresh_token'  → OAuth refresh token (long-lived)

// User Info
'user_email'            → user@example.com
'user_name'             → "John Doe"
'user_id'               → Google user ID

// Profile State
'profile_completed'     → "true" | null
```

### Auth Check Logic (landing.tsx)
```typescript
useEffect(() => {
  checkAuthState();
}, []);

const checkAuthState = async () => {
  const token = await SecureStore.getItemAsync('google_access_token');
  const profileCompleted = await SecureStore.getItemAsync('profile_completed');
  
  if (token && profileCompleted === 'true') {
    router.replace('/(tabs)');      // ✅ Authenticated & profile complete
  } else if (token) {
    router.replace('/welcome');     // ⚠️ Authenticated but profile incomplete
  }
  // Otherwise stay on landing page
};
```

## Google OAuth Configuration

### Required Scopes
```typescript
const scopes = [
  'openid',                                                    // User ID
  'profile',                                                  // Name, photo
  'email',                                                    // Email address
  'https://www.googleapis.com/auth/calendar.readonly',       // Read calendar
  'https://www.googleapis.com/auth/calendar.events',         // Create events
];
```

### OAuth Setup (sign-in.tsx)
```typescript
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useAuthRequest({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: [...],
});

// Trigger OAuth flow
await promptAsync();
```

### Response Handling
```typescript
useEffect(() => {
  if (response?.type === 'success') {
    const { authentication } = response;
    
    // Store tokens
    await SecureStore.setItemAsync('google_access_token', authentication.accessToken);
    await SecureStore.setItemAsync('google_refresh_token', authentication.refreshToken);
    
    // Fetch user info
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${authentication.accessToken}` }
    }).then(r => r.json());
    
    await SecureStore.setItemAsync('user_email', userInfo.email);
    await SecureStore.setItemAsync('user_name', userInfo.name);
    
    // Navigate to welcome
    router.replace('/welcome');
  }
}, [response]);
```

## Welcome Screen Design

### Animated Elements

#### 1. Psychic Circle Animation
```typescript
// Entrance animations
Animated.parallel([
  Animated.spring(circleScale, { toValue: 1 }),      // Scale: 0 → 1
  Animated.timing(circleOpacity, { toValue: 1 }),    // Opacity: 0 → 1
]).start();

// Continuous pulse
Animated.loop(
  Animated.sequence([
    Animated.timing(pulseAnim, { toValue: 1.08 }),   // Scale up 8%
    Animated.timing(pulseAnim, { toValue: 1 }),      // Scale back
  ])
).start();

// Color glow
glowColor = glowAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [
    'rgba(74, 155, 175, 0.2)',    // Primary blue (calm)
    'rgba(122, 207, 125, 0.4)',   // Success green (glow)
  ],
});
```

#### 2. Visual Hierarchy
```
┌─────────────────────────────────┐
│                                  │
│        🧠 Psychic Circle         │ ← Animated center
│      (pulse + glow effect)       │
│                                  │
│     Welcome, John!               │ ← 36px bold
│  Let's create your profile       │ ← 18px secondary
│                                  │
│          🎤                       │ ← Voice button (120px)
│     "Hold to speak"              │
│                                  │
│  [Text Input Box]                │ ← Shows when toggled
│                                  │
│                     ⌨️            │ ← Floating toggle (bottom-right)
│                                  │
│     Skip for now →               │ ← Bottom center
└─────────────────────────────────┘
```

### Voice Recording

#### Audio Permissions
```typescript
await Audio.requestPermissionsAsync();
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
});
```

#### Recording Flow
```typescript
// Start recording (on press)
const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);
setRecording(recording);
setIsRecording(true);

// Stop recording (on release)
await recording.stopAndUnloadAsync();
const uri = recording.getURI();

// TODO: Send to speech-to-text API (ElevenLabs/OpenAI)
// For now: Show alert and enable text input
```

#### UI States
- **Default**: Blue mic button, "Hold to speak"
- **Recording**: Red mic button, "Release to stop"
- **Text Input**: Keyboard icon toggles input box

### Profile Completion
```typescript
const handleContinue = async () => {
  if (!userName.trim()) {
    Alert.alert('Name Required', 'Please tell us your name');
    return;
  }
  
  await SecureStore.setItemAsync('profile_completed', 'true');
  await SecureStore.setItemAsync('user_name', userName);
  
  router.replace('/(tabs)');  // Navigate to main app
};
```

## Schedule Calendar Integration

### Async Event Fetching
The schedule tab (`plan-week.tsx`) automatically fetches Google Calendar events when mounted:

```typescript
useEffect(() => {
  fetchCalendarEvents();
}, [currentDate]);

const fetchCalendarEvents = async () => {
  const token = await SecureStore.getItemAsync('google_access_token');
  if (!token) return;
  
  const response = await fetch(`${API_BASE_URL}/get-calendar-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: token,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
    }),
  });
  
  const data = await response.json();
  setEvents(mapEventsToCalendar(data.events));  // Max 5 per day
};
```

### Loading States
- **Loading**: ActivityIndicator in calendar grid
- **No Token**: Silent failure (shows empty calendar)
- **Events Loaded**: Dots appear on calendar dates

## Color Consistency

### Landing Page Colors
```typescript
// Light Mode
background: #FFFFFF
text: #1A1A1A
primary: #4A9BAF (blue)
textSecondary: #6B7280
surface: #F9FAFB

// Dark Mode  
background: #1A1A1A
text: #F9FAFB
primary: #4A9BAF (blue)
textSecondary: #9CA3AF
surface: #262626
```

### Sign-In Screen
- Icon container: Primary blue (#4A9BAF)
- Google button: White background, Google blue icon (#4285F4)
- Same spacing/typography as landing

### Welcome Screen
- Psychic circle: Primary blue (#4A9BAF)
- Glow effect: Primary → Success gradient
- Voice button: Primary (default), Error (recording)
- Text input: Surface background, border color
- All animations use calm colors (no jarring transitions)

## Installation & Setup

### Required Packages
```bash
npx expo install expo-auth-session expo-web-browser expo-av expo-secure-store
```

### Environment Variables
```bash
# .env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_client_id_here
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Google Cloud Console Setup
1. Create OAuth 2.0 credentials (iOS)
2. Add authorized redirect URI: 
   - `com.googleusercontent.apps.YOUR_CLIENT_ID:/oauth2redirect`
3. Enable Google Calendar API
4. Copy iOS client ID to `.env`

## Testing Checklist

### Landing Page
- [ ] Auth state check on mount works
- [ ] Auto-redirect if authenticated
- [ ] Sign-in/sign-up buttons navigate correctly
- [ ] Animations smooth (logo, content, buttons)

### Sign-In Screen
- [ ] Google OAuth prompt appears
- [ ] Tokens saved to SecureStore
- [ ] User info fetched and stored
- [ ] Navigation to welcome screen
- [ ] Back button returns to landing

### Welcome Screen
- [ ] Psychic circle animates (scale, pulse, glow)
- [ ] User name displays (if available)
- [ ] Voice recording works (iOS only)
- [ ] Text input toggle functional
- [ ] Profile completion saves flag
- [ ] Navigation to tabs after completion

### Schedule Integration
- [ ] Calendar events load after sign-in
- [ ] Max 5 events per day respected
- [ ] Loading state shows
- [ ] Empty state handled gracefully
- [ ] Month navigation refetches events

## Next Steps

### Priority 1: Token Refresh
- [ ] Implement refresh token logic
- [ ] Check token expiry before API calls
- [ ] Auto-refresh when expired
- [ ] Handle refresh failures (re-auth)

### Priority 2: Speech-to-Text
- [ ] Integrate ElevenLabs/OpenAI API
- [ ] Send recorded audio to API
- [ ] Parse response for name
- [ ] Auto-populate text input

### Priority 3: Profile Enrichment
- [ ] Add ADHD preferences (energy windows)
- [ ] Add sensory preferences
- [ ] Add dietary restrictions
- [ ] Add workout preferences
- [ ] Save to Supabase profiles table

### Priority 4: Sign Out
- [ ] Add sign out in profile modal
- [ ] Clear all SecureStore keys
- [ ] Navigate back to landing
- [ ] Confirm dialog

## Troubleshooting

### OAuth Not Working
- Check `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set
- Verify redirect URI in Google Cloud Console
- Ensure Calendar API is enabled
- Test on physical device (not simulator)

### Voice Recording Fails
- Check microphone permissions
- iOS only feature (not Android/web yet)
- Test `expo-av` installation
- Check Audio.setAudioModeAsync() called

### Calendar Not Loading
- Check access token exists in SecureStore
- Verify server endpoint `/get-calendar-events` works
- Check network request in console
- Ensure Calendar API scope granted

---

**Implementation Status:** ✅ Complete  
**Last Updated:** January 6, 2025  
**Dependencies:** expo-auth-session, expo-web-browser, expo-av, expo-secure-store
