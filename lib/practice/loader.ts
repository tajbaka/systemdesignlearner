/**
 * Central loader for scenario reference configurations.
 *
 * Provides async loading with caching for scenario JSON files.
 * Use this module instead of direct imports to enable dynamic scenario support.
 */

import type { ScenarioReference } from "./reference/schema";

// In-memory cache for loaded scenario references
const cache = new Map<string, ScenarioReference>();

/**
 * Dynamically load a scenario reference JSON file.
 * Results are cached for subsequent calls.
 *
 * @param slug - The scenario slug (e.g., "url-shortener", "rate-limiter")
 * @returns The scenario reference configuration
 * @throws Error if the scenario reference file doesn't exist
 */
export async function loadScenarioReference(slug: string): Promise<ScenarioReference> {
  // Return from cache if available
  if (cache.has(slug)) {
    return cache.get(slug)!;
  }

  try {
    // Dynamic import of the scenario reference JSON
    const importedModule = await import(`./reference/${slug}.json`);
    const reference = importedModule.default as ScenarioReference;

    // Cache for future use
    cache.set(slug, reference);

    return reference;
  } catch (error) {
    throw new Error(
      `Failed to load scenario reference for "${slug}". ` +
        `Ensure lib/practice/reference/${slug}.json exists. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get a scenario reference synchronously from cache.
 * Returns null if not yet loaded.
 *
 * Use this when you need to check if a reference is available
 * without triggering a load operation.
 *
 * @param slug - The scenario slug
 * @returns The cached scenario reference or null
 */
export function getScenarioReferenceSync(slug: string): ScenarioReference | null {
  return cache.get(slug) ?? null;
}

/**
 * Preload scenario references into cache.
 * Useful for warming the cache at app startup.
 *
 * @param slugs - Array of scenario slugs to preload
 * @returns Promise that resolves when all scenarios are loaded
 */
export async function preloadScenarioReferences(slugs: string[]): Promise<void> {
  await Promise.all(slugs.map((slug) => loadScenarioReference(slug)));
}

/**
 * Clear the scenario reference cache.
 * Mainly useful for testing.
 */
export function clearScenarioReferenceCache(): void {
  cache.clear();
}

/**
 * Check if a scenario reference exists in cache.
 *
 * @param slug - The scenario slug
 * @returns True if the reference is cached
 */
export function isScenarioReferenceCached(slug: string): boolean {
  return cache.has(slug);
}
