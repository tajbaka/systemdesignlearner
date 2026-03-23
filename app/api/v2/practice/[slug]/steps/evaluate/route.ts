import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/[slug]/steps/evaluate
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Authenticate
    const profile = await userController.getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Call controller
    const result = await practiceController.getScores(profile.id, slug);

    // 3. Handle result
    if (!result.allowed) {
      if (result.error === "Problem not found") {
        return NextResponse.json({ error: result.error, details: { slug } }, { status: 404 });
      }
      if (result.error === "User problem not found") {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: "Access denied", message: result.error }, { status: 403 });
    }

    logger.info("GET /api/v2/practice/[slug]/steps/evaluate - Success", { slug });
    return NextResponse.json({ stepScores: result.stepScores });
  } catch (error) {
    logger.error("GET /api/v2/practice/[slug]/steps/evaluate - Error:", error);
    captureServerError(error, { route: "GET /api/v2/practice/[slug]/steps/evaluate" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
