import type { NonFunctionalRequirements } from "../store/store";
import type { SaveStepResponse } from "../../lib/schemas/step-data";

/**
 * Save non-functional requirements to the backend
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param nonFunctionalRequirements - The non-functional requirements data from the store
 * @param status - The status of the step ("draft" or "submitted")
 * @returns The saved step data from the API
 */
async function saveNonFunctionalRequirements(
  scenarioSlug: string,
  nonFunctionalRequirements: NonFunctionalRequirements
): Promise<SaveStepResponse> {
  const payload = {
    data: nonFunctionalRequirements,
  };

  const response = await fetch(`/api/v2/practice/${scenarioSlug}/nonFunctional`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save non-functional requirements");
  }

  return response.json();
}

/**
 * Evaluate non-functional requirements using AI
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @param nonFunctionalRequirements - The non-functional requirements to evaluate
 * @returns Evaluation result
 */
async function evaluate(
  scenarioSlug: string,
  nonFunctionalRequirements: NonFunctionalRequirements
) {
  const input = {
    textField: nonFunctionalRequirements.textField,
  };

  const evaluateResponse = await fetch(`/api/v2/practice/${scenarioSlug}/nonFunctional/evaluate`, {
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

const nonFunctionalActions = {
  saveNonFunctionalRequirements,
  evaluate,
};

export default nonFunctionalActions;
