DROP INDEX IF EXISTS "idx_profiles_clerk_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_user_problem_steps_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_user_problems_unique";--> statement-breakpoint

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "new_problem_emails_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint

ALTER TABLE "problem_steps"
  ADD COLUMN IF NOT EXISTS "score_weight" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

ALTER TABLE "user_problem_steps"
  DROP COLUMN IF EXISTS "attempt_count";--> statement-breakpoint

-- Keep the most recently updated row before restoring the current unique index.
DELETE FROM user_problem_steps
WHERE id NOT IN (
  SELECT DISTINCT ON (user_problem_id) id
  FROM user_problem_steps
  ORDER BY user_problem_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);--> statement-breakpoint

DELETE FROM user_problems
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, problem_id, problem_version_id) id
  FROM user_problems
  ORDER BY user_id, problem_id, problem_version_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_problem_steps_unique"
  ON "user_problem_steps" USING btree ("user_problem_id");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_problems_unique"
  ON "user_problems" USING btree ("user_id", "problem_id", "problem_version_id");--> statement-breakpoint
