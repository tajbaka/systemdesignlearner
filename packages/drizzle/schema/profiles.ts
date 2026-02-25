import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// Profiles Table
// User profiles synced from Clerk via webhook
// Enhanced with soft delete support
// ============================================================================

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(), // unique() creates index automatically
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
  newProblemEmailsEnabled: boolean("new_problem_emails_enabled").notNull().default(true),
});

// ============================================================================
// Relations
// ============================================================================

// NOTE: These imports are safe despite being circular - schema definitions don't execute code at import time
import { userProblems } from "./user-problems";

export const profilesRelations = relations(profiles, ({ many }) => ({
  userProblems: many(userProblems),
}));

// ============================================================================
// Type Exports
// ============================================================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
