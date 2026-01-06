-- Migration: 004_practice_sessions.sql
-- Description: Add tables for practice session storage (localStorage to DB migration)
-- Date: 2026-01-02

-- ============================================================================
-- Enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE practice_step AS ENUM (
    'functional',
    'nonFunctional',
    'api',
    'highLevelDesign',
    'score'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_step AS ENUM (
    'functional',
    'nonFunctional',
    'api',
    'design',
    'simulation'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Profiles Table
-- Synced from Clerk via webhook
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON profiles(clerk_user_id);

-- ============================================================================
-- Practice Sessions Table
-- One row per user+scenario combination
-- Stores full PracticeState as JSONB with denormalized completion flags
-- ============================================================================

CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_slug TEXT NOT NULL,

  -- Current step in the flow
  current_step practice_step NOT NULL DEFAULT 'functional',

  -- Full practice state as JSONB (single source of truth)
  state_data JSONB NOT NULL DEFAULT '{}',

  -- Denormalized completion tracking for efficient queries
  completed_functional BOOLEAN NOT NULL DEFAULT FALSE,
  completed_non_functional BOOLEAN NOT NULL DEFAULT FALSE,
  completed_api BOOLEAN NOT NULL DEFAULT FALSE,
  completed_high_level_design BOOLEAN NOT NULL DEFAULT FALSE,
  completed_score BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Unique constraint: one session per user per scenario
  CONSTRAINT practice_sessions_profile_scenario_unique UNIQUE(profile_id, scenario_slug)
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_profile_id ON practice_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_scenario_slug ON practice_sessions(scenario_slug);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_updated_at ON practice_sessions(updated_at);

-- ============================================================================
-- Scenario Completions Table
-- Tracks first-time completion for gamification/progress display
-- ============================================================================

CREATE TABLE IF NOT EXISTS scenario_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_slug TEXT NOT NULL,
  first_completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint: one completion record per user per scenario
  CONSTRAINT scenario_completions_profile_scenario_unique UNIQUE(profile_id, scenario_slug)
);

CREATE INDEX IF NOT EXISTS idx_scenario_completions_profile_id ON scenario_completions(profile_id);

-- ============================================================================
-- Step Evaluations Table
-- AI feedback storage for history and analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS step_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  step feedback_step NOT NULL,

  -- Feedback content
  feedback_data JSONB NOT NULL,
  score SMALLINT CHECK (score >= 0 AND score <= 100),

  -- Request content for debugging/replay
  request_content TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_step_evaluations_session_id ON step_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_step_evaluations_created_at ON step_evaluations(created_at);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

-- Create or replace the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for practice_sessions
DROP TRIGGER IF EXISTS update_practice_sessions_updated_at ON practice_sessions;
CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_evaluations ENABLE ROW LEVEL SECURITY;

-- Note: Since we're using Clerk for auth (not Supabase Auth), we'll use
-- service role key for all database operations from the server.
-- RLS policies here are for defense-in-depth if someone accesses the DB directly.

-- Allow service role full access (our server actions use service role)
CREATE POLICY "Service role full access on profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on practice_sessions" ON practice_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on scenario_completions" ON scenario_completions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on step_evaluations" ON step_evaluations
  FOR ALL USING (true) WITH CHECK (true);
