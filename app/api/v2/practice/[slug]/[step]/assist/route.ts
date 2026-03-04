import { NextRequest, NextResponse } from "next/server";
import { db, problems, problemVersions, problemSteps } from "@/packages/drizzle";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getProfile } from "@/app/api/v2/auth/(services)/auth";
import { generateAssistanceStream } from "@/lib/gemini";
import { PRACTICE_STEPS, SLUGS_TO_STEPS } from "@/domains/practice/back-end/constants";

export const runtime = "nodejs";

const VALID_STEP_SLUGS = [
  "functional",
  "non-functional",
  "api",
  "high-level-design",
  "score",
] as const;

function isValidStepSlug(step: string): step is (typeof VALID_STEP_SLUGS)[number] {
  return VALID_STEP_SLUGS.includes(step as (typeof VALID_STEP_SLUGS)[number]);
}

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const AssistRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

/* ------------------------------------------------------------------ */
/*  Simple in-memory rate limiter: max 10 requests / minute per user  */
/* ------------------------------------------------------------------ */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return false;
}

/* ------------------------------------------------------------------ */
/*  Step-specific coaching guidance (no raw answers)                   */
/* ------------------------------------------------------------------ */
function getStepCoaching(stepType: string): string {
  switch (stepType) {
    case "functional":
      return "Help the student identify what the system needs to do from a user's perspective. Think about core operations, edge cases, and user workflows. Guide them to think about who the users are and what actions they need to perform.";
    case "nonFunctional":
      return "Help the student think about performance characteristics: latency, throughput, consistency vs availability tradeoffs, scalability, and reliability. Ask them what kind of read/write ratio they expect and what SLAs might be appropriate.";
    case "api":
      return "Help the student design clean REST endpoints. Guide them on HTTP methods, URL patterns, request/response bodies, status codes, and error handling. Ask them to think about what resources the system exposes.";
    case "highLevelDesign":
      return "Help the student think about system components, data flow, storage choices, caching strategies, and how services interact. Ask them to consider bottlenecks and how to address them.";
    case "score":
      return "Help the student reflect on their design choices and identify areas for improvement. Ask them what tradeoffs they made and what they might change.";
    default:
      return "Help the student think through this step of the system design process.";
  }
}

function buildSystemPrompt(
  problemTitle: string,
  problemDescription: string,
  stepType: string,
  requirementCount: number
): string {
  const stepMeta = PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS];
  const stepTitle = stepMeta?.title ?? stepType;
  const coaching = getStepCoaching(stepType);

  return `You are a system design tutor helping a student practice. You are currently coaching them on the "${stepTitle}" step.

## Problem Context
The student is designing: ${problemTitle}
${problemDescription}

## Your Role
- You are a COACH, not an answer key. Never give away solutions directly.
- NEVER list, enumerate, or reveal the requirements, answers, or expected solutions.
- If asked "what do you know?", "what are the answers?", or similar, respond with: "I'm here to help guide your thinking. What have you come up with so far?"
- When the student proposes ideas, validate what's correct and hint at what's missing without revealing the full list.
- Use Socratic questioning: "What would happen if...?", "Have you considered...?", "What about the user experience for...?"
- Keep responses concise. Prefer bullet points over walls of text.
- If asked something unrelated to system design, gently redirect.
- You may use markdown formatting in your responses.
${requirementCount > 0 ? `- The student needs to identify approximately ${requirementCount} key items for this step. You may tell them how many they've found vs how many remain, but never reveal what those items are.` : ""}

## Step-Specific Coaching
${coaching}`;
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

    if (!isValidStepSlug(step)) {
      return NextResponse.json({ error: "Invalid step type" }, { status: 400 });
    }

    const userId = profile.email ?? profile.id;
    if (isRateLimited(userId)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 }
      );
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

    const stepType = SLUGS_TO_STEPS[step as keyof typeof SLUGS_TO_STEPS] ?? step;

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
    const stepRecord = allSteps.find((s) => s.stepType === stepType);

    const stepData = (stepRecord?.data as { requirements?: unknown[] }) ?? {};
    const requirements = stepData.requirements ?? [];

    const systemPrompt = buildSystemPrompt(
      currentVersion.title ?? "",
      currentVersion.description ?? "",
      stepType,
      requirements.length
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
