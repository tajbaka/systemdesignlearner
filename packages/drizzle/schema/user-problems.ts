import { pgTable, uuid, timestamp, jsonb, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profiles } from "./profiles";
import { problems, problemVersions } from "./problems";

// ============================================================================
// Enums
// ============================================================================

export const userProblemStatusEnum = pgEnum("user_problem_status", ["in_progress", "completed"]);
export const userProblemStepStatusEnum = pgEnum("user_problem_step_status", [
  "in_progress",
  "completed",
]);

// ============================================================================
// User Problems Table
// Tracks user's overall progress on problems
// ============================================================================

export const userProblems = pgTable(
  "user_problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id),
    problemVersionId: uuid("problem_version_id")
      .notNull()
      .references(() => problemVersions.id),
    // State
    status: userProblemStatusEnum("status").notNull().default("in_progress"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_user_problems_unique").on(table.userId, table.problemId, table.problemVersionId),
  ]
);

// ============================================================================
// User Problem Steps Table
// Tracks user's progress on individual steps within a problem
// ============================================================================

export const userProblemSteps = pgTable(
  "user_problem_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userProblemId: uuid("user_problem_id")
      .notNull()
      .references(() => userProblems.id, { onDelete: "cascade" }),
    status: userProblemStepStatusEnum("status").notNull().default("in_progress"),
    data: jsonb("data"), // Step-specific submission data
    createdAt: timestamp("created_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("idx_user_problem_steps_unique").on(table.userProblemId)]
);

// ============================================================================
// Relations
// ============================================================================

export const userProblemsRelations = relations(userProblems, ({ one, many }) => ({
  user: one(profiles, {
    fields: [userProblems.userId],
    references: [profiles.id],
  }),
  problem: one(problems, {
    fields: [userProblems.problemId],
    references: [problems.id],
  }),
  problemVersion: one(problemVersions, {
    fields: [userProblems.problemVersionId],
    references: [problemVersions.id],
  }),
  steps: many(userProblemSteps),
}));

export const userProblemStepsRelations = relations(userProblemSteps, ({ one }) => ({
  userProblem: one(userProblems, {
    fields: [userProblemSteps.userProblemId],
    references: [userProblems.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type UserProblem = typeof userProblems.$inferSelect;
export type NewUserProblem = typeof userProblems.$inferInsert;

export type UserProblemStep = typeof userProblemSteps.$inferSelect;
export type NewUserProblemStep = typeof userProblemSteps.$inferInsert;
