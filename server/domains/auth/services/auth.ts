import { auth } from "@clerk/nextjs/server";
import { db, profiles } from "@/packages/drizzle";
import { eq } from "drizzle-orm";

export type Profile = typeof profiles.$inferSelect;

/**
 * Get profile for authenticated user.
 * Returns null if not authenticated.
 */
export async function getProfile() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  return db.query.profiles.findFirst({
    where: eq(profiles.clerkUserId, userId),
  });
}
