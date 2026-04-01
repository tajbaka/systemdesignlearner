import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db, problemSteps, problemVersions, problems, profiles } from "@/packages/drizzle";

type NewProfile = typeof profiles.$inferInsert;
type NewProblem = typeof problems.$inferInsert;
type NewProblemVersion = typeof problemVersions.$inferInsert;
type NewProblemStep = typeof problemSteps.$inferInsert;

export async function resetDatabase() {
  await db.execute(
    sql.raw(`
    TRUNCATE TABLE
      user_problem_steps,
      user_problems,
      problem_steps,
      problem_versions,
      problems,
      profiles
    RESTART IDENTITY CASCADE
  `)
  );
}

export async function createProfile(overrides: Partial<NewProfile> = {}) {
  const [profile] = await db
    .insert(profiles)
    .values({
      clerkUserId: overrides.clerkUserId ?? `clerk-${randomUUID()}`,
      email: overrides.email ?? "integration@example.com",
      displayName: overrides.displayName ?? "Integration User",
      avatarUrl: overrides.avatarUrl ?? null,
      updatedAt: overrides.updatedAt ?? new Date(),
      deletedAt: overrides.deletedAt ?? null,
      newProblemEmailsEnabled: overrides.newProblemEmailsEnabled ?? true,
    })
    .returning();

  return profile;
}

export async function createProblem(overrides: Partial<NewProblem> = {}) {
  const [problem] = await db
    .insert(problems)
    .values({
      slug: overrides.slug ?? `problem-${randomUUID()}`,
      category: overrides.category ?? "backend",
      updatedAt: overrides.updatedAt ?? new Date(),
    })
    .returning();

  return problem;
}

export async function createProblemVersion(
  problemId: string,
  overrides: Partial<NewProblemVersion> & Pick<NewProblemVersion, "versionNumber">
) {
  const [version] = await db
    .insert(problemVersions)
    .values({
      problemId,
      versionNumber: overrides.versionNumber,
      title: overrides.title ?? `Version ${overrides.versionNumber}`,
      description: overrides.description ?? "Integration test version",
      difficulty: overrides.difficulty ?? "medium",
      timeToComplete: overrides.timeToComplete ?? "45 min",
      topic: overrides.topic ?? "System Design",
      links: overrides.links ?? [],
      isCurrent: overrides.isCurrent ?? false,
    })
    .returning();

  return version;
}

export async function createProblemStep(
  problemId: string,
  overrides: Partial<NewProblemStep> & Pick<NewProblemStep, "title" | "stepType" | "order">
) {
  const [step] = await db
    .insert(problemSteps)
    .values({
      problemId,
      title: overrides.title,
      description: overrides.description ?? "Integration test step",
      stepType: overrides.stepType,
      order: overrides.order,
      required: overrides.required ?? true,
      scoreWeight: overrides.scoreWeight ?? 25,
      data: overrides.data ?? {},
    })
    .returning();

  return step;
}
