import { NextRequest, NextResponse } from "next/server";
import { db, problems, problemSteps, userProblems, userProblemSteps } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/[slug]/steps/evaluate
// Calculates total score for user's completed problem steps
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    // 1. Get authenticated user
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch problem by slug
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    // 3. Fetch user's problem progress
    const userProblem = await db.query.userProblems.findFirst({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
    });

    if (!userProblem) {
      return NextResponse.json({ error: "User problem not found" }, { status: 404 });
    }

    // 4. Fetch problem steps with their score weights
    const steps = await db.query.problemSteps.findMany({
      where: eq(problemSteps.problemId, problem.id),
      orderBy: (steps, { asc }) => [asc(steps.order)],
    });

    // 5. Fetch user's problem step data
    const userProblemStepData = await db.query.userProblemSteps.findFirst({
      where: eq(userProblemSteps.userProblemId, userProblem.id),
    });

    // 6. Check access control - calculate maxVisitedStep
    const stepData = (userProblemStepData?.data as Record<string, unknown>) || {};
    let highestCompletedOrder = -1;

    for (const step of steps) {
      const userStepData = stepData[step.stepType] as { status?: string } | undefined;
      if (userStepData?.status === "completed") {
        highestCompletedOrder = Math.max(highestCompletedOrder, step.order);
      }
    }

    const maxVisitedStep = highestCompletedOrder + 1;

    // Find the score step order (should be the last step)
    const scoreStepOrder = Math.max(...steps.map((s) => s.order)) + 1;

    // User can only access score page if they can access the score step
    if (scoreStepOrder > maxVisitedStep) {
      return NextResponse.json(
        {
          error: "Access denied",
          message: "You must complete all steps before viewing the score page",
          details: {
            scoreStepOrder,
            maxAllowedStep: maxVisitedStep,
          },
        },
        { status: 403 }
      );
    }

    // 7. Build step scores array
    const stepScores: Array<{
      stepType: string;
      title: string;
      order: number;
      score: number;
      maxScore: number;
      completed: boolean;
    }> = [];

    for (const step of steps) {
      const userStepData = stepData[step.stepType] as
        | {
            status?: string;
            earnedScore?: number;
          }
        | undefined;

      const isCompleted = !!(userStepData && userStepData.status === "completed");
      const earnedScore = userStepData?.earnedScore ?? 0;

      stepScores.push({
        stepType: step.stepType,
        title: step.title,
        order: step.order,
        score: earnedScore,
        maxScore: step.scoreWeight,
        completed: isCompleted,
      });
    }

    // 8. Return step scores
    logger.info("GET /api/v2/practice/[slug]/steps/evaluate - Response sent", { data: stepScores });
    return NextResponse.json({
      stepScores: stepScores,
    });
  } catch (error) {
    logger.error("GET /api/v2/practice/[slug]/steps/evaluate - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
