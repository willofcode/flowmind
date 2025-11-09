-- Calendar Sync Tables
-- Tables to support calendar synchronization and change tracking

-- ============================================================================
-- Calendar Watch Channels
-- Stores Google Calendar push notification channels
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_watch_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) UNIQUE NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  webhook_url TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watch_channels_user_id ON calendar_watch_channels(user_id);
CREATE INDEX idx_watch_channels_channel_id ON calendar_watch_channels(channel_id);
CREATE INDEX idx_watch_channels_expiration ON calendar_watch_channels(expiration);

COMMENT ON TABLE calendar_watch_channels IS 'Google Calendar push notification watch channels';
COMMENT ON COLUMN calendar_watch_channels.channel_id IS 'Unique channel identifier for Google Calendar API';
COMMENT ON COLUMN calendar_watch_channels.resource_id IS 'Resource ID returned by Google Calendar watch API';
COMMENT ON COLUMN calendar_watch_channels.expiration IS 'When the watch expires (max 7 days)';

-- ============================================================================
-- Cached Calendar Events
-- Local cache of Google Calendar events for change detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS cached_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  summary TEXT,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_by_agent BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL,
  event_data JSONB, -- Full event object from Google
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_cached_events_user_id ON cached_calendar_events(user_id);
CREATE INDEX idx_cached_events_event_id ON cached_calendar_events(event_id);
CREATE INDEX idx_cached_events_start_time ON cached_calendar_events(start_time);
CREATE INDEX idx_cached_events_updated_at ON cached_calendar_events(updated_at);
CREATE INDEX idx_cached_events_created_by_agent ON cached_calendar_events(created_by_agent);

COMMENT ON TABLE cached_calendar_events IS 'Cached Google Calendar events for change detection';
COMMENT ON COLUMN cached_calendar_events.event_id IS 'Google Calendar event ID';
COMMENT ON COLUMN cached_calendar_events.created_by_agent IS 'Whether event was created by FlowMind optimizer';
COMMENT ON COLUMN cached_calendar_events.event_data IS 'Full Google Calendar event object';

-- ============================================================================
-- User Calendar Sync
-- Tracks sync state per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  sync_token TEXT,
  last_sync_at TIMESTAMPTZ,
  last_full_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_errors INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_sync_user_id ON user_calendar_sync(user_id);
CREATE INDEX idx_calendar_sync_last_sync ON user_calendar_sync(last_sync_at);

COMMENT ON TABLE user_calendar_sync IS 'Calendar sync state per user';
COMMENT ON COLUMN user_calendar_sync.sync_token IS 'Google Calendar sync token for delta sync';
COMMENT ON COLUMN user_calendar_sync.last_sync_at IS 'Last successful sync (any type)';
COMMENT ON COLUMN user_calendar_sync.last_full_sync_at IS 'Last full sync (not delta)';

-- ============================================================================
-- Calendar Change Log
-- Audit trail of all calendar changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(255),
  change_type VARCHAR(50) NOT NULL, -- 'added', 'modified', 'deleted'
  change_source VARCHAR(50), -- 'agent', 'user', 'external'
  summary TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_log_user_id ON calendar_change_log(user_id);
CREATE INDEX idx_change_log_event_id ON calendar_change_log(event_id);
CREATE INDEX idx_change_log_created_at ON calendar_change_log(created_at);
CREATE INDEX idx_change_log_change_type ON calendar_change_log(change_type);

COMMENT ON TABLE calendar_change_log IS 'Audit trail of all calendar changes';
COMMENT ON COLUMN calendar_change_log.change_type IS 'Type of change: added, modified, deleted';
COMMENT ON COLUMN calendar_change_log.change_source IS 'Source: agent (FlowMind), user (manual), external (other apps)';

-- ============================================================================
-- Calendar Sync Notifications
-- Track notifications sent to users about calendar changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_sync_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'reoptimization_recommended', 'sync_error', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_notifications_user_id ON calendar_sync_notifications(user_id);
CREATE INDEX idx_sync_notifications_read ON calendar_sync_notifications(read);
CREATE INDEX idx_sync_notifications_created_at ON calendar_sync_notifications(created_at);

COMMENT ON TABLE calendar_sync_notifications IS 'Notifications about calendar sync events';

-- ============================================================================
-- Functions for automatic timestamp updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_calendar_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watch_channels_timestamp
  BEFORE UPDATE ON calendar_watch_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_timestamp();

CREATE TRIGGER update_calendar_sync_timestamp
  BEFORE UPDATE ON user_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_sync_timestamp();

-- ============================================================================
-- Views for easy querying
-- ============================================================================

-- View: Recent calendar changes (last 7 days)
CREATE OR REPLACE VIEW recent_calendar_changes AS
SELECT 
  cl.*,
  u.email,
  u.name,
  ce.summary AS current_summary,
  ce.start_time AS current_start,
  ce.end_time AS current_end
FROM calendar_change_log cl
LEFT JOIN users u ON cl.user_id = u.id
LEFT JOIN cached_calendar_events ce ON cl.user_id = ce.user_id AND cl.event_id = ce.event_id
WHERE cl.created_at > NOW() - INTERVAL '7 days'
ORDER BY cl.created_at DESC;

COMMENT ON VIEW recent_calendar_changes IS 'Calendar changes in the last 7 days with user info';

-- View: Active watch channels
CREATE OR REPLACE VIEW active_watch_channels AS
SELECT 
  wc.*,
  u.email,
  u.name,
  (wc.expiration > NOW()) AS is_active,
  EXTRACT(EPOCH FROM (wc.expiration - NOW())) / 3600 AS hours_until_expiration
FROM calendar_watch_channels wc
LEFT JOIN users u ON wc.user_id = u.id
WHERE wc.expiration > NOW()
ORDER BY wc.expiration ASC;

COMMENT ON VIEW active_watch_channels IS 'Active (not expired) watch channels';

-- View: Users needing re-optimization
CREATE OR REPLACE VIEW users_needing_reoptimization AS
SELECT DISTINCT
  cl.user_id,
  u.email,
  u.name,
  COUNT(*) AS changes_count,
  MAX(cl.created_at) AS last_change_at,
  MAX(aos.created_at) AS last_optimization_at
FROM calendar_change_log cl
LEFT JOIN users u ON cl.user_id = u.id
LEFT JOIN ai_orchestration_sessions aos ON cl.user_id = aos.user_id 
  AND aos.session_type = 'calendar_optimization'
WHERE 
  cl.change_source IN ('user', 'external')
  AND cl.created_at > COALESCE(
    (SELECT MAX(created_at) FROM ai_orchestration_sessions 
     WHERE user_id = cl.user_id AND session_type = 'calendar_optimization'),
    NOW() - INTERVAL '1 day'
  )
GROUP BY cl.user_id, u.email, u.name, aos.created_at
HAVING COUNT(*) >= 3;

COMMENT ON VIEW users_needing_reoptimization IS 'Users with 3+ calendar changes since last optimization';

-- ============================================================================
-- Sample queries for testing
-- ============================================================================

-- Get sync status for a user
-- SELECT * FROM user_calendar_sync WHERE user_id = 'your-user-id';

-- Get recent changes for a user
-- SELECT * FROM calendar_change_log 
-- WHERE user_id = 'your-user-id' 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- Get active watch channels
-- SELECT * FROM active_watch_channels;

-- Check if user needs re-optimization
-- SELECT * FROM users_needing_reoptimization WHERE user_id = 'your-user-id';

-- Get unread sync notifications
-- SELECT * FROM calendar_sync_notifications 
-- WHERE user_id = 'your-user-id' AND read = FALSE
-- ORDER BY created_at DESC;
