import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";
import type { GetProblemResponse, ProblemLink } from "../schemas";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/[slug]
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const profile = await userController.getProfile();

    const result = await practiceController.getProblemDetail(slug, profile?.id);

    if (!result) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    const { problem, currentVersion, userStepData } = result;

    const response: GetProblemResponse = {
      data: {
        id: problem.id,
        slug: problem.slug,
        category: problem.category as "backend" | "frontend",
        title: currentVersion.title,
        description: currentVersion.description,
        difficulty: currentVersion.difficulty,
        timeToComplete: currentVersion.timeToComplete,
        topic: currentVersion.topic,
        links: currentVersion.links as ProblemLink[] | null,
        status: userStepData ? "in_progress" : null,
        totalSteps: null,
        completedSteps: null,
        versionNumber: currentVersion.versionNumber,
        userProblem: null, // Simplified - add if needed
      },
    };

    logger.info("GET /api/v2/practice/[slug] - Success", { slug });
    return NextResponse.json(response);
  } catch (error) {
    logger.error("GET /api/v2/practice/[slug] - Error:", error);
    captureServerError(error, { route: "GET /api/v2/practice/[slug]" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
