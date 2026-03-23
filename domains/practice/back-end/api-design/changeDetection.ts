/**
 * Change Detection Utilities for API Evaluation
 *
 * This module provides field-level change detection and result merging for the API design step.
 * Key features:
 * - `getChangedFields()` - Detects which specific fields (method/path/description) changed per endpoint
 * - `mergeEvaluationResults()` - Protects against AI regression by preserving completed requirements
 *   when their matched endpoints haven't changed
 * - `sortItemIdsByPriority()` - Ensures method → path → description priority for field highlighting
 */
import type { EndpointItem } from "../store/store.tsx";
import type { APIEvaluationResult } from "@/server/domains/practice/services/evaluation/types";

type EvaluatedEndpoint = {
  id: string;
  method: string;
  path: string;
  description: string;
};

export type FieldName = "method" | "path" | "description";

export type ChangedFieldsMap = Map<string, Set<FieldName>>;

/**
 * Normalizes a string for comparison by trimming whitespace and converting to lowercase.
 */
function normalizeForComparison(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Compare current endpoints with what was previously evaluated.
 * Returns a Map of endpoint IDs to Sets of changed field names.
 * This allows field-level change detection rather than just endpoint-level.
 */
export function getChangedFields(
  currentEndpoints: EndpointItem[],
  previousEvaluation: APIEvaluationResult | undefined
): ChangedFieldsMap {
  const changedFields: ChangedFieldsMap = new Map();

  // Debug: Log what we're comparing
  console.log("[ChangeDetection] Comparing:", {
    current: currentEndpoints.map((e) => ({
      id: e.id,
      desc: e.description.value.substring(0, 80),
    })),
    previous: previousEvaluation?.evaluatedInput?.endpoints?.map((e) => ({
      id: e.id,
      desc: e.description.substring(0, 80),
    })),
  });

  if (!previousEvaluation?.evaluatedInput?.endpoints) {
    // No previous evaluation - all fields of all endpoints are "changed"
    currentEndpoints.forEach((ep) => {
      changedFields.set(ep.id, new Set(["method", "path", "description"]));
    });
    return changedFields;
  }

  const previousMap = new Map<string, EvaluatedEndpoint>();
  for (const ep of previousEvaluation.evaluatedInput.endpoints) {
    previousMap.set(ep.id, ep);
  }

  // Check each current endpoint against previous
  for (const current of currentEndpoints) {
    const previous = previousMap.get(current.id);

    if (!previous) {
      // New endpoint - all fields are "changed"
      changedFields.set(current.id, new Set(["method", "path", "description"]));
      continue;
    }

    // Compare each field individually
    const fields = new Set<FieldName>();

    if (current.method.value !== previous.method) {
      fields.add("method");
    }
    if (normalizeForComparison(current.path.value) !== normalizeForComparison(previous.path)) {
      fields.add("path");
    }
    if (
      normalizeForComparison(current.description.value) !==
      normalizeForComparison(previous.description)
    ) {
      fields.add("description");
    }

    if (fields.size > 0) {
      changedFields.set(current.id, fields);
    }
  }

  // Check for deleted endpoints (endpoint existed before but not now)
  for (const prevEp of previousEvaluation.evaluatedInput.endpoints) {
    if (!currentEndpoints.find((ep) => ep.id === prevEp.id)) {
      // Deleted endpoint - mark all fields as changed for tracking
      changedFields.set(prevEp.id, new Set(["method", "path", "description"]));
    }
  }

  return changedFields;
}

/**
 * Backwards-compatible wrapper that returns just the endpoint IDs that changed.
 * Use getChangedFields() for field-level detection.
 */
export function getChangedEndpointIds(
  currentEndpoints: EndpointItem[],
  previousEvaluation: APIEvaluationResult | undefined
): Set<string> {
  const changedFields = getChangedFields(currentEndpoints, previousEvaluation);
  return new Set(changedFields.keys());
}

/**
 * Maps a field item ID to its field name.
 * Item IDs follow the pattern: "method-xxx", "path-xxx", "desc-xxx"
 */
function getFieldNameFromItemId(itemId: string): FieldName | null {
  if (itemId.startsWith("method-")) return "method";
  if (itemId.startsWith("path-")) return "path";
  if (itemId.startsWith("desc-")) return "description";
  return null;
}

/**
 * Priority order for field types.
 * Method should be fixed first, then path, then description.
 */
const FIELD_PRIORITY: Record<FieldName, number> = {
  method: 0,
  path: 1,
  description: 2,
};

/**
 * Sorts itemIds by field priority: method → path → description.
 * This ensures the frontend (which uses itemIds[0]) always highlights
 * the highest priority field first.
 */
function sortItemIdsByPriority(itemIds: string[] | undefined): string[] | undefined {
  if (!itemIds || itemIds.length === 0) return undefined;

  return [...itemIds].sort((a, b) => {
    const fieldA = getFieldNameFromItemId(a);
    const fieldB = getFieldNameFromItemId(b);

    // Unknown fields go to the end
    const priorityA = fieldA ? FIELD_PRIORITY[fieldA] : 999;
    const priorityB = fieldB ? FIELD_PRIORITY[fieldB] : 999;

    return priorityA - priorityB;
  });
}

/**
 * Merge previous results with new results, preserving unchanged.
 *
 * For requirements whose matched endpoint hasn't changed:
 * - Keep previous complete=true (don't let AI regress)
 * - Accept improvements (incomplete -> complete)
 *
 * All itemIds are kept but sorted by priority: method → path → description.
 * This ensures the frontend (which uses itemIds[0]) always highlights
 * the highest priority field first.
 */
export function mergeEvaluationResults(
  newResults: APIEvaluationResult,
  previousResults: APIEvaluationResult | undefined,
  changedEndpointIds: Set<string>
): APIEvaluationResult {
  if (!previousResults?.results) {
    // First evaluation - sort itemIds by priority
    return {
      ...newResults,
      results: newResults.results.map((result) => ({
        ...result,
        itemIds: sortItemIdsByPriority(result.itemIds),
      })),
    };
  }

  const previousResultsMap = new Map(previousResults.results.map((r) => [r.id, r]));

  const mergedResults = newResults.results.map((newResult) => {
    const previousResult = previousResultsMap.get(newResult.id);

    if (!previousResult) {
      // New requirement - sort itemIds by priority
      return {
        ...newResult,
        itemIds: sortItemIdsByPriority(newResult.itemIds),
      };
    }

    // Determine if THIS requirement's matched endpoint changed
    // Use the previous matchedEndpointId since that's what we evaluated against before
    const thisEndpointChanged =
      previousResult.matchedEndpointId != null &&
      changedEndpointIds.has(previousResult.matchedEndpointId);

    // If AI says complete now, always accept the improvement
    if (newResult.complete) {
      return newResult;
    }

    // If previously complete but AI now says incomplete...
    if (previousResult.complete && !newResult.complete) {
      // If THIS requirement's matched endpoint changed, accept the new incomplete status
      if (thisEndpointChanged) {
        return {
          ...newResult,
          itemIds: sortItemIdsByPriority(newResult.itemIds),
        };
      }

      // If this requirement's endpoint didn't change, this is AI regression - preserve previous
      console.warn(
        `[Evaluation] AI regression detected for requirement ${newResult.id}. ` +
          `Was complete, now incomplete. Endpoint ${previousResult.matchedEndpointId} unchanged. ` +
          `Preserving previous completion.`
      );
      return {
        ...previousResult,
        feedback: newResult.feedback || previousResult.feedback,
        matchedEndpointId: newResult.matchedEndpointId, // Keep new matched endpoint for future tracking
      };
    }

    // For incomplete -> incomplete transitions, use new result with sorted itemIds
    return {
      ...newResult,
      itemIds: sortItemIdsByPriority(newResult.itemIds),
    };
  });

  return {
    ...newResults,
    results: mergedResults,
    // Keep the new evaluatedInput snapshot
  };
}
