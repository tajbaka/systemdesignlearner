// ============================================================================
// Evaluation Services - Pure Functions
// ============================================================================

// Each service exports: validate, buildPrompt, parseResponse
// The controller handles orchestration (selecting service, calling AI, post-validation)

export { functionalService } from "./functional.service";
export { nonFunctionalService } from "./non-functional.service";
export { apiService, validateMatchedEndpoint, type ExtractedApiInfo } from "./api.service";
export { highLevelDesignService } from "./high-level-design.service";

// Re-export types
export type { EvaluationResult, APIEvaluationResult, EvaluationStrategy } from "./types";
export type { TextRequirementInput, ApiDefinitionInput } from "./validation";
