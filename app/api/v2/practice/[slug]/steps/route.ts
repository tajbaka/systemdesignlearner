import { NextRequest, NextResponse } from "next/server";
import { db, problems, problemSteps, userProblems, userProblemSteps } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/[slug]/steps
// Retrieves problem steps for a specific problem with optional user progress
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    // 1. Fetch problem by slug
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    // 2. Fetch problem steps
    const steps = await db.query.problemSteps.findMany({
      where: eq(problemSteps.problemId, problem.id),
      orderBy: (steps, { asc }) => [asc(steps.order)],
    });

    // 3. Optionally fetch user problem steps (if authenticated)
    let userProblemStepData = null;
    const profile = await getProfile();

    if (profile) {
      const userProblem = await db.query.userProblems.findFirst({
        where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
      });

      if (userProblem) {
        userProblemStepData = await db.query.userProblemSteps.findFirst({
          where: eq(userProblemSteps.userProblemId, userProblem.id),
        });
      }
    }

    // 4. Transform steps to include user step data
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

      if (userProblemStepData) {
        const stepData = (userProblemStepData.data as Record<string, unknown>) || {};
        const userStepData = stepData[step.stepType] as
          | {
              data?: unknown;
              status?: string;
              updatedAt?: string;
              submittedAt?: string | null;
            }
          | undefined;

        if (userStepData) {
          userStep = {
            id: userProblemStepData.id,
            userProblemId: userProblemStepData.userProblemId,
            status: userStepData.status as "in_progress" | "completed",
            data: (userStepData.data as Record<string, unknown>) || null,
            createdAt: userProblemStepData.createdAt?.toISOString() || "",
            completedAt: userProblemStepData.completedAt?.toISOString() || null,
            updatedAt: userProblemStepData.updatedAt?.toISOString() || "",
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
        userStep: userStep,
      };
    });

    // 5. Return response
    logger.info("GET /api/v2/practice/[slug]/steps - Response sent", { data: stepsWithUserStep });
    return NextResponse.json({
      data: stepsWithUserStep,
    });
  } catch (error) {
    logger.error("GET /api/v2/practice/[slug]/steps - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
