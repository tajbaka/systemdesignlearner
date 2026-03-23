import { NextResponse } from "next/server";
import { captureServerError } from "@/lib/posthog-server";
import { userController } from "@/server/domains/auth/controller";

export async function POST() {
  try {
    const profileResult = await userController.initializeSession();
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
    captureServerError(error, { route: "POST /api/v2/auth/session" });
    return NextResponse.json({ error: "Failed to initialize session" }, { status: 500 });
  }
}
