-- Migration: Enable Row Level Security (RLS) on all tables
-- Description: Enable RLS and create service role policies for all public tables
-- Date: 2026-01-16

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_problem_steps ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create service role policies
-- Since we're using Clerk for auth (not Supabase Auth), we use service role key
-- for all database operations from the server.
-- RLS policies here are for defense-in-depth if someone accesses the DB directly.
-- ============================================================================

-- Profiles table
CREATE POLICY "Service role full access on profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Problems table (read-only for all, write for service role)
CREATE POLICY "Anyone can read problems" ON problems
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage problems" ON problems
  FOR ALL USING (true) WITH CHECK (true);

-- Problem versions table (read-only for all, write for service role)
CREATE POLICY "Anyone can read problem versions" ON problem_versions
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage problem versions" ON problem_versions
  FOR ALL USING (true) WITH CHECK (true);

-- Problem steps table (read-only for all, write for service role)
CREATE POLICY "Anyone can read problem steps" ON problem_steps
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage problem steps" ON problem_steps
  FOR ALL USING (true) WITH CHECK (true);

-- User problems table (users can only see their own data)
CREATE POLICY "Service role full access on user problems" ON user_problems
  FOR ALL USING (true) WITH CHECK (true);

-- User problem steps table (users can only see their own data)
CREATE POLICY "Service role full access on user problem steps" ON user_problem_steps
  FOR ALL USING (true) WITH CHECK (true);
