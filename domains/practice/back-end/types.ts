import { STEPS } from "./constants";
import type { StepperStep } from "./components/Stepper";

export type IntroStepActions = "start";

export type FunctionalStepActions =
  | "back"
  | "next"
  | "changeTextBox"
  | "continue"
  | "revise"
  | "insert"
  | "assistanceQuestion";

export type NonFunctionalStepActions =
  | "back"
  | "next"
  | "changeTextBox"
  | "continue"
  | "revise"
  | "insert"
  | "assistanceQuestion";

export type ApiStepActions =
  | "back"
  | "next"
  | "changeInput"
  | "changeTextBox"
  | "addEndpoint"
  | "deleteEndpoint"
  | "continue"
  | "revise"
  | "insert"
  | "assistanceQuestion";

export type HighLevelDesignStepActions =
  | "back"
  | "next"
  | "updateDesign"
  | "continue"
  | "revise"
  | "insert"
  | "assistanceQuestion";

export type ScoreStepActions = "back" | "home" | "getScore" | "assistanceQuestion";

export type StepActions = {
  [STEPS.INTRO]: IntroStepActions;
  [STEPS.FUNCTIONAL]: FunctionalStepActions;
  [STEPS.NON_FUNCTIONAL]: NonFunctionalStepActions;
  [STEPS.API]: ApiStepActions;
  [STEPS.HIGH_LEVEL_DESIGN]: HighLevelDesignStepActions;
  [STEPS.SCORE]: ScoreStepActions;
};

// Flexible handler type - actions can accept any optional parameters
// The handler implementation decides what to do with the parameters
export type StepHandlers = {
  [K in keyof StepActions]: (action: StepActions[K], ...args: unknown[]) => void;
};

// Union type of all possible actions across all steps
export type AllStepActions = StepActions[keyof StepActions];

export type PracticeStepWithRoute = StepperStep & {
  route: string;
  tooltipDescription: string;
  href?: string;
  order: number;
};

export type StepComponentProps = {
  config: ProblemConfig;
  stepType: string | null;
  handlers: StepHandlers;
  [key: string]: unknown;
};

/**
 * Types for practice problem configurations
 * These types define the structure for each section and the complete problem
 */

// ============================================================================
// Shared Types
// ============================================================================

export type Hint = {
  text: string;
  title?: string;
  href?: string;
  id: string;
};

export type SimpleSolution = {
  text: string;
};

export type ApiSolution = {
  overview: string;
  request: string;
  response: {
    statusCode: string;
    text: string;
  };
  errors: Array<{
    statusCode: string;
    text: string;
  }>;
};

export type Solution = SimpleSolution | ApiSolution;

// ============================================================================
// Functional Requirements Section
// ============================================================================

export type FunctionalRequirement = {
  id: string;
  label: string;
  description: string;
  weight: number;
  required: boolean;
  solutions?: Solution[];
  hints?: Hint[];
  evaluationCriteria?: string;
  feedbackOnMissing?: string;
};

export type FunctionalStep = {
  scoreWeight: number;
  requirements: FunctionalRequirement[];
  completed?: boolean;
  order?: number;
};

// ============================================================================
// Non-Functional Requirements Section
// ============================================================================

export type NonFunctionalRequirement = {
  id: string;
  label: string;
  description: string;
  weight: number;
  required?: boolean;
  solutions?: Solution[];
  hints?: Hint[];
  evaluationCriteria?: string;
  feedbackOnMissing?: string;
};

export type NonFunctionalStep = {
  scoreWeight: number;
  requirements?: NonFunctionalRequirement[];
  completed?: boolean;
  order?: number;
};

// ============================================================================
// API Requirements Section
// ============================================================================

export type BaseApiRequirement = {
  id: string;
  label: string;
  description: string;
  weight: number;
  required: boolean;
  solutions?: Solution[];
  hints?: Hint[];
  evaluationCriteria?: string;
  feedbackOnMissing?: string;
};

export type EndpointApiRequirement = BaseApiRequirement & {
  scope: "endpoint";
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  correctPath: string;
};

export type GlobalApiRequirement = BaseApiRequirement & {
  scope: "global";
};

export type ApiRequirement = EndpointApiRequirement | GlobalApiRequirement;

export type ApiStep = {
  scoreWeight: number;
  requirements: ApiRequirement[];
  completed?: boolean;
  order?: number;
};

// ============================================================================
// High-Level Design Section
// ============================================================================

export type DesignNode = {
  id: string;
  type: string;
  name: string;
  icon: string;
};

export type DesignEdge = {
  from: string;
  to: string;
  percentage?: number;
  description?: string;
  hints?: Hint[];
};

export type DesignSolution = {
  nodes: DesignNode[];
  edges: DesignEdge[];
};

export type HighLevelDesignStep = {
  scoreWeight: number;
  requirements?: DesignSolution[];
  completed?: boolean;
  order?: number;
};

// ============================================================================
// Metadata Section
// ============================================================================

export type ProblemMetadata = {
  version: string;
  author?: string;
  lastUpdated?: string;
};

// ============================================================================
// Step Configuration
// ============================================================================

export type StepConfig = {
  order: number;
  stepType: string;
  requirements?: unknown; // Flexible requirements structure based on stepType
  scoreWeight: number;
};

// ============================================================================
// Complete Problem Type
// ============================================================================

export type ProblemConfig = {
  problemId: string;
  type: "backend" | "frontend";
  title: string;
  description: string;
  totalScore: number;
  difficulty: "easy" | "medium" | "hard";
  solutions?: {
    text: string;
    href?: string;
    id: string;
  }[];
  articles?: {
    id: string;
    href: string;
    title: string;
  }[];
  steps: {
    functional: FunctionalStep;
    nonFunctional: NonFunctionalStep;
    api: ApiStep;
    highLevelDesign: HighLevelDesignStep;
  };
  metadata?: ProblemMetadata;
};
