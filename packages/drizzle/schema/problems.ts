import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// Enums
// ============================================================================

export const problemCategoryEnum = pgEnum("problem_category", ["backend", "frontend"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const problemStepEnum = pgEnum("problem_step", [
  "functional",
  "nonFunctional",
  "api",
  "highLevelDesign",
]);

// ============================================================================
// Problems Table
// Core problem definitions (e.g., url-shortener, rate-limiter)
// ============================================================================

export const problems = pgTable("problems", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // e.g., 'url-shortener'
  category: problemCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// Problem Versions Table
// Versioned problem metadata for historical integrity
// ============================================================================

export const problemVersions = pgTable(
  "problem_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(), // 1, 2, 3...
    title: text("title"),
    description: text("description"),
    difficulty: difficultyEnum("difficulty"),
    timeToComplete: text("time_to_complete"), // e.g., "45 min"
    topic: text("topic"), // e.g., "System Design"
    links: jsonb("links").default([]), // Array of { label, href } objects
    isCurrent: boolean("is_current").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_problem_versions_unique").on(table.problemId, table.versionNumber)]
);

// ============================================================================
// Problem Steps Table
// Defines the steps for a problem (functional, non-functional, api, high-level-design)
// ============================================================================

export const problemSteps = pgTable(
  "problem_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    stepType: problemStepEnum("step").notNull(),
    order: integer("order").notNull(),
    required: boolean("required").notNull().default(true),
    scoreWeight: integer("score_weight").notNull().default(0),
    data: jsonb("data").default({}), // Step-specific configuration/requirements
  },
  (table) => [uniqueIndex("idx_problem_steps_unique").on(table.problemId, table.order)]
);

// ============================================================================
// Relations
// ============================================================================

export const problemsRelations = relations(problems, ({ many }) => ({
  versions: many(problemVersions),
  steps: many(problemSteps),
}));

export const problemVersionsRelations = relations(problemVersions, ({ one }) => ({
  problem: one(problems, {
    fields: [problemVersions.problemId],
    references: [problems.id],
  }),
}));

export const problemStepsRelations = relations(problemSteps, ({ one }) => ({
  problem: one(problems, {
    fields: [problemSteps.problemId],
    references: [problems.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;

export type ProblemVersion = typeof problemVersions.$inferSelect;
export type NewProblemVersion = typeof problemVersions.$inferInsert;

export type ProblemStep = typeof problemSteps.$inferSelect;
export type NewProblemStep = typeof problemSteps.$inferInsert;
