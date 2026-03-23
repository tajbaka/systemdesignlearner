import { NextRequest, NextResponse } from "next/server";
import { db, problems, problemVersions, userProblems, userProblemSteps } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import { ensureUserProblem } from "@/app/api/v2/practice/(services)/user-problem";
import { z } from "zod";

export const runtime = "nodejs";

// ============================================================================
// Step Type Validation
// ============================================================================

const VALID_STEPS = ["functional", "nonFunctional", "api", "highLevelDesign"] as const;
type StepType = (typeof VALID_STEPS)[number];

function isValidStep(step: string): step is StepType {
  return VALID_STEPS.includes(step as StepType);
}

// ============================================================================
// Request Schema
// ============================================================================

const SaveStepRequestSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

// ============================================================================
// PATCH /api/v2/practice/[slug]/[step]
// Saves user's step data for a specific problem step
// Works as both create and update in one - upsert operation
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; step: string }> }
) {
  try {
    // 1. Authenticate
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    // 2. Get and validate params
    const { slug, step } = await params;
    if (!isValidStep(step)) {
      return NextResponse.json(
        {
          error: "Invalid step type",
          details: { step, validSteps: VALID_STEPS },
        },
        { status: 400 }
      );
    }

    const stepType: StepType = step;

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = SaveStepRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { data } = parseResult.data;

    // 4. Fetch the problem by slug
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    // 5. Fetch the current problem version
    const currentVersion = await db.query.problemVersions.findFirst({
      where: and(eq(problemVersions.problemId, problem.id), eq(problemVersions.isCurrent, true)),
    });

    if (!currentVersion) {
      return NextResponse.json(
        { error: "Problem version not found", details: { problemId: problem.id } },
        { status: 404 }
      );
    }

    // 6. Get or create user problem record
    const now = new Date();
    const userProblem = await ensureUserProblem({
      userId: profile.id,
      problemId: problem.id,
      problemVersionId: currentVersion.id,
      now,
    });

    // 7. Get or create user problem step record
    const userProblemStep = await db.query.userProblemSteps.findFirst({
      where: eq(userProblemSteps.userProblemId, userProblem.id),
    });

    let updatedStep;

    if (userProblemStep) {
      // Update existing step - overwrite data for this stepType
      const existingData = (userProblemStep.data as Record<string, unknown>) || {};
      const [updated] = await db
        .update(userProblemSteps)
        .set({
          data: {
            ...existingData,
            [stepType]: {
              data,
              status: "in_progress",
              updatedAt: now.toISOString(),
            },
          },
          updatedAt: now,
        })
        .where(eq(userProblemSteps.id, userProblemStep.id))
        .returning();
      updatedStep = updated;
    } else {
      // Create new step
      const [created] = await db
        .insert(userProblemSteps)
        .values({
          userProblemId: userProblem.id,
          status: "in_progress",
          data: {
            [stepType]: {
              data,
              status: "in_progress",
              updatedAt: now.toISOString(),
            },
          },
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      updatedStep = created;
    }

    // 8. Update userProblem timestamp
    await db
      .update(userProblems)
      .set({ updatedAt: now })
      .where(eq(userProblems.id, userProblem.id));

    // 9. Return response
    const response = {
      success: true,
      step: {
        id: updatedStep.id,
        stepType,
        data,
        status: "in_progress",
        updatedAt: now.toISOString(),
      },
    };

    logger.info("PATCH /api/v2/practice/[slug]/[step] - Response sent", { data: response });
    return NextResponse.json(response);
  } catch (error) {
    logger.error("PATCH /api/v2/practice/[slug]/[step] - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
