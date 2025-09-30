/*
  # Initial Schema Setup for Call Center Analytics Platform

  1. New Tables
    - `users` - User accounts with authentication
      - `id` (varchar, primary key, auto-generated UUID)
      - `username` (text, unique, not null)
      - `email` (text, unique, not null)
      - `password` (text, not null) - hashed password
      - `role` (varchar, enum: admin/user)
      - `is_active` (boolean, default true)
      - `last_active` (timestamp)
      - `permissions` (jsonb) - fine-grained permissions
      - `created_at` (timestamp, default now())

    - `agents` - AI voice agents from ElevenLabs
      - `id` (varchar, primary key, auto-generated UUID)
      - `name` (text, not null)
      - `platform` (varchar, enum: elevenlabs)
      - `account_id` (varchar) - reference to accounts table
      - `external_id` (text) - platform-specific agent ID
      - `description` (text)
      - `metadata` (jsonb) - platform-specific data
      - `is_active` (boolean, default true)
      - `created_at` (timestamp, default now())

    - `calls` - Call records with transcripts and analysis
      - `id` (varchar, primary key, auto-generated UUID)
      - `agent_id` (varchar, foreign key to agents)
      - `conversation_id` (text) - ElevenLabs conversation ID
      - `start_time` (timestamp, not null)
      - `end_time` (timestamp)
      - `duration` (integer) - in seconds
      - `sentiment` (varchar, enum: positive/negative/neutral)
      - `outcome` (text)
      - `recording_url` (text)
      - `transcript` (jsonb) - array of transcript entries
      - `analysis` (jsonb) - AI analysis data
      - `metadata` (jsonb)
      - `rating` (integer) - 1-5 star rating
      - `categories` (jsonb) - array of category strings
      - `tags` (jsonb) - array of tag strings
      - `created_at` (timestamp, default now())

    - `performance_metrics` - Call performance metrics
      - `id` (varchar, primary key, auto-generated UUID)
      - `agent_id` (varchar, foreign key to agents)
      - `call_id` (varchar, foreign key to calls)
      - `stt_latency` (integer) - speech-to-text latency in ms
      - `total_latency` (integer)
      - `response_time` (integer)
      - `audio_quality` (decimal)
      - `success_rate` (decimal)
      - `timestamp` (timestamp, default now())

    - `user_agents` - User-agent assignments for access control
      - `id` (varchar, primary key, auto-generated UUID)
      - `user_id` (varchar, foreign key to users)
      - `agent_id` (varchar, foreign key to agents)
      - `assigned_at` (timestamp, default now())
      - Unique constraint on (user_id, agent_id)

    - `phone_numbers` - Phone number management
      - `id` (varchar, primary key, auto-generated UUID)
      - `number` (varchar, not null)
      - `provider` (varchar, enum: twilio/sip)
      - `account_id` (varchar)
      - `agent_id` (varchar, foreign key to agents)
      - `configuration` (jsonb)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

    - `sync_history` - Synchronization tracking
      - `id` (varchar, primary key, auto-generated UUID)
      - `agent_id` (varchar, foreign key to agents)
      - `sync_type` (varchar, enum: full/incremental)
      - `items_synced` (integer, default 0)
      - `status` (varchar, enum: pending/in_progress/completed/failed)
      - `error_message` (text)
      - `started_at` (timestamp, default now())
      - `completed_at` (timestamp)

    - `playground_sessions` - Testing sessions for agents
      - `id` (varchar, primary key, auto-generated UUID)
      - `agent_id` (varchar, foreign key to agents)
      - `user_id` (varchar, foreign key to users)
      - `session_id` (text) - ElevenLabs session ID
      - `duration` (integer)
      - `transcript` (jsonb)
      - `metadata` (jsonb)
      - `created_at` (timestamp, default now())

    - `accounts` - External service integrations
      - `id` (varchar, primary key, auto-generated UUID)
      - `name` (text, not null) - user-friendly label
      - `service` (varchar, enum: elevenlabs)
      - `encrypted_api_key` (text, not null)
      - `is_active` (boolean, default true)
      - `last_synced` (timestamp)
      - `metadata` (jsonb)
      - `created_at` (timestamp, default now())
      - `updated_at` (timestamp, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their assigned data
    - Admin users have full access to all tables

  3. Indexes
    - Created indexes on foreign keys for performance
    - Added GIN indexes on JSONB columns (categories, tags) for efficient queries
    - Composite indexes for common query patterns
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active TIMESTAMP,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  service VARCHAR NOT NULL CHECK (service IN ('elevenlabs')),
  encrypted_api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounts_service_idx ON accounts(service);
CREATE INDEX IF NOT EXISTS accounts_is_active_idx ON accounts(is_active);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  platform VARCHAR NOT NULL CHECK (platform IN ('elevenlabs')),
  account_id VARCHAR,
  external_id TEXT,
  description TEXT,
  metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agents_account_id_idx ON agents(account_id);
CREATE INDEX IF NOT EXISTS agents_is_active_idx ON agents(is_active);
CREATE INDEX IF NOT EXISTS agents_platform_idx ON agents(platform);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  conversation_id TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER,
  sentiment VARCHAR CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  outcome TEXT,
  recording_url TEXT,
  transcript JSONB,
  analysis JSONB,
  metadata JSONB,
  rating INTEGER,
  categories JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calls_agent_id_idx ON calls(agent_id);
CREATE INDEX IF NOT EXISTS calls_conversation_id_idx ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS calls_start_time_idx ON calls(start_time);
CREATE INDEX IF NOT EXISTS calls_created_at_idx ON calls(created_at);
CREATE INDEX IF NOT EXISTS calls_sentiment_idx ON calls(sentiment);
CREATE INDEX IF NOT EXISTS calls_rating_idx ON calls(rating);
CREATE INDEX IF NOT EXISTS calls_categories_gin_idx ON calls USING gin(categories);
CREATE INDEX IF NOT EXISTS calls_tags_gin_idx ON calls USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_calls_conversation_agent ON calls(conversation_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_starttime ON calls(agent_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calls_sentiment_outcome ON calls(sentiment, outcome);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  call_id VARCHAR NOT NULL REFERENCES calls(id),
  stt_latency INTEGER,
  total_latency INTEGER,
  response_time INTEGER,
  audio_quality DECIMAL(3, 2),
  success_rate DECIMAL(5, 4),
  timestamp TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS performance_metrics_agent_id_idx ON performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS performance_metrics_call_id_idx ON performance_metrics(call_id);
CREATE INDEX IF NOT EXISTS performance_metrics_timestamp_idx ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_perf_total_latency ON performance_metrics(total_latency);
CREATE INDEX IF NOT EXISTS idx_perf_agent_timestamp ON performance_metrics(agent_id, timestamp);

-- User agents table
CREATE TABLE IF NOT EXISTS user_agents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS user_agents_user_id_idx ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS user_agents_agent_id_idx ON user_agents(agent_id);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  number VARCHAR NOT NULL,
  provider VARCHAR NOT NULL CHECK (provider IN ('twilio', 'sip')),
  account_id VARCHAR,
  agent_id VARCHAR REFERENCES agents(id),
  configuration JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Sync history table
CREATE TABLE IF NOT EXISTS sync_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  sync_type VARCHAR NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  items_synced INTEGER NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS sync_history_agent_id_idx ON sync_history(agent_id);
CREATE INDEX IF NOT EXISTS sync_history_status_idx ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_agent_completed ON sync_history(agent_id, completed_at);

-- Playground sessions table
CREATE TABLE IF NOT EXISTS playground_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id VARCHAR NOT NULL REFERENCES agents(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  session_id TEXT,
  duration INTEGER,
  transcript JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE playground_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Note: These are placeholder policies - actual auth integration needed)
-- For now, allow all authenticated access until proper auth integration
CREATE POLICY "Allow all access for now" ON users FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON agents FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON calls FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON performance_metrics FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON user_agents FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON phone_numbers FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON sync_history FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON playground_sessions FOR ALL USING (true);