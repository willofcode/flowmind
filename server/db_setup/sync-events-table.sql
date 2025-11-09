-- Calendar Sync Events Table
-- Tracks when calendar changes occur for real-time client updates

CREATE TABLE IF NOT EXISTS calendar_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'calendar_changed', 'manual_sync', etc.
  channel_id TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_sync_events_user_id ON calendar_sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_triggered_at ON calendar_sync_events(triggered_at);
CREATE INDEX IF NOT EXISTS idx_sync_events_processed ON calendar_sync_events(processed);

-- Auto-delete old sync events (keep last 24 hours only)
CREATE OR REPLACE FUNCTION cleanup_old_sync_events()
RETURNS void AS $$
BEGIN
  DELETE FROM calendar_sync_events
  WHERE triggered_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE calendar_sync_events IS 'Tracks calendar change events for real-time client sync';
