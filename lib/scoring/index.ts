/**
 * Scoring System Entry Point
 *
 * Main orchestrator for evaluating practice solutions across all steps.
 */

import type {
  ProblemScoringConfig,
  CumulativeScore,
  FeedbackResult,
  FunctionalScoringInput,
  NonFunctionalScoringInput,
  ApiScoringInput,
  DesignScoringInput,
  SimulationScoringInput,
} from "./types";

import { evaluateDesign } from "./engines/design";
import {
  evaluateFunctionalAIOnly,
  evaluateNonFunctionalAIOnly,
  evaluateApiAIOnly,
} from "./ai/ai-only";

// In-memory cache for loaded scoring configs
const scoringConfigCache = new Map<string, ProblemScoringConfig>();

/**
 * Load scoring configuration for a problem
 */
export async function loadScoringConfig(problemId: string): Promise<ProblemScoringConfig> {
  // Return from cache if available
  if (scoringConfigCache.has(problemId)) {
    return scoringConfigCache.get(problemId)!;
  }

  // Dynamic import of JSON config
  const config = await import(`./configs/${problemId}.json`);
  const scoringConfig = (config.default || config) as ProblemScoringConfig;

  // Cache for future use
  scoringConfigCache.set(problemId, scoringConfig);

  return scoringConfig;
}

/**
 * Get scoring configuration synchronously from cache.
 * Returns null if not yet loaded.
 *
 * Use this when you need to check if a config is available
 * without triggering a load operation.
 */
export function getScoringConfigSync(problemId: string): ProblemScoringConfig | null {
  return scoringConfigCache.get(problemId) ?? null;
}

/**
 * Evaluate functional requirements step (AI-only)
 */
export async function scoreFunctionalRequirements(
  input: FunctionalScoringInput,
  config: ProblemScoringConfig,
  slug: string
): Promise<FeedbackResult> {
  return evaluateFunctionalAIOnly(input, config.steps.functional, slug);
}

/**
 * Evaluate non-functional requirements step (AI-only)
 */
export async function scoreNonFunctionalRequirements(
  input: NonFunctionalScoringInput,
  config: ProblemScoringConfig,
  slug: string
): Promise<FeedbackResult> {
  return evaluateNonFunctionalAIOnly(input, config.steps.nonFunctional, slug);
}

/**
 * Evaluate API definition step (AI-only)
 */
export async function scoreApiDefinition(
  input: ApiScoringInput,
  config: ProblemScoringConfig,
  slug: string
): Promise<FeedbackResult> {
  return evaluateApiAIOnly(input, config.steps.api, slug);
}

/**
 * Evaluate design step
 */
export function scoreDesign(
  input: DesignScoringInput,
  config: ProblemScoringConfig
): FeedbackResult {
  return evaluateDesign(input, config.steps.design);
}

/**
 * Evaluate simulation/run step
 */
export function scoreSimulation(
  input: SimulationScoringInput,
  config: ProblemScoringConfig
): FeedbackResult {
  const criteria = config.steps.simulation.criteria;
  let score = 0;

  const blocking: FeedbackResult["blocking"] = [];
  const warnings: FeedbackResult["warnings"] = [];
  const positive: FeedbackResult["positive"] = [];

  // Check RPS
  if (input.meetsRps) {
    score += criteria.meetsRps;
    positive.push({
      category: "performance",
      severity: "positive",
      message: `✓ System meets RPS requirement${input.actualRps && input.targetRps ? ` (${input.actualRps}/${input.targetRps} RPS)` : ""}`,
    });
  } else {
    warnings.push({
      category: "performance",
      severity: "warning",
      message: `System doesn't meet RPS requirement${input.actualRps && input.targetRps ? ` (${input.actualRps}/${input.targetRps} RPS)` : ""}`,
      actionable: "Add more replicas or optimize your data path",
    });
  }

  // Check latency
  if (input.meetsLatency) {
    score += criteria.meetsLatency;
    positive.push({
      category: "performance",
      severity: "positive",
      message: `✓ System meets latency requirement${input.actualLatency && input.targetLatency ? ` (${input.actualLatency}ms vs ${input.targetLatency}ms target)` : ""}`,
    });
  } else {
    warnings.push({
      category: "performance",
      severity: "warning",
      message: `System doesn't meet latency requirement${input.actualLatency && input.targetLatency ? ` (${input.actualLatency}ms vs ${input.targetLatency}ms target)` : ""}`,
      actionable: "Ensure cache is on the critical path and optimize slow components",
    });
  }

  // Check chaos
  if (!input.failedByChaos) {
    score += criteria.passesChaos;
    positive.push({
      category: "architecture",
      severity: "positive",
      message: "✓ System survives chaos testing (failure scenarios)",
    });
  } else {
    warnings.push({
      category: "architecture",
      severity: "warning",
      message: "System failed chaos testing - needs better resilience",
      actionable: "Add redundancy, replicas, or fallback mechanisms",
    });
  }

  return {
    score,
    maxScore: config.steps.simulation.maxScore,
    percentage: (score / config.steps.simulation.maxScore) * 100,
    blocking,
    warnings,
    positive,
    suggestions: [],
  };
}

/**
 * Calculate cumulative score across all steps
 */
export function calculateCumulativeScore(
  functionalResult: FeedbackResult,
  nonFunctionalResult: FeedbackResult,
  apiResult: FeedbackResult,
  designResult: FeedbackResult
): CumulativeScore {
  const breakdown = {
    functional: functionalResult.score,
    nonFunctional: nonFunctionalResult.score,
    api: apiResult.score,
    design: designResult.score,
  };

  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  // Collect strengths (positive feedback)
  const strengths: string[] = [];
  for (const result of [functionalResult, nonFunctionalResult, apiResult, designResult]) {
    strengths.push(...result.positive.slice(0, 2).map((f) => f.message)); // Top 2 from each
  }

  // Collect improvements needed (warnings + blocking)
  const improvements: string[] = [];
  for (const result of [functionalResult, nonFunctionalResult, apiResult, designResult]) {
    improvements.push(...result.blocking.map((f) => f.message));
    improvements.push(...result.warnings.slice(0, 2).map((f) => f.message)); // Top 2 warnings
  }

  // Calculate grade
  let grade: CumulativeScore["grade"];
  if (total >= 90) grade = "A";
  else if (total >= 80) grade = "B";
  else if (total >= 70) grade = "C";
  else if (total >= 60) grade = "D";
  else grade = "F";

  return {
    total,
    breakdown,
    feedback: {
      strengths: strengths.slice(0, 5), // Top 5 strengths
      improvements: improvements.slice(0, 5), // Top 5 improvements
    },
    grade,
  };
}

/**
 * Check if step can proceed (no blocking issues)
 */
export function canProceedToNextStep(result: FeedbackResult): boolean {
  return result.blocking.length === 0;
}

/**
 * Get grade description
 */
export function getGradeDescription(grade: CumulativeScore["grade"]): string {
  switch (grade) {
    case "A":
      return "Excellent - Production Ready";
    case "B":
      return "Good - Minor Improvements Needed";
    case "C":
      return "Acceptable - Several Issues to Address";
    case "D":
      return "Needs Work - Major Gaps";
    case "F":
      return "Incomplete - Missing Critical Elements";
  }
}

/**
 * Get grade color for UI
 */
export function getGradeColor(grade: CumulativeScore["grade"]): string {
  switch (grade) {
    case "A":
      return "emerald"; // green
    case "B":
      return "blue";
    case "C":
      return "yellow";
    case "D":
      return "orange";
    case "F":
      return "red";
  }
}

// Re-export types for convenience
export * from "./types";
export { evaluateDesign } from "./engines/design";
export type { ScoreBreakdown } from "./engines/simulationScore";
export { calculateScore } from "./engines/simulationScore";

// Re-export AI-only functions (recommended - pure AI evaluation)
export {
  evaluateFunctionalAIOnly,
  evaluateNonFunctionalAIOnly,
  evaluateApiAIOnly,
} from "./ai/ai-only";

// Optimized design evaluation (used in RunStage)
export { evaluateDesignOptimized } from "./ai/optimized";

// Re-export progress tracking
export type { ProgressStep, ProgressCallback, EvaluationProgress } from "./ai/progress";
export { createFunctionalProgress, createApiProgress, createDesignProgress } from "./ai/progress";

export { isAIAvailable } from "./ai/gemini";
