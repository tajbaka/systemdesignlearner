import type { SaveStepResponse } from "../../lib/schemas/step-data";
import type { EndpointItem } from "../store/store";
import type { CachedExtractions } from "@/server/domains/practice/services/evaluation/types";

export type ApiEndpoints = EndpointItem[];

/**
 * Save API endpoints to the backend
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param apiEndpoints - The API endpoints to save
 * @param status - The status of the step (draft or submitted)
 * @returns Response from the backend
 */
async function saveApiEndpoints(
  scenarioSlug: string,
  apiEndpoints: ApiEndpoints,
  _status: "draft" | "submitted" = "draft"
): Promise<SaveStepResponse> {
  const response = await fetch(`/api/v2/practice/${scenarioSlug}/api`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { endpoints: apiEndpoints },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(error.error || "Failed to save API endpoints");
  }

  return response.json();
}

/**
 * Evaluate API endpoints using AI
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param apiEndpoints - The API endpoints to evaluate
 * @param previousExtractions - Optional cached extractions to skip LLM calls for unchanged endpoints
 * @param changedEndpointIds - IDs of endpoints whose descriptions changed (need re-extraction)
 * @returns Evaluation result
 */
async function evaluate(
  scenarioSlug: string,
  apiEndpoints: ApiEndpoints,
  previousExtractions?: CachedExtractions,
  changedEndpointIds?: string[]
) {
  const normalizedEndpoints = apiEndpoints.map((endpoint) => ({
    id: endpoint.id,
    method: {
      id: endpoint.method.id,
      value: endpoint.method.value,
    },
    path: {
      id: endpoint.path.id,
      value: endpoint.path.value,
    },
    description: {
      id: endpoint.description.id,
      value: endpoint.description.value,
    },
  }));

  const evaluateResponse = await fetch(`/api/v2/practice/${scenarioSlug}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { endpoints: normalizedEndpoints },
      previousExtractions,
      changedEndpointIds,
    }),
  });

  if (!evaluateResponse.ok) {
    const errorData = await evaluateResponse.json();
    throw new Error(errorData.error || "Evaluation failed");
  }

  return evaluateResponse.json();
}

const apiActions = {
  saveApiEndpoints,
  evaluate,
};

export default apiActions;
