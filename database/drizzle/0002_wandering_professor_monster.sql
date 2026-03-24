DROP INDEX "idx_user_problems_unique";--> statement-breakpoint

-- Dedupe user_problem_steps: keep most recently updated row per user_problem_id
DELETE FROM user_problem_steps
WHERE id NOT IN (
  SELECT DISTINCT ON (user_problem_id) id
  FROM user_problem_steps
  ORDER BY user_problem_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);--> statement-breakpoint

-- Dedupe user_problems: keep most recently updated row per (user_id, problem_id, problem_version_id)
DELETE FROM user_problems
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, problem_id, problem_version_id) id
  FROM user_problems
  ORDER BY user_id, problem_id, problem_version_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);--> statement-breakpoint

CREATE UNIQUE INDEX "idx_user_problem_steps_unique" ON "user_problem_steps" USING btree ("user_problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_problems_unique" ON "user_problems" USING btree ("user_id","problem_id","problem_version_id");