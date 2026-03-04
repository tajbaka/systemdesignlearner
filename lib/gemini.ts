import { GoogleGenAI as PostHogGoogleGenAI } from "@posthog/ai";
import { GoogleGenAI, Type } from "@google/genai";
import { PostHog } from "posthog-node";

// Server-side PostHog client (singleton)
let phClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!phClient) {
    phClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return phClient;
}

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
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: TEMPERATURE,
      responseMimeType: "application/json",
      responseSchema: functionalEvaluationSchema,
    },
    posthogDistinctId,
  });
  return response.text ?? "";
}

/**
 * Generate an API evaluation using Gemini with strict schema.
 */
export async function generateApiEvaluation(
  prompt: string,
  posthogDistinctId?: string
): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: TEMPERATURE,
      responseMimeType: "application/json",
      responseSchema: apiEvaluationSchema,
    },
    posthogDistinctId,
  });
  return response.text ?? "";
}

/**
 * Generate an API extraction using Gemini.
 */
export async function generateExtraction(
  prompt: string,
  posthogDistinctId?: string
): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: TEMPERATURE,
      responseMimeType: "application/json",
      responseSchema: extractionSchema,
    },
    posthogDistinctId,
  });
  return response.text ?? "";
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
  });
}
