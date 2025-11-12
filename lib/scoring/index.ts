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

import { evaluateFunctionalRequirements } from "./engines/functional";
import { evaluateNonFunctionalRequirements } from "./engines/nonFunctional";
import { evaluateApiDefinition } from "./engines/api";
import { evaluateDesign } from "./engines/design";

/**
 * Load scoring configuration for a problem
 */
export async function loadScoringConfig(problemId: string): Promise<ProblemScoringConfig> {
  // Dynamic import of JSON config
  const config = await import(`./configs/${problemId}.json`);
  return config.default || config;
}

/**
 * Evaluate functional requirements step
 */
export function scoreFunctionalRequirements(
  input: FunctionalScoringInput,
  config: ProblemScoringConfig
): FeedbackResult {
  return evaluateFunctionalRequirements(input, config.steps.functional);
}

/**
 * Evaluate non-functional requirements step
 */
export function scoreNonFunctionalRequirements(
  input: NonFunctionalScoringInput,
  config: ProblemScoringConfig
): FeedbackResult {
  return evaluateNonFunctionalRequirements(input, config.steps.nonFunctional);
}

/**
 * Evaluate API definition step
 */
export function scoreApiDefinition(
  input: ApiScoringInput,
  config: ProblemScoringConfig
): FeedbackResult {
  return evaluateApiDefinition(input, config.steps.api);
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
export { evaluateFunctionalRequirements } from "./engines/functional";
export { evaluateNonFunctionalRequirements } from "./engines/nonFunctional";
export { evaluateApiDefinition } from "./engines/api";
export { evaluateDesign } from "./engines/design";

// Re-export AI-enhanced functions
export {
  evaluateFunctionalWithAI,
  evaluateApiWithAI,
  evaluateDesignWithAI,
  explainOverallScore,
} from "./ai/hybrid";

// Re-export optimized functions (recommended - faster with deduplication)
export {
  evaluateFunctionalOptimized,
  evaluateApiOptimized,
  evaluateDesignOptimized,
} from "./ai/optimized";

// Re-export progress tracking
export type { ProgressStep, ProgressCallback, EvaluationProgress } from "./ai/progress";
export {
  createFunctionalProgress,
  createApiProgress,
  createDesignProgress,
} from "./ai/progress";

export { isAIAvailable } from "./ai/gemini";
