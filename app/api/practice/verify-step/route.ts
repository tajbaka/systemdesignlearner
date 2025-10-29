import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";
import {
  buildFunctionalPrompt,
  buildNonFunctionalPrompt,
  buildApiPrompt,
  parseVerificationResponse,
  type VerificationResult,
} from "@/lib/practice/verification";
import type { Requirements, ApiEndpoint } from "@/lib/practice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyRequestBody =
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
    };

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();

    let prompt: string;

    switch (body.step) {
      case "functional":
        prompt = buildFunctionalPrompt(body.summary, body.selectedFeatures);
        break;

      case "nonFunctional":
        prompt = buildNonFunctionalPrompt(
          body.notes,
          body.readRps,
          body.writeRps,
          body.p95RedirectMs,
          body.availability
        );
        break;

      case "api":
        prompt = buildApiPrompt(body.endpoints, body.selectedFeatures);
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
    console.error("Verification API error:", error);
    return NextResponse.json(
      {
        error: "Verification service failed. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
