import { services } from "../factory";
import { createPracticeController } from "./controllers/practice.controller";

// ============================================================================
// Domain Controller Instance
// ============================================================================

export const practiceController = createPracticeController(services);

// ============================================================================
// Type Export
// ============================================================================

export type { PracticeController } from "./controllers/practice.controller";
