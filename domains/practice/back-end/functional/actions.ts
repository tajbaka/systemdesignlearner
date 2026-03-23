import type { FunctionalRequirements } from "../store/store";
import type { SaveStepResponse } from "../../lib/schemas/step-data";

/**
 * Save functional requirements to the backend
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param functionalRequirements - The functional requirements data from the store
 * @param status - The status of the step ("draft" or "submitted")
 * @returns The saved step data from the API
 */
async function saveFunctionalRequirements(
  scenarioSlug: string,
  functionalRequirements: FunctionalRequirements
): Promise<SaveStepResponse> {
  const payload = {
    data: functionalRequirements,
  };

  const response = await fetch(`/api/v2/practice/${scenarioSlug}/functional`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save functional requirements");
  }

  return response.json();
}

/**
 * Evaluate functional requirements using AI
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param functionalRequirements - The functional requirements to evaluate
 * @returns Evaluation result
 */
async function evaluate(scenarioSlug: string, functionalRequirements: FunctionalRequirements) {
  const input = {
    textField: functionalRequirements.textField,
  };

  const evaluateResponse = await fetch(`/api/v2/practice/${scenarioSlug}/functional/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
    }),
  });

  if (!evaluateResponse.ok) {
    const errorData = await evaluateResponse.json();
    throw new Error(errorData.error || "Evaluation failed");
  }

  return evaluateResponse.json();
}

const functionalActions = {
  saveFunctionalRequirements,
  evaluate,
};

export default functionalActions;
