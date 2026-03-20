import type { Services } from "../../factory";
import type { UpdateSessionParams } from "../services/session";

// ============================================================================
// Controller Factory
// ============================================================================

export function createUserController(services: Services) {
  return {
    // ========================================================================
    // Get Profile (Auth)
    // ========================================================================
    async getProfile() {
      return services.auth.profile.get();
    },

    // ========================================================================
    // Get Session
    // ========================================================================
    async getSession(userId: string, slug: string) {
      const session = await services.auth.session.get(userId, slug);
      if (!session) {
        return { error: "NOT_FOUND" as const };
      }
      return { data: session };
    },

    // ========================================================================
    // Update Session
    // ========================================================================
    async updateSession(params: UpdateSessionParams) {
      const result = await services.auth.session.update(params);
      if (!result) {
        return { error: "NOT_FOUND" as const };
      }
      return { data: result };
    },
  };
}

// ============================================================================
// Type Export
// ============================================================================

export type UserController = ReturnType<typeof createUserController>;
