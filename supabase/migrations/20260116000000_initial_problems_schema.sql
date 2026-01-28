CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."problem_category" AS ENUM('backend', 'frontend');--> statement-breakpoint
CREATE TYPE "public"."problem_step" AS ENUM('functional', 'nonFunctional', 'api', 'highLevelDesign');--> statement-breakpoint
CREATE TYPE "public"."user_problem_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_problem_step_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "profiles_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "problem_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"step" "problem_step" NOT NULL,
	"order" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "problem_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text,
	"description" text,
	"difficulty" "difficulty",
	"time_to_complete" text,
	"topic" text,
	"links" jsonb DEFAULT '[]'::jsonb,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" "problem_category" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problems_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_problem_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_problem_id" uuid NOT NULL,
	"status" "user_problem_step_status" DEFAULT 'in_progress' NOT NULL,
	"data" jsonb,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"problem_version_id" uuid NOT NULL,
	"status" "user_problem_status" DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "problem_steps" ADD CONSTRAINT "problem_steps_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_versions" ADD CONSTRAINT "problem_versions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problem_steps" ADD CONSTRAINT "user_problem_steps_user_problem_id_user_problems_id_fk" FOREIGN KEY ("user_problem_id") REFERENCES "public"."user_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_problems" ADD CONSTRAINT "user_problems_problem_version_id_problem_versions_id_fk" FOREIGN KEY ("problem_version_id") REFERENCES "public"."problem_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_profiles_clerk_user_id" ON "profiles" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_problem_steps_unique" ON "problem_steps" USING btree ("problem_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_problem_versions_unique" ON "problem_versions" USING btree ("problem_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_problems_unique" ON "user_problems" USING btree ("user_id","problem_id");