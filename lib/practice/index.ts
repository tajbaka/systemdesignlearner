/**
 * Practice Module
 *
 * Provides the core functionality for the guided practice mode.
 */

// Types
export type {
  PracticeStep,
  PracticeState,
  PracticeDesignState,
  PracticeRunState,
  PracticeSimulationResult,
  PracticeStepScores,
  PracticeIterativeFeedback,
  PracticeProgress,
  Requirements,
  NFConstraints,
  ApiEndpoint,
  PracticeApiDefinitionState,
} from "./types";
export { PRACTICE_STEPS } from "./types";

// Storage
export { loadPractice, savePractice } from "./storage";

// Defaults
export {
  makeDefaultRequirements,
  makeDefaultDesignState,
  makeDefaultRunState,
  makeDefaultApiDefinition,
  makeInitialPracticeState,
} from "./defaults";

// Scenario configs
export type { ScenarioConfig } from "./scenario-configs";
export { getScenarioConfig, getScenarioMetadata, getFunctionalToggles } from "./scenario-configs";

// Step configs
export type { StepConfig } from "./step-configs";
export { getStepConfig, STEP_CONFIGS, completeStep } from "./step-configs";

// Design guidance
export type { DesignGuidance } from "./designGuidance";
export { evaluateDesignGuidance } from "./designGuidance";

// Validation
export type { DesignValidationResult } from "./validation";
export { validateDesignForScenario } from "./validation";

// Brief generation
export { toMarkdown, toMarkdownSync } from "./brief";

// Reference data loading
export {
  loadScenarioReference,
  getScenarioReferenceSync,
  preloadScenarioReferences,
} from "./loader";
