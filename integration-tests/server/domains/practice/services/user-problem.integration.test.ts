import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, userProblems, userProblemSteps, type UserProblemStep } from "@/packages/drizzle";
import {
  createProblem,
  createProblemStep,
  createProblemVersion,
  createProfile,
  resetDatabase,
} from "@/integration-tests/helpers/database";
import {
  getOrCreateUserProblem,
  saveStepData,
} from "@/server/domains/practice/services/user-problem";

vi.mock("@/domains/practice/utils/access-control", () => ({
  calculateMaxVisitedStep: vi.fn(),
}));

describe("user-problem service integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("keeps separate user problem rows per problem version", async () => {
    const profile = await createProfile();
    const problem = await createProblem({ slug: "integration-user-problem-versioned" });
    const firstVersion = await createProblemVersion(problem.id, {
      versionNumber: 1,
      isCurrent: true,
    });
    const secondVersion = await createProblemVersion(problem.id, {
      versionNumber: 2,
      isCurrent: false,
    });

    const firstUserProblem = await getOrCreateUserProblem(profile.id, problem.id, firstVersion.id);
    const secondUserProblem = await getOrCreateUserProblem(
      profile.id,
      problem.id,
      secondVersion.id
    );
    const repeatedFirstUserProblem = await getOrCreateUserProblem(
      profile.id,
      problem.id,
      firstVersion.id
    );

    const savedUserProblems = await db.query.userProblems.findMany({
      where: and(eq(userProblems.userId, profile.id), eq(userProblems.problemId, problem.id)),
    });

    expect(firstUserProblem.id).toBe(repeatedFirstUserProblem.id);
    expect(secondUserProblem.id).not.toBe(firstUserProblem.id);
    expect(savedUserProblems).toHaveLength(2);
  });

  it("preserves evaluation fields when saving new input for an existing step row", async () => {
    const profile = await createProfile();
    const problem = await createProblem({ slug: "integration-save-step-data" });
    const version = await createProblemVersion(problem.id, {
      versionNumber: 1,
      isCurrent: true,
    });

    await createProblemStep(problem.id, {
      title: "Functional Requirements",
      stepType: "functional",
      order: 1,
    });

    const userProblem = await getOrCreateUserProblem(profile.id, problem.id, version.id);

    await db.insert(userProblemSteps).values({
      userProblemId: userProblem.id,
      status: "in_progress",
      data: {
        functional: {
          data: { textField: { value: "old text" } },
          evaluation: { score: 25 },
          earnedScore: 25,
          maxScore: 25,
          status: "completed",
          updatedAt: "2026-03-24T19:50:00.000Z",
        },
        _metadata: {
          maxVisitedStep: 1,
        },
      },
      createdAt: new Date("2026-03-24T19:50:00.000Z"),
      updatedAt: new Date("2026-03-24T19:50:00.000Z"),
    });

    const result = await saveStepData({
      userId: profile.id,
      slug: problem.slug,
      stepType: "functional",
      data: {
        textField: { value: "new text" },
      },
    });

    const savedStep = (await db.query.userProblemSteps.findFirst({
      where: eq(userProblemSteps.userProblemId, userProblem.id),
    })) as UserProblemStep;

    expect(result).toEqual({
      data: {
        id: expect.any(String),
        stepType: "functional",
        data: {
          textField: { value: "new text" },
        },
        status: "in_progress",
        updatedAt: expect.any(String),
      },
    });
    expect(savedStep.data).toMatchObject({
      functional: {
        data: {
          textField: { value: "new text" },
        },
        evaluation: { score: 25 },
        earnedScore: 25,
        maxScore: 25,
        status: "completed",
      },
      _metadata: {
        maxVisitedStep: 1,
      },
    });
  });
});
