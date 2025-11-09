# Quick Start: Testing Google Calendar Integration

## 🚀 What You Need to Do Now

### 1. Wait for iOS Build to Complete
The build is currently in progress. Once it finishes, the iOS simulator should launch automatically.

### 2. Test the Integration

#### Option A: Use the Test Screen (Recommended)
Once the app launches, you need to navigate to the test screen. Since there's no button in the UI yet, you can:

1. **Add a temporary button to landing page:**
   - Edit `client/app/landing.tsx`
   - Add this button somewhere visible:
   ```tsx
   <Pressable onPress={() => router.push('/google-calendar-test')}>
     <Text>🧪 Test Google Calendar</Text>
   </Pressable>
   ```

2. **Or use the existing sign-in flow** and test from there

#### Option B: Add to Profile Screen
Add the `CalendarSyncStatus` component to your profile/modal screen:

```tsx
// In app/modal.tsx or app/(tabs)/profile.tsx
import CalendarSyncStatus from '@/components/calendar-sync-status';
import { useAuth0 } from '@/lib/use-auth0';

export default function ProfileScreen() {
  const { user } = useAuth0();
  
  return (
    <View>
      {/* Your existing UI */}
      
      <CalendarSyncStatus
        userId={user?.id || 'test-user'}
        colorScheme="light"
      />
    </View>
  );
}
```

### 3. Test Sign-In Flow

Once you have access to the test screen or calendar sync status:

1. **Tap "Connect Google Calendar"** or **"Sign In with Google"**
2. **iOS Google Sign-In UI will appear** (native iOS sheet)
3. **Select your Google account**
4. **Grant calendar permissions** when prompted
5. **You should see:**
   - ✅ "Sign-in successful" in logs
   - 🎟️ Access token displayed (truncated)
   - 👤 Your email address
   - ✅ "CONNECTED" badge

### 4. Test Calendar Sync

After signing in:

1. **Open Google Calendar in your browser**
2. **Add 1-2 new events** (any time, any title)
3. **Wait ~30 seconds** (for webhook or next sync)
4. **Return to app** - should see:
   - "Recent changes: +2 added"
   - Last synced time updates

### 5. Test Re-optimization Alert

Add more events to trigger the alert:

1. **Add 3+ more events** in Google Calendar
2. **Wait for sync**
3. **Should see**:
   - "⚠️ Schedule Changed" alert
   - "3 significant events changed"
   - **"Re-Optimize Calendar" button**

## 🔍 What to Look For

### In Xcode Console / Terminal
```
🚀 Initializing Google Calendar integration...
🔧 Configuring Google Sign-In...
📱 iOS Client ID: 940109485523-...
🌐 Web Client ID: 940109485523-...
✅ Google Sign-In configured
```

### When Tapping Sign-In
```
🔐 Starting Google Calendar sign-in...
✅ Sign-in successful: your.email@gmail.com
🎟️ Got access token
💾 Tokens stored securely
```

### When Syncing
```
🔄 Syncing calendar...
✅ Calendar synced: { added: 2, modified: 0, deleted: 0 }
```

## 🐛 Troubleshooting

### Build Fails
**Error**: Pod install issues  
**Solution**:
```bash
cd client/ios
pod install
cd ..
npm run ios
```

### Google Sign-In Doesn't Appear
**Possible causes:**
1. Google Client ID not configured correctly
2. Bundle ID mismatch in Google Cloud Console
3. Google Sign-In library not linked

**Check:**
```bash
# Verify .env has correct values
cat client/.env | grep GOOGLE

# Should show:
# EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=940109485523-...
```

### "SIGN_IN_CANCELLED"
**Not an error!** User dismissed the sign-in UI. Try again.

### "No access token available"
**Cause**: Sign-in didn't complete  
**Solution**: Sign in again

## 📝 Next Steps After Successful Test

### 1. Remove Test Screen (Optional)
Once verified working, you can remove or hide the test screen:
```bash
# Delete or move to a hidden location
mv client/app/google-calendar-test.tsx client/app/_google-calendar-test.tsx.backup
```

### 2. Add to Production UI
Integrate `CalendarSyncStatus` into your actual profile/settings screen.

### 3. Set Up Backend Sync
Make sure your backend server is running:
```bash
# Terminal 1
cd server && npm start

# Terminal 2  
ngrok http 3001
```

### 4. Test Full Flow
1. Sign in with Google ✅
2. Sync calendar ✅
3. Add events in Google Calendar ✅
4. See changes detected ✅
5. See re-optimization alert ✅
6. Tap "Re-Optimize" ✅

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Google Sign-In UI appears (native iOS sheet)
- ✅ Sign-in succeeds and token is displayed
- ✅ "CONNECTED" badge shows green
- ✅ Calendar sync completes without errors
- ✅ Changes from Google Calendar are detected
- ✅ Re-optimization alert appears after 3+ event changes

## 📞 Need Help?

Check the logs for specific error messages:
- Xcode Console (if running `npm run ios`)
- iOS Simulator: Debug → Open System Log
- Backend logs: Check `server` terminal

Common errors and solutions are in `GOOGLE_CALENDAR_INTEGRATION_COMPLETE.md`.

---

**Current Status**: iOS build in progress...

Once the simulator launches, follow the steps above to test!
