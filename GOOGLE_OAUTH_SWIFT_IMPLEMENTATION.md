# Google Calendar OAuth - Native Swift Implementation

## Why Use Native Swift?

- ✅ Better user experience (native Google Sign-In UI)
- ✅ More reliable authentication flow
- ✅ Automatic token management by Google SDK
- ✅ Better security (no custom URL schemes needed)
- ✅ Works offline for token refresh

## Prerequisites

1. Google Cloud Console setup (same as before)
2. iOS Bundle ID configured
3. GoogleService-Info.plist file

---

## Option 1: Expo with Native Module (Recommended)

### Step 1: Install Google Sign-In Package

```bash
cd client
npx expo install expo-google-sign-in
# OR use the community package
npx expo install @react-native-google-signin/google-signin
```

### Step 2: Install iOS CocoaPods

```bash
cd ios
pod install
cd ..
```

### Step 3: Download GoogleService-Info.plist

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project or select existing
3. Add iOS app with your bundle ID: `com.yourcompany.flowmind`
4. Download `GoogleService-Info.plist`
5. Place it at: `client/GoogleService-Info.plist`

### Step 4: Update app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.flowmind",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR_CLIENT_ID_REVERSED"
        }
      ]
    ]
  }
}
```

### Step 5: Update TypeScript Implementation

Replace `client/lib/google-auth.ts`:

```typescript
/**
 * Google Calendar OAuth - Native Swift Implementation
 * Uses @react-native-google-signin/google-signin
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

// Configure Google Sign-In
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  offlineAccess: true, // Get refresh token
  forceCodeForRefreshToken: true,
});

const ACCESS_TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';

/**
 * Sign in with Google (native UI)
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    await GoogleSignin.hasPlayServices();
    
    const userInfo = await GoogleSignin.signIn();
    
    // Get tokens
    const tokens = await GoogleSignin.getTokens();
    
    // Store tokens
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    
    console.log('✅ Signed in:', userInfo.user.email);
    return tokens.accessToken;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled sign in');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Sign in already in progress');
    } else {
      console.error('Sign in error:', error);
    }
    return null;
  }
}

/**
 * Get current access token (auto-refresh if needed)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    
    if (!isSignedIn) {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }
    
    // Let Google SDK handle token refresh automatically
    const tokens = await GoogleSignin.getTokens();
    
    // Update stored token
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    
    return tokens.accessToken;
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
}

/**
 * Check if signed in
 */
export async function isSignedIn(): Promise<boolean> {
  return await GoogleSignin.isSignedIn();
}

/**
 * Sign out
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    console.log('✅ Signed out');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Revoke access completely
 */
export async function revokeGoogleAccess(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
    await signOutGoogle();
  } catch (error) {
    console.error('Revoke error:', error);
  }
}

/**
 * Get user info
 */
export async function getCurrentUser() {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return userInfo.user;
  } catch (error) {
    return null;
  }
}
```

---

## Option 2: Custom Swift Native Module (Full Control)

If you need more control, create a custom native module.

### Step 1: Create Expo Config Plugin

Create `client/plugins/google-calendar-plugin.js`:

```javascript
const { withAppDelegate, withPodfile } = require('@expo/config-plugins');

module.exports = function withGoogleCalendar(config) {
  // Add GoogleSignIn pod
  config = withPodfile(config, (config) => {
    config.modResults.contents = addGoogleSignInPod(config.modResults.contents);
    return config;
  });
  
  // Configure AppDelegate
  config = withAppDelegate(config, (config) => {
    config.modResults.contents = addGoogleSignInToAppDelegate(
      config.modResults.contents
    );
    return config;
  });
  
  return config;
};

function addGoogleSignInPod(podfile) {
  if (!podfile.includes('GoogleSignIn')) {
    return podfile.replace(
      /target .+ do/,
      `target 'YourApp' do\n  pod 'GoogleSignIn', '~> 7.0'`
    );
  }
  return podfile;
}

function addGoogleSignInToAppDelegate(appDelegate) {
  // Add import
  if (!appDelegate.includes('@import GoogleSignIn;')) {
    appDelegate = appDelegate.replace(
      /#import "AppDelegate.h"/,
      `#import "AppDelegate.h"\n@import GoogleSignIn;`
    );
  }
  
  // Add URL handling
  if (!appDelegate.includes('handleURL')) {
    const urlHandling = `
- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [GIDSignIn.sharedInstance handleURL:url];
}
`;
    appDelegate = appDelegate.replace(
      /@end/,
      `${urlHandling}\n@end`
    );
  }
  
  return appDelegate;
}
```

### Step 2: Create Swift Native Module

Create `client/modules/google-calendar/ios/GoogleCalendarModule.swift`:

```swift
import ExpoModulesCore
import GoogleSignIn
import GoogleAPIClientForREST

public class GoogleCalendarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GoogleCalendar")
    
    // Sign in with Google
    AsyncFunction("signIn") { (promise: Promise) in
      guard let presentingViewController = UIApplication.shared.keyWindow?.rootViewController else {
        promise.reject("NO_VIEW_CONTROLLER", "No view controller available")
        return
      }
      
      let configuration = GIDConfiguration(clientID: getClientId())
      let scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events"
      ]
      
      GIDSignIn.sharedInstance.signIn(
        withPresenting: presentingViewController,
        hint: nil,
        additionalScopes: scopes
      ) { signInResult, error in
        if let error = error {
          promise.reject("SIGN_IN_ERROR", error.localizedDescription)
          return
        }
        
        guard let user = signInResult?.user,
              let accessToken = user.accessToken.tokenString else {
          promise.reject("NO_TOKEN", "Failed to get access token")
          return
        }
        
        let result: [String: Any] = [
          "accessToken": accessToken,
          "email": user.profile?.email ?? "",
          "name": user.profile?.name ?? "",
          "photo": user.profile?.imageURL(withDimension: 200)?.absoluteString ?? ""
        ]
        
        promise.resolve(result)
      }
    }
    
    // Get current access token
    AsyncFunction("getAccessToken") { (promise: Promise) in
      guard let user = GIDSignIn.sharedInstance.currentUser else {
        promise.reject("NOT_SIGNED_IN", "User not signed in")
        return
      }
      
      // Refresh token if needed
      user.refreshTokensIfNeeded { user, error in
        if let error = error {
          promise.reject("TOKEN_REFRESH_ERROR", error.localizedDescription)
          return
        }
        
        guard let accessToken = user?.accessToken.tokenString else {
          promise.reject("NO_TOKEN", "Failed to get access token")
          return
        }
        
        promise.resolve(accessToken)
      }
    }
    
    // Check if signed in
    Function("isSignedIn") { () -> Bool in
      return GIDSignIn.sharedInstance.currentUser != nil
    }
    
    // Sign out
    Function("signOut") {
      GIDSignIn.sharedInstance.signOut()
    }
    
    // Get calendar free/busy
    AsyncFunction("getFreeBusy") { (timeMin: String, timeMax: String, promise: Promise) in
      guard let user = GIDSignIn.sharedInstance.currentUser,
            let accessToken = user.accessToken.tokenString else {
        promise.reject("NOT_SIGNED_IN", "User not signed in")
        return
      }
      
      // Use Google Calendar API
      let calendarService = GTLRCalendarService()
      calendarService.authorizer = user.fetcherAuthorizer
      
      let query = GTLRCalendarQuery_FreebusyQuery.query(
        withObject: GTLRCalendar_FreeBusyRequest()
      )
      
      calendarService.executeQuery(query) { ticket, response, error in
        if let error = error {
          promise.reject("API_ERROR", error.localizedDescription)
          return
        }
        
        // Parse and return free/busy data
        if let freeBusyResponse = response as? GTLRCalendar_FreeBusyResponse {
          promise.resolve(self.parseFreeBusy(freeBusyResponse))
        }
      }
    }
    
    // Helper to get client ID from Info.plist
    private func getClientId() -> String {
      guard let clientId = Bundle.main.object(
        forInfoDictionaryKey: "GIDClientID"
      ) as? String else {
        fatalError("Missing GIDClientID in Info.plist")
      }
      return clientId
    }
    
    // Helper to parse free/busy response
    private func parseFreeBusy(_ response: GTLRCalendar_FreeBusyResponse) -> [[String: Any]] {
      var busyBlocks: [[String: Any]] = []
      
      if let calendars = response.calendars,
         let primary = calendars["primary"] as? GTLRCalendar_FreeBusyCalendar,
         let busy = primary.busy {
        for timePeriod in busy {
          if let start = timePeriod.start?.dateValue,
             let end = timePeriod.end?.dateValue {
            busyBlocks.append([
              "start": ISO8601DateFormatter().string(from: start),
              "end": ISO8601DateFormatter().string(from: end)
            ])
          }
        }
      }
      
      return busyBlocks
    }
  }
}
```

### Step 3: Create TypeScript Wrapper

Create `client/lib/google-calendar-native.ts`:

```typescript
import { NativeModules } from 'react-native';

const { GoogleCalendar } = NativeModules;

export interface GoogleUser {
  accessToken: string;
  email: string;
  name: string;
  photo?: string;
}

export async function signInWithGoogle(): Promise<GoogleUser> {
  return await GoogleCalendar.signIn();
}

export async function getAccessToken(): Promise<string> {
  return await GoogleCalendar.getAccessToken();
}

export function isSignedIn(): boolean {
  return GoogleCalendar.isSignedIn();
}

export function signOut(): void {
  GoogleCalendar.signOut();
}

export async function getFreeBusy(
  timeMin: string,
  timeMax: string
): Promise<Array<{ start: string; end: string }>> {
  return await GoogleCalendar.getFreeBusy(timeMin, timeMax);
}
```

---

## Comparison: Web OAuth vs Native Swift

| Feature | Web OAuth (expo-auth-session) | Native Swift (GoogleSignIn SDK) |
|---------|-------------------------------|----------------------------------|
| User Experience | Browser popup | Native Google UI ✅ |
| Token Management | Manual refresh | Auto-refresh ✅ |
| Offline Support | Limited | Works offline ✅ |
| Setup Complexity | Easy | Moderate |
| Expo Compatible | ✅ Yes | Requires config plugin |
| Production Ready | Good | Excellent ✅ |

---

## Recommendation

**For Production:** Use **@react-native-google-signin/google-signin** (Option 1)
- Easiest to implement
- Battle-tested
- Good Expo support with config plugin
- Automatic token management

**For Maximum Control:** Use custom Swift module (Option 2)
- Full control over implementation
- Can add custom calendar features
- Direct Google Calendar API integration

---

## Quick Start (Option 1)

```bash
# Install package
cd client
npx expo install @react-native-google-signin/google-signin

# Update app.json (add plugin)
# Update google-auth.ts (use new implementation above)

# Prebuild (generates native code)
npx expo prebuild

# Run
npx expo run:ios
```

Would you like me to help you implement Option 1 (recommended) or Option 2 (custom module)?

