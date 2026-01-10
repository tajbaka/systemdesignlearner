/**
 * Iterative Feedback Engine
 *
 * - Orders topics: required → optional
 * - Always verifies coverage with Gemini using the user's current text and the step config
 * - Emits exactly ONE interviewer-style question per loop
 * - Sharpens the same question if the last attempt did not address it
 * - Required topics are blocking; optional contribute to max score
 * - Gemini only
 */

import { getGenAI } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import type { Solution, Hint } from "../types";

export type Topic = {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  required?: boolean;
  weight?: number; // Points awarded for covering this topic (defaults to 1)
  hints?: Hint[]; // Hints to guide users when this topic is missing
  solutions?: Solution[]; // Example solutions shown after 3 failed attempts
};

export type IterativeTopicState = Record<string, boolean>;

export type EndpointRequirement = {
  id: string;
  method: string;
  correctPath?: string; // The correct path to use as solution after 3 failed attempts
  purpose: string;
  required: boolean;
  solutions?: Solution[]; // Solutions for the textarea/notes content, not the path
};

export type StepConfig = {
  stepId: string;
  stepName: string;
  topics: Topic[]; // include both required and optional, mark required: true
  endpointRequirements?: EndpointRequirement[]; // For API step: specific endpoint validation
};

export type CoverageReport = {
  covered: { id: string; label: string }[];
  missing: { id: string; label: string; required: boolean }[];
  requiredCovered: boolean;
  allCovered: boolean;
};

export type QuestionResult = {
  question: string; // single sentence only
  topicId: string;
};

export type IterativeFeedbackResult = {
  coverage: CoverageReport;
  nextQuestion: QuestionResult | null;
  score: {
    obtained: number;
    max: number;
    percentage: number;
  };
  // for your UI "Good progress" card
  ui: {
    coveredLines: string[]; // "✓ URL Shortening: …"
    nextPrompt: string | null; // the one-line question
    blocking: boolean; // true if any required still missing
    showSolution?: boolean; // After 3 attempts, indicate that solutions should be fetched from config and displayed
  };
};

/**
 * Utility: model client for JSON-only prompts with strict parsing and 1 retry
 */
async function callGeminiJson<T>(prompt: string): Promise<T> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.0,
      responseMimeType: "application/json",
    },
  });

  const run = async () => {
    const res = await model.generateContent(prompt);
    const text = res.response.text().trim();
    try {
      return JSON.parse(text) as T;
    } catch {
      // try to extract first JSON object if the model wrapped it
      const m = text.match(/\{[\s\S]*\}$/);
      if (!m) throw new Error("No JSON block found");
      return JSON.parse(m[0]) as T;
    }
  };

  try {
    return await run();
  } catch (e) {
    logger.error("Gemini JSON parse failed, retrying once", { error: String(e) });
    return await run();
  }
}

/**
 * 1) Ask Gemini to judge coverage against your topic list
 *    We pass the userContent plus topic metadata and require a simple map.
 */
export async function assessCoverage(
  step: StepConfig,
  userContent: string,
  previousQuestion?: string | null
): Promise<{ coverage: CoverageReport; nextTopicId: string | null }> {
  const topicsForModel = step.topics.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description ?? "",
    // keywords are hints only; LLM must use full context of userContent
    keywords: t.keywords ?? [],
    required: Boolean(t.required),
  }));

  const isApiStep = step.stepId === "api";

  // Build endpoint-specific validation rules for API step
  let endpointValidationRules = "";
  if (isApiStep && step.endpointRequirements) {
    const endpointDetails = step.endpointRequirements.map((ep) => ({
      id: ep.id,
      method: ep.method,
      correctPath: ep.correctPath,
      purpose: ep.purpose,
      required: ep.required,
    }));

    endpointValidationRules = `
API Endpoint Validation Requirements:
For each endpoint, verify:
1. **Path Structure**: Must follow the pattern shown in correctPath (e.g., if example is "/api/v1/shorten", user should use "/api/v1/..." structure)
2. **Request Body** (for POST/PATCH): Must explicitly mention the specific field names that are sent in the request, either in JSON format OR in natural language (e.g., "body contains longUrl, customSlug, and expiresAt fields" counts as covered)
3. **Response Details**: Must explicitly mention what fields or data are returned, either in JSON format OR in natural language (e.g., "returns the shortUrl, slug, and createdAt" counts as covered)
4. **Error Handling**: Must mention at least one error case (e.g., 400, 404, 409, 410) or describe what happens when something goes wrong

Expected Endpoints:
${JSON.stringify(endpointDetails, null, 2)}

IMPORTANT: Accept both structured (JSON) and natural language descriptions as long as they explicitly name the fields/data involved.

When asking questions about missing endpoints:
- If an endpoint exists but doesn't mention specific field names for request body (POST/PATCH), ask: "What specific fields or data should be included in the request body for [endpoint purpose]?"
- If path structure doesn't match example pattern, ask: "What path structure would you use for [endpoint purpose] following REST API conventions?"
- If response details are missing or vague, ask: "What specific data or fields should be returned in the response?"
- If error handling is missing, ask: "What should happen if something goes wrong with this request?"
`;
  }

  const prompt = `
You are a senior system design interviewer. Judge which topics the candidate has already covered in their answer.

Return JSON only with the exact schema:
{
  "covered": string[],           // topic ids clearly covered
  "missing": string[],           // topic ids not yet covered
  "nextTopicId": string | null   // highest-priority missing topic (required first)
}

Rules
- Read the candidate's text carefully. Use context, not only keywords.
- Mark a topic "covered" ONLY if the candidate explicitly addresses it with sufficient detail.
- For FUNCTIONAL requirements: Focus on WHAT the system should do (user-facing behavior), NOT HOW it's implemented. Accept high-level descriptions without requiring technical implementation details.
- For functional topics like "uniqueness": Accept that the candidate mentioned the requirement (e.g., "each URL should be unique") without requiring collision handling, concurrency, or algorithm details - those belong in later design steps.
- For storage/persistence in non-functional requirements: The candidate must explicitly mention databases, persistence, or storage - don't infer it.
- For rate limiting, abuse prevention, or security topics: The candidate must explicitly mention them - don't assume they're implied.
- For admin/user management topics: The candidate must explicitly describe the feature - don't assume it's covered by authentication.
${
  isApiStep
    ? `- For API endpoint topics: An endpoint is covered if it includes BOTH request details AND response details with explicit field/data names. Accept both JSON format and natural language.
- Examples that COUNT as covered: "body contains longUrl, customSlug, and expiresAt" OR "body: { longUrl, customSlug, expiresAt }" OR "request includes the long URL, optional custom slug, and optional expiration date"
- Examples that are TOO VAGUE: "request: url" OR "body contains the URL" OR "returns the short link" (must specify field names)
- Focus on the NEXT missing topic in priority order (required topics first). Never mark topics already covered as missing.`
    : ""
}
- If uncertain or if coverage is incomplete, treat it as missing.

${endpointValidationRules}

Step: ${step.stepName}
Topics:
${JSON.stringify(topicsForModel, null, 2)}

Candidate answer:
"""
${userContent}
"""

Previous question (if any):
${previousQuestion ? `"${previousQuestion}"` : "null"}
`;

  const result = await callGeminiJson<{
    covered: string[];
    missing: string[];
    nextTopicId: string | null;
  }>(prompt);

  const coveredSet = new Set(result.covered);
  const missingSet = new Set(result.missing);

  // normalize to the provided topics order
  const covered = step.topics
    .filter((t) => coveredSet.has(t.id))
    .map((t) => ({ id: t.id, label: t.label }));
  const missing = step.topics
    .filter((t) => missingSet.has(t.id))
    .map((t) => ({ id: t.id, label: t.label, required: Boolean(t.required) }));

  const requiredList = step.topics.filter((t) => t.required);
  const requiredCovered = requiredList.every((t) => coveredSet.has(t.id));
  // For 100% score, only core requirements need to be covered (optional are bonus)
  const allCovered = requiredCovered;

  return {
    coverage: { covered, missing, requiredCovered, allCovered },
    nextTopicId: result.nextTopicId ?? null,
  };
}

/**
 * 2) Pick next topic: required first in declared order, then optional
 */
export function pickNextTopic(step: StepConfig, coverage: CoverageReport): Topic | null {
  const coveredIds = new Set(coverage.covered.map((c) => c.id));

  // required first
  for (const t of step.topics.filter((x) => x.required)) {
    if (!coveredIds.has(t.id)) return t;
  }
  // then optional
  for (const t of step.topics.filter((x) => !x.required)) {
    if (!coveredIds.has(t.id)) return t;
  }
  return null;
}

/**
 * 3) Ask Gemini to craft exactly one interviewer-style question about the chosen topic
 *    If there was a previous unanswered question, we ask it to sharpen the same question.
 */
export async function generateSingleQuestion(opts: {
  step: StepConfig;
  topic: Topic;
  userContent: string;
  previousQuestion?: string | null;
}): Promise<QuestionResult> {
  const { step, topic, userContent, previousQuestion } = opts;

  const prompt = `
You are a system design interviewer. Ask ONE question that nudges the candidate toward covering the missing requirement without revealing the answer. Keep it to one sentence, no bullets, no explanations.

Constraints:
- Target topic id: ${topic.id}
- Topic label: ${topic.label}
- Step: ${step.stepName}
- Ask about the user's intent/behavior (e.g., "what should happen when...") rather than specific solutions or technical implementations.
- Do NOT mention concrete solution hints such as HTTP status codes, data structures, algorithms, or numeric values.
- For FUNCTIONAL requirements: Only ask about user-facing behavior and features. Do NOT ask about implementation details like collision handling, concurrency, algorithms, or data structures - those belong in later steps.
- If a previous question exists and the candidate still missed it, sharpen the same question by emphasizing the outcome they still haven't described, but still avoid giving the answer.
- Output JSON with schema: { "question": "..." }

Candidate answer:
"""
${userContent}
"""

Previous question (if any):
${previousQuestion ? `"${previousQuestion}"` : "null"}
`;

  const data = await callGeminiJson<{ question: string }>(prompt);

  // normalize to single sentence
  const q = data.question.replace(/\s+/g, " ").trim();
  return { question: q.endsWith("?") ? q : q + "?", topicId: topic.id };
}

/**
 * 4) Compute score
 *    Simple scoring: max = sum of all core topic weights
 *    obtained = sum of covered core topic weights
 *    percentage = obtained / max * 100
 *    (Optional topics don't affect the score - they're just bonus feedback)
 */
function computeScore(step: StepConfig, coveredIds: Set<string>) {
  const coreTopics = step.topics.filter((t) => t.required);

  // Max score = sum of all core topic weights
  const max = coreTopics.reduce((acc, t) => acc + (t.weight ?? 1), 0);

  // Obtained = sum of covered core topic weights
  const obtained = coreTopics.reduce((acc, t) => {
    if (coveredIds.has(t.id)) {
      return acc + (t.weight ?? 1);
    }
    return acc;
  }, 0);

  // Percentage = obtained / max
  const percentage = max === 0 ? 100 : Math.round((obtained / max) * 100);

  return { obtained, max, percentage };
}

/**
 * 5) Main entry for your Functional Requirements step
 */
export async function getIterativeFeedback(
  step: StepConfig,
  userContent: string,
  previousQuestion?: string | null,
  attemptCount?: number
): Promise<IterativeFeedbackResult> {
  // Gemini validates coverage only (no question generation)
  const { coverage, nextTopicId } = await assessCoverage(step, userContent, previousQuestion);

  let nextQuestion: QuestionResult | null = null;
  const topicFromModel = nextTopicId ? step.topics.find((t) => t.id === nextTopicId) : null;

  // Check if there are ANY topics left (core OR optional)
  const hasAnyMissingTopics = coverage.missing.length > 0;

  if (hasAnyMissingTopics) {
    const topic = topicFromModel ?? pickNextTopic(step, coverage);

    if (topic) {
      // Use hints from config instead of Gemini-generated questions
      if (topic.hints && topic.hints.length > 0) {
        // Use the first hint, or cycle through hints based on attempt count if user hasn't addressed it
        const hintIndex =
          previousQuestion && topic.hints.length > 1
            ? Math.min((attemptCount ?? 0) % topic.hints.length, topic.hints.length - 1)
            : 0;
        const hint = topic.hints[hintIndex];
        nextQuestion = {
          question: hint.text.endsWith("?") ? hint.text : `${hint.text}?`,
          topicId: topic.id,
        };
      } else {
        // Fallback: if no hints in config, use Gemini (for backward compatibility)
        nextQuestion = await generateSingleQuestion({
          step,
          topic,
          userContent,
          previousQuestion,
        });
      }
    }
  }

  const coveredIds = new Set(coverage.covered.map((c) => c.id));
  const score = computeScore(step, coveredIds);

  // Build covered lines with visual distinction for core vs optional
  const coreTopics = step.topics.filter((t) => t.required);
  const optionalTopics = step.topics.filter((t) => !t.required);

  const coveredCoreLines = coverage.covered
    .filter((c) => coreTopics.some((t) => t.id === c.id))
    .map((c) => `${c.label}: covered`);

  const coveredOptionalLines = coverage.covered
    .filter((c) => optionalTopics.some((t) => t.id === c.id))
    .map((c) => `${c.label}: covered`);

  // Combine: core first, then optional (with bonus indicator if any)
  const coveredLines = [
    ...coveredCoreLines,
    ...(coveredOptionalLines.length > 0 ? coveredOptionalLines : []),
  ];

  const blocking = !coverage.requiredCovered;

  // After 3 attempts (global per step), indicate that solutions should be shown
  // The UI layer will fetch solutions from the config based on problem slug and step type
  const showSolution = attemptCount !== undefined && attemptCount >= 3 && blocking;

  return {
    coverage,
    nextQuestion,
    score,
    ui: {
      coveredLines,
      nextPrompt: nextQuestion ? nextQuestion.question : null,
      blocking,
      showSolution,
    },
  };
}

/**
 * 6) After the user revises their text in response to the question, call this to see if it was addressed.
 *    We ask Gemini to compare old vs new and decide if the chosen topic is now covered.
 *    If not, you will call generateSingleQuestion again with previousQuestion to sharpen it.
 */
export async function evaluateRevision(
  step: StepConfig,
  topic: Topic,
  previousContent: string,
  newContent: string,
  previousQuestion: string
): Promise<{ addressed: boolean; reasoning: string }> {
  const prompt = `
You are a system design interviewer. Decide if the candidate addressed the topic after your question.

Return JSON only:
{ "addressed": true|false, "reasoning": "short phrase" }

Topic id: ${topic.id}
Topic label: ${topic.label}
Question you asked: "${previousQuestion}"

Before:
"""
${previousContent}
"""

After:
"""
${newContent}
"""

Rules
- Mark addressed only if the new content clearly includes that topic with specific intent.
- If uncertain, return false.
`;

  const data = await callGeminiJson<{ addressed: boolean; reasoning: string }>(prompt);
  return { addressed: Boolean(data.addressed), reasoning: String(data.reasoning || "").trim() };
}
