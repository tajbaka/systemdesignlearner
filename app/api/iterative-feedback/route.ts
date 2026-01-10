import { NextRequest, NextResponse } from "next/server";
import {
  getIterativeFeedback,
  evaluateRevision,
  generateSingleQuestion,
  type StepConfig,
  type Topic,
} from "@/domains/practice/scoring/iterative";
import { logger } from "@/lib/logger";
import { loadScoringConfig } from "@/domains/practice/scoring/index";
import type { ProblemScoringConfig, Solution, Hint } from "@/domains/practice/types";

type SupportedIterativeStep = "functional" | "nonFunctional" | "api";

// Cache configs per slug to avoid repeated file reads
const SCORING_CONFIG_CACHE: Record<string, ProblemScoringConfig> = {};
const STEP_CONFIG_CACHE: Record<string, Partial<Record<SupportedIterativeStep, StepConfig>>> = {};

interface BaseRequirement {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  weight: number;
  required?: boolean; // Whether this is a core requirement (defaults to false)
  solutions?: Solution[];
  hints?: Hint[]; // Hints to guide users when this requirement is missing
}

function buildTopics(stepConfig: { requirements: BaseRequirement[] | readonly BaseRequirement[] }) {
  return stepConfig.requirements.map((req) => ({
    id: req.id,
    label: req.label,
    description: req.description,
    keywords: req.keywords,
    required: req.required ?? false, // Use required field from config, default to false
    weight: req.weight,
    solutions: req.solutions,
    hints: req.hints,
  }));
}

const STEP_BUILDERS: Record<
  SupportedIterativeStep,
  (scoringConfig: ProblemScoringConfig) => StepConfig
> = {
  functional: (scoringConfig) => ({
    stepId: "functional",
    stepName: "Functional Requirements",
    topics: buildTopics({
      requirements: scoringConfig.steps.functional.requirements as BaseRequirement[],
    }),
  }),
  nonFunctional: (scoringConfig) => ({
    stepId: "nonFunctional",
    stepName: "Non-Functional Requirements",
    topics: buildTopics({
      requirements: (scoringConfig.steps.nonFunctional.requirements ?? []) as BaseRequirement[],
    }),
  }),
  api: (scoringConfig) => {
    const api = scoringConfig.steps.api;
    const endpointRequirements: Array<{
      id: string;
      method: string;
      correctPath?: string;
      purpose: string;
      required: boolean;
      solutions?: Solution[];
    }> = [];

    // Collect endpoints from requirements[].endpoint
    for (const req of api.requirements || []) {
      if (req.endpoint) {
        endpointRequirements.push({
          id: req.id, // Use requirement id as endpoint id
          method: req.endpoint.method,
          correctPath: req.endpoint.correctPath,
          purpose: req.endpoint.purpose,
          required: req.required,
          solutions: req.solutions, // Use requirement's solutions for textarea content
        });
      }
    }

    return {
      stepId: "api",
      stepName: "API Design",
      topics: buildTopics({
        requirements: api.requirements as BaseRequirement[],
      }),
      endpointRequirements,
    };
  },
};

async function getStepConfig(slug: string, stepId: SupportedIterativeStep): Promise<StepConfig> {
  // Load and cache the scoring config for this slug
  if (!SCORING_CONFIG_CACHE[slug]) {
    const config = await loadScoringConfig(slug);
    if (!config) {
      throw new Error(`Scoring config not found for slug: ${slug}`);
    }
    SCORING_CONFIG_CACHE[slug] = config;
  }
  const scoringConfig = SCORING_CONFIG_CACHE[slug];

  // Initialize step cache for this slug if needed
  if (!STEP_CONFIG_CACHE[slug]) {
    STEP_CONFIG_CACHE[slug] = {};
  }

  // Build and cache step config
  if (!STEP_CONFIG_CACHE[slug][stepId]) {
    const builder = STEP_BUILDERS[stepId];
    if (!builder) {
      throw new Error(`Unsupported iterative feedback step: ${stepId}`);
    }
    STEP_CONFIG_CACHE[slug][stepId] = builder(scoringConfig);
  }

  const config = STEP_CONFIG_CACHE[slug][stepId];
  if (!config) {
    throw new Error(`Failed to build config for step: ${stepId}`);
  }
  return config;
}

function findTopic(step: StepConfig, topicId: string): Topic | undefined {
  return step.topics.find((topic) => topic.id === topicId);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IterativeFeedbackRequest =
  | {
      action: "get_feedback";
      slug: string;
      stepId: SupportedIterativeStep;
      userContent: string;
      previousQuestion?: string | null;
      attemptCount?: number;
    }
  | {
      action: "evaluate_revision";
      slug: string;
      stepId: SupportedIterativeStep;
      userContent: string;
      topicId: string;
      previousContent: string;
      previousQuestion: string;
    }
  | {
      action: "sharpen_question";
      slug: string;
      stepId: SupportedIterativeStep;
      userContent: string;
      topicId: string;
      previousQuestion?: string | null;
    };

export async function POST(request: NextRequest) {
  try {
    const body: IterativeFeedbackRequest = await request.json();

    // Validate slug is provided
    if (!body.slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

    if (body.action === "get_feedback") {
      const stepConfig = await getStepConfig(body.slug, body.stepId);
      logger.info("[API iterative-feedback] get_feedback request", {
        slug: body.slug,
        stepId: body.stepId,
        attemptCount: body.attemptCount,
        contentLength: body.userContent?.length ?? 0,
      });
      const result = await getIterativeFeedback(
        stepConfig,
        body.userContent,
        body.previousQuestion,
        body.attemptCount
      );
      return NextResponse.json(result);
    }

    if (body.action === "evaluate_revision") {
      const stepConfig = await getStepConfig(body.slug, body.stepId);
      const topic = findTopic(stepConfig, body.topicId);
      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }

      const evaluation = await evaluateRevision(
        stepConfig,
        topic,
        body.previousContent,
        body.userContent,
        body.previousQuestion
      );
      return NextResponse.json(evaluation);
    }

    if (body.action === "sharpen_question") {
      const stepConfig = await getStepConfig(body.slug, body.stepId);
      const topic = findTopic(stepConfig, body.topicId);
      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }

      const question = await generateSingleQuestion({
        step: stepConfig,
        topic,
        userContent: body.userContent,
        previousQuestion: body.previousQuestion,
      });
      return NextResponse.json(question);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process iterative feedback";
    const isRateLimited = message.toLowerCase().includes("quota") || message.includes("429");

    logger.error("Iterative feedback API error:", error);

    if (isRateLimited) {
      return NextResponse.json(
        { error: "Gemini is rate limited right now. Please wait a few seconds and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
