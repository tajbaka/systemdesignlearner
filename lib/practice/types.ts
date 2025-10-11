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
  availability: "99.0" | "99.9" | "99.99";
};

export type Requirements = {
  functional: Record<string, boolean>;
  nonFunctional: NFConstraints;
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
};

export type PracticeRunState = {
  attempts: number;
  chaosMode: boolean;
  lastResult?: PracticeSimulationResult & { completedAt: number };
  firstPassAt?: number;
};

export type PracticeState = {
  slug: "url-shortener";
  requirements: Requirements;
  design: PracticeDesignState;
  run: PracticeRunState;
  locked: {
    brief: boolean;
    design: boolean;
    run: boolean;
  };
  updatedAt: number;
};

export type PracticeStep = "brief" | "design" | "run" | "review";

export const PRACTICE_STEPS: PracticeStep[] = ["brief", "design", "run", "review"];
