# Google Sign-In Native Setup - Quick Start Guide

## ✅ What's Already Done

1. ✅ app.json updated with Google Sign-In plugin
2. ✅ .env file has placeholder for iOS Client ID

---

## 🔧 Next Steps (Follow in Order)

### Step 1: Install the Package

```bash
cd client
npx expo install @react-native-google-signin/google-signin
cd ..
```

### Step 2: Get iOS Client ID from Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Click "Add app" → iOS
4. Enter iOS Bundle ID: `com.yourcompany.flowmind` (must match app.json)
5. Register app
6. Download `GoogleService-Info.plist`
7. Move it to: `client/GoogleService-Info.plist`

### Step 3: Get the Reversed Client ID

Open the `GoogleService-Info.plist` file and find these two values:

```xml
<key>CLIENT_ID</key>
<string>123456789-abcdefg.apps.googleusercontent.com</string>

<key>REVERSED_CLIENT_ID</key>
<string>com.googleusercontent.apps.123456789-abcdefg</string>
```

### Step 4: Update Configuration Files

**A) Update `client/.env`:**
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

**B) Update `client/app.json` (line 46):**

Replace:
```json
"iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"
```

With your actual reversed client ID:
```json
"iosUrlScheme": "com.googleusercontent.apps.123456789-abcdefg"
```

### Step 5: Update google-auth.ts

Replace `client/lib/google-auth.ts` with the native implementation from `GOOGLE_OAUTH_SWIFT_IMPLEMENTATION.md` (Option 1, Step 5).

### Step 6: Prebuild & Run

```bash
cd client

# Generate native iOS project with the plugin
npx expo prebuild --platform ios

# Run on iOS
npx expo run:ios
```

---

## 🧪 Testing

1. Open the app in iOS simulator
2. Go to Explore tab
3. Tap "Connect Google Calendar"
4. Should see native Google Sign-In UI (not browser!)
5. Sign in with Google account
6. Check console for "✅ Signed in: [email]"

---

## 🔍 Troubleshooting

### Error: "hasPlayServices is not available"
This is expected on iOS - the method is for Android. The native implementation handles it gracefully.

### Error: "No such module 'GoogleSignIn'"
Run: `cd ios && pod install && cd ..`

### Error: "iosUrlScheme is invalid"
Make sure you're using the REVERSED_CLIENT_ID from GoogleService-Info.plist (starts with `com.googleusercontent.apps.`)

### Sign-in opens Safari instead of native UI
Make sure:
1. GoogleService-Info.plist is in `client/` folder
2. app.json has `"googleServicesFile": "./GoogleService-Info.plist"`
3. You ran `npx expo prebuild` after adding the file

---

## 📝 What Changed in app.json

```diff
     "ios": {
       "supportsTablet": true,
       "bundleIdentifier": "com.yourcompany.flowmind",
+      "googleServicesFile": "./GoogleService-Info.plist"
     },
     
     "plugins": [
       "expo-router",
       [
         "expo-splash-screen",
         { ... }
-      ]
+      ],
+      [
+        "@react-native-google-signin/google-signin",
+        {
+          "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"
+        }
+      ]
     ],
```

---

## 🎯 Why This Is Better

| Old (Web OAuth) | New (Native Swift) |
|-----------------|-------------------|
| Opens Safari browser | Native Google UI ✨ |
| Manual token refresh | Auto-refresh ✨ |
| Requires redirect URI setup | Automatic ✨ |
| Can break on iOS updates | Maintained by Google ✨ |

---

Ready to proceed? Run Step 1 to install the package!
