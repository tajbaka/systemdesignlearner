import type { PlacedNode, Edge } from "@/app/components/types";
import type { ScoreBreakdown } from "@/lib/scoring";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { IterativeTopicState, IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";

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
