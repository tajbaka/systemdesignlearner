import { NextResponse } from "next/server";
import { db, problems, problemVersions, userProblems } from "@/packages/drizzle";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import type { GetProblemsResponse, ProblemSimpleResponse, ProblemLink } from "./schemas";

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

    // 3. Optionally fetch userProblems status (if authenticated)
    const profile = await getProfile();
    const statusMap = new Map<string, "in_progress" | "completed">();

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
    }

    // 4. Build response
    const responseData: ProblemSimpleResponse[] = problemsWithVersions.map((problem) => {
      const currentVersion = problem.versions[0];
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
        status: statusMap.get(problem.id) ?? null,
      };
    });

    const response: GetProblemsResponse = {
      data: responseData,
    };

    logger.info("GET /api/v2/practice - Response sent", { data: responseData });
    return NextResponse.json(response);
  } catch (error) {
    logger.error("GET /api/v2/practice - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
