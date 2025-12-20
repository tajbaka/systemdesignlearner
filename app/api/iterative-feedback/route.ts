import { NextRequest, NextResponse } from "next/server";
import {
  getIterativeFeedback,
  evaluateRevision,
  generateSingleQuestion,
  type StepConfig,
  type Topic,
} from "@/lib/scoring/ai/iterative";
import { logger } from "@/lib/logger";
import { loadScoringConfig } from "@/lib/scoring/index";
import type { ProblemScoringConfig } from "@/lib/scoring/types";

type SupportedIterativeStep = "functional" | "nonFunctional" | "api";

// Cache configs per slug to avoid repeated file reads
const SCORING_CONFIG_CACHE: Record<string, ProblemScoringConfig> = {};
const STEP_CONFIG_CACHE: Record<string, Partial<Record<SupportedIterativeStep, StepConfig>>> = {};

function buildFunctionalStepConfig(scoringConfig: ProblemScoringConfig): StepConfig {
  const functional = scoringConfig.steps.functional;
  const topics: (Topic & { examplePhrases?: string[] })[] = [
    ...functional.coreRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
      weight: req.weight,
      examplePhrases: req.examplePhrases,
    })),
    ...functional.optionalRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
      weight: req.weight,
      examplePhrases: req.examplePhrases,
    })),
  ];

  return {
    stepId: "functional",
    stepName: "Functional Requirements",
    topics,
  };
}

function buildNonFunctionalStepConfig(scoringConfig: ProblemScoringConfig): StepConfig {
  const nonFunctional = scoringConfig.steps.nonFunctional;
  const coreReqs = nonFunctional.coreRequirements ?? [];
  const optionalReqs = nonFunctional.optionalRequirements ?? [];

  const topics: (Topic & { examplePhrases?: string[] })[] = [
    ...coreReqs.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
      weight: req.weight,
      examplePhrases: req.examplePhrases,
    })),
    ...optionalReqs.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
      weight: req.weight,
      examplePhrases: req.examplePhrases,
    })),
  ];

  return {
    stepId: "nonFunctional",
    stepName: "Non-Functional Requirements",
    topics,
  };
}

function buildApiStepConfig(scoringConfig: ProblemScoringConfig): StepConfig {
  const api = scoringConfig.steps.api;

  const topics: (Topic & { examplePhrases?: string[] })[] = [
    ...api.coreRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
      weight: req.weight,
      examplePhrases: req.examplePhrases,
    })),
    ...api.optionalRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
      weight: req.weight,
      examplePhrases: req.examplePhrases,
    })),
  ];

  const endpointRequirements = [
    ...api.requiredEndpoints.map(
      (ep: (typeof api.requiredEndpoints)[number] & { exampleNotes?: string }) => ({
        id: ep.id,
        method: ep.method,
        examplePath: ep.examplePath,
        purpose: ep.purpose,
        documentationHints: ep.documentationHints,
        required: true,
        exampleNotes: ep.exampleNotes,
      })
    ),
    ...api.optionalEndpoints.map(
      (ep: (typeof api.optionalEndpoints)[number] & { exampleNotes?: string }) => ({
        id: ep.id,
        method: ep.method,
        examplePath: ep.examplePath,
        purpose: ep.purpose,
        documentationHints: ep.documentationHints,
        required: false,
        exampleNotes: ep.exampleNotes,
      })
    ),
  ];

  return {
    stepId: "api",
    stepName: "API Design",
    topics,
    endpointRequirements,
  };
}

async function getStepConfig(slug: string, stepId: SupportedIterativeStep): Promise<StepConfig> {
  // Load and cache the scoring config for this slug
  if (!SCORING_CONFIG_CACHE[slug]) {
    SCORING_CONFIG_CACHE[slug] = await loadScoringConfig(slug);
  }
  const scoringConfig = SCORING_CONFIG_CACHE[slug];

  // Initialize step cache for this slug if needed
  if (!STEP_CONFIG_CACHE[slug]) {
    STEP_CONFIG_CACHE[slug] = {};
  }

  // Build and cache step config
  if (!STEP_CONFIG_CACHE[slug][stepId]) {
    if (stepId === "functional") {
      STEP_CONFIG_CACHE[slug].functional = buildFunctionalStepConfig(scoringConfig);
    } else if (stepId === "nonFunctional") {
      STEP_CONFIG_CACHE[slug].nonFunctional = buildNonFunctionalStepConfig(scoringConfig);
    } else if (stepId === "api") {
      STEP_CONFIG_CACHE[slug].api = buildApiStepConfig(scoringConfig);
    }
  }

  const config = STEP_CONFIG_CACHE[slug][stepId];
  if (!config) {
    throw new Error(`Unsupported iterative feedback step: ${stepId}`);
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
      logger.info("[API iterative-feedback] get_feedback response", {
        blocking: result.ui.blocking,
        hasExampleHint: !!result.ui.exampleHint,
        attemptCount: body.attemptCount,
      });
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
