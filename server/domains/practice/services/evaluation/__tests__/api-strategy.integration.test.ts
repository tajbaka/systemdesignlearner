import { describe, it, expect } from "vitest";
import {
  apiService,
  type ExtractedApiInfo,
} from "@/server/domains/practice/services/evaluation/api.service";
import { generateEvaluation, generateExtraction } from "@/lib/gemini";
import type { ProblemConfig } from "@/domains/practice/back-end/types";

// Helper to strip markdown code blocks if the LLM wraps JSON
const cleanJson = (raw: string) => raw.replace(/```json|```/g, "").trim();

/**
 * Integration tests that actually call the Gemini API.
 *
 * These tests stress-test the AI evaluation with various field combinations
 * to ensure correct highlighting of incorrect fields.
 *
 * These tests are skipped unless BOTH GEMINI_API_KEY and RUN_INTEGRATION are set because they:
 * - Cost money (API calls)
 * - Are slower (~2-5 seconds per test)
 * - Can be flaky (network issues, API rate limits, AI response variability)
 *
 * To run these tests manually:
 *   GEMINI_API_KEY=your_key RUN_INTEGRATION=1 npm test -- --run __tests__/api/api-strategy.integration.test.ts
 */
// Skip integration tests in CI - they're flaky due to API timeouts and response variability
// Run manually with: GEMINI_API_KEY=your_key RUN_INTEGRATION=1 npm test -- --run __tests__/api/api-strategy.integration.test.ts
const shouldRun = !!process.env.GEMINI_API_KEY && !!process.env.RUN_INTEGRATION;
const describeOrSkip = shouldRun ? describe : describe.skip;

describeOrSkip("API Evaluation Strategy - Gemini Integration", () => {
  // Test config with 2 requirements for focused testing
  const testConfig: ProblemConfig = {
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
              "POST endpoint at /api/v1/urls. Request: { url: string }. Response: 201 { shortUrl: string }. Error: 400 for invalid URL.",
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

  // Extended config with 6 requirements
  const sixEndpointConfig: ProblemConfig = {
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
            weight: 10,
            evaluationCriteria:
              "User defines a POST endpoint that accepts a long URL and returns a short URL with proper status codes.",
          },
          {
            id: "req-redirect",
            scope: "endpoint",
            method: "GET",
            correctPath: "/:slug",
            description: "Redirect to original",
            weight: 10,
            evaluationCriteria:
              "User defines a GET endpoint that handles redirection from short URL to original URL.",
          },
          {
            id: "req-stats",
            scope: "endpoint",
            method: "GET",
            correctPath: "/api/v1/urls/:slug/stats",
            description: "Get URL stats",
            weight: 10,
            evaluationCriteria:
              "User defines an endpoint to retrieve analytics/statistics for a URL.",
          },
          {
            id: "req-delete",
            scope: "endpoint",
            method: "DELETE",
            correctPath: "/api/v1/urls/:slug",
            description: "Delete URL",
            weight: 10,
            evaluationCriteria: "User defines an endpoint to delete a shortened URL.",
          },
          {
            id: "req-update",
            scope: "endpoint",
            method: "PUT",
            correctPath: "/api/v1/urls/:slug",
            description: "Update URL",
            weight: 10,
            evaluationCriteria: "User defines an endpoint to update a shortened URL.",
          },
          {
            id: "req-list",
            scope: "endpoint",
            method: "GET",
            correctPath: "/api/v1/urls",
            description: "List all URLs",
            weight: 10,
            evaluationCriteria: "User defines an endpoint to list all shortened URLs for a user.",
          },
        ],
      },
    },
  } as unknown as ProblemConfig;

  // Helper to call AI using two-step extraction process
  async function evaluateWithAI(
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
    // Step 1: Extract structured data from EACH endpoint's description IN PARALLEL
    const extractionPromises = endpoints.endpoints.map(async (endpoint) => {
      const extractionPrompt = apiService.buildExtractionPrompt(endpoint);
      try {
        const rawText = await generateExtraction(extractionPrompt);
        const extracted = JSON.parse(cleanJson(rawText)) as ExtractedApiInfo;
        return { endpointId: endpoint.id, extracted, error: null };
      } catch (e) {
        // Return a fallback extraction on error
        return {
          endpointId: endpoint.id,
          extracted: {
            mainAction: "extraction failed",
            requestBody: "not specified",
            responseFormat: "not specified",
            successStatusCode: "not specified",
            errorCases: [],
          } as ExtractedApiInfo,
          error: e,
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

    return {
      evaluation: apiService.parseResponse(responseText, config, endpoints),
      rawResponse: responseText,
      extractions,
    };
  }

  // ============================================================================
  // TEST SUITE 1: Field-level accuracy tests (2 endpoints)
  // ============================================================================

  describe("Field-level error detection", () => {
    it("should detect wrong method (POST expected, GET provided)", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "GET" }, // WRONG: should be POST
            path: { id: "path-1", value: "/api/v1/urls" }, // Correct
            description: {
              id: "desc-1",
              value: "Create shortened URL. Request: { url }. Response: 201 { shortUrl }",
            }, // Correct
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(false);
      // Should highlight method field (may also flag other fields - AI is probabilistic)
      expect(createResult?.itemIds).toContain("method-1");
    }, 60000);

    it("should detect wrong path (/wrong instead of /api/v1/urls)", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" }, // Correct
            path: { id: "path-1", value: "/wrong/path" }, // WRONG
            description: {
              id: "desc-1",
              value: "Create shortened URL. Request: { url }. Response: 201 { shortUrl }",
            }, // Correct
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(false);
      // Should highlight path field (may also flag other fields - AI is probabilistic)
      expect(createResult?.itemIds).toContain("path-1");
    }, 30000);

    it("should detect empty description", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" }, // Correct
            path: { id: "path-1", value: "/api/v1/urls" }, // Correct
            description: { id: "desc-1", value: "" }, // EMPTY
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(false);
      // Should highlight description field (may also flag other fields - AI is probabilistic)
      expect(createResult?.itemIds).toContain("desc-1");
    }, 30000);

    it("should detect multiple wrong fields (method + path)", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "DELETE" }, // WRONG
            path: { id: "path-1", value: "/users" }, // WRONG
            description: {
              id: "desc-1",
              value: "Create shortened URL. Request: { url }. Response: 201 { shortUrl }",
            }, // Correct
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(false);
      // AI should highlight at least one wrong field (method or path)
      // Note: AI may not return all wrong fields consistently
      const highlightedWrongFields =
        createResult?.itemIds?.filter((id) => id === "method-1" || id === "path-1") || [];
      expect(highlightedWrongFields.length).toBeGreaterThanOrEqual(1);
    }, 30000);

    it("should detect all wrong fields (method + path + description)", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "DELETE" }, // WRONG
            path: { id: "path-1", value: "/users" }, // WRONG
            description: { id: "desc-1", value: "Gets user data" }, // WRONG
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);
      const createResult = evaluation.results.find((r) => r.id === "req-create");

      expect(createResult?.complete).toBe(false);
      // AI should highlight at least one wrong field
      // Note: AI may not return all wrong fields consistently
      const highlightedWrongFields =
        createResult?.itemIds?.filter(
          (id) => id === "method-1" || id === "path-1" || id === "desc-1"
        ) || [];
      expect(highlightedWrongFields.length).toBeGreaterThanOrEqual(1);
    }, 30000);
  });

  // ============================================================================
  // TEST SUITE 2: Multi-endpoint scenarios
  // ============================================================================

  describe("Multi-endpoint evaluation", () => {
    it("should handle one correct and one incorrect endpoint", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: {
              id: "desc-1",
              value:
                "Create shortened URL. Request: { url: string }. Response: 201 { shortUrl }. Error: 400 for invalid URL.",
            },
          },
          {
            id: "ep-2",
            method: { id: "method-2", value: "POST" }, // WRONG: should be GET
            path: { id: "path-2", value: "/:slug" },
            description: {
              id: "desc-2",
              value: "Redirect to original URL using 301/302. Error: 404 if not found.",
            },
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);

      const createResult = evaluation.results.find((r) => r.id === "req-create");
      const redirectResult = evaluation.results.find((r) => r.id === "req-redirect");

      expect(createResult?.complete).toBe(true);
      expect(redirectResult?.complete).toBe(false);
      expect(redirectResult?.itemIds).toContain("method-2");
      expect(evaluation.score).toBe(25); // Only create endpoint correct
    }, 30000);

    it("should evaluate 6 correct endpoints", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: {
              id: "desc-1",
              value:
                "Create shortened URL. Request: { url: string }. Response: 201 { shortUrl }. Error: 400 for invalid URL.",
            },
          },
          {
            id: "ep-2",
            method: { id: "method-2", value: "GET" },
            path: { id: "path-2", value: "/:slug" },
            description: {
              id: "desc-2",
              value: "Redirect to the original URL using 301/302. Error: 404 if not found.",
            },
          },
          {
            id: "ep-3",
            method: { id: "method-3", value: "GET" },
            path: { id: "path-3", value: "/api/v1/urls/:slug/stats" },
            description: {
              id: "desc-3",
              value:
                "Get click count and analytics for a URL. Response: 200 { clicks: number, created: date }. Error: 404 if not found.",
            },
          },
          {
            id: "ep-4",
            method: { id: "method-4", value: "DELETE" },
            path: { id: "path-4", value: "/api/v1/urls/:slug" },
            description: {
              id: "desc-4",
              value: "Delete a shortened URL. Response: 204 No Content. Error: 404 if not found.",
            },
          },
          {
            id: "ep-5",
            method: { id: "method-5", value: "PUT" },
            path: { id: "path-5", value: "/api/v1/urls/:slug" },
            description: {
              id: "desc-5",
              value:
                "Update the destination URL. Request: { url: string }. Response: 200 { shortUrl }. Error: 404 if not found.",
            },
          },
          {
            id: "ep-6",
            method: { id: "method-6", value: "GET" },
            path: { id: "path-6", value: "/api/v1/urls" },
            description: {
              id: "desc-6",
              value:
                "List all URLs for the authenticated user. Response: 200 [{ shortUrl, originalUrl }].",
            },
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(sixEndpointConfig, endpoints);

      expect(evaluation.results).toHaveLength(6);

      // At least 4 of 6 should be complete (allowing for AI variability)
      const completeCount = evaluation.results.filter((r) => r.complete).length;
      expect(completeCount).toBeGreaterThanOrEqual(4);

      expect(evaluation.evaluatedInput?.endpoints).toHaveLength(6);
    }, 30000);

    it("should handle 6 endpoints with mixed errors", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" }, // Correct
            path: { id: "path-1", value: "/api/v1/urls" }, // Correct
            description: { id: "desc-1", value: "Create URL" }, // Incomplete
          },
          {
            id: "ep-2",
            method: { id: "method-2", value: "POST" }, // WRONG: should be GET
            path: { id: "path-2", value: "/:slug" },
            description: { id: "desc-2", value: "Redirect" },
          },
          {
            id: "ep-3",
            method: { id: "method-3", value: "GET" },
            path: { id: "path-3", value: "/wrong/stats" }, // WRONG path
            description: { id: "desc-3", value: "Get stats" },
          },
          // Missing: delete, update, list endpoints
        ],
      };

      const { evaluation } = await evaluateWithAI(sixEndpointConfig, endpoints);

      expect(evaluation.results).toHaveLength(6);

      // req-create: incomplete description
      const createResult = evaluation.results.find((r) => r.id === "req-create");
      expect(createResult?.complete).toBe(false);

      // req-redirect: wrong method
      const redirectResult = evaluation.results.find((r) => r.id === "req-redirect");
      expect(redirectResult?.complete).toBe(false);
      if (redirectResult?.itemIds?.length) {
        expect(redirectResult.itemIds).toContain("method-2");
      }

      // req-stats: wrong path
      const statsResult = evaluation.results.find((r) => r.id === "req-stats");
      expect(statsResult?.complete).toBe(false);

      // Missing endpoints should be incomplete
      ["req-delete", "req-update", "req-list"].forEach((id) => {
        const result = evaluation.results.find((r) => r.id === id);
        expect(result?.complete).toBe(false);
      });
    }, 30000);
  });

  // ============================================================================
  // TEST SUITE 3: Edge cases
  // ============================================================================

  describe("Edge cases", () => {
    it("should handle empty endpoints array", async () => {
      const endpoints = { endpoints: [] };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);

      // All requirements should be incomplete
      expect(evaluation.results).toHaveLength(2);
      evaluation.results.forEach((r) => {
        expect(r.complete).toBe(false);
      });
      expect(evaluation.score).toBe(0);
    }, 30000);

    it("should handle extra endpoints that don't match requirements", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "POST" },
            path: { id: "path-1", value: "/api/v1/urls" },
            description: {
              id: "desc-1",
              value:
                "Create shortened URL. Request: { url: string }. Response: 201 { shortUrl: string }. Error: 400 for invalid URL.",
            },
          },
          {
            id: "ep-2",
            method: { id: "method-2", value: "GET" },
            path: { id: "path-2", value: "/:slug" },
            description: {
              id: "desc-2",
              value: "Redirects (301/302) to the original URL. Error: 404 if not found.",
            },
          },
          // Extra endpoints not in requirements
          {
            id: "ep-extra-1",
            method: { id: "method-extra-1", value: "GET" },
            path: { id: "path-extra-1", value: "/health" },
            description: { id: "desc-extra-1", value: "Health check endpoint" },
          },
          {
            id: "ep-extra-2",
            method: { id: "method-extra-2", value: "POST" },
            path: { id: "path-extra-2", value: "/api/v1/analytics" },
            description: { id: "desc-extra-2", value: "Track analytics" },
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);

      // Should still correctly evaluate the 2 required endpoints
      expect(evaluation.results).toHaveLength(2);

      const createResult = evaluation.results.find((r) => r.id === "req-create");
      const redirectResult = evaluation.results.find((r) => r.id === "req-redirect");

      expect(createResult?.complete).toBe(true);
      expect(redirectResult?.complete).toBe(true);
    }, 30000);

    it("should handle path parameter variations (/:id vs /{id} vs /:slug)", async () => {
      const endpoints = {
        endpoints: [
          {
            id: "ep-1",
            method: { id: "method-1", value: "GET" },
            path: { id: "path-1", value: "/{shortCode}" }, // Different param name/style
            description: {
              id: "desc-1",
              value: "Redirects (301/302) to the original URL. Error: 404 if not found.",
            },
          },
        ],
      };

      const { evaluation } = await evaluateWithAI(testConfig, endpoints);
      const redirectResult = evaluation.results.find((r) => r.id === "req-redirect");

      // Should recognize /{shortCode} as equivalent to /:slug
      expect(redirectResult?.complete).toBe(true);
    }, 30000);
  });
});
