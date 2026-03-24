import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { GeminiError } from "@/lib/gemini";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";
import { isValidStep } from "@/server/domains/practice/services/user-problem";
import type { StepType } from "@/server/domains/practice/services/user-problem";

export const runtime = "nodejs";

const EvaluateRequestSchema = z.object({
  input: z.unknown(),
  previousExtractions: z
    .object({
      version: z.number(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
  changedEndpointIds: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; step: string }> }
) {
  try {
    const profile = await userController.getProfile();

    const { slug, step } = await params;
    logger.info("POST /api/v2/practice/[slug]/[step]/evaluate", { slug, step });

    if (!isValidStep(step)) {
      return NextResponse.json({ error: "Invalid step type", details: { step } }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = EvaluateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { input, previousExtractions, changedEndpointIds } = parseResult.data;

    const result = await practiceController.evaluateStep(
      profile?.id ?? null,
      profile?.email ?? undefined,
      slug,
      step as StepType,
      input,
      previousExtractions,
      changedEndpointIds
    );

    if ("error" in result) {
      switch (result.error) {
        case "PROBLEM_NOT_FOUND":
          return NextResponse.json({ error: "Problem not found" }, { status: 404 });
        case "VERSION_NOT_FOUND":
          return NextResponse.json({ error: "Problem version not found" }, { status: 404 });
        case "STEP_NOT_FOUND":
          return NextResponse.json({ error: "Step not found" }, { status: 404 });
        case "ACCESS_DENIED":
          return NextResponse.json(
            {
              error: "Access denied",
              message: "You must complete previous steps before accessing this one",
              details: result.details,
            },
            { status: 403 }
          );
      }
    }

    logger.info("POST /api/v2/practice/[slug]/[step]/evaluate - Success", { data: result.data });
    return NextResponse.json(result.data);
  } catch (error) {
    logger.error("POST /api/v2/practice/[slug]/[step]/evaluate - Error:", error);
    captureServerError(error, { route: "POST /api/v2/practice/[slug]/[step]/evaluate" });

    if (error instanceof GeminiError) {
      switch (error.code) {
        case "RATE_LIMIT":
          return NextResponse.json(
            { error: "AI service is temporarily busy. Please try again.", retryable: true },
            { status: 503 }
          );
        case "TIMEOUT":
          return NextResponse.json(
            { error: "Evaluation timed out. Please try again.", retryable: true },
            { status: 504 }
          );
        case "UNAVAILABLE":
          return NextResponse.json(
            { error: "AI service is temporarily unavailable. Please try again.", retryable: true },
            { status: 503 }
          );
      }
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again.", retryable: true },
      { status: 500 }
    );
  }
}
