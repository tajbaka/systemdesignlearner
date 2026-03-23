import { auth, currentUser } from "@clerk/nextjs/server";
import { db, profiles } from "@/packages/drizzle";
import { eq } from "drizzle-orm";

export type Profile = typeof profiles.$inferSelect;

type GetProfileOptions = {
  createIfMissing?: boolean;
};

async function findProfileByClerkUserId(clerkUserId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.clerkUserId, clerkUserId),
  });
}

async function createOrUpdateProfileFromCurrentUser(clerkUserId: string) {
  const user = await currentUser();
  if (!user || user.id !== clerkUserId) {
    return null;
  }

  const now = new Date();
  const email = user.emailAddresses[0]?.emailAddress ?? null;
  const displayName = user.firstName || user.username || email?.split("@")[0] || "User";

  const [profile] = await db
    .insert(profiles)
    .values({
      clerkUserId,
      email,
      displayName,
      avatarUrl: user.imageUrl ?? null,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: profiles.clerkUserId,
      set: {
        email,
        displayName,
        avatarUrl: user.imageUrl ?? null,
        updatedAt: now,
        deletedAt: null,
      },
    })
    .returning();

  return profile;
}

/**
 * Get profile for authenticated user.
 * Returns null if not authenticated.
 */
export async function getProfile({ createIfMissing = false }: GetProfileOptions = {}) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const existingProfile = await findProfileByClerkUserId(userId);
  if (existingProfile || !createIfMissing) {
    return existingProfile;
  }

  return createOrUpdateProfileFromCurrentUser(userId);
}

export async function getOrCreateProfile() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const existingProfile = await findProfileByClerkUserId(userId);
  if (existingProfile) {
    return {
      profile: existingProfile,
      isNew: false,
    };
  }

  const profile = await createOrUpdateProfileFromCurrentUser(userId);
  if (!profile) {
    return null;
  }

  return {
    profile,
    isNew: true,
  };
}
