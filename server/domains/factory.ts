import { db } from "@/packages/drizzle";
import type { Deps } from "./types";

// Import domain factories
import { createPracticeServices } from "./practice/factory";
import { createAuthServices } from "./auth/factory";

// ============================================================================
// Root Service Factory
// ============================================================================

export function createServices(deps: Deps) {
  return {
    practice: createPracticeServices(deps),
    auth: createAuthServices(deps),
  };
}

// ============================================================================
// Default Instance (production)
// ============================================================================

const defaultDeps: Deps = { db };

export const services = createServices(defaultDeps);

// ============================================================================
// Type Export
// ============================================================================

export type Services = ReturnType<typeof createServices>;
