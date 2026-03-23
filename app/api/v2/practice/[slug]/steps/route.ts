import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/[slug]/steps
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

    const { steps, userStepData } = result;

    // Transform steps to include user step data
    const stepsWithUserStep = steps.map((step) => {
      let userStep: {
        id: string;
        userProblemId: string;
        status: "in_progress" | "completed";
        data: Record<string, unknown> | null;
        createdAt: string;
        completedAt: string | null;
        updatedAt: string;
      } | null = null;

      if (userStepData) {
        const stepData = (userStepData.data as Record<string, unknown>) || {};
        const userStepDataForType = stepData[step.stepType] as
          | {
              data?: unknown;
              status?: string;
              updatedAt?: string;
              submittedAt?: string | null;
            }
          | undefined;

        if (userStepDataForType) {
          userStep = {
            id: userStepData.id,
            userProblemId: userStepData.userProblemId,
            status: userStepDataForType.status as "in_progress" | "completed",
            data: (userStepDataForType.data as Record<string, unknown>) || null,
            createdAt: userStepData.createdAt?.toISOString() || "",
            completedAt: userStepData.completedAt?.toISOString() || null,
            updatedAt: userStepData.updatedAt?.toISOString() || "",
          };
        }
      }

      return {
        id: step.id,
        problemId: step.problemId,
        slug,
        title: step.title,
        description: step.description,
        stepType: step.stepType,
        order: step.order,
        required: step.required,
        scoreWeight: step.scoreWeight,
        data: step.data,
        userStep,
      };
    });

    logger.info("GET /api/v2/practice/[slug]/steps - Success", { slug, count: steps.length });
    return NextResponse.json({ data: stepsWithUserStep });
  } catch (error) {
    logger.error("GET /api/v2/practice/[slug]/steps - Error:", error);
    captureServerError(error, { route: "GET /api/v2/practice/[slug]/steps" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
