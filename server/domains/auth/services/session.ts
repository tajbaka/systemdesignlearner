import { db, problems, problemVersions, userProblems, userProblemSteps } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import type { GetSessionResponse, StepRecord } from "@/domains/practice/lib/schemas/step-data";
import { STEP_TYPES } from "@/domains/practice/lib/schemas/step-data";

/**
 * Fetch a user's session and step data for a given problem slug.
 */
export async function getSession(userId: string, slug: string): Promise<GetSessionResponse | null> {
  const problem = await db.query.problems.findFirst({
    where: eq(problems.slug, slug),
  });

  if (!problem) return null;

  const userProblem = await db.query.userProblems.findFirst({
    where: and(eq(userProblems.userId, userId), eq(userProblems.problemId, problem.id)),
    with: {
      steps: true,
    },
  });

  const steps: Record<string, StepRecord> = {};
  let maxVisitedStep = 0;
  let currentStepType = "intro";

  if (userProblem) {
    const userProblemStep = userProblem.steps?.[0];
    if (userProblemStep) {
      const stepData = (userProblemStep.data as Record<string, unknown>) || {};

      for (const stepType of STEP_TYPES) {
        const data = stepData[stepType] as Record<string, unknown> | undefined;
        if (data) {
          steps[stepType] = {
            id: `${userProblemStep.id}-${stepType}`,
            data: (data.data as Record<string, unknown>) || {},
            status: (data.status as "draft" | "submitted" | "evaluated") || "draft",
            updatedAt: (data.updatedAt as string) || userProblemStep.updatedAt?.toISOString() || "",
            submittedAt: (data.submittedAt as string) || null,
          };
        }
      }

      const metadata = stepData._metadata as Record<string, unknown> | undefined;
      if (metadata) {
        maxVisitedStep = (metadata.maxVisitedStep as number) || 0;
        currentStepType = (metadata.currentStepType as string) || "intro";
      } else {
        for (let i = 0; i < STEP_TYPES.length; i++) {
          if (stepData[STEP_TYPES[i]]) {
            maxVisitedStep = i;
            currentStepType = STEP_TYPES[i];
          }
        }
      }
    }
  }

  return {
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
}

export type UpdateSessionParams = {
  userId: string;
  scenarioSlug: string;
  maxVisitedStep?: number;
  currentStepType?: string;
};

export type UpdateSessionResult = {
  id: string;
  maxVisitedStep: number;
  currentStepType: string;
  updatedAt: string;
} | null;

/**
 * Update a user's session metadata (maxVisitedStep, currentStepType).
 */
export async function updateSession(params: UpdateSessionParams): Promise<UpdateSessionResult> {
  const { userId, scenarioSlug, maxVisitedStep, currentStepType } = params;

  const problem = await db.query.problems.findFirst({
    where: eq(problems.slug, scenarioSlug),
  });

  if (!problem) return null;

  const currentVersion = await db.query.problemVersions.findFirst({
    where: and(eq(problemVersions.problemId, problem.id), eq(problemVersions.isCurrent, true)),
  });

  if (!currentVersion) return null;

  // Get or create user problem
  let userProblem = await db.query.userProblems.findFirst({
    where: and(eq(userProblems.userId, userId), eq(userProblems.problemId, problem.id)),
  });

  const now = new Date();

  if (!userProblem) {
    const [created] = await db
      .insert(userProblems)
      .values({
        userId,
        problemId: problem.id,
        problemVersionId: currentVersion.id,
        status: "in_progress",
      })
      .returning();
    userProblem = created;
  }

  // Get or create user problem step to store metadata
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

  // Update userProblem timestamp
  await db.update(userProblems).set({ updatedAt: now }).where(eq(userProblems.id, userProblem.id));

  return {
    id: userProblem.id,
    maxVisitedStep: newMetadata.maxVisitedStep,
    currentStepType: newMetadata.currentStepType,
    updatedAt: now.toISOString(),
  };
}
