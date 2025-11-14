-- Create Storage Buckets for FlowMind
-- Run this in Supabase SQL Editor

-- Create bucket for TTS audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-audio',
  'session-audio',
  true,  -- Public bucket so client can access URLs
  5242880,  -- 5MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for session-audio bucket
CREATE POLICY "Public can read audio files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'session-audio');

CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'session-audio');

-- Optional: Create bucket for user uploaded audio (STT recordings)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-audio',
  'user-audio',
  false,  -- Private bucket
  10485760,  -- 10MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can access their own audio"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
