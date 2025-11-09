import { NextRequest, NextResponse } from "next/server";
import {
  getIterativeFeedback,
  evaluateRevision,
  generateSingleQuestion,
  type StepConfig,
  type Topic,
} from "@/lib/scoring/ai/iterative";
import { logger } from "@/lib/logger";
import scoringConfig from "@/lib/scoring/configs/url-shortener.json";

type SupportedIterativeStep = "functional" | "nonFunctional" | "api";

const STEP_CONFIG_CACHE: Partial<Record<SupportedIterativeStep, StepConfig>> = {};

function buildFunctionalStepConfig(): StepConfig {
  const functional = scoringConfig.steps.functional;
  const topics: Topic[] = [
    ...functional.coreRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
      weight: req.weight, // Use weight from config (core=5pts)
    })),
    ...functional.optionalRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
      weight: req.weight, // Use weight from config (optional=1pt)
    })),
  ];

  return {
    stepId: "functional",
    stepName: "Functional Requirements",
    topics,
  };
}

function buildNonFunctionalStepConfig(): StepConfig {
  const nonFunctional = scoringConfig.steps.nonFunctional;
  const topics: Topic[] = [
    ...nonFunctional.coreRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
      weight: req.weight, // Use weight from config
    })),
    ...nonFunctional.optionalRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
      weight: req.weight, // Use weight from config
    })),
  ];

  return {
    stepId: "nonFunctional",
    stepName: "Non-Functional Requirements",
    topics,
  };
}

function buildApiStepConfig(): StepConfig {
  const api = scoringConfig.steps.api;
  const topics: Topic[] = [
    ...api.coreRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: true,
      weight: req.weight,
    })),
    ...api.optionalRequirements.map((req) => ({
      id: req.id,
      label: req.label,
      description: req.description,
      keywords: req.keywords,
      required: false,
      weight: req.weight,
    })),
  ];

  return {
    stepId: "api",
    stepName: "API Design",
    topics,
  };
}

function getStepConfig(stepId: SupportedIterativeStep): StepConfig {
  if (!STEP_CONFIG_CACHE[stepId]) {
    if (stepId === "functional") {
      STEP_CONFIG_CACHE.functional = buildFunctionalStepConfig();
    } else if (stepId === "nonFunctional") {
      STEP_CONFIG_CACHE.nonFunctional = buildNonFunctionalStepConfig();
    } else if (stepId === "api") {
      STEP_CONFIG_CACHE.api = buildApiStepConfig();
    }
  }

  const config = STEP_CONFIG_CACHE[stepId];
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
      stepId: SupportedIterativeStep;
      userContent: string;
      previousQuestion?: string | null;
    }
  | {
      action: "evaluate_revision";
      stepId: SupportedIterativeStep;
      userContent: string;
      topicId: string;
      previousContent: string;
      previousQuestion: string;
    }
  | {
      action: "sharpen_question";
      stepId: SupportedIterativeStep;
      userContent: string;
      topicId: string;
      previousQuestion?: string | null;
    };

export async function POST(request: NextRequest) {
  try {
    const body: IterativeFeedbackRequest = await request.json();

    if (body.action === "get_feedback") {
      const stepConfig = getStepConfig(body.stepId);
      const result = await getIterativeFeedback(stepConfig, body.userContent, body.previousQuestion);
      return NextResponse.json(result);
    }

    if (body.action === "evaluate_revision") {
      const stepConfig = getStepConfig(body.stepId);
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
      const stepConfig = getStepConfig(body.stepId);
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

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
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
