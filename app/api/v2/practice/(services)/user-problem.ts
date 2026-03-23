import { and, eq } from "drizzle-orm";
import { db, userProblems } from "@/packages/drizzle";

type EnsureUserProblemParams = {
  userId: string;
  problemId: string;
  problemVersionId: string;
  now?: Date;
};

export async function ensureUserProblem({
  userId,
  problemId,
  problemVersionId,
  now = new Date(),
}: EnsureUserProblemParams) {
  const [userProblem] = await db
    .insert(userProblems)
    .values({
      userId,
      problemId,
      problemVersionId,
      status: "in_progress",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userProblems.userId, userProblems.problemId],
      set: {
        problemVersionId,
        updatedAt: now,
      },
    })
    .returning();

  if (userProblem) {
    return userProblem;
  }

  const existingUserProblem = await db.query.userProblems.findFirst({
    where: and(eq(userProblems.userId, userId), eq(userProblems.problemId, problemId)),
  });

  if (!existingUserProblem) {
    throw new Error("Failed to ensure user problem record");
  }

  return existingUserProblem;
}
