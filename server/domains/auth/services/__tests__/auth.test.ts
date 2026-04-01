import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const authMock = vi.fn();
  const currentUserMock = vi.fn();
  const profilesFindFirstMock = vi.fn();
  const insertMock = vi.fn();
  const insertValuesMock = vi.fn();
  const onConflictDoUpdateMock = vi.fn();
  const returningMock = vi.fn();
  const eqMock = vi.fn((column, value) => ({ column, value }));
  const profiles = {
    clerkUserId: Symbol("profiles.clerkUserId"),
  };

  const db = {
    query: {
      profiles: {
        findFirst: profilesFindFirstMock,
      },
    },
    insert: insertMock,
  };

  insertMock.mockImplementation(() => ({
    values: insertValuesMock,
  }));
  insertValuesMock.mockImplementation(() => ({
    onConflictDoUpdate: onConflictDoUpdateMock,
  }));
  onConflictDoUpdateMock.mockImplementation(() => ({
    returning: returningMock,
  }));

  return {
    authMock,
    currentUserMock,
    profilesFindFirstMock,
    insertMock,
    insertValuesMock,
    onConflictDoUpdateMock,
    returningMock,
    eqMock,
    profiles,
    db,
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authMock,
  currentUser: mocks.currentUserMock,
}));

vi.mock("@/packages/drizzle", () => ({
  db: mocks.db,
  profiles: mocks.profiles,
}));

vi.mock("drizzle-orm", () => ({
  eq: mocks.eqMock,
}));

import { getOrCreateProfile, getProfile } from "../auth";

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T15:00:00.000Z"));
  });

  it("returns null profile when Clerk auth has no user", async () => {
    mocks.authMock.mockResolvedValue({ userId: null });

    await expect(getProfile()).resolves.toBeNull();
    await expect(getOrCreateProfile()).resolves.toBeNull();

    expect(mocks.profilesFindFirstMock).not.toHaveBeenCalled();
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });

  it("returns the existing profile without creating a new one", async () => {
    const existingProfile = { id: "profile-1", clerkUserId: "clerk-1" };
    mocks.authMock.mockResolvedValue({ userId: "clerk-1" });
    mocks.profilesFindFirstMock.mockResolvedValue(existingProfile);

    await expect(getOrCreateProfile()).resolves.toEqual({
      profile: existingProfile,
      isNew: false,
    });

    expect(mocks.currentUserMock).not.toHaveBeenCalled();
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });

  it("creates and upserts the Clerk profile when none exists", async () => {
    const createdProfile = { id: "profile-2", clerkUserId: "clerk-2" };
    mocks.authMock.mockResolvedValue({ userId: "clerk-2" });
    mocks.profilesFindFirstMock.mockResolvedValueOnce(null);
    mocks.currentUserMock.mockResolvedValue({
      id: "clerk-2",
      firstName: null,
      username: null,
      imageUrl: "https://example.com/avatar.png",
      emailAddresses: [{ emailAddress: "alice@example.com" }],
    });
    mocks.returningMock.mockResolvedValue([createdProfile]);

    await expect(getOrCreateProfile()).resolves.toEqual({
      profile: createdProfile,
      isNew: true,
    });

    expect(mocks.insertMock).toHaveBeenCalledWith(mocks.profiles);
    expect(mocks.insertValuesMock).toHaveBeenCalledWith({
      clerkUserId: "clerk-2",
      email: "alice@example.com",
      displayName: "alice",
      avatarUrl: "https://example.com/avatar.png",
      updatedAt: new Date("2026-03-24T15:00:00.000Z"),
      deletedAt: null,
    });
    expect(mocks.onConflictDoUpdateMock).toHaveBeenCalledWith({
      target: mocks.profiles.clerkUserId,
      set: {
        email: "alice@example.com",
        displayName: "alice",
        avatarUrl: "https://example.com/avatar.png",
        updatedAt: new Date("2026-03-24T15:00:00.000Z"),
        deletedAt: null,
      },
    });
  });

  it("returns null when currentUser does not match the authenticated Clerk user", async () => {
    mocks.authMock.mockResolvedValue({ userId: "clerk-3" });
    mocks.profilesFindFirstMock.mockResolvedValue(null);
    mocks.currentUserMock.mockResolvedValue({
      id: "other-user",
      firstName: "Other",
      username: "other",
      imageUrl: null,
      emailAddresses: [{ emailAddress: "other@example.com" }],
    });

    await expect(getOrCreateProfile()).resolves.toBeNull();

    expect(mocks.insertMock).not.toHaveBeenCalled();
  });
});
