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

export type PracticeState = {
  slug: "url-shortener";
  requirements?: Requirements;
  high?: HighLevelChoice;
  low?: LowLevel;
  locked: {
    req: boolean;
    high: boolean;
    low: boolean;
  };
  updatedAt: number;
};

export type PracticeStep = "req" | "high" | "low" | "review";

export const PRACTICE_STEPS: PracticeStep[] = ["req", "high", "low", "review"];
