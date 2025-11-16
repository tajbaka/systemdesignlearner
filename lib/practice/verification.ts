import type { Requirements } from "./types";
import type { ApiEndpoint } from "./types";
import reference from "./reference/url-shortener.json";
import scoringConfig from "@/lib/scoring/configs/url-shortener.json";
import { logger } from "@/lib/logger";

export type VerificationResult = {
  canProceed: boolean;
  blocking: string[];
  warnings: string[];
};

/**
 * Build prompt for functional requirements verification
 */
export function buildFunctionalPrompt(
  summary: string,
  selectedFeatures: Requirements["functional"]
) {
  const required = scoringConfig.steps.functional.coreRequirements;
  const optional = scoringConfig.steps.functional.optionalRequirements.filter(
    (opt: { id: string }) => selectedFeatures[opt.id as keyof typeof selectedFeatures]
  );

  return `You are verifying functional requirements for a URL Shortener system design practice exercise.

**Reference Requirements:**

REQUIRED Features (user MUST mention these):
${required.map((r: { label: string; description: string }) => `- ${r.label}: ${r.description}`).join("\n")}

OPTIONAL Features (user selected these, should mention them):
${optional.length > 0 ? optional.map((o: { label: string; description: string }) => `- ${o.label}: ${o.description}`).join("\n") : "None selected"}

**User's Input:**
${summary}

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
}

/**
 * Build prompt for non-functional requirements verification
 */
export function buildNonFunctionalPrompt(
  notes: string,
  readRps: number,
  writeRps: number,
  p95RedirectMs: number,
  availability: string
) {
  const nf = reference.nonFunctional;

  // Extract categories from the JSON structure
  const readThroughput = nf.categories.find((c) => c.id === "readThroughput");
  const writeThroughput = nf.categories.find((c) => c.id === "writeThroughput");
  const latency = nf.categories.find((c) => c.id === "latency");
  const availabilityCategory = nf.categories.find((c) => c.id === "availability");

  return `You are verifying non-functional requirements for a URL Shortener system design.

**Acceptable Ranges:**
- Read throughput: ${readThroughput?.quantitative?.min}-${readThroughput?.quantitative?.max} rps (recommended: ${readThroughput?.quantitative?.recommended})
- Write throughput: ${writeThroughput?.quantitative?.min}-${writeThroughput?.quantitative?.max} rps (recommended: ${writeThroughput?.quantitative?.recommended})
- P95 latency: ${latency?.quantitative?.min}-${latency?.quantitative?.max} ms (recommended: ${latency?.quantitative?.recommended})
- Availability: ${availabilityCategory?.quantitative?.acceptable?.join(", ")}

**User's Input:**
Text: ${notes}
Read RPS: ${readRps}
Write RPS: ${writeRps}
P95 Latency: ${p95RedirectMs} ms
Availability: ${availability}%

**Task:**
1. Check if numeric values are within acceptable ranges
2. Check if text description is reasonably detailed (blocking if completely empty)
3. Verify text and numbers are somewhat aligned

Return ONLY valid JSON:
{
  "canProceed": true,
  "blocking": [],
  "warnings": []
}`;
}

/**
 * Build prompt for API definition verification
 */
export function buildApiPrompt(
  endpoints: ApiEndpoint[],
  selectedFeatures: Requirements["functional"]
) {
  const requiredEndpoints = reference.apiEndpoints.filter((e) => e.required);
  const optionalEndpoints = reference.apiEndpoints.filter(
    (e) =>
      !e.required &&
      (!e.requiresFeature || selectedFeatures[e.requiresFeature as keyof typeof selectedFeatures])
  );

  return `You are verifying API design for a URL Shortener system.

**Required Endpoints:**
${requiredEndpoints.map((e) => `- ${e.method} ${e.path}: ${e.purpose}`).join("\n")}

**Optional Endpoints (based on selected features):**
${optionalEndpoints.length > 0 ? optionalEndpoints.map((e) => `- ${e.method} ${e.path}: ${e.purpose}`).join("\n") : "None"}

**User's API Definition:**
${endpoints.map((e) => `${e.method} ${e.path}: ${e.notes.substring(0, 100)}`).join("\n")}

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
