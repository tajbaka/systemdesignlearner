import { describe, it, expect, vi } from "vitest";
import {
  getChangedEndpointIds,
  getChangedFields,
  mergeEvaluationResults,
} from "../changeDetection";
import type { APIEvaluationResult } from "@/app/api/v2/practice/(evaluation)/types";
import type { EndpointItem } from "@/domains/practice/back-end/store/store.tsx";

describe("Change Detection", () => {
  const createEndpoint = (
    id: string,
    method: string,
    path: string,
    desc: string
  ): EndpointItem => ({
    id,
    value: "",
    method: { id: `method-${id}`, value: method as "GET" | "POST" },
    path: { id: `path-${id}`, value: path },
    description: { id: `desc-${id}`, value: desc },
  });

  describe("getChangedEndpointIds", () => {
    it("should return all endpoint IDs when no previous evaluation exists", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Get users")];
      const changed = getChangedEndpointIds(endpoints, undefined);

      expect(changed.size).toBe(1);
      expect(changed.has("1")).toBe(true);
    });

    it("should return all endpoint IDs when previous evaluation has no evaluatedInput", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Get users")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        // No evaluatedInput
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.size).toBe(1);
      expect(changed.has("1")).toBe(true);
    });

    it("should return empty set when nothing changed", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Get users")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.size).toBe(0);
    });

    it("should detect method change", () => {
      const endpoints = [createEndpoint("1", "POST", "/users", "Get users")]; // Changed to POST
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.has("1")).toBe(true);
    });

    it("should detect path change", () => {
      const endpoints = [createEndpoint("1", "GET", "/customers", "Get users")]; // Changed path
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.has("1")).toBe(true);
    });

    it("should detect description change", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Updated description")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.has("1")).toBe(true);
    });

    it("should ignore case and whitespace differences in text fields", () => {
      const endpoints = [createEndpoint("1", "GET", "  /users  ", "  GET USERS  ")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "get users" }],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.size).toBe(0);
    });

    it("should detect only changed endpoint in multi-endpoint scenario", () => {
      const endpoints = [
        createEndpoint("1", "GET", "/users", "Get users"), // Unchanged
        createEndpoint("2", "POST", "/orders", "CHANGED desc"), // Changed description
      ];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [
            { id: "1", method: "GET", path: "/users", description: "Get users" },
            { id: "2", method: "POST", path: "/orders", description: "Create order" },
          ],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.has("1")).toBe(false); // Endpoint 1 unchanged
      expect(changed.has("2")).toBe(true); // Endpoint 2 changed
    });

    it("should detect new endpoints", () => {
      const endpoints = [
        createEndpoint("1", "GET", "/users", "Get users"),
        createEndpoint("2", "POST", "/orders", "Create order"), // NEW
      ];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.has("1")).toBe(false);
      expect(changed.has("2")).toBe(true);
    });

    it("should detect deleted endpoints", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Get users")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [
            { id: "1", method: "GET", path: "/users", description: "Get users" },
            { id: "2", method: "POST", path: "/orders", description: "Create order" }, // Will be deleted
          ],
        },
      };

      const changed = getChangedEndpointIds(endpoints, previousEval);
      expect(changed.has("1")).toBe(false);
      expect(changed.has("2")).toBe(true); // Deleted endpoint is marked as changed
    });
  });

  describe("getChangedFields", () => {
    it("should return all fields for all endpoints when no previous evaluation exists", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Get users")];
      const changedFields = getChangedFields(endpoints, undefined);

      expect(changedFields.size).toBe(1);
      const fields = changedFields.get("1");
      expect(fields?.has("method")).toBe(true);
      expect(fields?.has("path")).toBe(true);
      expect(fields?.has("description")).toBe(true);
    });

    it("should return empty map when nothing changed", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Get users")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changedFields = getChangedFields(endpoints, previousEval);
      expect(changedFields.size).toBe(0);
    });

    it("should detect only method change", () => {
      const endpoints = [createEndpoint("1", "POST", "/users", "Get users")]; // Changed to POST
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changedFields = getChangedFields(endpoints, previousEval);
      expect(changedFields.size).toBe(1);
      const fields = changedFields.get("1");
      expect(fields?.has("method")).toBe(true);
      expect(fields?.has("path")).toBe(false);
      expect(fields?.has("description")).toBe(false);
    });

    it("should detect only path change", () => {
      const endpoints = [createEndpoint("1", "GET", "/customers", "Get users")]; // Changed path
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changedFields = getChangedFields(endpoints, previousEval);
      expect(changedFields.size).toBe(1);
      const fields = changedFields.get("1");
      expect(fields?.has("method")).toBe(false);
      expect(fields?.has("path")).toBe(true);
      expect(fields?.has("description")).toBe(false);
    });

    it("should detect only description change", () => {
      const endpoints = [createEndpoint("1", "GET", "/users", "Updated description")];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changedFields = getChangedFields(endpoints, previousEval);
      expect(changedFields.size).toBe(1);
      const fields = changedFields.get("1");
      expect(fields?.has("method")).toBe(false);
      expect(fields?.has("path")).toBe(false);
      expect(fields?.has("description")).toBe(true);
    });

    it("should detect multiple changed fields", () => {
      const endpoints = [createEndpoint("1", "POST", "/customers", "Get users")]; // Changed method and path
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/users", description: "Get users" }],
        },
      };

      const changedFields = getChangedFields(endpoints, previousEval);
      expect(changedFields.size).toBe(1);
      const fields = changedFields.get("1");
      expect(fields?.has("method")).toBe(true);
      expect(fields?.has("path")).toBe(true);
      expect(fields?.has("description")).toBe(false);
    });

    it("should track different fields changed in different endpoints", () => {
      const endpoints = [
        createEndpoint("1", "POST", "/users", "Get users"), // Changed method only
        createEndpoint("2", "GET", "/api/orders", "Create order"), // Changed path only
      ];
      const previousEval: APIEvaluationResult = {
        feedback: "done",
        results: [],
        evaluatedInput: {
          endpoints: [
            { id: "1", method: "GET", path: "/users", description: "Get users" },
            { id: "2", method: "GET", path: "/orders", description: "Create order" },
          ],
        },
      };

      const changedFields = getChangedFields(endpoints, previousEval);
      expect(changedFields.size).toBe(2);

      const fields1 = changedFields.get("1");
      expect(fields1?.has("method")).toBe(true);
      expect(fields1?.has("path")).toBe(false);
      expect(fields1?.has("description")).toBe(false);

      const fields2 = changedFields.get("2");
      expect(fields2?.has("method")).toBe(false);
      expect(fields2?.has("path")).toBe(true);
      expect(fields2?.has("description")).toBe(false);
    });
  });

  describe("mergeEvaluationResults", () => {
    it("should preserve completed requirement when no endpoints changed", () => {
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: true, feedback: "Good!" }],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: false, feedback: "AI regressed", itemIds: ["path-1"] }],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set<string>(); // Nothing changed

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should preserve completion from previous since nothing changed
      expect(merged.results[0].complete).toBe(true);
      expect(merged.results[0].itemIds).toBeUndefined();
    });

    it("should use new result when endpoint content changed", () => {
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: true, matchedEndpointId: "endpoint-1" }],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          { id: "req-1", complete: false, itemIds: ["method-1"], matchedEndpointId: "endpoint-1" },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set(["endpoint-1"]); // This specific endpoint changed

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should use new result since THIS requirement's matched endpoint changed
      expect(merged.results[0].complete).toBe(false);
      expect(merged.results[0].itemIds).toContain("method-1");
    });

    it("should return new results when no previous evaluation exists", () => {
      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: false, itemIds: ["path-1"] }],
        evaluatedInput: { endpoints: [] },
      };

      const merged = mergeEvaluationResults(newResults, undefined, new Set());

      expect(merged).toEqual(newResults);
    });

    it("should accept improvements (incomplete to complete)", () => {
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: false, itemIds: ["method-1"] }],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: true }], // Improved!
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set<string>(); // Nothing changed

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should accept the improvement
      expect(merged.results[0].complete).toBe(true);
    });

    it("should handle new requirements that did not exist before", () => {
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: true }],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          { id: "req-1", complete: true },
          { id: "req-2", complete: false, itemIds: ["path-2"] }, // New requirement
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set<string>();

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      expect(merged.results).toHaveLength(2);
      expect(merged.results[1].id).toBe("req-2");
      expect(merged.results[1].complete).toBe(false);
    });

    it("should preserve new evaluatedInput snapshot", () => {
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: true }],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "GET", path: "/old", description: "old" }],
        },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "req-1", complete: true }],
        evaluatedInput: {
          endpoints: [{ id: "1", method: "POST", path: "/new", description: "new" }],
        },
      };

      const changedEndpointIds = new Set(["1"]);

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should have the new snapshot
      expect(merged.evaluatedInput?.endpoints?.[0].method).toBe("POST");
      expect(merged.evaluatedInput?.endpoints?.[0].path).toBe("/new");
    });

    it("should handle multiple requirements with mixed changes", () => {
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          { id: "req-1", complete: true }, // Will regress in new
          { id: "req-2", complete: false, itemIds: ["method-2"] }, // Will improve in new
          { id: "req-3", complete: true }, // Stays complete in new
        ],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          { id: "req-1", complete: false, itemIds: ["path-1"] }, // AI regression
          { id: "req-2", complete: true }, // Improvement
          { id: "req-3", complete: true }, // Still complete
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set<string>(); // Nothing changed

      // Mock console.warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // req-1: Should preserve completion (regression blocked)
      expect(merged.results[0].complete).toBe(true);
      expect(merged.results[0].itemIds).toBeUndefined();

      // req-2: Should accept improvement
      expect(merged.results[1].complete).toBe(true);

      // req-3: Should stay complete
      expect(merged.results[2].complete).toBe(true);

      warnSpy.mockRestore();
    });

    it("should preserve requirement when UNRELATED endpoint changed (key scenario)", () => {
      // This tests the exact bug scenario:
      // - User has endpoint-1 (matched to req-1, complete ✓)
      // - User has endpoint-2 (matched to req-2, incomplete)
      // - User fixes endpoint-2
      // - AI re-evaluates and randomly regresses req-1
      // - We should PRESERVE req-1's completion because endpoint-1 didn't change
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          { id: "create-url-endpoint", complete: true, matchedEndpointId: "endpoint-1" },
          {
            id: "redirect-endpoint",
            complete: false,
            itemIds: ["path-2"],
            matchedEndpointId: "endpoint-2",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["desc-1"],
            matchedEndpointId: "endpoint-1",
          }, // AI regressed!
          {
            id: "redirect-endpoint",
            complete: false,
            itemIds: ["desc-2"],
            matchedEndpointId: "endpoint-2",
          }, // Still incomplete (path fixed, desc now wrong)
        ],
        evaluatedInput: { endpoints: [] },
      };

      // Only endpoint-2 changed (user fixed it)
      const changedEndpointIds = new Set(["endpoint-2"]);

      // Mock console.warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // create-url-endpoint: Should preserve completion (endpoint-1 didn't change)
      expect(merged.results[0].complete).toBe(true);
      expect(merged.results[0].itemIds).toBeUndefined();

      // redirect-endpoint: Should use new result (endpoint-2 changed)
      expect(merged.results[1].complete).toBe(false);
      expect(merged.results[1].itemIds).toContain("desc-2");

      // Should have warned about regression
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("AI regression detected for requirement create-url-endpoint")
      );

      warnSpy.mockRestore();
    });

    it("should sort itemIds by priority: method → path → description", () => {
      // When AI marks multiple fields as wrong, they should be sorted by priority
      // so the frontend (which uses itemIds[0]) highlights the most important field first
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "create-url-endpoint", complete: true, matchedEndpointId: "endpoint-1" }],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["desc-1", "path-1", "method-1"], // AI returns in random order
            matchedEndpointId: "endpoint-1",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set(["endpoint-1"]);

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should be sorted: method → path → description
      expect(merged.results[0].complete).toBe(false);
      expect(merged.results[0].itemIds).toEqual(["method-1", "path-1", "desc-1"]);
      // First item should be method (highest priority for frontend to highlight)
      expect(merged.results[0].itemIds?.[0]).toBe("method-1");
    });

    it("should keep all itemIds when AI marks fields as wrong (with sorting)", () => {
      // User changed PATH only, but AI marks METHOD as wrong too
      // New behavior: keep all itemIds, just sort them by priority
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [{ id: "create-url-endpoint", complete: true, matchedEndpointId: "endpoint-1" }],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["path-1", "method-1"], // AI says both are wrong
            matchedEndpointId: "endpoint-1",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set(["endpoint-1"]);

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should use new result since endpoint changed, but itemIds should be sorted
      expect(merged.results[0].complete).toBe(false);
      // Method should come first (higher priority)
      expect(merged.results[0].itemIds).toEqual(["method-1", "path-1"]);
    });

    it("should use new itemIds for incomplete->incomplete transitions (sorted)", () => {
      // Previous: method was wrong
      // User fixes method, changes path (path is now wrong)
      // AI should only flag path
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["method-1"],
            matchedEndpointId: "endpoint-1",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["path-1"], // AI says path is now wrong
            matchedEndpointId: "endpoint-1",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set(["endpoint-1"]);

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should use new itemIds (path-1) since AI says method is now correct
      expect(merged.results[0].complete).toBe(false);
      expect(merged.results[0].itemIds).toEqual(["path-1"]);
    });

    it("should keep all itemIds from AI and sort them by priority", () => {
      // Previous: description was wrong
      // User only changes path (doesn't fix description)
      // AI now says path is wrong, description is still wrong
      // New behavior: keep both, but sort by priority (path before description)
      const previousResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["desc-1"],
            matchedEndpointId: "endpoint-1",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const newResults: APIEvaluationResult = {
        feedback: "done",
        results: [
          {
            id: "create-url-endpoint",
            complete: false,
            itemIds: ["desc-1", "path-1"], // AI says both path and desc are wrong (in random order)
            matchedEndpointId: "endpoint-1",
          },
        ],
        evaluatedInput: { endpoints: [] },
      };

      const changedEndpointIds = new Set(["endpoint-1"]);

      const merged = mergeEvaluationResults(newResults, previousResults, changedEndpointIds);

      // Should show BOTH but sorted by priority: path before description
      expect(merged.results[0].complete).toBe(false);
      expect(merged.results[0].itemIds).toEqual(["path-1", "desc-1"]);
      // Path should be first (higher priority than description)
      expect(merged.results[0].itemIds?.[0]).toBe("path-1");
    });
  });
});
