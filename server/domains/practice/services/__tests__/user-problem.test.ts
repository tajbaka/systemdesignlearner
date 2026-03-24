import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const problemsFindFirstMock = vi.fn();
  const userProblemStepsFindFirstMock = vi.fn();
  const insertMock = vi.fn();
  const updateMock = vi.fn();
  const eqMock = vi.fn((column, value) => ({ column, value }));
  const andMock = vi.fn((...conditions) => ({ conditions }));

  const userProblemsReturningMock = vi.fn();
  const userProblemsOnConflictDoUpdateMock = vi.fn();
  const userProblemsValuesMock = vi.fn();

  const userProblemStepsInsertReturningMock = vi.fn();
  const userProblemStepsInsertValuesMock = vi.fn();
  const userProblemStepsUpdateReturningMock = vi.fn();
  const userProblemStepsUpdateWhereMock = vi.fn();
  const userProblemStepsUpdateSetMock = vi.fn();

  const problems = { slug: Symbol("problems.slug"), id: Symbol("problems.id") };
  const problemVersions = {
    isCurrent: Symbol("problemVersions.isCurrent"),
  };
  const problemSteps = {};
  const userProblems = {
    userId: Symbol("userProblems.userId"),
    problemId: Symbol("userProblems.problemId"),
    problemVersionId: Symbol("userProblems.problemVersionId"),
  };
  const userProblemSteps = {
    id: Symbol("userProblemSteps.id"),
    userProblemId: Symbol("userProblemSteps.userProblemId"),
  };

  const db = {
    query: {
      problems: { findFirst: problemsFindFirstMock },
      userProblemSteps: { findFirst: userProblemStepsFindFirstMock },
    },
    insert: insertMock,
    update: updateMock,
  };

  userProblemsValuesMock.mockImplementation(() => ({
    onConflictDoUpdate: userProblemsOnConflictDoUpdateMock,
  }));
  userProblemsOnConflictDoUpdateMock.mockImplementation(() => ({
    returning: userProblemsReturningMock,
  }));

  userProblemStepsInsertValuesMock.mockImplementation(() => ({
    returning: userProblemStepsInsertReturningMock,
  }));
  userProblemStepsUpdateSetMock.mockImplementation(() => ({
    where: userProblemStepsUpdateWhereMock,
  }));
  userProblemStepsUpdateWhereMock.mockImplementation(() => ({
    returning: userProblemStepsUpdateReturningMock,
  }));

  insertMock.mockImplementation((table) => {
    if (table === userProblems) {
      return { values: userProblemsValuesMock };
    }
    if (table === userProblemSteps) {
      return { values: userProblemStepsInsertValuesMock };
    }
    throw new Error("Unexpected insert table");
  });

  updateMock.mockImplementation((table) => {
    if (table === userProblemSteps) {
      return { set: userProblemStepsUpdateSetMock };
    }
    throw new Error("Unexpected update table");
  });

  return {
    problemsFindFirstMock,
    userProblemStepsFindFirstMock,
    insertMock,
    updateMock,
    eqMock,
    andMock,
    userProblemsValuesMock,
    userProblemsOnConflictDoUpdateMock,
    userProblemsReturningMock,
    userProblemStepsInsertValuesMock,
    userProblemStepsInsertReturningMock,
    userProblemStepsUpdateSetMock,
    userProblemStepsUpdateWhereMock,
    userProblemStepsUpdateReturningMock,
    problems,
    problemVersions,
    problemSteps,
    userProblems,
    userProblemSteps,
    db,
  };
});

vi.mock("@/packages/drizzle", () => ({
  db: mocks.db,
  problems: mocks.problems,
  problemVersions: mocks.problemVersions,
  problemSteps: mocks.problemSteps,
  userProblems: mocks.userProblems,
  userProblemSteps: mocks.userProblemSteps,
}));

vi.mock("drizzle-orm", () => ({
  eq: mocks.eqMock,
  and: mocks.andMock,
}));

vi.mock("@/domains/practice/utils/access-control", () => ({
  calculateMaxVisitedStep: vi.fn(),
}));

import { getOrCreateUserProblem, saveStepData } from "../user-problem";

describe("user-problem service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T17:00:00.000Z"));

    mocks.userProblemsReturningMock.mockResolvedValue([{ id: "user-problem-1" }]);
    mocks.userProblemStepsUpdateReturningMock.mockResolvedValue([{ id: "step-row-1" }]);
    mocks.userProblemStepsInsertReturningMock.mockResolvedValue([{ id: "step-row-2" }]);
  });

  it("upserts a user problem using the version-scoped unique key", async () => {
    const result = await getOrCreateUserProblem("user-1", "problem-1", "version-1");

    expect(mocks.userProblemsValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      problemId: "problem-1",
      problemVersionId: "version-1",
      status: "in_progress",
      updatedAt: new Date("2026-03-24T17:00:00.000Z"),
    });
    expect(mocks.userProblemsOnConflictDoUpdateMock).toHaveBeenCalledWith({
      target: [
        mocks.userProblems.userId,
        mocks.userProblems.problemId,
        mocks.userProblems.problemVersionId,
      ],
      set: {
        updatedAt: new Date("2026-03-24T17:00:00.000Z"),
      },
    });
    expect(result).toEqual({ id: "user-problem-1" });
  });

  it("preserves existing evaluation fields when saving updated step input", async () => {
    mocks.problemsFindFirstMock.mockResolvedValue({
      id: "problem-1",
      versions: [{ id: "version-1" }],
    });
    mocks.userProblemStepsFindFirstMock.mockResolvedValue({
      id: "step-row-1",
      data: {
        functional: {
          data: { textField: { value: "old text" } },
          evaluation: { score: 25 },
          earnedScore: 25,
          maxScore: 25,
          status: "completed",
          updatedAt: "old-timestamp",
        },
      },
    });

    const result = await saveStepData({
      userId: "user-1",
      slug: "url-shortener",
      stepType: "functional",
      data: { textField: { value: "new text" } },
    });

    expect(mocks.userProblemStepsUpdateSetMock).toHaveBeenCalledWith({
      data: {
        functional: {
          data: { textField: { value: "new text" } },
          evaluation: { score: 25 },
          earnedScore: 25,
          maxScore: 25,
          status: "completed",
          updatedAt: "2026-03-24T17:00:00.000Z",
        },
      },
      updatedAt: new Date("2026-03-24T17:00:00.000Z"),
    });
    expect(result).toEqual({
      data: {
        id: "step-row-1",
        stepType: "functional",
        data: { textField: { value: "new text" } },
        status: "in_progress",
        updatedAt: "2026-03-24T17:00:00.000Z",
      },
    });
  });

  it("returns VERSION_NOT_FOUND when the current problem version is missing", async () => {
    mocks.problemsFindFirstMock.mockResolvedValue({
      id: "problem-2",
      versions: [],
    });

    await expect(
      saveStepData({
        userId: "user-2",
        slug: "pastebin",
        stepType: "api",
        data: { endpoints: [] },
      })
    ).resolves.toEqual({ error: "VERSION_NOT_FOUND" });

    expect(mocks.insertMock).not.toHaveBeenCalled();
    expect(mocks.updateMock).not.toHaveBeenCalled();
  });
});
