-- Calendar Watch Channels Table
-- Stores Google Calendar webhook subscriptions for real-time sync

CREATE TABLE IF NOT EXISTS calendar_watch_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_id TEXT UNIQUE NOT NULL,
  resource_id TEXT NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  webhook_url TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_watch_channels_user_id ON calendar_watch_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_channels_channel_id ON calendar_watch_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_watch_channels_expiration ON calendar_watch_channels(expiration);

-- Function to get expiring channels (within 24 hours)
CREATE OR REPLACE FUNCTION get_expiring_watch_channels()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  channel_id TEXT,
  resource_id TEXT,
  calendar_id TEXT,
  webhook_url TEXT,
  expiration TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cwc.id,
    cwc.user_id,
    cwc.channel_id,
    cwc.resource_id,
    cwc.calendar_id,
    cwc.webhook_url,
    cwc.expiration
  FROM calendar_watch_channels cwc
  WHERE cwc.expiration <= NOW() + INTERVAL '24 hours'
  AND cwc.expiration > NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE calendar_watch_channels IS 'Stores Google Calendar webhook subscriptions for real-time calendar sync';
