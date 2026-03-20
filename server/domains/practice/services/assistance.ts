import { db, problems, problemVersions, problemSteps } from "@/packages/drizzle";
import { eq } from "drizzle-orm";
import { generateAssistanceStream } from "@/lib/gemini";
import { PRACTICE_STEPS, SLUGS_TO_STEPS } from "@/domains/practice/back-end/constants";

// ============================================================================
// Types
// ============================================================================

export type AssistanceStreamParams = {
  slug: string;
  stepSlug: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  userEmail?: string;
};

// ============================================================================
// Rate Limiter
// ============================================================================

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

export function isRateLimited(userId: string): boolean {
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

// ============================================================================
// Step-specific Coaching
// ============================================================================

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

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Prepare and return an assistance stream.
 * Fetches problem data, builds the system prompt, and returns the AI stream.
 */
export async function prepareAssistanceStream(params: AssistanceStreamParams) {
  const { slug, stepSlug, messages, userEmail } = params;

  const stepType = SLUGS_TO_STEPS[stepSlug as keyof typeof SLUGS_TO_STEPS] ?? stepSlug;

  const problem = await db.query.problems.findFirst({
    where: eq(problems.slug, slug),
    with: {
      versions: {
        where: eq(problemVersions.isCurrent, true),
        limit: 1,
      },
    },
  });

  if (!problem) return null;

  const currentVersion = problem.versions[0];
  if (!currentVersion) return null;

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

  const stream = await generateAssistanceStream(systemPrompt, geminiMessages, userEmail);

  return stream;
}
