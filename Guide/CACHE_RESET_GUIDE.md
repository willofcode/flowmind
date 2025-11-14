# Manual Cache Reset Guide

## ✅ What the System Does

The app uses **date-specific cache flags** to prevent duplicate activity generation:

```
activities_generated_date_2025-11-12  (Yesterday)
activities_generated_date_2025-11-13  (Today)
activities_generated_date_2025-11-14  (Tomorrow)
```

When you generate activities, it sets:
```typescript
await SecureStore.setItemAsync('activities_generated_date_2025-11-13', '2025-11-13');
```

## 🔄 How to Reset Cache (3 Methods)

### Method 1: Using iOS Simulator (EASIEST)
1. Open iOS Simulator
2. Go to: **Device** → **Erase All Content and Settings**
3. This clears ALL app data including cache flags
4. Restart the app

### Method 2: Delete App from Simulator
1. Long-press the FlowMind app icon
2. Tap the **X** to delete
3. Reinstall: `npm run ios` from client folder
4. All cache cleared on fresh install

### Method 3: In-App Pull-to-Refresh (SAFEST)
1. Open **Today** tab
2. **Pull down** on the screen
3. This triggers `refreshSchedule()` which:
   - Re-fetches Google Calendar
   - Shows existing activities
   - Does NOT regenerate (cache still active)

**Note**: Pull-to-refresh does NOT clear the cache flag, it just refreshes the display.

---

## 🛠️ Programmatic Reset (For Development)

### Option A: Add Debug Button (Recommended)
Add this to `client/app/(tabs)/today.tsx`:

```typescript
// Add state
const [showDebug, setShowDebug] = useState(__DEV__); // Only in dev mode

// Add function
const clearActivityCache = async () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dates = [yesterday, today, tomorrow];
  
  for (const date of dates) {
    const dateString = date.toISOString().split('T')[0];
    const key = `activities_generated_date_${dateString}`;
    try {
      await SecureStore.deleteItemAsync(key);
      console.log('✅ Cleared:', key);
    } catch (e) {
      console.log('⚠️ Not found:', key);
    }
  }
  
  Alert.alert('Cache Cleared', 'Activities will regenerate on next refresh');
};

// Add button in render (only in dev mode)
{showDebug && (
  <Pressable
    onPress={clearActivityCache}
    style={{
      position: 'absolute',
      top: 100,
      right: 20,
      backgroundColor: 'red',
      padding: 10,
      borderRadius: 8,
      zIndex: 1000,
    }}
  >
    <Text style={{ color: 'white', fontSize: 12 }}>🧹 Clear Cache</Text>
  </Pressable>
)}
```

### Option B: Console Commands (iOS Simulator)
Open Safari Web Inspector while app is running:

1. Safari → **Develop** → **Simulator** → **JSContext**
2. Run in console:
```javascript
// Clear today's cache
await SecureStore.deleteItemAsync('activities_generated_date_2025-11-13');

// Clear yesterday
await SecureStore.deleteItemAsync('activities_generated_date_2025-11-12');

// Clear tomorrow
await SecureStore.deleteItemAsync('activities_generated_date_2025-11-14');
```

### Option C: Expo Dev Tools
If running with `expo start`:
1. Press `Shift + M` in terminal (open dev menu)
2. Tap "Debug Remote JS"
3. Opens Chrome DevTools
4. In Console, run:
```javascript
import * as SecureStore from 'expo-secure-store';
await SecureStore.deleteItemAsync('activities_generated_date_2025-11-13');
```

---

## 🔍 How to Check Cache Status

### Check in Code (Debugging)
Add this anywhere in `today.tsx`:

```typescript
const checkCache = async () => {
  const today = new Date().toISOString().split('T')[0];
  const key = `activities_generated_date_${today}`;
  const value = await SecureStore.getItemAsync(key);
  console.log(`📦 Cache for ${today}:`, value ? 'SET ✅' : 'NOT SET ❌');
};

useEffect(() => {
  checkCache();
}, []);
```

### Visual Indicator
You could add a cache status indicator to the UI:

```typescript
const [cacheStatus, setCacheStatus] = useState<string>('');

useEffect(() => {
  (async () => {
    const today = getTodayDateString();
    const key = `activities_generated_date_${today}`;
    const cached = await SecureStore.getItemAsync(key);
    setCacheStatus(cached ? '🟢 Cached' : '🔴 Not Cached');
  })();
}, [selectedDay]);

// In render:
<Text style={{ fontSize: 10, color: '#666' }}>{cacheStatus}</Text>
```

---

## 📊 Cache Keys Explained

| Key Pattern | Purpose | When Set |
|-------------|---------|----------|
| `activities_generated_date_YYYY-MM-DD` | Marks activities generated for specific date | After successful AI generation OR when FlowMind events detected in calendar |

### When Cache is Set:
1. **After AI Generation**: When `/api/generate-agentic-activities` succeeds
2. **Auto-Detection**: When calendar fetch finds existing FlowMind events (🌿 prefix)

### Cache Check Logic (in `fetchAgenticActivities`):
```typescript
const generatedDateKey = `activities_generated_date_${targetDateString}`;
const generated = await SecureStore.getItemAsync(generatedDateKey);

if (generated) {
  console.log('✅ Activities already generated, skipping API call');
  return [];
}

// Also check Google Calendar for FlowMind events
const existingFlowMindEvents = calendarEvents.filter(e => 
  e.summary?.startsWith('🌿')
);

if (existingFlowMindEvents.length > 0) {
  console.log('🔍 Detected FlowMind events, auto-caching');
  await SecureStore.setItemAsync(generatedDateKey, targetDateString);
  return [];
}
```

---

## ✨ Recommended: Add Cache Reset to Dev Menu

Add to `client/app/(tabs)/today.tsx`:

```typescript
// In the dev menu or settings screen
<Pressable onPress={async () => {
  Alert.alert(
    'Reset Activity Cache',
    'This will allow activities to regenerate. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          // Clear 3 days (yesterday, today, tomorrow)
          const dates = [-1, 0, 1].map(offset => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            return d.toISOString().split('T')[0];
          });
          
          for (const date of dates) {
            await SecureStore.deleteItemAsync(`activities_generated_date_${date}`);
          }
          
          Alert.alert('Done', 'Cache cleared. Pull to refresh to regenerate.');
        }
      }
    ]
  );
}}>
  <Text>🧹 Reset Activity Cache</Text>
</Pressable>
```

---

## 🚨 Important Notes

1. **Cache is PER DATE**: Today and tomorrow have separate caches
2. **Deleting app clears cache**: But also clears Google auth tokens!
3. **Pull-to-refresh does NOT clear cache**: It only refreshes display
4. **Auto-caching prevents duplicates**: Finding FlowMind events auto-sets cache
5. **Cache survives app restart**: Uses expo-secure-store (persistent)

---

## Quick Reference

| Action | Clears Cache? | Clears Auth? | Best For |
|--------|---------------|--------------|----------|
| Erase Simulator | ✅ Yes | ✅ Yes | Full reset |
| Delete App | ✅ Yes | ✅ Yes | Clean slate |
| Pull-to-refresh | ❌ No | ❌ No | Just refresh display |
| Debug button | ✅ Yes | ❌ No | **Development** ⭐ |
| Console command | ✅ Yes | ❌ No | Quick test |

**Recommended for dev**: Add debug button (Option A above) 🎯
