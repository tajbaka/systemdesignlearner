import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/posthog-server";
import { practiceController } from "@/server/domains/practice/controller";
import { userController } from "@/server/domains/auth/controller";

export const runtime = "nodejs";

// ============================================================================
// Schemas
// ============================================================================

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

// ============================================================================
// POST /api/v2/practice/[slug]/[step]/assist
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; step: string }> }
) {
  try {
    // 1. Authenticate
    const profile = await userController.getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate params
    const { slug, step } = await params;
    logger.info("POST /api/v2/practice/[slug]/[step]/assist", { slug, step });

    if (!isValidStepSlug(step)) {
      return NextResponse.json({ error: "Invalid step type" }, { status: 400 });
    }

    // 3. Parse request body
    const body = await request.json();
    const parseResult = AssistRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    // 4. Call controller
    const userId = profile.email ?? profile.id;
    const result = await practiceController.getAssistanceStream(userId, {
      slug,
      stepSlug: step,
      messages: parseResult.data.messages,
      userEmail: profile.email ?? undefined,
    });

    // 5. Handle result
    if ("error" in result) {
      switch (result.error) {
        case "RATE_LIMITED":
          return NextResponse.json(
            { error: "Too many requests. Please wait a moment before trying again." },
            { status: 429 }
          );
        case "PROBLEM_NOT_FOUND":
          return NextResponse.json({ error: "Problem not found" }, { status: 404 });
      }
    }

    // 6. Stream response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
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
    captureServerError(error, { route: "POST /api/v2/practice/[slug]/[step]/assist" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
