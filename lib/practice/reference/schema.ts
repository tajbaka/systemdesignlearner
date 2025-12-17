/**
 * TypeScript types for scenario reference JSON files.
 *
 * Each scenario in practice mode has a reference JSON file that contains
 * all the configuration needed for that scenario. This allows adding new
 * scenarios without code changes.
 */

// ============================================================================
// Functional Requirements
// ============================================================================

export type FunctionalToggle = {
  id: string;
  label: string;
  description: string;
  default: boolean;
};

export type FunctionalConfig = {
  toggles: FunctionalToggle[];
  /** Order in which functional requirements should appear in the brief */
  order: string[];
  /** Display labels for functional requirement IDs */
  labels: Record<string, string>;
};

// ============================================================================
// Non-Functional Requirements
// ============================================================================

export type QuantitativeRange = {
  min: number;
  max: number;
  recommended: number;
  unit: string;
  metric: string;
};

export type QuantitativeAcceptable = {
  acceptable: string[];
  recommended: string;
};

export type NonFunctionalCategory = {
  id: string;
  label: string;
  description: string;
  /** Placeholder text for the input field */
  placeholder?: string;
  examples: string[];
  quantitative?: QuantitativeRange | QuantitativeAcceptable;
};

export type NonFunctionalConfig = {
  categories: NonFunctionalCategory[];
};

// ============================================================================
// API Definition
// ============================================================================

export type ApiRequestBodyField = {
  type: string;
  required: boolean;
  description: string;
};

export type ApiResponseBody = {
  description: string;
  body?: Record<string, string>;
};

export type ApiEndpointReference = {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  purpose: string;
  required: boolean;
  /** Feature ID that must be enabled for this endpoint to be required */
  requiresFeature?: string;
  /** Placeholder text for the endpoint description */
  placeholder?: string;
  requestBody?: Record<string, ApiRequestBodyField | string>;
  responses: Record<string, string | ApiResponseBody>;
};

export type ApiConfig = {
  endpoints: ApiEndpointReference[];
};

// ============================================================================
// Design Guidance
// ============================================================================

export type GuidanceLevel = "core" | "bonus";

export type GuidanceQuestion = {
  id: string;
  question: string;
  hints?: string[];
  /** Whether this is a core requirement or bonus improvement */
  level?: GuidanceLevel;
  /** Component kinds that should be present to answer this question */
  requiredKinds?: string[];
};

export type EvaluationCriterion = {
  kinds: string[];
  minCount: number;
};

export type DesignGuidanceConfig = {
  questions: GuidanceQuestion[];
  evaluationCriteria: Record<string, EvaluationCriterion>;
};

export type DesignConfig = {
  guidance: DesignGuidanceConfig;
  /** Component groups for different feature configurations */
  components: Record<string, string[]>;
};

// ============================================================================
// Brief Generation
// ============================================================================

export type BriefConfig = {
  title: string;
  sections: {
    functional: string;
    nonFunctional: string;
    api: string;
    design: string;
  };
};

// ============================================================================
// Onboarding Text
// ============================================================================

export type OnboardingConfig = {
  welcome: string;
  steps: {
    functional: string;
    nonFunctional: string;
    api: string;
    highLevelDesign: string;
    score: string;
  };
};

// ============================================================================
// Verification Prompts
// ============================================================================

export type VerificationConfig = {
  systemPrompt: string;
  criteria: {
    functional: string;
    api: string;
    design: string;
  };
};

// ============================================================================
// Main Scenario Reference Type
// ============================================================================

export type ScenarioReference = {
  slug: string;
  title: string;
  description?: string;

  /** Functional requirements configuration */
  functional?: FunctionalConfig;

  /** Non-functional requirements configuration */
  nonFunctional: NonFunctionalConfig;

  /** API endpoints reference (legacy field name) */
  apiEndpoints?: ApiEndpointReference[];
  /** API configuration (new field name) */
  api?: ApiConfig;

  /** Design guidance and components */
  design?: DesignConfig;

  /** Brief generation configuration */
  brief?: BriefConfig;

  /** Onboarding text for practice flow */
  onboarding?: OnboardingConfig;

  /** Verification/validation configuration */
  verification?: VerificationConfig;

  /** Component groups (legacy field) */
  components?: Record<string, string[]>;
};

// ============================================================================
// Helper Type Guards
// ============================================================================

export function hasQuantitativeRange(
  quant: QuantitativeRange | QuantitativeAcceptable | undefined
): quant is QuantitativeRange {
  return quant !== undefined && "min" in quant && "max" in quant;
}

export function hasQuantitativeAcceptable(
  quant: QuantitativeRange | QuantitativeAcceptable | undefined
): quant is QuantitativeAcceptable {
  return quant !== undefined && "acceptable" in quant;
}

// ============================================================================
// Defaults for optional fields
// ============================================================================

export const DEFAULT_BRIEF_CONFIG: BriefConfig = {
  title: "System Design Review",
  sections: {
    functional: "Functional Requirements",
    nonFunctional: "Non-Functional Requirements",
    api: "API Design",
    design: "System Architecture",
  },
};

export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  welcome: "Let's design this system together",
  steps: {
    functional: "First, let's define the functional requirements",
    nonFunctional: "Now let's set our performance targets",
    api: "Design the API interface",
    highLevelDesign: "Build your system architecture",
    score: "Review your complete design",
  },
};
