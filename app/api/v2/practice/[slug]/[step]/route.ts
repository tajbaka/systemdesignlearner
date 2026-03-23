import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";
import { isValidStep } from "@/server/domains/practice/services/user-problem";
import type { StepType } from "@/server/domains/practice/services/user-problem";

export const runtime = "nodejs";

const SaveStepRequestSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; step: string }> }
) {
  try {
    const profile = await userController.getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    const { slug, step } = await params;
    if (!isValidStep(step)) {
      return NextResponse.json({ error: "Invalid step type", details: { step } }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = SaveStepRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const result = await practiceController.saveStepData(
      profile.id,
      slug,
      step as StepType,
      parseResult.data.data
    );

    if ("error" in result) {
      switch (result.error) {
        case "PROBLEM_NOT_FOUND":
          return NextResponse.json({ error: "Problem not found" }, { status: 404 });
        case "VERSION_NOT_FOUND":
          return NextResponse.json({ error: "Problem version not found" }, { status: 404 });
      }
    }

    logger.info("PATCH /api/v2/practice/[slug]/[step] - Success", { slug, step });
    return NextResponse.json({ success: true, step: result.data });
  } catch (error) {
    logger.error("PATCH /api/v2/practice/[slug]/[step] - Error:", error);
    captureServerError(error, { route: "PATCH /api/v2/practice/[slug]/[step]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
