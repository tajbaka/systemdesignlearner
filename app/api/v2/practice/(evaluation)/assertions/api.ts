/**
 * Deterministic Assertions for API Evaluation
 *
 * These assertions check extraction results deterministically.
 * Used for POST-LLM validation - validates only the MATCHED endpoint for each requirement.
 *
 * This provides a safety net that doesn't rely on LLM judgment for obvious cases
 * like missing request body or unspecified response format.
 */
import type { ExtractedApiInfo } from "../strategies/api";

export type AssertionResult = {
  passed: boolean;
  failedReason?: string;
};

/**
 * Check if a requirement mentions a specific concept.
 * Uses case-insensitive matching with common variations.
 */
function requirementMentions(requirementText: string, ...keywords: string[]): boolean {
  const reqLower = requirementText.toLowerCase();
  return keywords.some((kw) => reqLower.includes(kw.toLowerCase()));
}

/**
 * Check if an extraction value is effectively empty/unspecified.
 */
function isUnspecified(value: string | undefined | null): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "not specified" ||
    normalized === "not_specified" ||
    normalized === "none" ||
    normalized === "n/a" ||
    normalized === "null" ||
    normalized === "undefined"
  );
}

/**
 * Pre-LLM assertions that check extraction results deterministically.
 * Returns failure immediately if mandatory fields are missing based on requirement text.
 *
 * @param extraction - The extracted API info from the user's description
 * @param requirementText - The evaluation criteria text from the requirement
 * @returns AssertionResult indicating pass/fail with reason
 */
export function assertExtractionMeetsRequirement(
  extraction: ExtractedApiInfo,
  requirementText: string
): AssertionResult {
  // Check for request body requirement
  if (requirementMentions(requirementText, "request body", "payload", "request format")) {
    if (isUnspecified(extraction.requestBody)) {
      return {
        passed: false,
        failedReason: "Requirement mentions request body/payload but extraction found none",
      };
    }
  }

  // Check for response format requirement
  // Include various "returns" patterns common in evaluation criteria:
  // - "Returns messages" (WhatsApp), "Returns whether" (Rate Limiter)
  // - "Returns 202" (Notification System), "Returns raw" (Pastebin)
  // - "Returns the paste" (Pastebin), "Returns success" (Pastebin)
  // Note: "returns" without "a" catches all these variations
  if (
    requirementMentions(
      requirementText,
      "response format",
      "response body",
      "in the response",
      "returns"
    )
  ) {
    if (isUnspecified(extraction.responseFormat)) {
      return {
        passed: false,
        failedReason: "Requirement mentions response format but extraction found none",
      };
    }
  }

  // Check for status code requirement
  if (requirementMentions(requirementText, "status code", "http code", "status")) {
    // Be specific - only fail if "status code" or "http code" is mentioned
    if (
      requirementMentions(requirementText, "status code", "http code") &&
      isUnspecified(extraction.successStatusCode)
    ) {
      return {
        passed: false,
        failedReason: "Requirement mentions status codes but extraction found none",
      };
    }
  }

  // Check for error handling requirement
  // Include "error case" (singular) since evaluation criteria often uses that
  if (
    requirementMentions(
      requirementText,
      "error handling",
      "error cases",
      "error case",
      "error response"
    )
  ) {
    if (!extraction.errorCases || extraction.errorCases.length === 0) {
      return {
        passed: false,
        failedReason: "Requirement mentions error handling but extraction found none",
      };
    }
  }

  // Check for completely empty/failed extraction
  if (
    extraction.mainAction === "extraction failed" ||
    (isUnspecified(extraction.mainAction) &&
      isUnspecified(extraction.requestBody) &&
      isUnspecified(extraction.responseFormat) &&
      isUnspecified(extraction.successStatusCode) &&
      (!extraction.errorCases || extraction.errorCases.length === 0))
  ) {
    return {
      passed: false,
      failedReason: "Extraction is empty or failed - description appears to be missing content",
    };
  }

  return { passed: true };
}

/**
 * Post-LLM validation: Check if the MATCHED endpoint's extraction
 * actually satisfies the requirement.
 *
 * This runs AFTER LLM evaluation, using the matchedEndpointId.
 * Only validates the specific extraction for requirements where LLM said correctDescription=true.
 *
 * This is the preferred approach - validates only what matters instead of N×M combinations.
 */
export function validateMatchedEndpoint(
  extraction: ExtractedApiInfo | undefined,
  requirementText: string
): AssertionResult {
  // If no extraction found for matched endpoint, fail
  if (!extraction) {
    return {
      passed: false,
      failedReason: "No extraction data for matched endpoint",
    };
  }

  // Use existing assertExtractionMeetsRequirement logic
  return assertExtractionMeetsRequirement(extraction, requirementText);
}
