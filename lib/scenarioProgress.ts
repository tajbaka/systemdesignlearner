/**
 * Track first-time scenario completions in localStorage
 */

const STORAGE_KEY = "scenario-completions";

export type ScenarioCompletion = {
  scenarioId: string;
  firstCompletedAt: number; // timestamp
};

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
 * Check if a scenario has been completed before
 */
export function hasCompletedScenario(scenarioId: string): boolean {
  const completions = getCompletedScenarios();
  return completions.some((c) => c.scenarioId === scenarioId);
}

/**
 * Mark a scenario as completed. Returns true if this is the first completion.
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
