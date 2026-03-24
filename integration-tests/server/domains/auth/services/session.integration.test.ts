import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
  db,
  problemVersions,
  userProblems,
  userProblemSteps,
  type UserProblemStep,
} from "@/packages/drizzle";
import {
  createProblem,
  createProblemVersion,
  createProfile,
  resetDatabase,
} from "@/integration-tests/helpers/database";
import { updateSession } from "@/server/domains/auth/services/session";

describe("session service integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates separate user problem sessions for different current versions", async () => {
    const profile = await createProfile();
    const problem = await createProblem({ slug: "integration-session-versioned" });
    const firstVersion = await createProblemVersion(problem.id, {
      versionNumber: 1,
      isCurrent: true,
    });
    const secondVersion = await createProblemVersion(problem.id, {
      versionNumber: 2,
      isCurrent: false,
    });

    const firstResult = await updateSession({
      userId: profile.id,
      scenarioSlug: problem.slug,
      maxVisitedStep: 1,
      currentStepType: "functional",
    });

    await db
      .update(problemVersions)
      .set({ isCurrent: false })
      .where(eq(problemVersions.id, firstVersion.id));
    await db
      .update(problemVersions)
      .set({ isCurrent: true })
      .where(eq(problemVersions.id, secondVersion.id));

    const secondResult = await updateSession({
      userId: profile.id,
      scenarioSlug: problem.slug,
      maxVisitedStep: 3,
      currentStepType: "api",
    });

    const savedUserProblems = await db.query.userProblems.findMany({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
    });

    expect(firstResult).toMatchObject({
      maxVisitedStep: 1,
      currentStepType: "functional",
      updatedAt: expect.any(String),
    });
    expect(secondResult).toMatchObject({
      maxVisitedStep: 3,
      currentStepType: "api",
      updatedAt: expect.any(String),
    });
    expect(savedUserProblems).toHaveLength(2);
    expect(savedUserProblems.map((record) => record.problemVersionId).sort()).toEqual(
      [firstVersion.id, secondVersion.id].sort()
    );
  });

  it("merges session metadata into an existing step payload without dropping saved step data", async () => {
    const profile = await createProfile();
    const problem = await createProblem({ slug: "integration-session-merge" });
    const version = await createProblemVersion(problem.id, {
      versionNumber: 1,
      isCurrent: true,
    });

    const [userProblem] = await db
      .insert(userProblems)
      .values({
        userId: profile.id,
        problemId: problem.id,
        problemVersionId: version.id,
        status: "in_progress",
        updatedAt: new Date("2026-03-24T18:55:00.000Z"),
      })
      .returning();

    await db.insert(userProblemSteps).values({
      userProblemId: userProblem.id,
      status: "in_progress",
      data: {
        functional: {
          data: { textField: { value: "existing" } },
          status: "draft",
          updatedAt: "2026-03-24T18:55:00.000Z",
        },
        _metadata: {
          currentStepType: "functional",
          retained: true,
        },
      },
      createdAt: new Date("2026-03-24T18:55:00.000Z"),
      updatedAt: new Date("2026-03-24T18:55:00.000Z"),
    });

    const result = await updateSession({
      userId: profile.id,
      scenarioSlug: problem.slug,
      maxVisitedStep: 2,
      currentStepType: "api",
    });

    const savedStep = (await db.query.userProblemSteps.findFirst({
      where: eq(userProblemSteps.userProblemId, userProblem.id),
    })) as UserProblemStep;

    expect(result).toMatchObject({
      id: userProblem.id,
      maxVisitedStep: 2,
      currentStepType: "api",
      updatedAt: expect.any(String),
    });
    expect(savedStep.data).toMatchObject({
      functional: {
        data: { textField: { value: "existing" } },
        status: "draft",
      },
      _metadata: {
        currentStepType: "api",
        maxVisitedStep: 2,
        retained: true,
      },
    });
  });
});
