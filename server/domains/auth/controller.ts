import { services } from "../factory";
import { createUserController } from "./controllers/user.controller";

// ============================================================================
// Domain Controller Instance
// ============================================================================

export const userController = createUserController(services);

// ============================================================================
// Type Export
// ============================================================================

export type { UserController } from "./controllers/user.controller";
