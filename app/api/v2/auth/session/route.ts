import { NextRequest, NextResponse } from "next/server";
import { getOrCreateProfile } from "@/app/api/v2/auth/(services)/auth";

/**
 * POST /api/v2/auth/session
 * Initialize user session after Clerk authentication
 * Creates profile in database if it doesn't exist
 */
export async function POST(_: NextRequest) {
  try {
    const profileResult = await getOrCreateProfile();
    if (!profileResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        profile: profileResult.profile,
        isNewUser: profileResult.isNew,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/v2/auth/session] Error:", error);
    return NextResponse.json({ error: "Failed to initialize session" }, { status: 500 });
  }
}
