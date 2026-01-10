/**
 * Scoring System Types
 *
 * Defines the type system for evaluating user solutions against optimal
 * reference solutions across all practice steps.
 */

import type {
  IterativeTopicState,
  IterativeFeedbackResult,
} from "@/domains/practice/scoring/iterative";

// ============================================================================
// Core Domain Types (moved from lib/types/domain.ts)
// ============================================================================

export type NodeId = string;
export type EdgeId = string;

export interface PlacedNode {
  id: NodeId;
  x: number; // board coords
  y: number; // board coords
}

export interface Edge {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  sourceHandle?: string;
  targetHandle?: string;
}

// ============================================================================
// Practice State Types (moved from lib/types.ts)
// ============================================================================

export type HighLevelChoice = {
  presetId: "db_only" | "cache_primary" | "global_edge_cache";
  components: string[];
  notes?: string[];
};

export type LowLevel = {
  schemas: Record<string, string>;
  apis: Array<{
    method: "GET" | "POST";
    path: string;
    notes?: string;
  }>;
  capacityAssumptions: {
    cacheHit: number;
    avgWritesPerCreate: number;
    readRps: number;
  };
};

export type NFConstraints = {
  readRps: number;
  writeRps: number;
  p95RedirectMs: number;
  rateLimitNotes: string;
  availability: "99.0" | "99.9" | "99.99";
  notes: string;
};

export type Requirements = {
  functionalSummary: string;
  functional: Record<string, boolean>;
  nonFunctional: NFConstraints;
};

export type ApiEndpoint = {
  id: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  notes: string;
  suggested?: boolean;
};

export type PracticeApiDefinitionState = {
  endpoints: ApiEndpoint[];
};

export type PracticeSimulationResult = {
  latencyMsP95: number;
  capacityRps: number;
  meetsRps: boolean;
  meetsLatency: boolean;
  backlogGrowthRps: number;
  failedByChaos: boolean;
  acceptanceResults?: Record<string, boolean>;
  acceptanceScore?: number;
  scoreBreakdown?: ScoreBreakdown;
};

export type PracticeDesignState = {
  nodes: PlacedNode[];
  edges: Edge[];
  guidedStepIndex: number;
  guidedCompleted: boolean;
  guidedDismissed: boolean;
  freeModeUnlocked: boolean;
  redirectMode: "301" | "302";
};

export type PracticeRunState = {
  attempts: number;
  chaosMode: boolean;
  isRunning: boolean;
  lastResult: (PracticeSimulationResult & { completedAt: number }) | null;
  firstPassAt?: number;
};

export type PracticeAuthState = {
  isAuthed: boolean;
  skipped: boolean;
};

export type PracticeStep = "functional" | "nonFunctional" | "api" | "highLevelDesign" | "score";

export const PRACTICE_STEPS: PracticeStep[] = [
  "functional",
  "nonFunctional",
  "api",
  "highLevelDesign",
  "score",
];

export type PracticeProgress = Record<PracticeStep, boolean>;

export type PracticeStepScores = {
  functional?: FeedbackResult;
  nonFunctional?: FeedbackResult;
  api?: FeedbackResult;
  design?: FeedbackResult;
  simulation?: FeedbackResult;
};

export type PracticeIterativeFeedback = {
  functional: {
    coveredTopics: IterativeTopicState;
    lastContent: string; // For detecting changes
    currentQuestion: string | null;
    cachedResult?: IterativeFeedbackResult | null; // Cached result for instant display
    attemptCount?: number; // Track number of submission attempts on same topic
  };
  nonFunctional: {
    coveredTopics: IterativeTopicState;
    lastContent: string;
    currentQuestion: string | null;
    cachedResult?: IterativeFeedbackResult | null;
    attemptCount?: number;
  };
  api: {
    coveredTopics: IterativeTopicState;
    lastContent: string;
    currentQuestion: string | null;
    cachedResult?: IterativeFeedbackResult | null;
    attemptCount?: number;
  };
  design: {
    coveredTopics: IterativeTopicState;
    lastContent: string;
    currentQuestion: string | null;
    cachedResult?: IterativeFeedbackResult | null;
    attemptCount?: number;
  };
};

export type PracticeState = {
  slug: string;
  currentStep: PracticeStep;
  requirements: Requirements;
  apiDefinition: PracticeApiDefinitionState;
  design: PracticeDesignState;
  run: PracticeRunState;
  auth: PracticeAuthState;
  completed: PracticeProgress;
  scores?: PracticeStepScores;
  iterativeFeedback?: PracticeIterativeFeedback;
  updatedAt: number;
};

// ============================================================================
// Component Types
// ============================================================================

/**
 * All possible component kinds that can be used in system designs
 */
export type ComponentKind =
  | "Client"
  | "CDN"
  | "API Gateway"
  | "Service"
  | "Cache (Redis)"
  | "DB (Postgres)"
  | "Object Store (S3)"
  | "Message Queue (Kafka Topic)"
  | "Load Balancer"
  | "Search Index (Elastic)"
  | "Read Replica"
  | "Object Cache (Memcached)"
  | "Auth"
  | "Rate Limiter"
  | "Stream Processor (Flink)"
  | "Worker Pool"
  | "ID Generator (Snowflake)"
  | "Shard Router"
  | "Tracing/Logging"
  | "Edge Function"
  | "Origin Shield (CDN Proxy)";

// ============================================================================
// Core Scoring Types
// ============================================================================

export type FeedbackSeverity = "blocking" | "warning" | "positive" | "info";
export type FeedbackCategory = "requirement" | "architecture" | "performance" | "bestPractice";

export type FeedbackItem = {
  category: FeedbackCategory;
  severity: FeedbackSeverity;
  message: string;
  relatedTo?: string; // ID of requirement/component
  actionable?: string; // What user should do
};

export type BonusScore = {
  score: number;
  maxScore: number;
  label?: string;
};

export type FeedbackResult = {
  score: number;
  maxScore: number;
  percentage: number;
  blocking: FeedbackItem[];
  warnings: FeedbackItem[];
  positive: FeedbackItem[];
  suggestions: FeedbackItem[];
  improvementQuestion?: string; // Optional iterative feedback question
  bonus?: BonusScore;
  totalScore?: number;
  totalMaxScore?: number;
};

export type CumulativeScore = {
  total: number; // 0-100
  breakdown: {
    functional: number; // out of 25
    nonFunctional: number; // out of 20
    api: number; // out of 20
    design: number; // out of 35
  };
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  grade: "A" | "B" | "C" | "D" | "F";
  percentile?: number; // Future: compare to other users
};

// ============================================================================
// Step 1: Functional Requirements Scoring
// ============================================================================

// Simple solution format for functional/non-functional requirements
export type SimpleSolution = {
  text: string; // The solution text/example answer
};

// Structured solution format for API endpoints
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

// Union type: solutions can be either simple text or structured API format
export type Solution = SimpleSolution | ApiSolution;

export type Hint = {
  text: string; // The hint text
  href?: string; // Optional link for more information
};

export type FunctionalRequirement = {
  id: string;
  label: string;
  description: string;
  keywords: string[]; // For text matching
  weight: number;
  required: boolean; // Core vs optional
  solutions?: Solution[]; // Example solutions shown after 3 failed attempts
  hints?: Hint[]; // Hints to guide users when this requirement is missing
};

export type FunctionalScoringConfig = {
  maxScore: number;
  requirements: FunctionalRequirement[]; // Use required: true/false to distinguish core vs optional
  minKeywordsMatch?: number; // Deprecated: Not used by AI-only evaluation
  minTextLength?: number; // Deprecated: Not used by AI-only evaluation
};

export type FunctionalScoringInput = {
  functionalSummary: string;
  selectedRequirements: Record<string, boolean>; // From Requirements.functional
};

// ============================================================================
// Step 2: Non-Functional Requirements Scoring
// ============================================================================

export type QualitativeAspect = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  weight: number;
  required?: boolean; // Whether this is a core requirement (defaults to false)
  solutions?: Solution[]; // Example solutions shown after 3 failed attempts
  hints?: Hint[]; // Hints to guide users when this requirement is missing
};

export type NonFunctionalScoringConfig = {
  maxScore: number;
  minTextLength?: number; // Deprecated: Not used by AI-only evaluation
  requirements?: QualitativeAspect[]; // Use required: true/false to distinguish core vs optional
};

export type NonFunctionalScoringInput = {
  readRps: number;
  writeRps: number;
  p95RedirectMs: number;
  availability: string;
  rateLimitNotes?: string;
  notes?: string;
  functionalRequirements: Record<string, boolean>; // From Step 1
};

// ============================================================================
// Step 3: API Definition Scoring
// ============================================================================

export type ApiEndpointConfig = {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  purpose: string;
  requiredBy: string[]; // Links to functional requirement IDs
  weight: number;
  required: boolean;
  minDocumentationLength?: number;
  correctPath?: string; // The correct path to use as solution after 3 failed attempts
};

export type ApiRequirement = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  weight: number;
  required: boolean;
  solutions?: Solution[];
  endpoint?: Omit<ApiEndpointConfig, "id">; // Single endpoint configuration (id not needed as it's tied to the requirement)
};

export type ApiScoringConfig = {
  maxScore: number;
  requirements: ApiRequirement[]; // Use required: true/false to distinguish core vs optional
};

export type ApiScoringInput = {
  endpoints: ApiEndpoint[];
  functionalRequirements: Record<string, boolean>; // From Step 1
};

/**
 * Type for design solution components (nodes and edges)
 * Used to define the optimal/reference solution for design scoring
 */
export type DesignSolution = {
  nodes: Array<{ id: string; type: string }>;
  edges: Array<{
    from: string;
    to: string;
    protocol?: string;
    op?: string;
    percentage?: number;
    hints?: Hint[];
  }>;
};

export type DesignScoringConfig = {
  maxScore: number;
  solutions?: DesignSolution[]; // Array of design solutions (currently one, but extensible)
};

export type DesignScoringInput = {
  nodes: PlacedNode[];
  edges: Edge[];
};

// ============================================================================
// Step 5: Simulation/Run Scoring
// ============================================================================

export type ScoreBreakdown = {
  outcome: "pass" | "fail";
  totalScore: number;
  hints?: string[];
};

// ============================================================================
// Complete Scoring Configuration
// ============================================================================

export type ProblemScoringConfig = {
  problemId: string;
  title: string;
  description: string;
  totalScore: number;
  steps: {
    functional: FunctionalScoringConfig;
    nonFunctional: NonFunctionalScoringConfig;
    api: ApiScoringConfig;
    highLevelDesign: DesignScoringConfig;
  };
  metadata?: {
    version: string;
    author?: string;
    lastUpdated?: string;
  };
};
