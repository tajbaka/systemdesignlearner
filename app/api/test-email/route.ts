import { NextRequest, NextResponse } from "next/server";
import { sendNewProblemNotification } from "@/lib/email";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";

const DEFAULT_PROBLEM = {
  problemTitle: "Design a Distributed Web Crawler",
  problemDescription:
    "Design a distributed system that crawls billions of web pages efficiently, deduplicates URLs, and respects politeness policies.",
  problemDifficulty: "hard" as const,
  problemSlug: "design-web-crawler",
  timeToComplete: "60 min",
};

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const testSecret = process.env.TEST_EMAIL_SECRET;

  try {
    const body = await request.json().catch(() => ({}));

    if (!isDev) {
      if (!testSecret || body.secret !== testSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const to = body.to || "ariantajbakh@gmail.com";

    const result = await sendNewProblemNotification({
      to,
      problemTitle: body.problemTitle || DEFAULT_PROBLEM.problemTitle,
      problemDescription: body.problemDescription || DEFAULT_PROBLEM.problemDescription,
      problemDifficulty: body.problemDifficulty || DEFAULT_PROBLEM.problemDifficulty,
      problemSlug: body.problemSlug || DEFAULT_PROBLEM.problemSlug,
      timeToComplete: body.timeToComplete || DEFAULT_PROBLEM.timeToComplete,
    });

    if (!result.success) {
      logger.error("Test email: failed to send:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (error) {
    logger.error("Test email error:", error);
    captureServerError(error, { route: "POST /api/test-email" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
