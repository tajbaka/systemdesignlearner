/**
 * AI-Only Evaluation Functions
 *
 * Wraps the iterative feedback system to provide direct scoring
 * for functional, non-functional, and API steps.
 */

import {
  assessCoverage,
  type StepConfig,
  type CoverageReport,
  type Topic,
  type EndpointRequirement,
} from "./iterative";
import { loadScoringConfig } from "./index";
import type {
  FunctionalScoringInput,
  FunctionalScoringConfig,
  NonFunctionalScoringInput,
  NonFunctionalScoringConfig,
  ApiScoringInput,
  ApiScoringConfig,
  FeedbackResult,
  FeedbackItem,
  ProblemScoringConfig,
  FunctionalRequirement,
  ApiRequirement,
  QualitativeAspect,
} from "../types";
import type { ApiEndpoint } from "../types";
import { logger } from "@/lib/logger";

function computeScore(
  stepConfig: StepConfig,
  coveredIds: Set<string>
): { obtained: number; max: number } {
  const coreTopics = stepConfig.topics.filter((t: Topic) => t.required);
  const max = coreTopics.reduce((acc: number, t: Topic) => acc + (t.weight ?? 1), 0);
  const obtained = coreTopics.reduce((acc: number, t: Topic) => {
    if (coveredIds.has(t.id)) {
      return acc + (t.weight ?? 1);
    }
    return acc;
  }, 0);
  return { obtained, max };
}

function convertCoverageToFeedback(
  coverage: CoverageReport,
  stepConfig: StepConfig,
  maxScore: number
): FeedbackResult {
  const coveredIds = new Set<string>(
    coverage.covered.map((c: { id: string; label: string }) => c.id)
  );
  const { obtained, max } = computeScore(stepConfig, coveredIds);
  const percentage = max === 0 ? 100 : Math.round((obtained / max) * 100);

  const blocking: FeedbackItem[] = [];
  const warnings: FeedbackItem[] = [];
  const positive: FeedbackItem[] = [];

  // Add blocking for missing required topics
  for (const missingTopic of coverage.missing.filter(
    (t: { id: string; label: string; required: boolean }) => t.required
  )) {
    const topic = stepConfig.topics.find((t: Topic) => t.id === missingTopic.id);
    blocking.push({
      category: "requirement",
      severity: "blocking",
      message: `Missing core requirement: ${topic?.label || missingTopic.label}`,
      relatedTo: missingTopic.id,
      actionable: `Provide details about ${topic?.label.toLowerCase() || missingTopic.label.toLowerCase()}.`,
    });
  }

  // Add positive feedback for covered topics
  for (const coveredTopic of coverage.covered) {
    const topic = stepConfig.topics.find((t: Topic) => t.id === coveredTopic.id);
    positive.push({
      category: "requirement",
      severity: "positive",
      message: `✓ ${topic?.label || coveredTopic.label}: covered`,
      relatedTo: coveredTopic.id,
    });
  }

  return {
    score: obtained,
    maxScore,
    percentage: Math.round(percentage),
    blocking,
    warnings,
    positive,
    suggestions: [],
  };
}

function buildStepConfig(
  scoringConfig: ProblemScoringConfig,
  stepId: "functional" | "nonFunctional" | "api"
): StepConfig {
  const step = scoringConfig.steps[stepId];
  const requirements = step.requirements || [];

  // Handle different requirement types based on step
  const topics: Topic[] = requirements.map(
    (req: FunctionalRequirement | ApiRequirement | QualitativeAspect) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: "keywords" in req ? req.keywords || [] : [],
      required: req.required ?? false, // Use required field from config, default to false
      weight: "weight" in req ? req.weight || 1 : 1,
    })
  );

  const stepName =
    stepId === "functional"
      ? "Functional Requirements"
      : stepId === "nonFunctional"
        ? "Non-Functional Requirements"
        : "API Design";

  let endpointRequirements: EndpointRequirement[] | undefined;
  if (stepId === "api") {
    const apiStep = step as ApiScoringConfig;

    // Collect endpoints from requirements[].endpoint
    for (const req of apiStep.requirements || []) {
      if (req.endpoint) {
        endpointRequirements = endpointRequirements || [];
        endpointRequirements.push({
          id: req.id,
          method: req.endpoint.method,
          correctPath: req.endpoint.correctPath || "",
          purpose: req.endpoint.purpose,
          required: req.required !== false,
          solutions: req.solutions, // Use requirement's solutions
        });
      }
    }
  }

  return {
    stepId,
    stepName,
    topics,
    endpointRequirements,
  };
}

export async function evaluateFunctionalAIOnly(
  input: FunctionalScoringInput,
  config: FunctionalScoringConfig,
  slug: string
): Promise<FeedbackResult> {
  try {
    const scoringConfig = await loadScoringConfig(slug);
    if (!scoringConfig) {
      throw new Error(`Scoring config not found for slug: ${slug}`);
    }
    const stepConfig = buildStepConfig(scoringConfig, "functional");
    const coverage = await assessCoverage(stepConfig, input.functionalSummary);
    return convertCoverageToFeedback(coverage.coverage, stepConfig, config.maxScore);
  } catch (error) {
    logger.error("AI-only functional evaluation failed:", error);
    return {
      score: 0,
      maxScore: config.maxScore,
      percentage: 0,
      blocking: [
        {
          category: "requirement",
          severity: "blocking",
          message: "Evaluation failed. Please try again.",
        },
      ],
      warnings: [],
      positive: [],
      suggestions: [],
    };
  }
}

export async function evaluateNonFunctionalAIOnly(
  input: NonFunctionalScoringInput,
  config: NonFunctionalScoringConfig,
  slug: string
): Promise<FeedbackResult> {
  try {
    const scoringConfig = await loadScoringConfig(slug);
    if (!scoringConfig) {
      throw new Error(`Scoring config not found for slug: ${slug}`);
    }
    const stepConfig = buildStepConfig(scoringConfig, "nonFunctional");
    const userContent = [
      input.notes,
      input.rateLimitNotes,
      input.readRps > 0 ? `Read throughput: ${input.readRps} rps` : "",
      input.writeRps > 0 ? `Write throughput: ${input.writeRps} rps` : "",
      input.p95RedirectMs > 0 ? `Latency target: ${input.p95RedirectMs}ms` : "",
      input.availability ? `Availability: ${input.availability}%` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const coverage = await assessCoverage(stepConfig, userContent);
    return convertCoverageToFeedback(coverage.coverage, stepConfig, config.maxScore);
  } catch (error) {
    logger.error("AI-only non-functional evaluation failed:", error);
    return {
      score: 0,
      maxScore: config.maxScore,
      percentage: 0,
      blocking: [
        {
          category: "requirement",
          severity: "blocking",
          message: "Evaluation failed. Please try again.",
        },
      ],
      warnings: [],
      positive: [],
      suggestions: [],
    };
  }
}

export async function evaluateApiAIOnly(
  input: ApiScoringInput,
  config: ApiScoringConfig,
  slug: string
): Promise<FeedbackResult> {
  try {
    const scoringConfig = await loadScoringConfig(slug);
    if (!scoringConfig) {
      throw new Error(`Scoring config not found for slug: ${slug}`);
    }
    const stepConfig = buildStepConfig(scoringConfig, "api");
    const userContent = input.endpoints
      .map(
        (ep: ApiEndpoint) => `${ep.method} ${ep.path}\n${ep.notes || "No documentation provided"}`
      )
      .join("\n\n");
    const coverage = await assessCoverage(stepConfig, userContent);
    return convertCoverageToFeedback(coverage.coverage, stepConfig, config.maxScore);
  } catch (error) {
    logger.error("AI-only API evaluation failed:", error);
    return {
      score: 0,
      maxScore: config.maxScore,
      percentage: 0,
      blocking: [
        {
          category: "requirement",
          severity: "blocking",
          message: "Evaluation failed. Please try again.",
        },
      ],
      warnings: [],
      positive: [],
      suggestions: [],
    };
  }
}
