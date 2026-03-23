import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";
import type { GetProblemsResponse, ProblemLink } from "./schemas";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice
// ============================================================================

export async function GET() {
  try {
    const profile = await userController.getProfile();
    const data = await practiceController.listProblems(profile?.id);

    const response: GetProblemsResponse = {
      data: data.map((p) => ({
        ...p,
        links: p.links as ProblemLink[] | null,
        category: p.category as "backend" | "frontend",
        difficulty: p.difficulty as "easy" | "medium" | "hard" | null,
      })),
    };

    logger.info("GET /api/v2/practice - Success", { count: response.data.length });
    return NextResponse.json(response);
  } catch (error) {
    logger.error("GET /api/v2/practice - Error:", error);
    captureServerError(error, { route: "GET /api/v2/practice" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
