import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import { db, problems, problemVersions, userProblems, userProblemSteps } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
  GetSessionQuerySchema,
  UpdateSessionRequestSchema,
  type GetSessionResponse,
  type UpdateSessionResponse,
  type StepRecord,
  STEP_TYPES,
} from "@/domains/practice/lib/schemas/step-data";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/session
// Retrieves user's session and step data for a specific problem
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const scenarioSlug = searchParams.get("scenarioSlug");

    const parseResult = GetSessionQuerySchema.safeParse({ scenarioSlug });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { scenarioSlug: slug } = parseResult.data;

    // 3. Fetch the problem by slug
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    // 4. Fetch user problem record with steps
    const userProblem = await db.query.userProblems.findFirst({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
      with: {
        steps: true,
      },
    });

    // 5. Transform step data into response format
    const steps: Record<string, StepRecord> = {};
    let maxVisitedStep = 0;
    let currentStepType = "intro";

    if (userProblem) {
      const userProblemStep = userProblem.steps?.[0];
      if (userProblemStep) {
        const stepData = (userProblemStep.data as Record<string, unknown>) || {};

        // Extract step data for each step type
        for (const stepType of STEP_TYPES) {
          const data = stepData[stepType] as Record<string, unknown> | undefined;
          if (data) {
            steps[stepType] = {
              id: `${userProblemStep.id}-${stepType}`,
              data: (data.data as Record<string, unknown>) || {},
              status: (data.status as "draft" | "submitted" | "evaluated") || "draft",
              updatedAt:
                (data.updatedAt as string) || userProblemStep.updatedAt?.toISOString() || "",
              submittedAt: (data.submittedAt as string) || null,
            };
          }
        }

        // Extract progress metadata
        const metadata = stepData._metadata as Record<string, unknown> | undefined;
        if (metadata) {
          maxVisitedStep = (metadata.maxVisitedStep as number) || 0;
          currentStepType = (metadata.currentStepType as string) || "intro";
        } else {
          // Infer from which steps have data
          for (let i = 0; i < STEP_TYPES.length; i++) {
            if (stepData[STEP_TYPES[i]]) {
              maxVisitedStep = i;
              currentStepType = STEP_TYPES[i];
            }
          }
        }
      }
    }

    // 6. Return response
    const response: GetSessionResponse = {
      session: userProblem
        ? {
            id: userProblem.id,
            maxVisitedStep,
            currentStepType,
            completedAt: userProblem.completedAt?.toISOString() ?? null,
          }
        : null,
      steps,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("GET /api/v2/practice/session error:", error);
    captureServerError(error, { route: "GET /api/v2/user" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/v2/practice/session
// Updates user's session progress (maxVisitedStep, currentStepType)
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized - please sign in" }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateSessionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { scenarioSlug, maxVisitedStep, currentStepType } = parseResult.data;

    // 3. Fetch the problem by slug
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, scenarioSlug),
    });

    if (!problem) {
      return NextResponse.json(
        { error: "Problem not found", details: { slug: scenarioSlug } },
        { status: 404 }
      );
    }

    // 4. Fetch the current problem version
    const currentVersion = await db.query.problemVersions.findFirst({
      where: and(eq(problemVersions.problemId, problem.id), eq(problemVersions.isCurrent, true)),
    });

    if (!currentVersion) {
      return NextResponse.json(
        { error: "Problem version not found", details: { problemId: problem.id } },
        { status: 404 }
      );
    }

    // 5. Get or create user problem record
    let userProblem = await db.query.userProblems.findFirst({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
    });

    const now = new Date();

    if (!userProblem) {
      const [created] = await db
        .insert(userProblems)
        .values({
          userId: profile.id,
          problemId: problem.id,
          problemVersionId: currentVersion.id,
          status: "in_progress",
        })
        .returning();
      userProblem = created;
    }

    // 6. Get or create user problem step to store metadata
    const userProblemStep = await db.query.userProblemSteps.findFirst({
      where: eq(userProblemSteps.userProblemId, userProblem.id),
    });

    const newMetadata = {
      maxVisitedStep: maxVisitedStep ?? 0,
      currentStepType: currentStepType ?? "intro",
    };

    if (userProblemStep) {
      const existingData = (userProblemStep.data as Record<string, unknown>) || {};
      await db
        .update(userProblemSteps)
        .set({
          data: {
            ...existingData,
            _metadata: {
              ...((existingData._metadata as Record<string, unknown>) || {}),
              ...newMetadata,
            },
          },
          updatedAt: now,
        })
        .where(eq(userProblemSteps.id, userProblemStep.id));
    } else {
      await db.insert(userProblemSteps).values({
        userProblemId: userProblem.id,
        status: "in_progress",
        data: { _metadata: newMetadata },
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Update userProblem timestamp
    await db
      .update(userProblems)
      .set({ updatedAt: now })
      .where(eq(userProblems.id, userProblem.id));

    // 8. Return response
    const response: UpdateSessionResponse = {
      success: true,
      session: {
        id: userProblem.id,
        maxVisitedStep: newMetadata.maxVisitedStep,
        currentStepType: newMetadata.currentStepType,
        updatedAt: now.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("PATCH /api/v2/practice/session error:", error);
    captureServerError(error, { route: "PATCH /api/v2/user" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } //
}
