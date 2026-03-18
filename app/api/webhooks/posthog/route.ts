import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/packages/drizzle";
import {
  sendNewProblemNotification,
  sendProblemReminder,
  sendProblemLastReminder,
} from "@/lib/email";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";

const newProblemSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  event: z.literal("new_problem_available"),
  email: z.string().email("Valid email is required"),
  problemTitle: z.string().min(1),
  problemDescription: z.string().min(1),
  problemDifficulty: z.enum(["easy", "medium", "hard"]),
  problemSlug: z.string().min(1),
  timeToComplete: z.string().min(1),
});

const problemReminderSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  event: z.literal("problem_reminder"),
  email: z.string().email("Valid email is required"),
  problemTitle: z.string().min(1),
  problemDifficulty: z.enum(["easy", "medium", "hard"]),
  problemSlug: z.string().min(1),
});

const problemLastReminderSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  event: z.literal("problem_last_reminder"),
  email: z.string().email("Valid email is required"),
  problemTitle: z.string().min(1),
  problemDifficulty: z.enum(["easy", "medium", "hard"]),
  problemSlug: z.string().min(1),
});

const webhookSchema = z.discriminatedUnion("event", [
  newProblemSchema,
  problemReminderSchema,
  problemLastReminderSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { secret, email } = parsed.data;

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

    let result;

    if (parsed.data.event === "new_problem_available") {
      result = await sendNewProblemNotification({
        to: email,
        problemTitle: parsed.data.problemTitle,
        problemDescription: parsed.data.problemDescription,
        problemDifficulty: parsed.data.problemDifficulty,
        problemSlug: parsed.data.problemSlug,
        timeToComplete: parsed.data.timeToComplete,
      });
    } else if (parsed.data.event === "problem_reminder") {
      result = await sendProblemReminder({
        to: email,
        problemTitle: parsed.data.problemTitle,
        problemDifficulty: parsed.data.problemDifficulty,
        problemSlug: parsed.data.problemSlug,
      });
    } else {
      result = await sendProblemLastReminder({
        to: email,
        problemTitle: parsed.data.problemTitle,
        problemDifficulty: parsed.data.problemDifficulty,
        problemSlug: parsed.data.problemSlug,
      });
    }

    if (!result.success) {
      logger.error("PostHog webhook: failed to send email:", result.error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("PostHog webhook error:", error);
    captureServerError(error, { route: "POST /api/webhooks/posthog" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
