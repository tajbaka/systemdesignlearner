-- Migration: 005_step_data.sql
-- Description: Create new tables for the refactored practice system
-- These tables coexist with legacy practice_sessions table during transition

-- Step-specific data storage (one row per user+scenario+step)
CREATE TABLE step_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_slug TEXT NOT NULL,
  step_type TEXT NOT NULL,  -- 'intro' | 'functional' | 'nonFunctional' | 'api' | 'highLevelDesign' | 'score'
  data JSONB NOT NULL DEFAULT '{}',
  schema_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'evaluated')),
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  submitted_at TIMESTAMPTZ,
  CONSTRAINT step_data_unique UNIQUE(profile_id, scenario_slug, step_type)
);

-- Session metadata (progress tracking)
CREATE TABLE practice_sessions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_slug TEXT NOT NULL,
  max_visited_step INT NOT NULL DEFAULT 0,
  current_step_type TEXT NOT NULL DEFAULT 'intro',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT practice_sessions_v2_unique UNIQUE(profile_id, scenario_slug)
);

-- Indexes for efficient querying
CREATE INDEX idx_step_data_profile_scenario ON step_data(profile_id, scenario_slug);
CREATE INDEX idx_step_data_updated_at ON step_data(updated_at);
CREATE INDEX idx_practice_sessions_v2_profile ON practice_sessions_v2(profile_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_step_data_updated_at
    BEFORE UPDATE ON step_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_sessions_v2_updated_at
    BEFORE UPDATE ON practice_sessions_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();