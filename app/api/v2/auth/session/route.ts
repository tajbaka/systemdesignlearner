import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db, profiles } from "@/packages/drizzle";
import { eq } from "drizzle-orm";

/**
 * POST /api/v2/auth/session
 * Initialize user session after Clerk authentication
 * Creates profile in database if it doesn't exist
 */
export async function POST(_: NextRequest) {
  try {
    // 1. Validate Clerk authentication
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if profile already exists
    let profile = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, user.id),
    });

    const isNewUser = !profile;

    // 3. Create profile if it doesn't exist
    if (!profile) {
      const email = user.emailAddresses[0]?.emailAddress || "";
      const displayName = user.firstName || user.username || email.split("@")[0] || "User";

      const [newProfile] = await db
        .insert(profiles)
        .values({
          clerkUserId: user.id,
          email,
          displayName,
          avatarUrl: user.imageUrl,
        })
        .returning();

      profile = newProfile;
    }

    // 4. Return profile data
    return NextResponse.json(
      {
        profile,
        isNewUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/v2/auth/session] Error:", error);
    return NextResponse.json({ error: "Failed to initialize session" }, { status: 500 });
  }
}
