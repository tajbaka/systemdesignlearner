import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const problemsFindFirstMock = vi.fn();
  const problemVersionsFindFirstMock = vi.fn();
  const userProblemStepsFindFirstMock = vi.fn();
  const insertMock = vi.fn();
  const updateMock = vi.fn();
  const eqMock = vi.fn((column, value) => ({ column, value }));
  const andMock = vi.fn((...conditions) => ({ conditions }));

  const userProblemsReturningMock = vi.fn();
  const userProblemsOnConflictDoUpdateMock = vi.fn();
  const userProblemsValuesMock = vi.fn();

  const userProblemStepsInsertValuesMock = vi.fn();
  const userProblemStepsUpdateWhereMock = vi.fn();
  const userProblemStepsUpdateSetMock = vi.fn();

  const userProblemsUpdateWhereMock = vi.fn();
  const userProblemsUpdateSetMock = vi.fn();

  const problems = { slug: Symbol("problems.slug"), id: Symbol("problems.id") };
  const problemVersions = {
    problemId: Symbol("problemVersions.problemId"),
    isCurrent: Symbol("problemVersions.isCurrent"),
    id: Symbol("problemVersions.id"),
  };
  const userProblems = {
    id: Symbol("userProblems.id"),
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
      problemVersions: { findFirst: problemVersionsFindFirstMock },
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

  userProblemStepsUpdateSetMock.mockImplementation(() => ({
    where: userProblemStepsUpdateWhereMock,
  }));
  userProblemsUpdateSetMock.mockImplementation(() => ({
    where: userProblemsUpdateWhereMock,
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
    if (table === userProblems) {
      return { set: userProblemsUpdateSetMock };
    }
    throw new Error("Unexpected update table");
  });

  return {
    problemsFindFirstMock,
    problemVersionsFindFirstMock,
    userProblemStepsFindFirstMock,
    insertMock,
    updateMock,
    eqMock,
    andMock,
    userProblemsValuesMock,
    userProblemsOnConflictDoUpdateMock,
    userProblemsReturningMock,
    userProblemStepsInsertValuesMock,
    userProblemStepsUpdateSetMock,
    userProblemStepsUpdateWhereMock,
    userProblemsUpdateSetMock,
    userProblemsUpdateWhereMock,
    problems,
    problemVersions,
    userProblems,
    userProblemSteps,
    db,
  };
});

vi.mock("@/packages/drizzle", () => ({
  db: mocks.db,
  problems: mocks.problems,
  problemVersions: mocks.problemVersions,
  userProblems: mocks.userProblems,
  userProblemSteps: mocks.userProblemSteps,
}));

vi.mock("drizzle-orm", () => ({
  eq: mocks.eqMock,
  and: mocks.andMock,
}));

import { updateSession } from "../session";

describe("session service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T16:00:00.000Z"));

    mocks.problemsFindFirstMock.mockResolvedValue({ id: "problem-1" });
    mocks.problemVersionsFindFirstMock.mockResolvedValue({ id: "version-1" });
    mocks.userProblemsReturningMock.mockResolvedValue([{ id: "user-problem-1" }]);
    mocks.userProblemsUpdateWhereMock.mockResolvedValue(undefined);
    mocks.userProblemStepsUpdateWhereMock.mockResolvedValue(undefined);
    mocks.userProblemStepsInsertValuesMock.mockResolvedValue(undefined);
  });

  it("upserts the version-scoped user problem and merges metadata into an existing step record", async () => {
    mocks.userProblemStepsFindFirstMock.mockResolvedValue({
      id: "step-row-1",
      data: {
        functional: { data: { textField: { value: "existing" } } },
        _metadata: { currentStepType: "functional", retained: true },
      },
    });

    const result = await updateSession({
      userId: "user-1",
      scenarioSlug: "url-shortener",
      maxVisitedStep: 3,
      currentStepType: "api",
    });

    expect(mocks.userProblemsValuesMock).toHaveBeenCalledWith({
      userId: "user-1",
      problemId: "problem-1",
      problemVersionId: "version-1",
      status: "in_progress",
      updatedAt: new Date("2026-03-24T16:00:00.000Z"),
    });
    expect(mocks.userProblemsOnConflictDoUpdateMock).toHaveBeenCalledWith({
      target: [
        mocks.userProblems.userId,
        mocks.userProblems.problemId,
        mocks.userProblems.problemVersionId,
      ],
      set: {
        updatedAt: new Date("2026-03-24T16:00:00.000Z"),
      },
    });
    expect(mocks.userProblemStepsUpdateSetMock).toHaveBeenCalledWith({
      data: {
        functional: { data: { textField: { value: "existing" } } },
        _metadata: {
          currentStepType: "api",
          retained: true,
          maxVisitedStep: 3,
        },
      },
      updatedAt: new Date("2026-03-24T16:00:00.000Z"),
    });
    expect(mocks.userProblemStepsInsertValuesMock).not.toHaveBeenCalled();
    expect(mocks.userProblemsUpdateSetMock).toHaveBeenCalledWith({
      updatedAt: new Date("2026-03-24T16:00:00.000Z"),
    });
    expect(result).toEqual({
      id: "user-problem-1",
      maxVisitedStep: 3,
      currentStepType: "api",
      updatedAt: "2026-03-24T16:00:00.000Z",
    });
  });

  it("creates a metadata row when the user problem has no step record yet", async () => {
    mocks.userProblemStepsFindFirstMock.mockResolvedValue(null);

    const result = await updateSession({
      userId: "user-2",
      scenarioSlug: "pastebin",
    });

    expect(mocks.userProblemStepsInsertValuesMock).toHaveBeenCalledWith({
      userProblemId: "user-problem-1",
      status: "in_progress",
      data: {
        _metadata: {
          maxVisitedStep: 0,
          currentStepType: "intro",
        },
      },
      createdAt: new Date("2026-03-24T16:00:00.000Z"),
      updatedAt: new Date("2026-03-24T16:00:00.000Z"),
    });
    expect(result).toEqual({
      id: "user-problem-1",
      maxVisitedStep: 0,
      currentStepType: "intro",
      updatedAt: "2026-03-24T16:00:00.000Z",
    });
  });
});
