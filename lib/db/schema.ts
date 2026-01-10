import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  smallint,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { PracticeState } from "@/domains/practice/types";
import type { FeedbackResult } from "@/domains/practice/types";

// ============================================================================
// Enums
// ============================================================================

export const practiceStepEnum = pgEnum("practice_step", [
  "functional",
  "nonFunctional",
  "api",
  "highLevelDesign",
  "score",
]);

export const feedbackStepEnum = pgEnum("feedback_step", [
  "functional",
  "nonFunctional",
  "api",
  "design",
  "simulation",
]);

// ============================================================================
// Profiles Table
// Synced from Clerk via webhook
// ============================================================================

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_profiles_clerk_user_id").on(table.clerkUserId)]
);

// ============================================================================
// Practice Sessions Table
// One row per user+scenario combination
// Stores full PracticeState as JSONB with denormalized completion flags
// ============================================================================

export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    scenarioSlug: text("scenario_slug").notNull(),

    // Current step in the flow
    currentStep: practiceStepEnum("current_step").notNull().default("functional"),

    // Full practice state as JSONB (single source of truth)
    stateData: jsonb("state_data").$type<PracticeState>().notNull(),

    // Denormalized completion tracking for efficient queries
    completedFunctional: boolean("completed_functional").notNull().default(false),
    completedNonFunctional: boolean("completed_non_functional").notNull().default(false),
    completedApi: boolean("completed_api").notNull().default(false),
    completedHighLevelDesign: boolean("completed_high_level_design").notNull().default(false),
    completedScore: boolean("completed_score").notNull().default(false),

    // Timestamps
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_practice_sessions_profile_scenario").on(table.profileId, table.scenarioSlug),
    index("idx_practice_sessions_profile_id").on(table.profileId),
    index("idx_practice_sessions_scenario_slug").on(table.scenarioSlug),
    index("idx_practice_sessions_updated_at").on(table.updatedAt),
  ]
);

// ============================================================================
// Scenario Completions Table
// Tracks first-time completion for gamification/progress display
// ============================================================================

export const scenarioCompletions = pgTable(
  "scenario_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    scenarioSlug: text("scenario_slug").notNull(),
    firstCompletedAt: timestamp("first_completed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_scenario_completions_profile_scenario").on(
      table.profileId,
      table.scenarioSlug
    ),
    index("idx_scenario_completions_profile_id").on(table.profileId),
  ]
);

// ============================================================================
// Step Evaluations Table
// AI feedback storage for history and analytics
// ============================================================================

export const stepEvaluations = pgTable(
  "step_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "cascade" }),
    step: feedbackStepEnum("step").notNull(),

    // Feedback content
    feedbackData: jsonb("feedback_data").$type<FeedbackResult>().notNull(),
    score: smallint("score"),

    // Request content for debugging/replay
    requestContent: text("request_content"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_step_evaluations_session_id").on(table.sessionId),
    index("idx_step_evaluations_created_at").on(table.createdAt),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const profilesRelations = relations(profiles, ({ many }) => ({
  practiceSessions: many(practiceSessions),
  scenarioCompletions: many(scenarioCompletions),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [practiceSessions.profileId],
    references: [profiles.id],
  }),
  stepEvaluations: many(stepEvaluations),
}));

export const scenarioCompletionsRelations = relations(scenarioCompletions, ({ one }) => ({
  profile: one(profiles, {
    fields: [scenarioCompletions.profileId],
    references: [profiles.id],
  }),
}));

export const stepEvaluationsRelations = relations(stepEvaluations, ({ one }) => ({
  session: one(practiceSessions, {
    fields: [stepEvaluations.sessionId],
    references: [practiceSessions.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;

export type ScenarioCompletion = typeof scenarioCompletions.$inferSelect;
export type NewScenarioCompletion = typeof scenarioCompletions.$inferInsert;

export type StepEvaluation = typeof stepEvaluations.$inferSelect;
export type NewStepEvaluation = typeof stepEvaluations.$inferInsert;
