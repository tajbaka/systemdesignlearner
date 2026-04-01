import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/packages/drizzle";
import { createProfile, resetDatabase } from "@/integration-tests/helpers/database";

const authMock = vi.hoisted(() => vi.fn());
const currentUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

import { getOrCreateProfile, getProfile } from "@/server/domains/auth/services/auth";

describe("auth service integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase();
  });

  it("creates a persisted profile from the authenticated Clerk user", async () => {
    authMock.mockResolvedValue({ userId: "clerk-auth-user" });
    currentUserMock.mockResolvedValue({
      id: "clerk-auth-user",
      firstName: null,
      username: null,
      imageUrl: "https://example.com/avatar.png",
      emailAddresses: [{ emailAddress: "alice@example.com" }],
    });

    const result = await getOrCreateProfile();

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      isNew: true,
      profile: {
        clerkUserId: "clerk-auth-user",
        email: "alice@example.com",
        displayName: "alice",
        avatarUrl: "https://example.com/avatar.png",
      },
    });

    const persistedProfile = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, "clerk-auth-user"),
    });

    expect(persistedProfile).toMatchObject({
      clerkUserId: "clerk-auth-user",
      email: "alice@example.com",
      displayName: "alice",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("returns the existing stored profile without rehydrating from Clerk", async () => {
    const existingProfile = await createProfile({
      clerkUserId: "clerk-existing-user",
      email: "existing@example.com",
      displayName: "Existing User",
    });

    authMock.mockResolvedValue({ userId: "clerk-existing-user" });

    await expect(getProfile()).resolves.toMatchObject({
      id: existingProfile.id,
      clerkUserId: "clerk-existing-user",
      email: "existing@example.com",
    });

    await expect(getOrCreateProfile()).resolves.toEqual({
      profile: expect.objectContaining({
        id: existingProfile.id,
        clerkUserId: "clerk-existing-user",
      }),
      isNew: false,
    });

    expect(currentUserMock).not.toHaveBeenCalled();
  });
});
