import type { Deps } from "../types";
import * as authService from "./services/auth";
import * as sessionService from "./services/session";

// ============================================================================
// Auth Domain Factory
// ============================================================================

export function createAuthServices(_deps: Deps) {
  return {
    // Profile
    profile: {
      get: authService.getProfile,
    },

    // Session (user progress tracking)
    session: {
      get: sessionService.getSession,
      update: sessionService.updateSession,
    },
  };
}

// ============================================================================
// Type Export
// ============================================================================

export type AuthServices = ReturnType<typeof createAuthServices>;
