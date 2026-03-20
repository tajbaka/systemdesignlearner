import { describe, it, expect } from "vitest";
import { apiService } from "@/server/domains/practice/services/evaluation/api.service";
import type { ProblemConfig } from "@/domains/practice/back-end/types";

describe("API Evaluation Strategy - itemId fallback", () => {
  const mockProblemConfig: ProblemConfig = {
    title: "URL Shortener",
    description: "Design a URL shortening service",
    steps: {
      api: {
        requirements: [
          {
            id: "create-url-endpoint",
            scope: "endpoint",
            method: "POST",
            correctPath: "/api/shorten",
            description: "Create shortened URL",
            weight: 10,
          },
          {
            id: "redirect-endpoint",
            scope: "endpoint",
            method: "GET",
            correctPath: "/{shortCode}",
            description: "Redirect to original URL",
            weight: 10,
          },
        ],
      },
    },
  } as unknown as ProblemConfig;

  const mockUserInput = {
    endpoints: [
      {
        id: "endpoint-1",
        method: { id: "method-1", value: "GET" as const },
        path: { id: "path-1", value: "/wrong" },
        description: { id: "desc-1", value: "Wrong endpoint" },
      },
    ],
  };

  it("should provide itemIds fallback when AI omits incorrectFieldId", () => {
    // Simulate AI response that doesn't include incorrectFieldId
    const aiResponseWithoutFieldId = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Wrong method used",
          // Note: NO incorrectFieldId provided by AI
        },
        {
          id: "redirect-endpoint",
          found: false,
          feedback: "Wrong path",
          // Note: NO incorrectFieldId provided by AI
        },
      ],
    });

    const result = apiService.parseResponse(
      aiResponseWithoutFieldId,
      mockProblemConfig,
      mockUserInput
    );

    // Verify all incomplete results have itemIds (fallback assigns field to highlight)
    const incompleteResults = result.results.filter((r) => !r.complete);

    expect(incompleteResults.length).toBeGreaterThan(0);
    incompleteResults.forEach((res) => {
      expect(res.itemIds).toBeDefined();
      expect(res.itemIds?.length).toBeGreaterThan(0);
      expect(typeof res.itemIds?.[0]).toBe("string");
    });

    // For create-url-endpoint: expects POST, user has GET - should highlight method
    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    expect(createResult?.itemIds?.[0]).toBe("method-1");

    // For redirect-endpoint: expects GET /{shortCode}, user has GET /wrong - should highlight path
    const redirectResult = result.results.find((r) => r.id === "redirect-endpoint");
    expect(redirectResult?.itemIds?.[0]).toBe("path-1");
  });

  it("should use AI-provided schema fields (correctMethod/correctPath/correctDescription) for field highlighting", () => {
    const aiResponseWithSchemaFields = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Wrong path",
          correctMethod: true,
          correctPath: false, // AI says path is wrong
          correctDescription: true,
          matchedEndpointId: "endpoint-1", // AI matched this endpoint
        },
      ],
    });

    const result = apiService.parseResponse(
      aiResponseWithSchemaFields,
      mockProblemConfig,
      mockUserInput
    );

    const incompleteResult = result.results.find((r) => !r.complete);
    expect(incompleteResult?.itemIds).toContain("path-1"); // Should highlight path based on AI's correctPath: false
  });

  it("should highlight method field when AI reports correctMethod: false", () => {
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Wrong method",
          correctMethod: false,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "endpoint-1",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, mockUserInput);

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    expect(createResult?.itemIds).toContain("method-1"); // Should highlight method
  });

  it("should highlight description when AI reports correctDescription: false", () => {
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Incomplete description",
          correctMethod: true,
          correctPath: true,
          correctDescription: false,
          matchedEndpointId: "endpoint-1",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, mockUserInput);

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    expect(createResult?.itemIds).toContain("desc-1"); // Should highlight description
  });

  it("should derive incomplete from correctness fields when AI returns inconsistent found=true", () => {
    // AI returns found: true but correctMethod: false - this is inconsistent
    // parseResponse should derive isComplete from correctness fields, not trust found
    const aiResponseInconsistent = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: true, // AI says complete, but...
          feedback: "Method should be POST",
          correctMethod: false, // ...method is wrong!
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "endpoint-1",
        },
      ],
    });

    const result = apiService.parseResponse(
      aiResponseInconsistent,
      mockProblemConfig,
      mockUserInput
    );

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    // Should be marked incomplete because correctMethod is false
    expect(createResult?.complete).toBe(false);
    // Should highlight method field
    expect(createResult?.itemIds).toContain("method-1");
  });

  it("should NOT highlight existing endpoints when matchedEndpointId is null (endpoint missing)", () => {
    // User has one correct endpoint for create-url, but is missing redirect-endpoint
    const correctEndpointInput = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "POST" as const },
          path: { id: "path-1", value: "/api/v1/urls" },
          description: { id: "desc-1", value: "Creates short URL" },
        },
      ],
    };

    // AI response: create-url is complete, redirect-endpoint is missing (no matchedEndpointId)
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: true,
          feedback: "Correct!",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "endpoint-1",
        },
        {
          id: "redirect-endpoint",
          found: false,
          feedback: "Redirect endpoint is missing. Add a GET /{slug} endpoint.",
          correctMethod: null,
          correctPath: null,
          correctDescription: null,
          matchedEndpointId: null, // No endpoint matched - user needs to ADD one
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, correctEndpointInput);

    // create-url should be complete with no itemIds
    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    expect(createResult?.complete).toBe(true);
    expect(createResult?.itemIds).toBeUndefined();

    // redirect-endpoint should be incomplete but NOT highlight the existing endpoint
    const redirectResult = result.results.find((r) => r.id === "redirect-endpoint");
    expect(redirectResult?.complete).toBe(false);
    expect(redirectResult?.itemIds).toBeUndefined(); // Should NOT highlight any field
  });

  it("should not set itemIds for complete results", () => {
    const aiResponseComplete = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: true,
          feedback: "Correct!",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponseComplete, mockProblemConfig, mockUserInput);

    const completeResult = result.results.find((r) => r.complete);
    // Complete results should not have itemIds (or it should be undefined)
    // The fallback only applies when !isComplete && itemIds.length === 0
    expect(completeResult?.itemIds).toBeUndefined();
  });

  it("should handle empty endpoints gracefully", () => {
    const emptyInput = { endpoints: [] };

    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "No endpoints provided",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, emptyInput);

    // Should not crash with empty endpoints
    expect(result.results).toBeDefined();
    expect(result.results.length).toBeGreaterThan(0);

    // When no endpoints, itemIds may be undefined (no fallback available)
    const incompleteResult = result.results.find((r) => !r.complete);
    // This is acceptable - no endpoints means no fallback target
    expect(incompleteResult).toBeDefined();
  });

  it("should handle malformed AI response", () => {
    const malformedResponse = "not valid json";

    const result = apiService.parseResponse(malformedResponse, mockProblemConfig, mockUserInput);

    // Should still return results for all requirements
    expect(result.results).toBeDefined();
    expect(result.results.length).toBe(2);

    // All results should be incomplete (AI couldn't evaluate)
    result.results.forEach((res) => {
      expect(res.complete).toBe(false);
    });

    // Fallback should still assign fields for incomplete results
    const incompleteResults = result.results.filter((r) => !r.complete);
    incompleteResults.forEach((res) => {
      expect(res.itemIds).toBeDefined();
      expect(res.itemIds?.length).toBeGreaterThan(0);
      expect(typeof res.itemIds?.[0]).toBe("string");
    });
  });

  it("should highlight method field when method is wrong", () => {
    // User has GET, requirement expects POST
    const userInputWrongMethod = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "GET" as const },
          path: { id: "path-1", value: "/api/shorten" }, // Path is correct
          description: { id: "desc-1", value: "Creates short URL" },
        },
      ],
    };

    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Wrong method",
          // No incorrectFieldId - triggers fallback
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, userInputWrongMethod);

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    // Method is wrong (GET vs POST), so should highlight method field
    expect(createResult?.itemIds?.[0]).toBe("method-1");
  });

  it("should highlight path field when method correct but path wrong", () => {
    // User has POST (correct), but path is wrong
    const userInputWrongPath = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "POST" as const },
          path: { id: "path-1", value: "/wrong/path" }, // Path is wrong
          description: { id: "desc-1", value: "Creates short URL" },
        },
      ],
    };

    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Wrong path",
          // No incorrectFieldId - triggers fallback
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, userInputWrongPath);

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    // Method is correct, path is wrong, so should highlight path field
    expect(createResult?.itemIds?.[0]).toBe("path-1");
  });

  it("should highlight description when method and path are correct", () => {
    // User has correct method and path, but description issue
    const userInputCorrectMethodPath = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "POST" as const },
          path: { id: "path-1", value: "/api/shorten" }, // Path is correct
          description: { id: "desc-1", value: "Missing details" },
        },
      ],
    };

    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Description incomplete",
          // No incorrectFieldId - triggers fallback
        },
      ],
    });

    const result = apiService.parseResponse(
      aiResponse,
      mockProblemConfig,
      userInputCorrectMethodPath
    );

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    // Method and path are correct, so should highlight description field
    expect(createResult?.itemIds?.[0]).toBe("desc-1");
  });

  it("should match correct endpoint from multiple endpoints", () => {
    // Multiple endpoints - should find the one that best matches the requirement
    const multipleEndpoints = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "GET" as const },
          path: { id: "path-1", value: "/users" },
          description: { id: "desc-1", value: "Get users" },
        },
        {
          id: "endpoint-2",
          method: { id: "method-2", value: "POST" as const }, // Correct method
          path: { id: "path-2", value: "/api/shorten" }, // Correct path
          description: { id: "desc-2", value: "Incomplete description" },
        },
      ],
    };

    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Description needs improvement",
          // No incorrectFieldId - triggers fallback
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, multipleEndpoints);

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    // Should match endpoint-2 (exact method + path match) and highlight its description
    expect(createResult?.itemIds?.[0]).toBe("desc-2");
  });

  it("should use fallback when AI provides invalid matchedEndpointId", () => {
    const aiResponseWithInvalidEndpoint = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Wrong method",
          correctMethod: false,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "non-existent-endpoint-id", // Invalid endpoint ID
        },
      ],
    });

    const result = apiService.parseResponse(
      aiResponseWithInvalidEndpoint,
      mockProblemConfig,
      mockUserInput
    );

    const createResult = result.results.find((r) => r.id === "create-url-endpoint");
    // Invalid endpoint ID means itemIds can't be determined from AI fields, fallback should be used
    // mockUserInput has GET, requirement expects POST, so method-1 should be highlighted
    expect(createResult?.itemIds?.[0]).toBe("method-1");
  });

  it("should handle path matching with parameter variations", () => {
    // Test that /{shortCode} matches /shortcode style paths
    const userInputWithParam = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "GET" as const },
          path: { id: "path-1", value: "/:code" }, // Similar path with different param style
          description: { id: "desc-1", value: "Redirect" },
        },
      ],
    };

    const aiResponse = JSON.stringify({
      results: [
        {
          id: "redirect-endpoint",
          found: false,
          feedback: "Description incomplete",
          // No incorrectFieldId - triggers fallback
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, userInputWithParam);

    const redirectResult = result.results.find((r) => r.id === "redirect-endpoint");
    // Method (GET) is correct, path /:code matches /{shortCode} semantically
    // So should highlight description
    expect(redirectResult?.itemIds?.[0]).toBe("desc-1");
  });

  it("should return multiple itemIds when multiple fields are incorrect", () => {
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Multiple issues",
          correctMethod: false, // Wrong
          correctPath: false, // Wrong
          correctDescription: true,
          matchedEndpointId: "endpoint-1",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, mockUserInput);
    const createResult = result.results.find((r) => r.id === "create-url-endpoint");

    // Should contain BOTH method and path IDs
    expect(createResult?.itemIds).toBeDefined();
    expect(createResult?.itemIds).toHaveLength(2);
    expect(createResult?.itemIds).toContain("method-1");
    expect(createResult?.itemIds).toContain("path-1");
    expect(createResult?.itemIds).not.toContain("desc-1"); // description was correct
  });

  it("should return all three itemIds when all fields are incorrect", () => {
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Everything wrong",
          correctMethod: false,
          correctPath: false,
          correctDescription: false,
          matchedEndpointId: "endpoint-1",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, mockUserInput);
    const createResult = result.results.find((r) => r.id === "create-url-endpoint");

    expect(createResult?.itemIds).toHaveLength(3);
    expect(createResult?.itemIds).toContain("method-1");
    expect(createResult?.itemIds).toContain("path-1");
    expect(createResult?.itemIds).toContain("desc-1");
  });

  it("should highlight correct endpoint's fields in multi-endpoint scenario", () => {
    const multiEndpointInput = {
      endpoints: [
        {
          id: "endpoint-1",
          method: { id: "method-1", value: "GET" as const },
          path: { id: "path-1", value: "/users" },
          description: { id: "desc-1", value: "Get users" },
        },
        {
          id: "endpoint-2",
          method: { id: "method-2", value: "POST" as const },
          path: { id: "path-2", value: "/api/shorten" },
          description: { id: "desc-2", value: "Incomplete" },
        },
      ],
    };

    // AI says endpoint-2 has wrong method and description
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: false,
          feedback: "Method and description issues",
          correctMethod: false,
          correctPath: true,
          correctDescription: false,
          matchedEndpointId: "endpoint-2", // AI matched endpoint-2
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, multiEndpointInput);
    const createResult = result.results.find((r) => r.id === "create-url-endpoint");

    // Should highlight endpoint-2's fields, NOT endpoint-1's
    expect(createResult?.itemIds).toContain("method-2");
    expect(createResult?.itemIds).toContain("desc-2");
    expect(createResult?.itemIds).not.toContain("method-1");
    expect(createResult?.itemIds).not.toContain("desc-1");
    expect(createResult?.itemIds).not.toContain("path-2"); // path was correct
  });

  it("should include evaluatedInput snapshot in result", () => {
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "create-url-endpoint",
          found: true,
          feedback: "Good",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, mockProblemConfig, mockUserInput);

    // Should include snapshot of evaluated input
    expect(result.evaluatedInput).toBeDefined();
    expect(result.evaluatedInput?.endpoints).toHaveLength(1);
    expect(result.evaluatedInput?.endpoints?.[0]).toEqual({
      id: "endpoint-1",
      method: "GET",
      path: "/wrong",
      description: "Wrong endpoint",
    });
  });

  it("should handle evaluation with 6 endpoints", () => {
    const sixEndpointConfig: ProblemConfig = {
      title: "Extended URL Shortener",
      description: "URL shortener with extended API",
      steps: {
        api: {
          requirements: [
            {
              id: "req-create",
              scope: "endpoint",
              method: "POST",
              correctPath: "/urls",
              description: "Create short URL",
              weight: 10,
            },
            {
              id: "req-redirect",
              scope: "endpoint",
              method: "GET",
              correctPath: "/:slug",
              description: "Redirect to original",
              weight: 10,
            },
            {
              id: "req-stats",
              scope: "endpoint",
              method: "GET",
              correctPath: "/urls/:slug/stats",
              description: "Get URL stats",
              weight: 10,
            },
            {
              id: "req-delete",
              scope: "endpoint",
              method: "DELETE",
              correctPath: "/urls/:slug",
              description: "Delete URL",
              weight: 10,
            },
            {
              id: "req-update",
              scope: "endpoint",
              method: "PUT",
              correctPath: "/urls/:slug",
              description: "Update URL",
              weight: 10,
            },
            {
              id: "req-list",
              scope: "endpoint",
              method: "GET",
              correctPath: "/urls",
              description: "List all URLs",
              weight: 10,
            },
          ],
        },
      },
    } as unknown as ProblemConfig;

    const sixEndpointInput = {
      endpoints: [
        {
          id: "ep-1",
          method: { id: "method-1", value: "POST" as const },
          path: { id: "path-1", value: "/urls" },
          description: { id: "desc-1", value: "Create short URL" },
        },
        {
          id: "ep-2",
          method: { id: "method-2", value: "GET" as const },
          path: { id: "path-2", value: "/:slug" },
          description: { id: "desc-2", value: "Redirect to original" },
        },
        {
          id: "ep-3",
          method: { id: "method-3", value: "GET" as const },
          path: { id: "path-3", value: "/urls/:slug/stats" },
          description: { id: "desc-3", value: "Get URL stats" },
        },
        {
          id: "ep-4",
          method: { id: "method-4", value: "DELETE" as const },
          path: { id: "path-4", value: "/urls/:slug" },
          description: { id: "desc-4", value: "Delete URL" },
        },
        {
          id: "ep-5",
          method: { id: "method-5", value: "PUT" as const },
          path: { id: "path-5", value: "/urls/:slug" },
          description: { id: "desc-5", value: "Update URL" },
        },
        {
          id: "ep-6",
          method: { id: "method-6", value: "GET" as const },
          path: { id: "path-6", value: "/urls" },
          description: { id: "desc-6", value: "List all URLs" },
        },
      ],
    };

    // Test buildPrompt handles 6 endpoints
    const prompt = apiService.buildPrompt(sixEndpointConfig, sixEndpointInput);
    expect(prompt).toContain("ep-1");
    expect(prompt).toContain("ep-6");
    expect(prompt).toContain("POST");
    expect(prompt).toContain("DELETE");
    expect(prompt).toContain("PUT");

    // Test parseResponse handles results for 6 endpoints
    const aiResponse = JSON.stringify({
      results: [
        {
          id: "req-create",
          found: true,
          feedback: "Good",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "ep-1",
        },
        {
          id: "req-redirect",
          found: true,
          feedback: "Good",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "ep-2",
        },
        {
          id: "req-stats",
          found: true,
          feedback: "Good",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "ep-3",
        },
        {
          id: "req-delete",
          found: true,
          feedback: "Good",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "ep-4",
        },
        {
          id: "req-update",
          found: true,
          feedback: "Good",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "ep-5",
        },
        {
          id: "req-list",
          found: true,
          feedback: "Good",
          correctMethod: true,
          correctPath: true,
          correctDescription: true,
          matchedEndpointId: "ep-6",
        },
      ],
    });

    const result = apiService.parseResponse(aiResponse, sixEndpointConfig, sixEndpointInput);

    // Should return results for all 6 requirements
    expect(result.results).toHaveLength(6);

    // All should be complete
    result.results.forEach((res) => {
      expect(res.complete).toBe(true);
    });

    // Should include all 6 endpoints in evaluatedInput snapshot
    expect(result.evaluatedInput?.endpoints).toHaveLength(6);
  });
});
