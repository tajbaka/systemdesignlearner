import { GoogleGenAI as PostHogGoogleGenAI } from "@posthog/ai";
import { GoogleGenAI, Type } from "@google/genai";
import { getPostHogClient } from "@/lib/posthog-server";

// Gemini client with PostHog LLM analytics (singleton)
let client: GoogleGenAI | PostHogGoogleGenAI | null = null;

function getClient(): GoogleGenAI | PostHogGoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please add it to your .env file."
    );
  }

  if (!client) {
    const posthog = getPostHogClient();
    client = posthog
      ? new PostHogGoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, posthog })
      : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return client;
}

const MODEL = "gemini-2.0-flash";
const TEMPERATURE = 0.1;

// Custom error class for classified Gemini failures
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: "RATE_LIMIT" | "TIMEOUT" | "UNAVAILABLE" | "UNKNOWN"
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("resource exhausted"))
      return true;
    if (msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded"))
      return true;
    if (msg.includes("timeout") || msg.includes("aborted") || error.name === "AbortError")
      return true;
  }
  return false;
}

function classifyError(error: unknown): GeminiError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("resource exhausted")) {
      return new GeminiError("AI service rate limited", "RATE_LIMIT");
    }
    if (msg.includes("timeout") || msg.includes("aborted") || error.name === "AbortError") {
      return new GeminiError("AI service timed out", "TIMEOUT");
    }
    if (msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded")) {
      return new GeminiError("AI service temporarily unavailable", "UNAVAILABLE");
    }
  }
  return new GeminiError(
    error instanceof Error ? error.message : "Unknown Gemini error",
    "UNKNOWN"
  );
}

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 30_000;

async function retryWithBackoff<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      return await fn(signal);
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES && isTransientError(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      break;
    }
  }

  throw classifyError(lastError);
}

/**
 * Schema for Functional & Non-Functional evaluation.
 * These steps use a simple met/not-met boolean.
 */
const functionalEvaluationSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          feedback: { type: Type.STRING },
          relatedHintId: { type: Type.STRING, nullable: true },
          met: { type: Type.BOOLEAN },
        },
        required: ["id", "feedback", "met"],
      },
    },
  },
  required: ["results"],
};

/**
 * Schema for API evaluation with strict field requirements.
 * All correctness fields are REQUIRED to ensure consistent responses.
 */
const apiEvaluationSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          feedback: { type: Type.STRING },
          relatedHintId: { type: Type.STRING, nullable: true },
          found: { type: Type.BOOLEAN },
          correctMethod: { type: Type.BOOLEAN },
          correctPath: { type: Type.BOOLEAN },
          correctDescription: { type: Type.BOOLEAN },
          matchedEndpointId: { type: Type.STRING, nullable: true },
        },
        required: ["id", "feedback", "found", "correctMethod", "correctPath", "correctDescription"],
      },
    },
  },
  required: ["results"],
};

/**
 * Schema for API extraction - flat structure with 5 fields
 */
const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    mainAction: { type: Type.STRING },
    requestBody: { type: Type.STRING },
    responseFormat: { type: Type.STRING },
    successStatusCode: { type: Type.STRING },
    errorCases: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["mainAction", "requestBody", "responseFormat", "successStatusCode", "errorCases"],
};

/**
 * Generate a Functional/Non-Functional evaluation using Gemini.
 */
export async function generateEvaluation(
  prompt: string,
  posthogDistinctId?: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: functionalEvaluationSchema,
      },
      posthogDistinctId,
      posthogProperties: { llm_feature: "feedback", feedback_type: "functional" },
    });
    return response.text ?? "";
  });
}

/**
 * Generate an API evaluation using Gemini with strict schema.
 */
export async function generateApiEvaluation(
  prompt: string,
  posthogDistinctId?: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: apiEvaluationSchema,
      },
      posthogDistinctId,
      posthogProperties: { llm_feature: "feedback", feedback_type: "api" },
    });
    return response.text ?? "";
  });
}

/**
 * Generate an API extraction using Gemini.
 */
export async function generateExtraction(
  prompt: string,
  posthogDistinctId?: string
): Promise<string> {
  return retryWithBackoff(async () => {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
      },
      posthogDistinctId,
      posthogProperties: { llm_feature: "feedback", feedback_type: "extraction" },
    });
    return response.text ?? "";
  });
}

const ASSISTANCE_TEMPERATURE = 0.3;

type AssistanceMessage = { role: "user" | "model"; content: string };

/**
 * Stream a conversational assistance response from Gemini.
 * Returns an async generator that yields text chunks.
 */
export async function generateAssistanceStream(
  systemInstruction: string,
  messages: AssistanceMessage[],
  posthogDistinctId?: string
) {
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  return getClient().models.generateContentStream({
    model: MODEL,
    contents,
    config: {
      temperature: ASSISTANCE_TEMPERATURE,
      systemInstruction,
    },
    posthogDistinctId,
    posthogProperties: { llm_feature: "chat" },
  });
}
