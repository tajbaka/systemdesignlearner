import type { db as Database } from "@/packages/drizzle";

// ============================================================================
// Dependency Types
// ============================================================================

export type Deps = {
  db: typeof Database;
};

// ============================================================================
// Service Interfaces (for future polymorphism if needed)
// ============================================================================

export type { Profile } from "./auth/services/auth";
export type { ProblemWithVersion, ProblemStep, ProblemListItem } from "./practice/services/problem";
export type {
  UserProblemRecord,
  UserProblemStepRecord,
  SaveStepResult,
  UpdateStepEvaluationParams,
  AccessCheckResult,
  EvaluateParams,
  StepType,
  StepScore,
  ScoreResult,
} from "./practice/services/user-problem";
export type { GetSessionResponse, StepRecord } from "@/domains/practice/lib/schemas/step-data";
