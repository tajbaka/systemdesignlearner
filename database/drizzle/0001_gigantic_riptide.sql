DROP INDEX "idx_profiles_clerk_user_id";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "new_problem_emails_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "problem_steps" ADD COLUMN "score_weight" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_problem_steps" DROP COLUMN "attempt_count";