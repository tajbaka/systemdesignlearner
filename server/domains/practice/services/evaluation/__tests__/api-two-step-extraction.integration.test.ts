import { describe, it, expect } from "vitest";
import {
  apiService,
  validateMatchedEndpoint,
  type ExtractedApiInfo,
} from "@/server/domains/practice/services/evaluation/api.service";
import { generateEvaluation, generateExtraction } from "@/lib/gemini";
import type { ProblemConfig } from "@/domains/practice/back-end/types";

/**
 * Integration tests for the two-step extraction evaluation flow.
 *
 * These tests validate that the new extraction-based evaluation correctly
 * handles descriptions that were previously incorrectly rejected as missing elements.
 *
 * The key scenarios tested:
 * 1. Arian's exact failing case from Slack - detailed description was incorrectly rejected
 * 2. Minimal descriptions that SHOULD fail
 * 3. Various formatting styles (bullet points, newlines, informal text)
 * 4. Edge cases for partial specifications
 *
 * To run these tests:
 *   GEMINI_API_KEY=your_key npm test -- --run __tests__/api/api-two-step-extraction.integration.test.ts
 */

// Skip integration tests in CI - they're flaky due to API timeouts and rate limits
// Run manually with: GEMINI_API_KEY=your_key RUN_INTEGRATION=1 npm test -- --run __tests__/api/api-two-step-extraction.integration.test.ts
const shouldRun = !!process.env.GEMINI_API_KEY && !!process.env.RUN_INTEGRATION;
const describeOrSkip = shouldRun ? describe : describe.skip;

// Helper to strip markdown code blocks if the LLM wraps JSON
const cleanJson = (raw: string) => raw.replace(/```json|```/g, "").trim();

// URL Shortener config with strict evaluation criteria (the problematic case)
const urlShortenerConfig: ProblemConfig = {
  title: "URL Shortener",
  description: "Design a URL shortening service like bit.ly",
  steps: {
    api: {
      requirements: [
        {
          id: "req-create",
          scope: "endpoint",
          method: "POST",
          correctPath: "/api/v1/urls",
          description: "Create short URL",
          weight: 25,
          evaluationCriteria:
            "The endpoint description must include: 1) Request body format with URL field, 2) Response format with shortened URL, 3) Success status code (201), 4) At least one error case (e.g., 400 for invalid URL)",
        },
        {
          id: "req-redirect",
          scope: "endpoint",
          method: "GET",
          correctPath: "/:slug",
          description: "Redirect to original",
          weight: 25,
          evaluationCriteria:
            "GET endpoint at /:slug that redirects (301/302) to the original URL. Error: 404 if not found.",
        },
      ],
    },
  },
} as unknown as ProblemConfig;

describeOrSkip("Two-Step Extraction - Arian's Failing Cases", () => {
  // Helper to run extraction for a single endpoint
  async function extractFromDescription(description: string): Promise<ExtractedApiInfo> {
    const endpoint = {
      description: { value: description },
    };
    const extractionPrompt = apiService.buildExtractionPrompt(endpoint);
    const rawText = await generateExtraction(extractionPrompt);
    return JSON.parse(cleanJson(rawText)) as ExtractedApiInfo;
  }

  // Helper to run full two-step evaluation
  async function evaluateWithTwoStepExtraction(
    config: ProblemConfig,
    endpoints: {
      endpoints: Array<{
        id: string;
        method: { id: string; value: string };
        path: { id: string; value: string };
        description: { id: string; value: string };
      }>;
    }
  ) {
    // Step 1: Extract from all endpoints in parallel
    const extractionPromises = endpoints.endpoints.map(async (endpoint) => {
      const extractionPrompt = apiService.buildExtractionPrompt(endpoint);
      try {
        const rawText = await generateExtraction(extractionPrompt);
        const extracted = JSON.parse(cleanJson(rawText)) as ExtractedApiInfo;
        return { endpointId: endpoint.id, extracted };
      } catch {
        return {
          endpointId: endpoint.id,
          extracted: {
            mainAction: "extraction failed",
            requestBody: "not specified",
            responseFormat: "not specified",
            successStatusCode: "not specified",
            errorCases: [],
          } as ExtractedApiInfo,
        };
      }
    });

    const extractionResults = await Promise.all(extractionPromises);
    const extractions = new Map<string, ExtractedApiInfo>(
      extractionResults.map((r) => [r.endpointId, r.extracted])
    );

    // Step 2: Evaluate with extracted data
    const evaluationPrompt = apiService.buildEvaluationPromptWithExtractions(
      config,
      endpoints,
      extractions
    );
    const responseText = await generateEvaluation(evaluationPrompt);

    const evaluation = apiService.parseResponse(responseText, config, endpoints);

    // Step 3: Apply post-validation (mirrors route.ts behavior)
    const apiRequirements = (config.steps?.api?.requirements || []) as Array<{
      id: string;
      method?: string;
      correctPath?: string;
      evaluationCriteria?: string;
      weight?: number;
    }>;
    for (const result of evaluation.results) {
      if (!result.complete) continue;

      const requirement = apiRequirements.find((r) => r.id === result.id);

      // Infer matchedEndpointId if LLM didn't provide it
      let effectiveMatchedEndpointId = result.matchedEndpointId;
      if (!effectiveMatchedEndpointId && requirement?.method) {
        // Find endpoint that matches requirement's method and path
        const matchingEndpoint = endpoints.endpoints.find((ep) => {
          const methodMatches = ep.method.value.toUpperCase() === requirement.method?.toUpperCase();
          const pathMatches = ep.path.value === requirement.correctPath;
          return methodMatches && pathMatches;
        });
        if (matchingEndpoint) {
          effectiveMatchedEndpointId = matchingEndpoint.id;
        } else if (endpoints.endpoints.length === 1) {
          // Fallback: if only one endpoint exists, assume it's the match
          effectiveMatchedEndpointId = endpoints.endpoints[0].id;
        }
      }

      if (!effectiveMatchedEndpointId) continue;

      const matchedExtraction = extractions.get(effectiveMatchedEndpointId);

      if (requirement?.evaluationCriteria) {
        const validation = validateMatchedEndpoint(
          matchedExtraction,
          requirement.evaluationCriteria
        );

        if (!validation.passed) {
          result.complete = false;
          result.correctDescription = false;
          result.feedback = `${validation.failedReason}. ${result.feedback || ""}`.trim();
        }
      }
    }

    // Recalculate score after post-validation
    const totalWeight = apiRequirements.reduce((sum, r) => sum + (r.weight || 0), 0);
    const earnedWeight = evaluation.results
      .filter((r) => r.complete)
      .reduce((sum, r) => {
        const req = apiRequirements.find((req) => req.id === r.id);
        return sum + (req?.weight || 0);
      }, 0);
    evaluation.score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    return {
      extractions,
      evaluation,
      rawResponse: responseText,
    };
  }

  // ============================================================================
  // TEST 1: Arian's exact failing case - SHOULD NOW PASS
  // ============================================================================

  describe("Arian's exact failing case from Slack", () => {
    const ariansDescription = `POST endpoint to create shortened URLs

Request: { "url": "https://example.com/long-url" }

Response (201): { "shortUrl": "https://short.ly/abc123", "slug": "abc123" }

Error Codes:
- 400: Invalid URL format
- 409: Rate limit exceeded`;

    it("should correctly extract all elements from Arian's description", async () => {
      const extraction = await extractFromDescription(ariansDescription);

      console.log("Extraction result:", JSON.stringify(extraction, null, 2));

      // The extraction should capture all the key elements
      expect(extraction.mainAction.toLowerCase()).toContain("create");
      expect(extraction.requestBody).not.toBe("not specified");
      expect(extraction.requestBody.toLowerCase()).toContain("url");
      expect(extraction.responseFormat).not.toBe("not specified");
      expect(extraction.responseFormat.toLowerCase()).toContain("shorturl");
      expect(extraction.successStatusCode).toBe("201");
      expect(extraction.errorCases.length).toBeGreaterThanOrEqual(1);
    }, 30000);

    it("should PASS evaluation with Arian's detailed description", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: ariansDescription },
          },
        ],
      };

      const { extractions, evaluation, rawResponse } = await evaluateWithTwoStepExtraction(
        urlShortenerConfig,
        endpoints
      );

      console.log("Extractions:", JSON.stringify(Object.fromEntries(extractions), null, 2));
      console.log("Raw AI Response:", rawResponse);
      console.log("Evaluation results:", JSON.stringify(evaluation.results, null, 2));

      const createResult = evaluation.results.find((r) => r.id === "req-create");

      // THIS IS THE CRITICAL ASSERTION - Arian's description should pass
      expect(createResult?.complete).toBe(true);

      // If it fails, the description field should NOT be highlighted
      if (!createResult?.complete) {
        expect(createResult?.itemIds).not.toContain("desc-1");
      }
    }, 60000);
  });

  // ============================================================================
  // TEST 2: Minimal description - SHOULD FAIL with specific feedback
  // ============================================================================

  describe("Minimal descriptions that should fail", () => {
    it("should FAIL for 'Creates short URLs' (missing request/response/status/error)", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: "Creates short URLs" },
          },
        ],
      };

      const { extractions, evaluation } = await evaluateWithTwoStepExtraction(
        urlShortenerConfig,
        endpoints
      );

      console.log(
        "Extractions for minimal:",
        JSON.stringify(Object.fromEntries(extractions), null, 2)
      );

      const createResult = evaluation.results.find((r) => r.id === "req-create");

      // Minimal description should fail
      expect(createResult?.complete).toBe(false);

      // Should highlight description field
      expect(createResult?.itemIds).toContain("desc-1");

      // Should have specific feedback about what's missing
      expect(createResult?.feedback).toBeDefined();
    }, 60000);

    it("should FAIL for empty description", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: "" },
          },
        ],
      };

      const { evaluation } = await evaluateWithTwoStepExtraction(urlShortenerConfig, endpoints);

      const createResult = evaluation.results.find((r) => r.id === "req-create");
      expect(createResult?.complete).toBe(false);
      expect(createResult?.itemIds).toContain("desc-1");
    }, 60000);
  });

  // ============================================================================
  // TEST 3: Various formatting styles - all should PASS if content is present
  // ============================================================================

  describe("Various formatting styles", () => {
    it("should PASS for bullet point format", async () => {
      const bulletDescription = `Create shortened URL endpoint
• Request: { "url": "long-url" }
• Response (201): { "shortUrl": "short-url" }
• Errors: 400 for invalid URL`;

      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: bulletDescription },
          },
        ],
      };

      const { evaluation } = await evaluateWithTwoStepExtraction(urlShortenerConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(true);
    }, 60000);

    it("should PASS for informal/messy format", async () => {
      const messyDescription = `create url endpoint
body has the long url like {"url": "..."}
returns 201 with shortUrl
errors: 400 bad url, 429 too many requests`;

      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: messyDescription },
          },
        ],
      };

      const { extractions, evaluation } = await evaluateWithTwoStepExtraction(
        urlShortenerConfig,
        endpoints
      );

      console.log("Messy extraction:", JSON.stringify(Object.fromEntries(extractions), null, 2));

      const createResult = evaluation.results.find((r) => r.id === "req-create");
      expect(createResult?.complete).toBe(true);
    }, 60000);

    it("should PASS for compact single-line format", async () => {
      const compactDescription =
        "Creates short URLs. Request: {url}. Response 201: {shortUrl}. Error 400: invalid URL.";

      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: compactDescription },
          },
        ],
      };

      const { evaluation } = await evaluateWithTwoStepExtraction(urlShortenerConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(true);
    }, 60000);
  });

  // ============================================================================
  // TEST 4: Partial specifications - edge cases
  // ============================================================================

  describe("Partial specifications", () => {
    it("should handle description with request/response but NO error codes", async () => {
      const noErrorDescription = `Create shortened URL
Request: { "url": "https://example.com" }
Response (201): { "shortUrl": "https://short.ly/abc" }`;

      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: noErrorDescription },
          },
        ],
      };

      const { extractions, evaluation } = await evaluateWithTwoStepExtraction(
        urlShortenerConfig,
        endpoints
      );

      console.log("No error extraction:", JSON.stringify(Object.fromEntries(extractions), null, 2));

      const createResult = evaluation.results.find((r) => r.id === "req-create");
      console.log("Create result:", JSON.stringify(createResult, null, 2));

      // The criteria requires "At least one error case" - should fail via post-validation
      // Verify extraction worked (errorCases should be empty)
      expect(extractions.get("ep-1")?.errorCases.length).toBe(0);
      // Post-validation should mark it incomplete
      expect(createResult?.complete).toBe(false);
    }, 60000);

    it("should handle description with error codes but NO status code", async () => {
      const noStatusDescription = `Create shortened URL
Request: { "url": "https://example.com" }
Response: { "shortUrl": "https://short.ly/abc" }
Errors: 400 for invalid URL`;

      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: { id: "desc-1", value: noStatusDescription },
          },
        ],
      };

      const { extractions, evaluation } = await evaluateWithTwoStepExtraction(
        urlShortenerConfig,
        endpoints
      );

      console.log(
        "No status extraction:",
        JSON.stringify(Object.fromEntries(extractions), null, 2)
      );

      const createResult = evaluation.results.find((r) => r.id === "req-create");

      // The criteria requires success status code (201) - should fail
      expect(createResult?.complete).toBe(false);
    }, 60000);
  });

  // ============================================================================
  // TEST 5: Extraction unit tests (fast, no evaluation call)
  // ============================================================================

  describe("Extraction unit tests", () => {
    it("should extract JSON-formatted request body", async () => {
      const description = 'Request body: { "url": "https://example.com", "customSlug": "my-link" }';
      const extraction = await extractFromDescription(description);

      expect(extraction.requestBody).not.toBe("not specified");
      expect(extraction.requestBody.toLowerCase()).toContain("url");
    }, 30000);

    it("should extract status codes mentioned inline", async () => {
      const description = "Returns 201 Created on success, 400 Bad Request for invalid input";
      const extraction = await extractFromDescription(description);

      expect(extraction.successStatusCode).toBe("201");
      expect(extraction.errorCases.length).toBeGreaterThanOrEqual(1);
    }, 30000);

    it("should handle description with only action mentioned", async () => {
      const description = "Creates a shortened URL";
      const extraction = await extractFromDescription(description);

      expect(extraction.mainAction.toLowerCase()).toContain("create");
      expect(extraction.requestBody).toBe("not specified");
      expect(extraction.responseFormat).toBe("not specified");
    }, 30000);

    it("should extract from redirect endpoint description", async () => {
      // More explicit description to help extraction
      const description =
        "Redirect to original URL. Status code: 301 Moved Permanently. Error: 404 Not Found if slug not found.";
      const extraction = await extractFromDescription(description);

      expect(extraction.mainAction.toLowerCase()).toContain("redirect");
      // AI may return "301", "301 Moved Permanently", etc. - just check it contains "301"
      expect(extraction.successStatusCode.toString()).toContain("301");
      expect(extraction.errorCases.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  });
});

// ============================================================================
// Non-integration tests for prompt building (always run)
// ============================================================================

describe("Two-Step Extraction - Prompt Building (Unit Tests)", () => {
  it("should build extraction prompt with description content", () => {
    const endpoint = {
      description: { value: "Creates a short URL from a long URL" },
    };

    const prompt = apiService.buildExtractionPrompt(endpoint);

    expect(prompt).toContain("Creates a short URL from a long URL");
    expect(prompt).toContain("Extract structured information");
    expect(prompt).toContain("mainAction");
    expect(prompt).toContain("requestBody");
    expect(prompt).toContain("errorCases");
  });

  it("should build extraction prompt with empty description", () => {
    const endpoint = {
      description: { value: "" },
    };

    const prompt = apiService.buildExtractionPrompt(endpoint);

    expect(prompt).toContain("(empty)");
  });

  it("should build evaluation prompt with extractions", () => {
    const config: ProblemConfig = {
      title: "Test API",
      description: "Test description",
      steps: {
        api: {
          requirements: [
            {
              id: "req-1",
              scope: "endpoint",
              method: "POST",
              correctPath: "/test",
              description: "Test endpoint",
              weight: 10,
              evaluationCriteria: "Must include request body",
            },
          ],
        },
      },
    } as unknown as ProblemConfig;

    const userInput = {
      endpoints: [
        {
          id: "ep-1",
          method: { id: "method-1", value: "POST" },
          path: { id: "path-1", value: "/test" },
          description: { id: "desc-1", value: "Test description" },
        },
      ],
    };

    const extractions = new Map<string, ExtractedApiInfo>([
      [
        "ep-1",
        {
          mainAction: "create",
          requestBody: '{ "field": "value" }',
          responseFormat: '{ "id": "123" }',
          successStatusCode: "201",
          errorCases: ["400: Bad request"],
        },
      ],
    ]);

    const prompt = apiService.buildEvaluationPromptWithExtractions(config, userInput, extractions);

    // Should include extracted data
    expect(prompt).toContain("**Extracted from description:**");
    expect(prompt).toContain("Action: create");
    expect(prompt).toContain('Request body: { "field": "value" }');
    expect(prompt).toContain("Status code: 201");
    expect(prompt).toContain("Error cases: 400: Bad request");

    // Should include evaluation instructions
    expect(prompt).toContain("EVALUATION APPROACH - GENEROUS MATCHING");
    expect(prompt).toContain("correctDescription = TRUE if:");
  });

  it("should handle missing extraction for endpoint", () => {
    const config: ProblemConfig = {
      title: "Test API",
      description: "Test",
      steps: {
        api: {
          requirements: [],
        },
      },
    } as unknown as ProblemConfig;

    const userInput = {
      endpoints: [
        {
          id: "ep-1",
          method: { id: "method-1", value: "GET" },
          path: { id: "path-1", value: "/test" },
          description: { id: "desc-1", value: "Test" },
        },
      ],
    };

    // Empty extractions map
    const extractions = new Map<string, ExtractedApiInfo>();

    const prompt = apiService.buildEvaluationPromptWithExtractions(config, userInput, extractions);

    // Should indicate extraction failed
    expect(prompt).toContain("(extraction failed)");
  });
});
