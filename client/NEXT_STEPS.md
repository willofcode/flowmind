# ✅ Google Sign-In Setup Complete!

## What's Been Done

1. ✅ Installed `@react-native-google-signin/google-signin`
2. ✅ Updated `app.json` with plugin configuration
3. ✅ Replaced `google-auth.ts` with native Swift implementation
4. ✅ TypeScript errors resolved
5. ✅ UI component ready (`GoogleCalendarConnect`)

---

## 🚀 Next: Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing
3. Name it: `flowmind` (or whatever you prefer)
4. Click **Continue** through setup

### Step 2: Add iOS App

1. In Firebase Console, click the **iOS icon** (⚙️ gear → Project settings)
2. Click **"Add app"** → iOS
3. Enter iOS Bundle ID: `com.yourcompany.flowmind`
   - ⚠️ Must match `app.json` → `ios.bundleIdentifier`
4. App nickname: `FlowMind`
5. Click **Register app**

### Step 3: Download GoogleService-Info.plist

1. Download the `GoogleService-Info.plist` file
2. Move it to your project:
   ```bash
   # Move downloaded file to client folder
   mv ~/Downloads/GoogleService-Info.plist /Users/williamng/Git/flowmind/flowmind/client/
   ```

### Step 4: Get Client IDs

Open the `GoogleService-Info.plist` file and find:

```xml
<key>CLIENT_ID</key>
<string>123456789-abcdefg.apps.googleusercontent.com</string>

<key>REVERSED_CLIENT_ID</key>
<string>com.googleusercontent.apps.123456789-abcdefg</string>
```

### Step 5: Update Configuration Files

**A) Update `.env`:**
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

**B) Update `app.json` (line 49):**

Replace:
```json
"iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"
```

With:
```json
"iosUrlScheme": "com.googleusercontent.apps.123456789-abcdefg"
```

### Step 6: Enable Google Calendar API

1. In Firebase/Google Cloud Console, go to **APIs & Services**
2. Click **"+ Enable APIs and Services"**
3. Search for **"Google Calendar API"**
4. Click **Enable**

### Step 7: Prebuild & Run

```bash
cd /Users/williamng/Git/flowmind/flowmind/client

# Generate native code with plugin
npx expo prebuild --platform ios --clean

# Run on iOS
npx expo run:ios
```

---

## 🧪 Testing Checklist

1. [ ] App launches without errors
2. [ ] Navigate to **Explore** tab
3. [ ] See "Connect Google Calendar" button
4. [ ] Tap button → Native Google Sign-In sheet appears (NOT Safari!)
5. [ ] Sign in with Google account
6. [ ] See "✅ Connected" message
7. [ ] Check console for: `✅ Signed in successfully`

---

## 🔍 Troubleshooting

### Build Error: "GoogleSignIn module not found"

```bash
cd ios
pod install
cd ..
npx expo prebuild --platform ios --clean
```

### Error: "iosUrlScheme is invalid"

Make sure you're using the **REVERSED_CLIENT_ID** from GoogleService-Info.plist (starts with `com.googleusercontent.apps.`)

### Still Opens Safari Instead of Native UI

1. Confirm `GoogleService-Info.plist` is in `client/` folder
2. Confirm `app.json` has `"googleServicesFile": "./GoogleService-Info.plist"`
3. Delete `ios` folder and run `npx expo prebuild` again

### Error: "hasPlayServices is not available"

This is normal on iOS! The code handles it automatically. Ignore this warning.

---

## 📝 What Changed

### app.json
- Added `googleServicesFile` reference
- Added `@react-native-google-signin/google-signin` plugin

### google-auth.ts
- Removed expo-auth-session (web OAuth)
- Added @react-native-google-signin/google-signin (native)
- Auto token refresh handled by SDK
- Simpler API, more reliable

### Benefits of Native Implementation

| Old (Web) | New (Native) |
|-----------|--------------|
| Opens Safari | Native Google UI ✨ |
| Manual token refresh | Auto-refresh ✨ |
| Complex setup | Simple setup ✨ |
| Can break | Google-maintained ✨ |

---

## ⏭️ After This Works

Once Google Sign-In works:

1. **Implement schedule intensity calculation** (server-side)
2. **Build gap analysis** (find free time slots)
3. **Generate adaptive activities** (breathing, workouts, meals)
4. **Integrate ElevenLabs TTS** (guided breathing audio)
5. **Complete plan-week flow** (AI + Calendar + Audio)

---

Ready to test! Start with **Step 1** above. 🚀
