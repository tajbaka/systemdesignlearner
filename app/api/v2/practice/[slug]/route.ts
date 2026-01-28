import { NextRequest, NextResponse } from "next/server";
import { db, problems, problemVersions, userProblems } from "@/packages/drizzle";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import type { GetProblemResponse, ProblemLink } from "../schemas";

export const runtime = "nodejs";

// ============================================================================
// GET /api/v2/practice/[slug]
// Retrieves a single problem by slug with optional user progress
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Fetch problem with current version
    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
      with: {
        versions: {
          where: eq(problemVersions.isCurrent, true),
          limit: 1,
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found", details: { slug } }, { status: 404 });
    }

    const currentVersion = problem.versions[0];
    if (!currentVersion) {
      return NextResponse.json({ error: "Problem version not found" }, { status: 404 });
    }

    // 2. Optionally fetch userProblem (if authenticated)
    let userProblemData = null;
    const profile = await getProfile();

    if (profile) {
      const userProblem = await db.query.userProblems.findFirst({
        where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
      });

      if (userProblem) {
        userProblemData = {
          id: userProblem.id,
          userId: userProblem.userId,
          status: userProblem.status,
          createdAt: userProblem.createdAt.toISOString(),
          completedAt: userProblem.completedAt?.toISOString() ?? null,
          updatedAt: userProblem.updatedAt.toISOString(),
        };
      }
    }

    // 3. Build response
    const response: GetProblemResponse = {
      data: {
        id: problem.id,
        slug: problem.slug,
        category: problem.category,
        title: currentVersion.title,
        description: currentVersion.description,
        difficulty: currentVersion.difficulty,
        timeToComplete: currentVersion.timeToComplete,
        topic: currentVersion.topic,
        links: currentVersion.links as ProblemLink[] | null,
        status: userProblemData?.status ?? null,
        versionNumber: currentVersion.versionNumber,
        userProblem: userProblemData,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("GET /api/v2/practice/[slug] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
