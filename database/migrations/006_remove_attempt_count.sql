-- Migration: 006_remove_attempt_count.sql
-- Description: Remove attempt_count column from user_problem_steps table
-- Reason: Attempt counting is now handled client-side only in Zustand store (not persisted)

ALTER TABLE user_problem_steps DROP COLUMN IF EXISTS attempt_count;
