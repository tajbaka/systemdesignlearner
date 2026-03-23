import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { userController } from "@/server/domains/auth/controller";
import {
  GetSessionQuerySchema,
  UpdateSessionRequestSchema,
  type UpdateSessionResponse,
} from "@/domains/practice/lib/schemas/step-data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const profile = await userController.getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scenarioSlug = searchParams.get("scenarioSlug");

    const parseResult = GetSessionQuerySchema.safeParse({ scenarioSlug });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const result = await userController.getSession(profile.id, parseResult.data.scenarioSlug);

    if ("error" in result) {
      return NextResponse.json(
        { error: "Problem not found", details: { slug: parseResult.data.scenarioSlug } },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    logger.error("GET /api/v2/user - Error:", error);
    captureServerError(error, { route: "GET /api/v2/user" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await userController.getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = UpdateSessionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { scenarioSlug, maxVisitedStep, currentStepType } = parseResult.data;

    const result = await userController.updateSession({
      userId: profile.id,
      scenarioSlug,
      maxVisitedStep,
      currentStepType,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: "Problem not found", details: { slug: scenarioSlug } },
        { status: 404 }
      );
    }

    const response: UpdateSessionResponse = {
      success: true,
      session: result.data,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("PATCH /api/v2/user - Error:", error);
    captureServerError(error, { route: "PATCH /api/v2/user" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
