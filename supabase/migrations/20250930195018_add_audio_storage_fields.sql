/*
  # Add Audio Storage Fields to Calls Table

  1. Changes
    - Add `audio_storage_key` column to store Supabase Storage bucket path
    - Add `audio_fetch_status` column to track audio availability
      - Values: 'pending', 'available', 'unavailable', 'failed'
    - Add `audio_fetched_at` timestamp for last audio check time
    - Add `has_user_audio` boolean for user audio availability
    - Add `has_response_audio` boolean for agent response audio availability
    - Add index on `audio_fetch_status` for efficient querying

  2. Purpose
    - Enable tracking of audio recordings stored in Supabase Storage
    - Provide granular status tracking for audio fetching operations
    - Support efficient queries for missing audio recordings
    - Track audio availability at conversation level
*/

-- Add audio storage columns to calls table
DO $$
BEGIN
  -- Add audio_storage_key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'audio_storage_key'
  ) THEN
    ALTER TABLE calls ADD COLUMN audio_storage_key TEXT;
  END IF;

  -- Add audio_fetch_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'audio_fetch_status'
  ) THEN
    ALTER TABLE calls ADD COLUMN audio_fetch_status VARCHAR DEFAULT 'pending'
      CHECK (audio_fetch_status IN ('pending', 'available', 'unavailable', 'failed'));
  END IF;

  -- Add audio_fetched_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'audio_fetched_at'
  ) THEN
    ALTER TABLE calls ADD COLUMN audio_fetched_at TIMESTAMP;
  END IF;

  -- Add has_user_audio if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'has_user_audio'
  ) THEN
    ALTER TABLE calls ADD COLUMN has_user_audio BOOLEAN DEFAULT false;
  END IF;

  -- Add has_response_audio if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'has_response_audio'
  ) THEN
    ALTER TABLE calls ADD COLUMN has_response_audio BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index on audio_fetch_status for efficient querying
CREATE INDEX IF NOT EXISTS calls_audio_fetch_status_idx ON calls(audio_fetch_status);

-- Create composite index for finding calls needing audio fetch
CREATE INDEX IF NOT EXISTS calls_audio_pending_idx ON calls(audio_fetch_status, created_at)
  WHERE audio_fetch_status IN ('pending', 'failed');

-- Create index on audio_storage_key for lookups
CREATE INDEX IF NOT EXISTS calls_audio_storage_key_idx ON calls(audio_storage_key)
  WHERE audio_storage_key IS NOT NULL;

-- Update existing calls with no recording_url to have 'pending' status
UPDATE calls
SET audio_fetch_status = 'pending'
WHERE recording_url IS NULL AND audio_fetch_status IS NULL;

-- Update existing calls with recording_url to have 'available' status
UPDATE calls
SET audio_fetch_status = 'available'
WHERE recording_url IS NOT NULL AND audio_fetch_status IS NULL;
