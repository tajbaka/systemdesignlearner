/**
 * Track first-time scenario completions
 * - Uses localStorage for anonymous users
 * - Uses database for authenticated users
 */

import {
  getCompletedScenarioSlugs,
  markScenarioCompleted as markScenarioCompletedInDb,
} from "@/lib/actions/practice";

const STORAGE_KEY = "scenario-completions";

export type ScenarioCompletion = {
  scenarioId: string;
  firstCompletedAt: number; // timestamp
};

// ============================================================================
// LocalStorage-based functions (for anonymous users)
// ============================================================================

/**
 * Get all completed scenarios from localStorage
 */
export function getCompletedScenarios(): ScenarioCompletion[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Check if a scenario has been completed before (localStorage)
 */
export function hasCompletedScenario(scenarioId: string): boolean {
  const completions = getCompletedScenarios();
  return completions.some((c) => c.scenarioId === scenarioId);
}

/**
 * Mark a scenario as completed in localStorage. Returns true if this is the first completion.
 */
export function markScenarioCompleted(scenarioId: string): boolean {
  if (typeof window === "undefined") return false;

  const isFirstTime = !hasCompletedScenario(scenarioId);

  if (isFirstTime) {
    const completions = getCompletedScenarios();
    completions.push({
      scenarioId,
      firstCompletedAt: Date.now(),
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completions));
    } catch {
      // localStorage error, ignore
    }
  }

  return isFirstTime;
}

// ============================================================================
// Database-backed functions (for authenticated users)
// ============================================================================

/**
 * Get all completed scenario slugs from database.
 * Used for authenticated users.
 */
export async function getCompletedScenariosFromDb(): Promise<string[]> {
  return getCompletedScenarioSlugs();
}

/**
 * Mark a scenario as completed in database.
 * Returns true if this is the first completion.
 * Used for authenticated users.
 */
export async function markScenarioCompletedDb(slug: string): Promise<boolean> {
  return markScenarioCompletedInDb(slug);
}

// ============================================================================
// Combined functions (check both sources)
// ============================================================================

/**
 * Check if a scenario has been completed from either localStorage or DB.
 * For use when we want to check both sources (e.g., during migration or display).
 */
export function getCompletedScenarioIds(): string[] {
  const localCompletions = getCompletedScenarios();
  return localCompletions.map((c) => c.scenarioId);
}
