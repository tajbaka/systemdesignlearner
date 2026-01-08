import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import {
  buildFunctionalPrompt,
  buildNonFunctionalPrompt,
  buildApiPrompt,
  parseVerificationResponse,
  type VerificationResult,
  type VerificationContext,
} from "@/lib/practice/verification";
import { loadScoringConfig } from "@/lib/scoring/index";
import { SCENARIOS } from "@/lib/scenarios";
import type { Requirements, ApiEndpoint } from "@/lib/practice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BaseRequestBody = {
  slug: string;
};

type VerifyRequestBody = BaseRequestBody &
  (
    | {
        step: "functional";
        summary: string;
        selectedFeatures: Requirements["functional"];
      }
    | {
        step: "nonFunctional";
        notes: string;
        readRps: number;
        writeRps: number;
        p95RedirectMs: number;
        availability: string;
      }
    | {
        step: "api";
        endpoints: ApiEndpoint[];
        selectedFeatures: Requirements["functional"];
      }
  );

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();
    const { slug } = body;

    // Validate slug
    const scenario = SCENARIOS.find((s) => s.id === slug && s.hasPractice);
    if (!scenario) {
      return NextResponse.json(
        { error: `Invalid or unsupported scenario: ${slug}` },
        { status: 400 }
      );
    }

    // Load scoring config as source of truth
    const scoringConfig = await loadScoringConfig(slug);

    const context: VerificationContext = {
      scenarioTitle: scenario.title,
      scoringConfig,
    };

    let prompt: string;

    switch (body.step) {
      case "functional":
        prompt = buildFunctionalPrompt(body.summary, body.selectedFeatures, context);
        break;

      case "nonFunctional":
        prompt = buildNonFunctionalPrompt(
          body.notes,
          body.readRps,
          body.writeRps,
          body.p95RedirectMs,
          body.availability,
          context
        );
        break;

      case "api":
        prompt = buildApiPrompt(body.endpoints, body.selectedFeatures, context);
        break;

      default:
        return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const verification: VerificationResult = parseVerificationResponse(text);

    return NextResponse.json(verification);
  } catch (error) {
    logger.error("Verification API error:", error);
    return NextResponse.json(
      {
        error: "Verification service failed. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
