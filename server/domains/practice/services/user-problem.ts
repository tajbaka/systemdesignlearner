import { db, problems, problemSteps, userProblems, userProblemSteps } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { calculateMaxVisitedStep } from "@/domains/practice/utils/access-control";
import type { EvaluationResult, APIEvaluationResult } from "./evaluation/types";
import type { ProblemStep } from "./problem";

// ============================================================================
// Types
// ============================================================================

export const VALID_STEPS = ["functional", "nonFunctional", "api", "highLevelDesign"] as const;
export type StepType = (typeof VALID_STEPS)[number];

export function isValidStep(step: string): step is StepType {
  return VALID_STEPS.includes(step as StepType);
}

export type UserProblemRecord = {
  id: string;
  userId: string;
  problemId: string;
  problemVersionId: string;
  status: "in_progress" | "completed";
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};

export type UserProblemStepRecord = {
  id: string;
  userProblemId: string;
  status: "in_progress" | "completed";
  data: Record<string, unknown> | null;
  createdAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date | null;
};

export type SaveStepResult = {
  id: string;
  stepType: StepType;
  data: Record<string, unknown>;
  status: string;
  updatedAt: string;
};

export type UpdateStepEvaluationParams = {
  userId: string;
  problemId: string;
  versionId: string;
  stepType: StepType;
  evaluation: EvaluationResult | APIEvaluationResult;
  earnedScore: number;
  maxScore: number;
  allSteps: ProblemStep[];
};

export type AccessCheckResult = {
  allowed: boolean;
  maxVisitedStep: number;
  targetStepOrder: number;
};

export type EvaluateParams = {
  userId: string;
  userEmail?: string;
  slug: string;
  stepType: StepType;
  input: unknown;
  previousExtractions?: {
    version: number;
    data: Record<string, unknown>;
  };
  changedEndpointIds?: string[];
};

export type StepScore = {
  stepType: string;
  title: string;
  order: number;
  score: number;
  maxScore: number;
  completed: boolean;
};

export type ScoreResult = {
  allowed: boolean;
  stepScores: StepScore[];
  error?: string;
};

// ============================================================================
// User Problem Functions
// ============================================================================

/**
 * Find or create a user problem record.
 */
export async function getOrCreateUserProblem(
  userId: string,
  problemId: string,
  versionId: string
): Promise<UserProblemRecord> {
  const existing = await db.query.userProblems.findFirst({
    where: and(eq(userProblems.userId, userId), eq(userProblems.problemId, problemId)),
  });

  if (existing) return existing as unknown as UserProblemRecord;

  const [created] = await db
    .insert(userProblems)
    .values({
      userId,
      problemId,
      problemVersionId: versionId,
      status: "in_progress",
    })
    .returning();

  return created as unknown as UserProblemRecord;
}

/**
 * Find or create a user problem step record (the single JSONB row per user-problem).
 */
export async function getOrCreateUserProblemSteps(
  userProblemId: string
): Promise<UserProblemStepRecord> {
  const existing = await db.query.userProblemSteps.findFirst({
    where: eq(userProblemSteps.userProblemId, userProblemId),
  });

  if (existing) return existing as unknown as UserProblemStepRecord;

  const now = new Date();
  const [created] = await db
    .insert(userProblemSteps)
    .values({
      userProblemId,
      status: "in_progress",
      data: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created as unknown as UserProblemStepRecord;
}

/**
 * Save user's step data (JSONB merge for a specific step type).
 */
export async function saveStepData(
  userProblemId: string,
  stepType: StepType,
  data: Record<string, unknown>
): Promise<SaveStepResult> {
  const userProblemStep = await db.query.userProblemSteps.findFirst({
    where: eq(userProblemSteps.userProblemId, userProblemId),
  });

  const now = new Date();
  let updatedStep;

  if (userProblemStep) {
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
    const [created] = await db
      .insert(userProblemSteps)
      .values({
        userProblemId,
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

  return {
    id: updatedStep.id,
    stepType,
    data,
    status: "in_progress",
    updatedAt: now.toISOString(),
  };
}

/**
 * Update step evaluation results, mark completion, and update problem status.
 */
export async function updateStepEvaluation(params: UpdateStepEvaluationParams): Promise<void> {
  const { userId, problemId, versionId, stepType, evaluation, earnedScore, maxScore, allSteps } =
    params;

  const isStepCompleted = earnedScore === maxScore;
  const now = new Date();

  // Get or create user problem
  const userProblemRecord = await getOrCreateUserProblem(userId, problemId, versionId);

  // Get or create user problem step
  const userProblemStepRecord = await db.query.userProblemSteps.findFirst({
    where: eq(userProblemSteps.userProblemId, userProblemRecord.id),
  });

  const currentStepUpdate = {
    evaluation,
    evaluatedAt: now.toISOString(),
    earnedScore,
    maxScore,
    status: isStepCompleted ? "completed" : "in_progress",
  };

  let updatedStepData: Record<string, unknown>;

  if (userProblemStepRecord) {
    const existingData = (userProblemStepRecord.data as Record<string, unknown>) || {};
    updatedStepData = {
      ...existingData,
      [stepType]: {
        ...((existingData[stepType] as Record<string, unknown>) || {}),
        ...currentStepUpdate,
      },
    };

    await db
      .update(userProblemSteps)
      .set({
        data: updatedStepData,
        status: isStepCompleted ? "completed" : userProblemStepRecord.status,
        completedAt: isStepCompleted ? now : userProblemStepRecord.completedAt,
        updatedAt: now,
      })
      .where(eq(userProblemSteps.id, userProblemStepRecord.id));
  } else {
    updatedStepData = {
      [stepType]: currentStepUpdate,
    };

    await db.insert(userProblemSteps).values({
      userProblemId: userProblemRecord.id,
      status: isStepCompleted ? "completed" : "in_progress",
      data: updatedStepData,
      completedAt: isStepCompleted ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Check if ALL steps are completed
  const isProblemCompleted = allSteps.every((step) => {
    const stepData = updatedStepData[step.stepType] as { status?: string } | undefined;
    return stepData?.status === "completed";
  });

  // Update userProblem timestamp and status
  await db
    .update(userProblems)
    .set({
      updatedAt: now,
      status: isProblemCompleted ? "completed" : "in_progress",
      completedAt: isProblemCompleted ? now : null,
    })
    .where(eq(userProblems.id, userProblemRecord.id));
}

/**
 * Get user's step data for a problem (by stable problem id).
 * Slug resolution belongs on the problem side; callers pass `problem.id` after `findBySlug`.
 */
export async function getStepData(
  userId: string,
  problemId: string
): Promise<UserProblemStepRecord | null> {
  const userProblem = await db.query.userProblems.findFirst({
    where: and(eq(userProblems.userId, userId), eq(userProblems.problemId, problemId)),
  });

  if (!userProblem) return null;

  const step = await db.query.userProblemSteps.findFirst({
    where: eq(userProblemSteps.userProblemId, userProblem.id),
  });

  return (step as unknown as UserProblemStepRecord) ?? null;
}

/**
 * Update the userProblem timestamp.
 */
export async function touchUserProblem(userProblemId: string): Promise<void> {
  await db
    .update(userProblems)
    .set({ updatedAt: new Date() })
    .where(eq(userProblems.id, userProblemId));
}

// ============================================================================
// Access Control Functions
// ============================================================================

/**
 * Check if a user has access to a given step based on sequential completion.
 */
export async function checkStepAccess(
  userId: string,
  problemId: string,
  targetStepOrder: number
): Promise<AccessCheckResult> {
  const allSteps = await db.query.problemSteps.findMany({
    where: eq(problemSteps.problemId, problemId),
    orderBy: (steps, { asc }) => [asc(steps.order)],
  });

  const userProblemStepData = await getStepData(userId, problemId);

  if (!userProblemStepData) {
    return {
      allowed: targetStepOrder <= 0,
      maxVisitedStep: 0,
      targetStepOrder,
    };
  }

  const stepData = (userProblemStepData.data as Record<string, unknown>) || {};

  const maxVisitedStep = calculateMaxVisitedStep(allSteps, (step) => {
    const userStepData = stepData[step.stepType] as { status?: string } | undefined;
    return userStepData?.status === "completed";
  });

  return {
    allowed: targetStepOrder <= maxVisitedStep,
    maxVisitedStep,
    targetStepOrder,
  };
}

// ============================================================================
// Score Functions
// ============================================================================

/**
 * Calculate scores for all steps of a problem.
 * Enforces access control — user must have completed all steps to view scores.
 */
export async function calculateScores(userId: string, slug: string): Promise<ScoreResult> {
  const problem = await db.query.problems.findFirst({
    where: eq(problems.slug, slug),
  });

  if (!problem) {
    return { allowed: false, stepScores: [], error: "Problem not found" };
  }

  const userProblem = await db.query.userProblems.findFirst({
    where: and(eq(userProblems.userId, userId), eq(userProblems.problemId, problem.id)),
  });

  if (!userProblem) {
    return { allowed: false, stepScores: [], error: "User problem not found" };
  }

  const steps = await db.query.problemSteps.findMany({
    where: eq(problemSteps.problemId, problem.id),
    orderBy: (steps, { asc }) => [asc(steps.order)],
  });

  const userProblemStepData = await db.query.userProblemSteps.findFirst({
    where: eq(userProblemSteps.userProblemId, userProblem.id),
  });

  const stepData = (userProblemStepData?.data as Record<string, unknown>) || {};

  let highestCompletedOrder = -1;
  for (const step of steps) {
    const userStepData = stepData[step.stepType] as { status?: string } | undefined;
    if (userStepData?.status === "completed") {
      highestCompletedOrder = Math.max(highestCompletedOrder, step.order);
    }
  }

  const maxVisitedStep = highestCompletedOrder + 1;
  const scoreStepOrder = Math.max(...steps.map((s) => s.order)) + 1;

  if (scoreStepOrder > maxVisitedStep) {
    return {
      allowed: false,
      stepScores: [],
      error: "You must complete all steps before viewing the score page",
    };
  }

  const stepScores: StepScore[] = steps.map((step) => {
    const userStepData = stepData[step.stepType] as
      | { status?: string; earnedScore?: number }
      | undefined;

    return {
      stepType: step.stepType,
      title: step.title,
      order: step.order,
      score: userStepData?.earnedScore ?? 0,
      maxScore: step.scoreWeight,
      completed: userStepData?.status === "completed",
    };
  });

  return { allowed: true, stepScores };
}
