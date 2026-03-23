import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/app/api/v2/auth/(services)/auth";

export async function POST() {
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
