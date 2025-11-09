# Calendar Sync Quick Start Guide

## Overview
FlowMind's calendar sync system detects external changes to your Google Calendar and recommends re-optimization when needed. This ensures your neurodivergent-friendly schedule stays optimal even when you add events manually.

## How It Works

### 1. **Change Detection**
```
User adds event → Google Calendar → Webhook notification
                                  ↓
                    FlowMind sync service detects change
                                  ↓
                    Analyzes impact on schedule intensity
                                  ↓
                    Recommends re-optimization if needed
```

### 2. **Sync Triggers**
- **Webhook (real-time)**: Google sends push notification when calendar changes
- **App foreground**: Syncs when user opens app (via AppState listener)
- **Periodic background**: Syncs every 15 minutes by default
- **Manual sync**: User taps "Sync" button

### 3. **Re-optimization Decision**
The system recommends re-optimization when:
- 3+ events added/modified in a day
- Total schedule time changes by >2 hours
- Free time changes by >30%
- Events overlap with existing optimized activities

## Database Schema

### Core Tables
```sql
-- Track active webhook subscriptions
calendar_watch_channels (
  channel_id (PK),
  user_id,
  resource_id,
  expiration,
  webhook_url
)

-- Cache calendar events for diff comparison
cached_calendar_events (
  event_id (PK),
  user_id,
  calendar_id,
  summary,
  start_time,
  end_time,
  last_modified
)

-- Track sync state per user
user_calendar_sync (
  user_id (PK),
  sync_token,
  last_sync_time,
  events_cached_count,
  consecutive_errors
)

-- Audit trail of changes
calendar_change_log (
  id (PK),
  user_id,
  change_type (added|modified|deleted),
  event_id,
  event_summary,
  old_data JSONB,
  new_data JSONB,
  detected_at
)

-- User-facing notifications
calendar_sync_notifications (
  id (PK),
  user_id,
  notification_type (reoptimize_recommended|sync_error),
  message,
  action_taken (pending|dismissed|actioned)
)
```

### Helper Views
```sql
-- Recent changes for debugging
recent_calendar_changes (user_id, change_type, count, last_change)

-- Active webhooks
active_watch_channels (user_id, channel_id, expiration, days_until_expiration)

-- Users needing re-optimization
users_needing_reoptimization (user_id, last_sync, changes_count, recommendation_reason)
```

## React Hook Usage

### Basic Setup
```tsx
import { useGoogleCalendar } from '@/lib/use-google-calendar';

function MyComponent() {
  const {
    isConnected,
    isSyncing,
    lastSyncTime,
    changes,
    shouldReoptimize,
    connect,
    sync
  } = useGoogleCalendar('user-123', {
    autoSync: true,
    syncInterval: 15, // minutes
    onReoptimizeRecommended: () => {
      console.log('📢 Re-optimize recommended!');
    }
  });

  return (
    <View>
      {!isConnected ? (
        <Button onPress={connect}>Connect Calendar</Button>
      ) : (
        <>
          <Text>Last synced: {formatTime(lastSyncTime)}</Text>
          {changes && (
            <Text>
              Changes: +{changes.added} ~{changes.modified} -{changes.deleted}
            </Text>
          )}
          {shouldReoptimize && (
            <Button onPress={() => router.push('/calendar-optimizer')}>
              Re-Optimize Schedule
            </Button>
          )}
        </>
      )}
    </View>
  );
}
```

### Pre-built Component
```tsx
import CalendarSyncStatus from '@/components/calendar-sync-status';

function ProfileScreen({ userId }: { userId: string }) {
  return (
    <View>
      {/* Handles all sync UI automatically */}
      <CalendarSyncStatus
        userId={userId}
        colorScheme="light"
        onReoptimizePress={() => {
          // Custom action when user wants to re-optimize
          router.push('/today'); // or wherever
        }}
      />
    </View>
  );
}
```

## API Endpoints

### Sync Operations
```bash
# Manual sync trigger
POST /calendar-sync/sync
Body: {
  "userId": "user-123",
  "accessToken": "ya29.a0..."
}
Response: {
  "changes": { "added": 2, "modified": 1, "deleted": 0 },
  "syncToken": "CODkmdrb0fkCODk...",
  "recommendReoptimization": true
}

# Set up webhook notifications
POST /calendar-sync/watch
Body: {
  "userId": "user-123",
  "accessToken": "ya29.a0...",
  "webhookUrl": "https://yourapp.com/webhook"
}
Response: {
  "channelId": "uuid-1234",
  "resourceId": "kYEhfXi...",
  "expiration": "2024-01-15T12:00:00Z"
}

# Tear down webhook
POST /calendar-sync/unwatch
Body: {
  "accessToken": "ya29.a0...",
  "channelId": "uuid-1234",
  "resourceId": "kYEhfXi..."
}

# Get recent changes
GET /calendar-sync/changes/:userId
Response: {
  "changes": [
    {
      "id": 1,
      "changeType": "added",
      "eventId": "evt_123",
      "eventSummary": "Doctor Appointment",
      "detectedAt": "2024-01-10T14:30:00Z"
    }
  ],
  "count": 5
}

# Check if re-optimization needed
GET /calendar-sync/should-reoptimize/:userId
Response: {
  "shouldReoptimize": true,
  "reason": "3 events added in last 24 hours",
  "lastSync": "2024-01-10T14:00:00Z",
  "changesSinceLastOptimization": 3
}
```

### Webhook Endpoint (Google calls this)
```bash
POST /calendar-sync/webhook
Headers: {
  "X-Goog-Channel-ID": "uuid-1234",
  "X-Goog-Resource-ID": "kYEhfXi...",
  "X-Goog-Resource-State": "exists" | "sync"
}
# No body - just notification that calendar changed
```

## Setup Steps

### 1. Run Database Migration
```bash
# In Supabase SQL Editor, run:
/server/db_setup/calendar-sync-tables.sql
```

### 2. Configure Environment Variables
```bash
# server/.env
GOOGLE_CALENDAR_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/calendar-sync/webhook
```

### 3. Test Webhook Setup
```bash
# Start ngrok
ngrok http 3001

# Copy the ngrok URL and set as webhook URL
# Test with:
curl -X POST http://localhost:3001/calendar-sync/watch \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "accessToken": "ya29.a0...",
    "webhookUrl": "https://your-ngrok-url.ngrok.io/calendar-sync/webhook"
  }'
```

### 4. Use in Client
```tsx
// In your profile or settings screen
import CalendarSyncStatus from '@/components/calendar-sync-status';

<CalendarSyncStatus
  userId={currentUser.id}
  colorScheme={colorScheme}
/>
```

## Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Actions                              │
└───────────┬─────────────────────────────────────────────────┘
            │
            ├─ Manual: User adds event in Google Calendar
            ├─ App: User adds event via FlowMind UI
            └─ External: Another app modifies calendar
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Calendar API                             │
│  (Events stored, modification timestamp updated)             │
└───────────┬─────────────────────────────────────────────────┘
            │
            ├──────────────┬──────────────┬──────────────┐
            │              │              │              │
            ▼              ▼              ▼              ▼
      Webhook Push    App Foreground  Background    Manual Sync
      (real-time)     (when opened)   (15 min)      (button tap)
            │              │              │              │
            └──────────────┴──────────────┴──────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │   FlowMind Sync Service               │
            │  (calendar-sync.service.js)           │
            └──────────────┬───────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │   Fetch Events with Delta Sync       │
            │   (Use syncToken for efficiency)     │
            └──────────────┬───────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │   Compare with Cached Events         │
            │   (cached_calendar_events table)     │
            └──────────────┬───────────────────────┘
                           │
                    Detect Changes
                    (added/modified/deleted)
                           │
                           ▼
            ┌──────────────────────────────────────┐
            │   Calculate Schedule Impact          │
            │   - Count significant changes (3+)   │
            │   - Check time delta (>2 hours)      │
            │   - Check free time change (>30%)    │
            │   - Check overlap with optimized     │
            └──────────────┬───────────────────────┘
                           │
                           ├─ Minor changes: Log only
                           │
                           └─ Significant changes
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │  Create Notification         │
                        │  (calendar_sync_notifications)│
                        └──────────────┬───────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │  Update UI State             │
                        │  (shouldReoptimize = true)   │
                        └──────────────┬───────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │  Show Alert to User          │
                        │  "⚠️ Schedule Changed"       │
                        │  [Re-Optimize] button        │
                        └──────────────────────────────┘
```

## Re-optimization Decision Logic

```javascript
// From calendar-sync.service.js
function shouldReoptimize(changes, lastOptimizationDate) {
  // 1. Count significant events
  const significantChanges = 
    changes.added.filter(e => e.duration >= 30).length +
    changes.modified.filter(e => e.durationChange >= 15).length;
  
  if (significantChanges >= 3) {
    return { 
      shouldReoptimize: true, 
      reason: `${significantChanges} significant events changed` 
    };
  }

  // 2. Check total time impact
  const totalTimeChange = 
    sum(changes.added.map(e => e.duration)) +
    sum(changes.modified.map(e => e.durationChange)) -
    sum(changes.deleted.map(e => e.duration));
  
  if (Math.abs(totalTimeChange) >= 120) { // 2 hours
    return { 
      shouldReoptimize: true, 
      reason: `Schedule changed by ${totalTimeChange} minutes` 
    };
  }

  // 3. Check free time impact
  const freeTimeBefore = calculateFreeTime(cachedSchedule);
  const freeTimeAfter = calculateFreeTime(currentSchedule);
  const freeTimeChangePercent = 
    Math.abs(freeTimeAfter - freeTimeBefore) / freeTimeBefore;
  
  if (freeTimeChangePercent >= 0.3) { // 30%
    return { 
      shouldReoptimize: true, 
      reason: `Free time changed by ${freeTimeChangePercent * 100}%` 
    };
  }

  // 4. Check overlap with optimized activities
  const overlapsWithOptimized = changes.added.some(event =>
    optimizedActivities.some(activity =>
      eventsOverlap(event, activity)
    )
  );
  
  if (overlapsWithOptimized) {
    return { 
      shouldReoptimize: true, 
      reason: 'New events overlap with optimized activities' 
    };
  }

  return { shouldReoptimize: false };
}
```

## Troubleshooting

### Webhook Not Receiving Notifications
**Problem**: Google Calendar changes don't trigger webhook
**Solutions**:
1. Check webhook expiration: `SELECT * FROM calendar_watch_channels WHERE user_id = 'user-123'`
2. Verify ngrok is running: `ngrok http 3001`
3. Re-register webhook: Call `/calendar-sync/watch` again
4. Check Google Cloud Console: Ensure Calendar API enabled

### Sync Token Invalid
**Problem**: "Sync token is no longer valid" error
**Solutions**:
1. Clear cached events: `DELETE FROM cached_calendar_events WHERE user_id = 'user-123'`
2. Clear sync token: `UPDATE user_calendar_sync SET sync_token = NULL WHERE user_id = 'user-123'`
3. Next sync will do full fetch

### Changes Not Detected
**Problem**: UI doesn't show recent changes
**Solutions**:
1. Check last sync time: `SELECT * FROM user_calendar_sync WHERE user_id = 'user-123'`
2. Manually trigger sync: Tap "Sync" button or call `/calendar-sync/sync`
3. Check error count: If `consecutive_errors >= 3`, sync pauses
4. Reset error count: `UPDATE user_calendar_sync SET consecutive_errors = 0`

### Too Many Re-optimization Alerts
**Problem**: User sees alerts too frequently
**Solutions**:
1. Adjust thresholds in `shouldReoptimize()` function
2. Increase `significantChanges` from 3 to 5
3. Increase `totalTimeChange` from 120 to 180 minutes
4. Increase `freeTimeChangePercent` from 0.3 to 0.4

## Performance Considerations

### Delta Sync Efficiency
- **First sync**: Fetches all events (slow, ~2-5 seconds)
- **Subsequent syncs**: Only fetches changes (fast, <1 second)
- **Token lifespan**: Sync tokens valid for ~1 week
- **Caching**: Events cached in PostgreSQL for instant comparison

### Webhook vs Polling
| Method | Latency | Server Load | Reliability |
|--------|---------|-------------|-------------|
| Webhook | <1 second | Very low | 95% (requires public URL) |
| Polling | 15 minutes | Medium | 99% (always works) |

**Recommendation**: Use webhooks with polling fallback (current implementation)

### Database Indexes
```sql
-- Already created by migration
CREATE INDEX idx_cached_events_user_id ON cached_calendar_events(user_id);
CREATE INDEX idx_cached_events_modified ON cached_calendar_events(last_modified);
CREATE INDEX idx_change_log_user_detected ON calendar_change_log(user_id, detected_at);
```

## Testing Checklist

- [ ] Run database migration
- [ ] Set up ngrok for webhook testing
- [ ] Connect Google Calendar in app
- [ ] Add event in Google Calendar web interface
- [ ] Verify webhook notification received
- [ ] Check `calendar_change_log` for logged change
- [ ] Verify UI shows "Recent changes" badge
- [ ] Add 3+ events to trigger re-optimization alert
- [ ] Verify "⚠️ Schedule Changed" alert appears
- [ ] Tap "Re-Optimize Calendar" button
- [ ] Verify optimization runs successfully

## Next Steps

1. **Run Migration**: Execute `calendar-sync-tables.sql` in Supabase
2. **Test Locally**: Use ngrok for webhook testing
3. **Deploy**: Set up permanent webhook URL in production
4. **Monitor**: Watch `calendar_change_log` for sync activity
5. **Iterate**: Adjust thresholds based on user feedback

---

**Key Files:**
- Backend Service: `server/src/services/calendar-sync.service.js`
- API Routes: `server/src/routes/calendar-sync.routes.js`
- React Hook: `client/lib/use-google-calendar.ts`
- UI Component: `client/components/calendar-sync-status.tsx`
- Database Schema: `server/db_setup/calendar-sync-tables.sql`
