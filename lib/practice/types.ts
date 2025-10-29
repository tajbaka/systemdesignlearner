import type { PlacedNode, Edge } from "@/app/components/types";
import type { ScoreBreakdown } from "@/lib/scoring";

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
  method: "GET" | "POST";
  path: string;
  body: string;
  response: string;
  suggested?: boolean;
};

export type PracticeApiDefinitionState = {
  endpoints: ApiEndpoint[];
  selectedId: string | null;
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
  lastResult?: PracticeSimulationResult & { completedAt: number };
  firstPassAt?: number;
};

export type PracticeAuthState = {
  isAuthed: boolean;
  skipped: boolean;
};

export type PracticeStep =
  | "functional"
  | "nonFunctional"
  | "api"
  | "sandbox"
  | "auth"
  | "score";

export const PRACTICE_STEPS: PracticeStep[] = [
  "functional",
  "nonFunctional",
  "api",
  "sandbox",
  "auth",
  "score",
];

export type PracticeProgress = Record<PracticeStep, boolean>;

export type PracticeState = {
  slug: "url-shortener";
  requirements: Requirements;
  apiDefinition: PracticeApiDefinitionState;
  design: PracticeDesignState;
  run: PracticeRunState;
  auth: PracticeAuthState;
  completed: PracticeProgress;
  updatedAt: number;
};
