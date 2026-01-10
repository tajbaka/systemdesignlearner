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
  FeedbackItem,
  Hint,
} from "../types";
import type { IterativeFeedbackResult } from "./iterative";

import {
  evaluateFunctionalAIOnly,
  evaluateNonFunctionalAIOnly,
  evaluateApiAIOnly,
} from "./ai-only";
import {
  buildAdjacencyList,
  compareDesignPaths,
  calculateDesignScore,
} from "@/domains/practice/lib/adjacencyListUtils";
import { designToComponents } from "@/domains/practice/lib/designToComponents";
import { logger } from "@/lib/logger";

// In-memory cache for loaded scoring configs
const scoringConfigCache = new Map<string, ProblemScoringConfig>();

/**
 * Load scoring configuration for a problem
 * Supports both .ts and .json config files (prefers .ts for type safety)
 */
export async function loadScoringConfig(problemId: string): Promise<ProblemScoringConfig | null> {
  // Return from cache if available
  if (scoringConfigCache.has(problemId)) {
    return scoringConfigCache.get(problemId)!;
  }

  // Try TypeScript config first (type-checked), fallback to JSON
  let scoringConfig: ProblemScoringConfig;
  try {
    const config = await import(`../configs/${problemId}.ts`);
    scoringConfig = (config.default || config) as ProblemScoringConfig;

    // Cache for future use
    scoringConfigCache.set(problemId, scoringConfig);

    return scoringConfig;
  } catch {
    return null;
  }
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
 * Convert IterativeFeedbackResult to FeedbackResult for cumulative scoring
 */
export function iterativeToFeedbackResult(result: IterativeFeedbackResult): FeedbackResult {
  const blocking: FeedbackItem[] = result.ui.blocking
    ? [
        {
          category: "requirement",
          severity: "blocking",
          message: result.ui.nextPrompt ?? "Missing required elements",
        },
      ]
    : [];

  const positive: FeedbackItem[] = result.ui.coveredLines.map((line) => ({
    category: "bestPractice",
    severity: "positive",
    message: line,
  }));

  return {
    score: result.score.obtained,
    maxScore: result.score.max,
    percentage: result.score.percentage,
    blocking,
    warnings: [],
    positive,
    suggestions: [],
    improvementQuestion: result.ui.nextPrompt ?? undefined,
  };
}

/**
 * Evaluate high-level design step
 */
export async function scoreHighLevelDesign(
  input: DesignScoringInput,
  config: ProblemScoringConfig,
  _slug: string
): Promise<IterativeFeedbackResult> {
  type ComponentsConfig = {
    nodes?: Array<{ id: string; type: string }>;
    edges?: Array<{
      from: string;
      to: string;
      protocol?: string;
      op?: string;
      percentage?: number;
      hints?: Hint[];
    }>;
  };

  const highLevelDesignStep = config.steps.highLevelDesign as
    | (import("../types").DesignScoringConfig & { solutions?: ComponentsConfig[] })
    | undefined;
  const expectedComponents = highLevelDesignStep?.solutions?.[0] as ComponentsConfig | undefined;
  const userComponents = designToComponents(input.nodes, input.edges);

  if (!expectedComponents) {
    throw new Error("No expected design solution found in config");
  }

  const blockingHints: string[] = [];
  const warningHints: string[] = [];
  const suggestionHints: string[] = [];

  const expectedAdjacencyList = buildAdjacencyList(expectedComponents);
  const userAdjacencyList = buildAdjacencyList(userComponents);
  const maxScore = highLevelDesignStep?.maxScore || 35;

  // Compare designs to find missing paths, edges, and hidden nodes
  const comparison = compareDesignPaths(
    expectedAdjacencyList,
    userAdjacencyList,
    expectedComponents,
    userComponents
  );

  // Calculate score based on missing edges (deduct their percentages from 100)
  const scoreResult = calculateDesignScore(comparison.missingEdges, maxScore);

  if (!scoreResult) {
    throw new Error("Failed to calculate design score");
  }

  for (const edge of comparison.missingEdges) {
    if (edge.hints && edge.hints.length > 0) {
      blockingHints.push(...edge.hints.map((hint) => hint.text));
    }
  }

  // Add path hints as warnings
  for (const path of comparison.missingPaths) {
    const pathStr = path.join(" → ");
    warningHints.push(`Missing path: ${pathStr}`);
  }

  // Handle hidden nodes (nodes that were bypassed in user's design)
  for (const hiddenNode of comparison.hiddenNodes) {
    const hint = `You bypassed ${hiddenNode.node} and connected ${hiddenNode.skippedFrom} → ${hiddenNode.skippedTo} directly. Consider adding ${hiddenNode.node} to improve ${hiddenNode.type === "cache" ? "performance and reduce database load" : "your design"}.`;
    suggestionHints.push(hint);
  }

  const hasBlocking = blockingHints.length > 0;
  const allCovered = scoreResult.percentage === 100;

  // Combine all blocking hints into a single prompt
  const nextPrompt =
    blockingHints.length > 0
      ? blockingHints.join("\n\n")
      : suggestionHints.length > 0
        ? suggestionHints[0]
        : null;

  // Build covered lines from edges (connections)
  // Map node IDs to readable names
  let coveredLines: string[] = [];
  try {
    const nodeNameMap = new Map<string, string>();
    const serviceIndexMap = new Map<string, number>();

    input.nodes.forEach((node) => {
      const match = node.id.match(/^node-([^-]+)-/);
      if (match) {
        const kind = match[1];
        if (kind === "Service") {
          const currentIndex = serviceIndexMap.get("Service") || 0;
          serviceIndexMap.set("Service", currentIndex + 1);
          nodeNameMap.set(node.id, `Service${currentIndex + 1}`);
        } else {
          nodeNameMap.set(node.id, kind);
        }
      } else {
        nodeNameMap.set(node.id, node.id);
      }
    });

    coveredLines = (input.edges || []).map((edge) => {
      const fromName = nodeNameMap.get(edge.from) || edge.from;
      const toName = nodeNameMap.get(edge.to) || edge.to;
      return `${fromName} → ${toName}`;
    });
  } catch (error) {
    logger.error("Error building covered lines for design:", error);
    coveredLines = [];
  }

  return {
    coverage: {
      covered: [],
      missing: [],
      requiredCovered: !hasBlocking,
      allCovered,
    },
    nextQuestion: nextPrompt
      ? {
          question: nextPrompt,
          topicId: "design",
        }
      : null,
    score: {
      obtained: scoreResult.score,
      max: scoreResult.maxScore,
      percentage: scoreResult.percentage,
    },
    ui: {
      coveredLines,
      nextPrompt,
      blocking: hasBlocking,
      showSolution: false, // Flag indicating solutions should be fetched from config
    },
  };
}

/**
 * Calculate cumulative score across all steps
 */
export function calculateCumulativeScore(
  functionalResult: FeedbackResult | IterativeFeedbackResult,
  nonFunctionalResult: FeedbackResult | IterativeFeedbackResult,
  apiResult: FeedbackResult | IterativeFeedbackResult,
  designResult: FeedbackResult | IterativeFeedbackResult
): CumulativeScore {
  // Convert IterativeFeedbackResult to FeedbackResult if needed
  const toFeedback = (result: FeedbackResult | IterativeFeedbackResult): FeedbackResult => {
    if ("coverage" in result) {
      return iterativeToFeedbackResult(result);
    }
    return result;
  };

  const functional = toFeedback(functionalResult);
  const nonFunctional = toFeedback(nonFunctionalResult);
  const api = toFeedback(apiResult);
  const design = toFeedback(designResult);
  const breakdown = {
    functional: functional.score,
    nonFunctional: nonFunctional.score,
    api: api.score,
    design: design.score,
  };

  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  // Collect strengths (positive feedback)
  const strengths: string[] = [];
  for (const result of [functional, nonFunctional, api, design]) {
    strengths.push(...result.positive.slice(0, 2).map((f: FeedbackItem) => f.message)); // Top 2 from each
  }

  // Collect improvements needed (warnings + blocking)
  const improvements: string[] = [];
  for (const result of [functional, nonFunctional, api, design]) {
    improvements.push(...result.blocking.map((f: FeedbackItem) => f.message));
    improvements.push(...result.warnings.slice(0, 2).map((f: FeedbackItem) => f.message)); // Top 2 warnings
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
    default:
      return "Unknown Grade";
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
    default:
      return "gray";
  }
}

// Re-export types for convenience
export * from "../types";

// Re-export AI-only functions (recommended - pure AI evaluation)
export {
  evaluateFunctionalAIOnly,
  evaluateNonFunctionalAIOnly,
  evaluateApiAIOnly,
} from "./ai-only";
