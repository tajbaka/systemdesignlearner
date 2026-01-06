"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import {
  db,
  profiles,
  practiceSessions,
  scenarioCompletions,
  type Profile,
  type PracticeSession,
} from "@/lib/db";
import type { PracticeState } from "@/lib/practice/types";
import { logger } from "@/lib/logger";

// ============================================================================
// Profile Management
// ============================================================================

/**
 * Get or create a profile for the current authenticated user.
 * Called on every authenticated request to ensure profile exists.
 */
export async function getOrCreateProfile(): Promise<Profile | null> {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("getOrCreateProfile: No userId from auth()");
    return null;
  }

  try {
    // Try to find existing profile
    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, userId),
    });

    if (existing) {
      return existing;
    }

    // Create new profile with data from Clerk
    const user = await currentUser();
    if (!user) {
      logger.warn("getOrCreateProfile: No currentUser returned");
      return null;
    }

    const [newProfile] = await db
      .insert(profiles)
      .values({
        clerkUserId: userId,
        email: user.emailAddresses[0]?.emailAddress ?? null,
        displayName: user.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
          : null,
        avatarUrl: user.imageUrl ?? null,
      })
      .returning();

    return newProfile ?? null;
  } catch (error) {
    logger.error("Failed to get or create profile - DB error:", error);
    return null;
  }
}

// ============================================================================
// Practice Session CRUD
// ============================================================================

/**
 * Get a practice session for the current user and scenario.
 * Returns null if user is not authenticated or session doesn't exist.
 */
export async function getPracticeSession(slug: string): Promise<PracticeState | null> {
  const profile = await getOrCreateProfile();

  if (!profile) {
    return null;
  }

  try {
    const session = await db.query.practiceSessions.findFirst({
      where: and(
        eq(practiceSessions.profileId, profile.id),
        eq(practiceSessions.scenarioSlug, slug)
      ),
    });

    if (!session) {
      return null;
    }

    // Return the stored state data
    return session.stateData;
  } catch (error) {
    logger.error("Failed to get practice session", error);
    return null;
  }
}

/**
 * Get all practice sessions for the current user.
 * Used for displaying progress overview.
 */
export async function getAllPracticeSessions(): Promise<PracticeSession[]> {
  const profile = await getOrCreateProfile();

  if (!profile) {
    return [];
  }

  try {
    const sessions = await db.query.practiceSessions.findMany({
      where: eq(practiceSessions.profileId, profile.id),
      orderBy: (sessions, { desc }) => [desc(sessions.updatedAt)],
    });

    return sessions;
  } catch (error) {
    logger.error("Failed to get all practice sessions", error);
    return [];
  }
}

/**
 * Save a practice session for the current user.
 * Creates a new session if one doesn't exist, otherwise updates.
 */
export async function savePracticeSession(state: PracticeState): Promise<boolean> {
  const profile = await getOrCreateProfile();

  if (!profile) {
    return false;
  }

  try {
    // Check if session exists
    const existing = await db.query.practiceSessions.findFirst({
      where: and(
        eq(practiceSessions.profileId, profile.id),
        eq(practiceSessions.scenarioSlug, state.slug)
      ),
    });

    const sessionData = {
      currentStep: state.currentStep,
      stateData: state,
      completedFunctional: state.completed.functional,
      completedNonFunctional: state.completed.nonFunctional,
      completedApi: state.completed.api,
      completedHighLevelDesign: state.completed.highLevelDesign,
      completedScore: state.completed.score,
      completedAt: state.completed.score ? new Date() : null,
    };

    if (existing) {
      // Update existing session
      await db
        .update(practiceSessions)
        .set(sessionData)
        .where(eq(practiceSessions.id, existing.id));
    } else {
      // Create new session
      await db.insert(practiceSessions).values({
        profileId: profile.id,
        scenarioSlug: state.slug,
        ...sessionData,
      });
    }

    // Also create scenario_completions entry when score step is completed
    // This enables cross-device completion tracking on the practice list page
    if (state.completed.score) {
      const existingCompletion = await db.query.scenarioCompletions.findFirst({
        where: and(
          eq(scenarioCompletions.profileId, profile.id),
          eq(scenarioCompletions.scenarioSlug, state.slug)
        ),
      });

      if (!existingCompletion) {
        await db.insert(scenarioCompletions).values({
          profileId: profile.id,
          scenarioSlug: state.slug,
        });
      }
    }

    return true;
  } catch (error) {
    logger.error("Failed to save practice session", error);
    return false;
  }
}

// ============================================================================
// Scenario Completions
// ============================================================================

/**
 * Get all completed scenario slugs for the current user.
 */
export async function getCompletedScenarioSlugs(): Promise<string[]> {
  const profile = await getOrCreateProfile();

  if (!profile) {
    return [];
  }

  try {
    const completions = await db.query.scenarioCompletions.findMany({
      where: eq(scenarioCompletions.profileId, profile.id),
    });

    return completions.map((c) => c.scenarioSlug);
  } catch (error) {
    logger.error("Failed to get completed scenarios", error);
    return [];
  }
}

/**
 * Mark a scenario as completed for the current user.
 * Returns true if this was the first completion.
 */
export async function markScenarioCompleted(slug: string): Promise<boolean> {
  const profile = await getOrCreateProfile();

  if (!profile) {
    return false;
  }

  try {
    // Check if already completed
    const existing = await db.query.scenarioCompletions.findFirst({
      where: and(
        eq(scenarioCompletions.profileId, profile.id),
        eq(scenarioCompletions.scenarioSlug, slug)
      ),
    });

    if (existing) {
      return false; // Already completed
    }

    // Mark as completed
    await db.insert(scenarioCompletions).values({
      profileId: profile.id,
      scenarioSlug: slug,
    });

    return true; // First completion
  } catch (error) {
    logger.error("Failed to mark scenario completed", error);
    return false;
  }
}

// ============================================================================
// LocalStorage Migration
// ============================================================================

/**
 * Migrate practice sessions from localStorage to database.
 * Called when a user signs in for the first time.
 * Uses "latest wins" merge strategy based on updatedAt timestamps.
 */
export async function migrateLocalStorageToDb(
  localSessions: Record<string, PracticeState>
): Promise<{ success: boolean; migrated: number; skipped: number; error?: string }> {
  const sessionCount = Object.keys(localSessions).length;

  if (sessionCount === 0) {
    return { success: true, migrated: 0, skipped: 0 };
  }

  const profile = await getOrCreateProfile();

  if (!profile) {
    // This is a real failure - user is authenticated but we can't get/create profile
    // This usually means DB connection issues
    return {
      success: false,
      migrated: 0,
      skipped: 0,
      error: "Failed to get user profile. Please check database connection.",
    };
  }

  let migrated = 0;
  let skipped = 0;

  try {
    for (const [_key, localState] of Object.entries(localSessions)) {
      // Check if there's an existing DB session
      const existing = await db.query.practiceSessions.findFirst({
        where: and(
          eq(practiceSessions.profileId, profile.id),
          eq(practiceSessions.scenarioSlug, localState.slug)
        ),
      });

      if (existing) {
        // Compare timestamps - latest wins
        const dbUpdatedAt = existing.updatedAt.getTime();
        const localUpdatedAt = localState.updatedAt;

        if (localUpdatedAt > dbUpdatedAt) {
          // Local is newer, update DB
          await db
            .update(practiceSessions)
            .set({
              currentStep: localState.currentStep,
              stateData: localState,
              completedFunctional: localState.completed.functional,
              completedNonFunctional: localState.completed.nonFunctional,
              completedApi: localState.completed.api,
              completedHighLevelDesign: localState.completed.highLevelDesign,
              completedScore: localState.completed.score,
              completedAt: localState.completed.score ? new Date() : null,
            })
            .where(eq(practiceSessions.id, existing.id));
          migrated++;
        } else {
          skipped++;
        }
      } else {
        // No existing DB session, create new
        await db.insert(practiceSessions).values({
          profileId: profile.id,
          scenarioSlug: localState.slug,
          currentStep: localState.currentStep,
          stateData: localState,
          completedFunctional: localState.completed.functional,
          completedNonFunctional: localState.completed.nonFunctional,
          completedApi: localState.completed.api,
          completedHighLevelDesign: localState.completed.highLevelDesign,
          completedScore: localState.completed.score,
          completedAt: localState.completed.score ? new Date() : null,
        });
        migrated++;
      }

      // Also migrate completion status if score is complete
      if (localState.completed.score) {
        const existingCompletion = await db.query.scenarioCompletions.findFirst({
          where: and(
            eq(scenarioCompletions.profileId, profile.id),
            eq(scenarioCompletions.scenarioSlug, localState.slug)
          ),
        });

        if (!existingCompletion) {
          await db.insert(scenarioCompletions).values({
            profileId: profile.id,
            scenarioSlug: localState.slug,
          });
        }
      }
    }

    return { success: true, migrated, skipped };
  } catch (error) {
    logger.error("Failed to migrate localStorage to DB", error);
    return {
      success: false,
      migrated,
      skipped,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

/**
 * Check if the current user has a profile (is authenticated and has DB record).
 * Useful for determining if we should use DB or localStorage.
 */
export async function hasProfile(): Promise<boolean> {
  const { userId } = await auth();

  if (!userId) {
    return false;
  }

  try {
    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, userId),
    });

    return !!existing;
  } catch (error) {
    logger.error("Failed to check profile", error);
    return false;
  }
}
