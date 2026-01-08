import type { Requirements } from "./types";
import type { ApiEndpoint } from "./types";
import type { ProblemScoringConfig } from "@/lib/scoring/types";
import { logger } from "@/lib/logger";

export type VerificationResult = {
  canProceed: boolean;
  blocking: string[];
  warnings: string[];
};

/**
 * Context needed for verification prompts.
 * Uses scoring config as the source of truth for all requirements.
 */
export type VerificationContext = {
  scenarioTitle: string;
  scoringConfig: ProblemScoringConfig;
};

/**
 * Input types for verification prompts
 */
export type FunctionalVerificationInput = {
  step: "functional";
  summary: string;
  selectedFeatures: Requirements["functional"];
};

export type NonFunctionalVerificationInput = {
  step: "nonFunctional";
  notes: string;
};

export type ApiVerificationInput = {
  step: "api";
  endpoints: ApiEndpoint[];
  selectedFeatures: Requirements["functional"];
};

export type VerificationInput =
  | FunctionalVerificationInput
  | NonFunctionalVerificationInput
  | ApiVerificationInput;

const PROMPT_BUILDERS = {
  functional: (input: FunctionalVerificationInput, context: VerificationContext) => {
    const { scenarioTitle, scoringConfig } = context;
    const required = scoringConfig.steps.functional.coreRequirements;
    const optional = scoringConfig.steps.functional.optionalRequirements.filter(
      (opt: { id: string }) => input.selectedFeatures[opt.id as keyof typeof input.selectedFeatures]
    );

    return `You are verifying functional requirements for a ${scenarioTitle} system design practice exercise.

**Reference Requirements:**

REQUIRED Features (user MUST mention these):
${required.map((r: { label: string; description: string }) => `- ${r.label}: ${r.description}`).join("\n")}

OPTIONAL Features (user selected these, should mention them):
${optional.length > 0 ? optional.map((o: { label: string; description: string }) => `- ${o.label}: ${o.description}`).join("\n") : "None selected"}

**User's Input:**
${input.summary}

**Task:**
Analyze the user's functional requirements and return a JSON response with:
1. "canProceed" (boolean) - false ONLY if missing required features
2. "blocking" (array of strings) - critical missing required features
3. "warnings" (array of strings) - suggestions for optional features or clarity

Return ONLY valid JSON in this format:
{
  "canProceed": true,
  "blocking": [],
  "warnings": ["suggestion 1", "suggestion 2"]
}`;
  },

  nonFunctional: (input: NonFunctionalVerificationInput, context: VerificationContext) => {
    const { scenarioTitle, scoringConfig } = context;
    const required = scoringConfig.steps.nonFunctional.coreRequirements || [];
    const optional = scoringConfig.steps.nonFunctional.optionalRequirements || [];

    return `You are verifying non-functional requirements for a ${scenarioTitle} system design.

**Required Non-Functional Requirements (user MUST address these):**
${required.map((r: { label: string; description: string }) => `- ${r.label}: ${r.description}`).join("\n")}

**Optional Non-Functional Requirements (user may address these):**
${optional.length > 0 ? optional.map((o: { label: string; description: string }) => `- ${o.label}: ${o.description}`).join("\n") : "None"}

**Task:**
1. Check if text description addresses the required non-functional requirements (blocking if missing)

Return ONLY valid JSON:
{
  "canProceed": true,
  "blocking": [],
  "warnings": []
}`;
  },

  api: (input: ApiVerificationInput, context: VerificationContext) => {
    const { scenarioTitle, scoringConfig } = context;
    const api = scoringConfig.steps.api;

    const requiredEndpoints = api.requiredEndpoints || [];
    const optionalEndpoints = (api.optionalEndpoints || []).filter(
      (e: { requiredBy?: string[] }) => {
        if (!e.requiredBy) return true;
        return e.requiredBy.some(
          (reqId: string) => input.selectedFeatures[reqId as keyof typeof input.selectedFeatures]
        );
      }
    );

    return `You are verifying API design for a ${scenarioTitle} system.

**Required Endpoints:**
${requiredEndpoints.map((e) => `- ${e.method} ${e.examplePath || e.pathPattern || "endpoint"}: ${e.purpose}`).join("\n")}

**Optional Endpoints (based on selected features):**
${optionalEndpoints.length > 0 ? optionalEndpoints.map((e) => `- ${e.method} ${e.examplePath || e.pathPattern || "endpoint"}: ${e.purpose}`).join("\n") : "None"}

**User's API Definition:**
${input.endpoints.map((e) => `${e.method} ${e.path}: ${e.notes.substring(0, 100)}`).join("\n")}

**Task:**
1. Verify all required endpoints are present (blocking if missing)
2. Check HTTP methods are appropriate (GET for reads, POST for creates, etc.)
3. Check path structure follows REST conventions
4. Verify endpoint descriptions mention request/response

Return ONLY valid JSON:
{
  "canProceed": true,
  "blocking": [],
  "warnings": []
}`;
  },
};

/**
 * Generic function to build verification prompt based on step
 */
export function buildVerificationPrompt(input: VerificationInput, context: VerificationContext) {
  const builder = PROMPT_BUILDERS[input.step] as (
    input: VerificationInput,
    context: VerificationContext
  ) => string;

  if (!builder) {
    throw new Error(`No prompt builder for step: ${input.step}`);
  }

  return builder(input, context);
}

/**
 * Build prompt for functional requirements verification
 * @deprecated Use buildVerificationPrompt instead
 */
export function buildFunctionalPrompt(
  summary: string,
  selectedFeatures: Requirements["functional"],
  context: VerificationContext
) {
  return buildVerificationPrompt({ step: "functional", summary, selectedFeatures }, context);
}

/**
 * Build prompt for non-functional requirements verification
 * @deprecated Use buildVerificationPrompt instead
 */
export function buildNonFunctionalPrompt(
  notes: string,
  _readRps: number,
  _writeRps: number,
  _p95RedirectMs: number,
  _availability: string,
  context: VerificationContext
) {
  return buildVerificationPrompt(
    {
      step: "nonFunctional",
      notes,
    },
    context
  );
}

/**
 * Build prompt for API definition verification
 * @deprecated Use buildVerificationPrompt instead
 */
export function buildApiPrompt(
  endpoints: ApiEndpoint[],
  selectedFeatures: Requirements["functional"],
  context: VerificationContext
) {
  return buildVerificationPrompt({ step: "api", endpoints, selectedFeatures }, context);
}

/**
 * Convert verification item to string (handles both string and object formats)
 */
function itemToString(item: unknown): string {
  if (typeof item === "string") {
    return item;
  }

  if (typeof item === "object" && item !== null) {
    // Handle object format like {endpoint, missing, provided, reason}
    const obj = item as Record<string, unknown>;

    if (obj.endpoint && obj.reason) {
      return `${obj.endpoint}: ${obj.reason}`;
    }

    if (obj.message) {
      return String(obj.message);
    }

    // Fallback: stringify the object
    return Object.entries(obj)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  }

  return String(item);
}

/**
 * Parse Gemini response and ensure it matches expected format
 */
export function parseVerificationResponse(text: string): VerificationResult {
  try {
    // Remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      canProceed: parsed.canProceed ?? true,
      blocking: Array.isArray(parsed.blocking) ? parsed.blocking.map(itemToString) : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(itemToString) : [],
    };
  } catch (error) {
    logger.error("Failed to parse verification response:", error);
    // On parse error, allow proceed but warn
    return {
      canProceed: true,
      blocking: [],
      warnings: [
        "Verification service returned invalid response. Please review your input carefully.",
      ],
    };
  }
}
