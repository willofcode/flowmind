# Conversation Mode Fixes

## Issues Fixed

### 1. ✅ Database Schema Error
**Error**: `column conversations.role does not exist`

**Root Cause**: The `conversations` table in Supabase wasn't created with the updated schema that includes the `role` column.

**Solution**: Run the database migration

#### Option A: Automatic (if SUPABASE_DB_URL is set)
```bash
cd server
./fix-conversations.sh
```

#### Option B: Manual (via Supabase Dashboard)
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of `server/db_setup/fix-conversations-table.sql`
3. Paste and run the query
4. You should see: "Conversations table fixed successfully!"

**What the fix does**:
- Backs up existing conversations data (if any)
- Drops and recreates `conversations` table with correct schema
- Adds required columns:
  - `role` VARCHAR(20) - 'user', 'assistant', or 'system'
  - `conversation_id` VARCHAR(255) - Session identifier
  - `message` TEXT - Message content
  - `context` JSONB - Schedule and sentiment context
  - `mood_score` INTEGER - 1-10 scale
  - `intent` VARCHAR(50) - AI response type
- Creates indexes for performance
- Grants proper permissions

### 2. ✅ Close Button Not Working
**Error**: Close button (X) not visible or not working in conversation mode

**Root Cause**: The close button was inside a conditional block `{!isExpanded && (...)}` which only showed it when the text input was collapsed. In conversation mode, the input is expanded by default, hiding the button.

**Solution**: Moved close button outside the conditional block

**Before**:
```tsx
{!isExpanded && (
  <>
    <FloatingIcon />
    <CloseButton /> {/* ❌ Hidden when expanded */}
  </>
)}
```

**After**:
```tsx
{!isExpanded && (
  <FloatingIcon />
)}

<CloseButton /> {/* ✅ Always visible */}
```

**File Changed**: `client/app/welcome.tsx`

### 3. ✅ NeuralSeek Connection Error
**Error**: `getaddrinfo ENOTFOUND neuralseekai.azurewebsites.net`

**Root Cause**: Network connectivity issue or invalid NeuralSeek endpoint

**Solutions**:

#### Check 1: Verify Environment Variables
```bash
cd server
cat .env | grep NS_
```

Should show:
```
NS_MAISTRO_ENDPOINT=https://neuralseekai.azurewebsites.net/maistro
NS_EMBED_CODE=your_embed_code_here
```

#### Check 2: Test Endpoint
```bash
curl -v https://neuralseekai.azurewebsites.net/maistro
```

If it fails:
- Check your internet connection
- Check if NeuralSeek service is running
- Verify the URL is correct (no typos)
- Check firewall settings

#### Check 3: Fallback Handling
The code already has fallback logic:
```javascript
catch (error) {
  console.error('❌ mAIstro sentiment call error:', error);
  // Returns default sentiment without breaking
  return {
    sentiment: 'neutral',
    moodScore: 5,
    energyLevel: 'medium',
    // ...fallback values
  };
}
```

So even if NeuralSeek is down, the app continues working with default values.

## Testing the Fixes

### Test 1: Database Schema
```bash
# In Supabase SQL Editor, run:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations';
```

Expected columns:
- id (uuid)
- user_id (uuid)
- conversation_id (character varying)
- **role** ← Should be present now
- message (text)
- context (jsonb)
- mood_score (integer)
- intent (character varying)
- created_at (timestamp with time zone)

### Test 2: Close Button
1. Open app → Go to Explore tab
2. Tap "Mood Conversation" tool
3. Should see welcome screen with voice recording interface
4. **Look for X button** in top-right corner
5. Tap X → Should return to Explore tab
6. Test again with text input expanded → X should still be visible

### Test 3: Conversation Flow
1. Tap voice button (mic icon)
2. Speak: "I'm feeling stressed today"
3. Stop recording
4. Should see:
   - Transcription: "I'm feeling stressed today"
   - Processing indicator
   - AI response after 2-3 seconds
5. Check server logs → Should NOT show "column role does not exist"

### Test 4: NeuralSeek Connection
```bash
cd server
npm start
```

Watch for:
- ✅ "🧠 Calling NeuralSeek mAIstro..."
- ✅ "✅ mAIstro response received"

Or errors:
- ❌ "ENOTFOUND neuralseekai.azurewebsites.net"
  → Check internet connection
  → Verify NS_MAISTRO_ENDPOINT in .env

## Common Issues & Solutions

### Issue: "Conversation history empty"
**Cause**: First message in a new conversation
**Solution**: Normal behavior - history builds up over multiple messages

### Issue: "Failed to save conversation"
**Cause**: Database permissions or user_id mismatch
**Solution**: 
```sql
-- Check user exists
SELECT id, email FROM users WHERE email = 'your-email@example.com';

-- Grant permissions
GRANT ALL ON conversations TO authenticated;
```

### Issue: "Voice transcription failed"
**Cause**: Mock transcription timeout or audio recording issue
**Solution**: Check `client/lib/voice-transcription.ts`:
- Mock delay is 1500ms
- Ensure Audio permissions granted
- Check iOS simulator vs real device

### Issue: "Router.back() does nothing"
**Cause**: No navigation history (opened directly)
**Solution**: Use router.push('/explore') instead:
```tsx
onPress={async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  if (router.canGoBack()) {
    router.back();
  } else {
    router.push('/(tabs)/explore');
  }
}}
```

## Files Modified

1. **client/app/welcome.tsx**
   - Moved close button outside conditional block
   - Now always visible in conversation mode

2. **server/db_setup/fix-conversations-table.sql** (NEW)
   - Database migration to fix schema
   - Adds missing `role` column

3. **server/fix-conversations.sh** (NEW)
   - Automated script to run migration
   - Checks environment variables
   - Provides fallback instructions

## Next Steps

1. **Run the database fix** (choose Option A or B above)
2. **Test the close button** (should be visible in top-right)
3. **Verify conversation flow** works end-to-end
4. **Check server logs** for any remaining errors

## Production Deployment

Before deploying to production:

```bash
# 1. Backup conversations table
pg_dump -t conversations $SUPABASE_DB_URL > conversations_backup.sql

# 2. Run migration
psql $SUPABASE_DB_URL -f server/db_setup/fix-conversations-table.sql

# 3. Verify schema
psql $SUPABASE_DB_URL -c "\\d conversations"

# 4. Test conversation flow
# 5. Monitor error logs for 24 hours
```

## Monitoring

Add to your monitoring dashboard:

```sql
-- Conversation activity (last 24 hours)
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as messages,
  COUNT(DISTINCT conversation_id) as conversations,
  COUNT(DISTINCT user_id) as users
FROM conversations
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Error rate
SELECT 
  COUNT(*) FILTER (WHERE role = 'system' AND message LIKE '%error%') as errors,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE role = 'system' AND message LIKE '%error%') / NULLIF(COUNT(*), 0), 2) as error_rate
FROM conversations
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

**Last Updated**: November 13, 2025  
**Status**: ✅ Ready to test  
**Priority**: HIGH (blocks conversation feature)
