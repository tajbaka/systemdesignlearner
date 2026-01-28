-- Add score_weight column to problem_steps table
-- This migration extracts maxScore from the jsonb data column to a proper integer column

-- Add the column with a default value
ALTER TABLE problem_steps
ADD COLUMN score_weight INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data: extract maxScore from data jsonb field
UPDATE problem_steps
SET score_weight = COALESCE((data->>'maxScore')::INTEGER, 0)
WHERE data IS NOT NULL AND data ? 'maxScore';

-- Optional: Remove maxScore from the jsonb data field to avoid duplication
-- (commented out in case you want to keep it temporarily for compatibility)
-- UPDATE problem_steps
-- SET data = data - 'maxScore'
-- WHERE data IS NOT NULL AND data ? 'maxScore';
