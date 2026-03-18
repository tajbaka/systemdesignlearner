import { NextResponse } from "next/server";
import {
  db,
  problems,
  problemVersions,
  problemSteps,
  userProblems,
  userProblemSteps,
} from "@/packages/drizzle";
import { eq, and, inArray, count } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import type { GetProblemsResponse, ProblemSimpleResponse, ProblemLink } from "./schemas";
import { captureServerError } from "@/lib/posthog-server";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice
// Retrieves all problems with their current versions and optional user progress
// ============================================================================

export async function GET() {
  try {
    // 1. Get problem IDs that have current versions (filter at DB level)
    const problemIdsWithCurrentVersion = await db
      .selectDistinct({ problemId: problemVersions.problemId })
      .from(problemVersions)
      .where(eq(problemVersions.isCurrent, true));

    const validProblemIds = problemIdsWithCurrentVersion.map((r) => r.problemId);

    if (validProblemIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch only problems that have current versions
    const problemsWithVersions = await db.query.problems.findMany({
      where: inArray(problems.id, validProblemIds),
      with: {
        versions: {
          where: eq(problemVersions.isCurrent, true),
          limit: 1,
        },
      },
    });

    // 3. Total steps per problem (for progress bar)
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

    // 4. Optionally fetch userProblems status (if authenticated)
    const profile = await getProfile();
    const statusMap = new Map<string, "in_progress" | "completed">();
    const completedStepsMap = new Map<string, number>();

    if (profile) {
      const problemIds = problemsWithVersions.map((p) => p.id);

      const userProblemsData = await db.query.userProblems.findMany({
        where: and(
          eq(userProblems.userId, profile.id),
          inArray(userProblems.problemId, problemIds)
        ),
      });

      for (const up of userProblemsData) {
        statusMap.set(up.problemId, up.status);
      }

      // Completed steps per user (for progress bar)
      const completedStepCounts = await db
        .select({
          problemId: userProblems.problemId,
          completedCount: count(userProblemSteps.id),
        })
        .from(userProblemSteps)
        .innerJoin(userProblems, eq(userProblemSteps.userProblemId, userProblems.id))
        .where(
          and(
            eq(userProblems.userId, profile.id),
            inArray(userProblems.problemId, problemIds),
            eq(userProblemSteps.status, "completed")
          )
        )
        .groupBy(userProblems.problemId);

      for (const row of completedStepCounts) {
        completedStepsMap.set(row.problemId, row.completedCount);
      }
    }

    // 5. Build response
    const responseData: ProblemSimpleResponse[] = problemsWithVersions.map((problem) => {
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
        links: currentVersion.links as ProblemLink[] | null,
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

    const response: GetProblemsResponse = {
      data: responseData,
    };

    logger.info("GET /api/v2/practice - Response sent", { data: responseData });
    return NextResponse.json(response);
  } catch (error) {
    logger.error("GET /api/v2/practice - Error:", error);
    captureServerError(error, { route: "GET /api/v2/practice" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
