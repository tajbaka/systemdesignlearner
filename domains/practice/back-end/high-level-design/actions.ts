import type { PracticeDesignState } from "./types";
import type { SaveStepResponse } from "../../lib/schemas/step-data";

/**
 * Save high-level design to the backend
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param diagram - The user's diagram state
 * @returns The saved step data from the API
 */
async function saveHighLevelDesign(
  scenarioSlug: string,
  diagram: PracticeDesignState
): Promise<SaveStepResponse> {
  const payload = {
    data: { diagram },
  };

  const response = await fetch(`/api/v2/practice/${scenarioSlug}/highLevelDesign`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save high-level design");
  }

  return response.json();
}

/**
 * Evaluate high-level design via API
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param diagram - The user's diagram state
 * @returns Evaluation result
 */
async function evaluate(scenarioSlug: string, diagram: PracticeDesignState | null) {
  try {
    // Call the evaluate API endpoint
    const evaluateResponse = await fetch(
      `/api/v2/practice/${scenarioSlug}/highLevelDesign/evaluate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { diagram },
        }),
      }
    );

    if (!evaluateResponse.ok) {
      const errorData = await evaluateResponse.json();
      throw new Error(errorData.error || "Evaluation failed");
    }

    const results = await evaluateResponse.json();

    return results;
  } catch (error) {
    console.error("Failed to evaluate:", error);
    throw error;
  }
}

const highLevelDesignActions = {
  saveHighLevelDesign,
  evaluate,
};

export default highLevelDesignActions;
