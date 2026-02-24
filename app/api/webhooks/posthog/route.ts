import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/packages/drizzle";
import { sendNewProblemNotification } from "@/lib/email";
import { logger } from "@/lib/logger";

const posthogWebhookSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  event: z.literal("new_problem_available"),
  email: z.string().email("Valid email is required"),
  problemTitle: z.string().min(1),
  problemDescription: z.string().min(1),
  problemDifficulty: z.enum(["easy", "medium", "hard"]),
  problemSlug: z.string().min(1),
  timeToComplete: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = posthogWebhookSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { secret, email, ...problemData } = parsed.data;

    const webhookSecret = process.env.POSTHOG_WEBHOOK_SECRET;
    if (!webhookSecret || secret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has unsubscribed from new problem emails
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.email, email),
      columns: { newProblemEmailsEnabled: true },
    });

    if (profile && !profile.newProblemEmailsEnabled) {
      return NextResponse.json({ skipped: true, reason: "unsubscribed" }, { status: 200 });
    }

    const result = await sendNewProblemNotification({
      to: email,
      problemTitle: problemData.problemTitle,
      problemDescription: problemData.problemDescription,
      problemDifficulty: problemData.problemDifficulty,
      problemSlug: problemData.problemSlug,
      timeToComplete: problemData.timeToComplete,
    });

    if (!result.success) {
      logger.error("PostHog webhook: failed to send email:", result.error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("PostHog webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
