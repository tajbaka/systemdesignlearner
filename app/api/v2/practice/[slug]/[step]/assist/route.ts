import { NextRequest, NextResponse } from "next/server";
import { db, problems, problemVersions, problemSteps } from "@/packages/drizzle";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import { generateAssistanceStream } from "@/lib/gemini";
import { PRACTICE_STEPS } from "@/domains/practice/back-end/constants";

export const runtime = "nodejs";

const VALID_STEPS = ["functional", "nonFunctional", "api", "highLevelDesign", "score"] as const;

function isValidStep(step: string): step is (typeof VALID_STEPS)[number] {
  return VALID_STEPS.includes(step as (typeof VALID_STEPS)[number]);
}

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const AssistRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

function buildSystemPrompt(
  problemTitle: string,
  problemDescription: string,
  stepType: string,
  stepRequirements: unknown[]
): string {
  const stepMeta = Object.values(PRACTICE_STEPS).find(
    (s) => s.route === stepType || Object.entries(PRACTICE_STEPS).find(([k]) => k === stepType)
  );
  const stepTitle = stepMeta?.title ?? stepType;

  return [
    `You are a helpful system design tutor. The student is working on a practice problem and is currently on the "${stepTitle}" step.`,
    "",
    `## Problem: ${problemTitle}`,
    problemDescription,
    "",
    stepRequirements.length > 0
      ? `## Step Requirements\n${JSON.stringify(stepRequirements, null, 2)}`
      : "",
    "",
    "## Guidelines",
    "- Guide the student toward the answer rather than giving it directly.",
    "- Use concise explanations. Prefer bullet points over walls of text.",
    "- If the student asks something unrelated to system design, gently redirect.",
    "- You may use markdown formatting in your responses.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; step: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, step } = await params;
    logger.info("POST /api/v2/practice/[slug]/[step]/assist", { slug, step });

    if (!isValidStep(step)) {
      return NextResponse.json({ error: "Invalid step type" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = AssistRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { messages } = parseResult.data;

    const problem = await db.query.problems.findFirst({
      where: eq(problems.slug, slug),
      with: {
        versions: {
          where: eq(problemVersions.isCurrent, true),
          limit: 1,
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const currentVersion = problem.versions[0];
    if (!currentVersion) {
      return NextResponse.json({ error: "Problem version not found" }, { status: 404 });
    }

    const allSteps = await db.query.problemSteps.findMany({
      where: eq(problemSteps.problemId, problem.id),
    });
    const stepRecord = allSteps.find((s) => s.stepType === step);

    const stepData = (stepRecord?.data as { requirements?: unknown[] }) ?? {};
    const requirements = stepData.requirements ?? [];

    const systemPrompt = buildSystemPrompt(
      currentVersion.title ?? "",
      currentVersion.description ?? "",
      step,
      requirements
    );

    const geminiMessages = messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      content: m.content,
    }));

    const stream = await generateAssistanceStream(
      systemPrompt,
      geminiMessages,
      profile.email ?? undefined
    );

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text ?? "";
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          logger.error("Assistance stream error:", err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify("[ERROR]")}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("POST /api/v2/practice/[slug]/[step]/assist - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
