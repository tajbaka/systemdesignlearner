import {
  db,
  problems,
  problemVersions,
  problemSteps,
  userProblems,
  userProblemSteps,
} from "@/packages/drizzle";
import { eq, and, inArray, count } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type ProblemWithVersion = {
  id: string;
  slug: string;
  category: string;
  versions: Array<{
    id: string;
    title: string | null;
    description: string | null;
    difficulty: "easy" | "medium" | "hard" | null;
    timeToComplete: string | null;
    topic: string | null;
    links: unknown;
    versionNumber: number;
  }>;
};

export type ProblemStep = {
  id: string;
  problemId: string;
  title: string;
  description: string | null;
  stepType: string;
  order: number;
  required: boolean;
  scoreWeight: number;
  data: unknown;
};

export type ProblemListItem = {
  id: string;
  slug: string;
  category: string;
  title: string | null;
  description: string | null;
  difficulty: string | null;
  timeToComplete: string | null;
  topic: string | null;
  links: unknown;
  status: "in_progress" | "completed" | null;
  totalSteps: number | null;
  completedSteps: number | null;
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch a problem by slug with its current version.
 */
export async function findBySlug(slug: string): Promise<ProblemWithVersion | null> {
  const problem = await db.query.problems.findFirst({
    where: eq(problems.slug, slug),
    with: {
      versions: {
        where: eq(problemVersions.isCurrent, true),
        limit: 1,
      },
    },
  });

  return problem as ProblemWithVersion | null;
}

/**
 * Fetch all steps for a problem, ordered by sequence.
 */
export async function getSteps(problemId: string): Promise<ProblemStep[]> {
  const steps = await db.query.problemSteps.findMany({
    where: eq(problemSteps.problemId, problemId),
    orderBy: (steps, { asc }) => [asc(steps.order)],
  });

  return steps as ProblemStep[];
}

/**
 * List all problems with current versions and optional user progress.
 */
export async function listProblemsWithProgress(userId?: string): Promise<ProblemListItem[]> {
  // 1. Get problem IDs that have current versions
  const problemIdsWithCurrentVersion = await db
    .selectDistinct({ problemId: problemVersions.problemId })
    .from(problemVersions)
    .where(eq(problemVersions.isCurrent, true));

  const validProblemIds = problemIdsWithCurrentVersion.map((r) => r.problemId);

  if (validProblemIds.length === 0) {
    return [];
  }

  // 2. Fetch problems with current versions
  const problemsWithVersions = await db.query.problems.findMany({
    where: inArray(problems.id, validProblemIds),
    with: {
      versions: {
        where: eq(problemVersions.isCurrent, true),
        limit: 1,
      },
    },
  });

  // 3. Total steps per problem
  const stepCounts = await db
    .select({
      problemId: problemSteps.problemId,
      total: count(problemSteps.id),
    })
    .from(problemSteps)
    .where(inArray(problemSteps.problemId, validProblemIds))
    .groupBy(problemSteps.problemId);

  const totalStepsMap = new Map<string, number>();
  for (const row of stepCounts) {
    totalStepsMap.set(row.problemId, row.total);
  }

  // 4. Optionally fetch user progress (for current versions only)
  const statusMap = new Map<string, "in_progress" | "completed">();
  const completedStepsMap = new Map<string, number>();

  if (userId) {
    // Build map of problemId -> currentVersionId
    const currentVersionIds = problemsWithVersions.map((p) => p.versions[0]?.id).filter(Boolean);

    if (currentVersionIds.length > 0) {
      const userProblemsData = await db.query.userProblems.findMany({
        where: and(
          eq(userProblems.userId, userId),
          inArray(userProblems.problemVersionId, currentVersionIds)
        ),
      });

      for (const up of userProblemsData) {
        statusMap.set(up.problemId, up.status);
      }

      const completedStepCounts = await db
        .select({
          problemId: userProblems.problemId,
          completedCount: count(userProblemSteps.id),
        })
        .from(userProblemSteps)
        .innerJoin(userProblems, eq(userProblemSteps.userProblemId, userProblems.id))
        .where(
          and(
            eq(userProblems.userId, userId),
            inArray(userProblems.problemVersionId, currentVersionIds),
            eq(userProblemSteps.status, "completed")
          )
        )
        .groupBy(userProblems.problemId);

      for (const row of completedStepCounts) {
        completedStepsMap.set(row.problemId, row.completedCount);
      }
    }
  }

  // 5. Build response
  return problemsWithVersions.map((problem) => {
    const currentVersion = problem.versions[0];
    const status = statusMap.get(problem.id) ?? null;
    return {
      id: problem.id,
      slug: problem.slug,
      category: problem.category,
      title: currentVersion.title,
      description: currentVersion.description,
      difficulty: currentVersion.difficulty,
      timeToComplete: currentVersion.timeToComplete,
      topic: currentVersion.topic,
      links: currentVersion.links,
      status,
      totalSteps: totalStepsMap.get(problem.id) ?? null,
      completedSteps:
        status === "completed"
          ? (totalStepsMap.get(problem.id) ?? null)
          : status !== null
            ? (completedStepsMap.get(problem.id) ?? 0)
            : null,
    };
  });
}
