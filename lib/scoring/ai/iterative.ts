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

export type Topic = {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  required?: boolean;
};

export type IterativeTopicState = Record<string, boolean>;

export type StepConfig = {
  stepId: string;
  stepName: string;
  topics: Topic[]; // include both required and optional, mark required: true
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
  // for your UI “Good progress” card
  ui: {
    coveredLines: string[]; // “✓ URL Shortening: …”
    nextPrompt: string | null; // the one-line question
    blocking: boolean; // true if any required still missing
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
      temperature: 0.3,
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
): Promise<{ coverage: CoverageReport; nextTopicId: string | null; question: string | null }> {
  const topicsForModel = step.topics.map(t => ({
    id: t.id,
    label: t.label,
    description: t.description ?? "",
    // keywords are hints only; LLM must use full context of userContent
    keywords: t.keywords ?? [],
    required: Boolean(t.required),
  }));

  const prompt = `
You are a senior system design interviewer. Judge which topics the candidate has already covered in their answer.

Return JSON only with the exact schema:
{
  "covered": string[],           // topic ids clearly covered
  "missing": string[],           // topic ids not yet covered
  "nextTopicId": string | null,  // highest-priority missing topic (required first)
  "question": string | null      // one-sentence interviewer question for nextTopicId, or null if none needed
}

Rules
- Read the candidate's text carefully. Use context, not only keywords.
- Mark a topic "covered" only if the intent is explicit.
- If uncertain, treat it as missing.
- When writing the question, focus on the user's intent/behavior (e.g., “what should happen when...”) and never reveal solution details (no HTTP codes, algorithms, numbers, etc.).
- If a previous question exists and the topic is still missing, sharpen the same question without giving away the answer.

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
    question: string | null;
  }>(prompt);

  const coveredSet = new Set(result.covered);
  const missingSet = new Set(result.missing);

  // normalize to the provided topics order
  const covered = step.topics.filter(t => coveredSet.has(t.id)).map(t => ({ id: t.id, label: t.label }));
  const missing = step.topics
    .filter(t => missingSet.has(t.id))
    .map(t => ({ id: t.id, label: t.label, required: Boolean(t.required) }));

  const requiredList = step.topics.filter(t => t.required);
  const requiredCovered = requiredList.every(t => coveredSet.has(t.id));
  const allCovered = step.topics.every(t => coveredSet.has(t.id));

  return {
    coverage: { covered, missing, requiredCovered, allCovered },
    nextTopicId: result.nextTopicId ?? null,
    question: result.question ? result.question.trim() : null,
  };
}

/**
 * 2) Pick next topic: required first in declared order, then optional
 */
export function pickNextTopic(step: StepConfig, coverage: CoverageReport): Topic | null {
  const coveredIds = new Set(coverage.covered.map(c => c.id));

  // required first
  for (const t of step.topics.filter(x => x.required)) {
    if (!coveredIds.has(t.id)) return t;
  }
  // then optional
  for (const t of step.topics.filter(x => !x.required)) {
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
 *    required each worth 1, optional each worth 1, simple and transparent
 */
function computeScore(step: StepConfig, coveredIds: Set<string>) {
  const max = step.topics.length;
  const obtained = step.topics.reduce((acc, t) => acc + (coveredIds.has(t.id) ? 1 : 0), 0);
  const percentage = max === 0 ? 100 : Math.round((obtained / max) * 100);
  return { obtained, max, percentage };
}

/**
 * 5) Main entry for your Functional Requirements step
 */
export async function getIterativeFeedback(
  step: StepConfig,
  userContent: string,
  previousQuestion?: string | null
): Promise<IterativeFeedbackResult> {
  const { coverage, nextTopicId, question } = await assessCoverage(step, userContent, previousQuestion);

  let nextQuestion: QuestionResult | null = null;
  const topicFromModel = nextTopicId ? step.topics.find(t => t.id === nextTopicId) : null;

  if (!coverage.allCovered) {
    let topic = topicFromModel ?? pickNextTopic(step, coverage);

    if (topic) {
      if (question && topicFromModel && topicFromModel.id === topic.id) {
        const q = question.replace(/\s+/g, " ").trim();
        nextQuestion = { question: q.endsWith("?") ? q : `${q}?`, topicId: topic.id };
      } else {
        nextQuestion = await generateSingleQuestion({
          step,
          topic,
          userContent,
          previousQuestion,
        });
      }
    }
  }

  const coveredIds = new Set(coverage.covered.map(c => c.id));
  const score = computeScore(step, coveredIds);
  const coveredLines = coverage.covered.map(c => `✓ ${c.label}: covered`);
  const blocking = !coverage.requiredCovered;

  return {
    coverage,
    nextQuestion,
    score,
    ui: {
      coveredLines,
      nextPrompt: nextQuestion ? nextQuestion.question : null,
      blocking,
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
