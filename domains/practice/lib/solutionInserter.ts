/**
 * Solution Inserter
 *
 * Inserts solutions into the appropriate UI elements using the Open/Closed Principle.
 * Each step type has its own inserter method.
 * Solutions are fetched from the config based on problem slug and step type.
 */

import type { Solution } from "../types";
import type { PracticeState } from "../types";
import type { ProblemScoringConfig } from "../types";
import { getScoringConfigSync } from "../scoring";

type StepType = "functional" | "nonFunctional" | "api";

type InserterContext = {
  state: PracticeState;
  setRequirements: (requirements: PracticeState["requirements"]) => void;
  setApiDefinition: (
    updater: (prev: PracticeState["apiDefinition"]) => PracticeState["apiDefinition"]
  ) => void;
};

/**
 * Insert solutions for functional requirements step
 */
function insertFunctional(config: ProblemScoringConfig, context: InserterContext): void {
  const requirements = config.steps.functional.requirements || [];
  const solutionItems: Array<{ requirementId: string; solution: Solution }> = [];

  for (const req of requirements) {
    if (req.required && req.solutions && req.solutions.length > 0) {
      solutionItems.push({
        requirementId: req.id,
        solution: req.solutions[0],
      });
    }
  }

  const formatted = solutionItems
    .map((item) => {
      if ("text" in item.solution) {
        return item.solution.text;
      }
      return JSON.stringify(item.solution);
    })
    .join("\n\n");

  context.setRequirements({
    ...context.state.requirements,
    functionalSummary: formatted,
  });
}

/**
 * Insert solutions for non-functional requirements step
 */
function insertNonFunctional(config: ProblemScoringConfig, context: InserterContext): void {
  const requirements = config.steps.nonFunctional.requirements || [];
  const solutionItems: Array<{ requirementId: string; solution: Solution }> = [];

  for (const req of requirements) {
    if (req.required && req.solutions && req.solutions.length > 0) {
      solutionItems.push({
        requirementId: req.id,
        solution: req.solutions[0],
      });
    }
  }

  const formatted = solutionItems
    .map((item) => {
      if ("text" in item.solution) {
        return item.solution.text;
      }
      return JSON.stringify(item.solution);
    })
    .join("\n\n");

  context.setRequirements({
    ...context.state.requirements,
    nonFunctional: {
      ...context.state.requirements.nonFunctional,
      notes: formatted,
    },
  });
}

/**
 * Insert solutions for API design step
 * Each solution is inserted into the matching endpoint's notes field
 */
function insertApi(config: ProblemScoringConfig, context: InserterContext): void {
  const apiReqs = config.steps.api.requirements || [];
  const solutionItems: Array<{ requirementId: string; solution: Solution }> = [];

  // Fetch solutions from config
  for (const req of apiReqs) {
    if (req.required && req.solutions && req.solutions.length > 0) {
      solutionItems.push({
        requirementId: req.id,
        solution: req.solutions[0],
      });
    }
  }

  context.setApiDefinition((prev) => {
    const updatedEndpoints = [...prev.endpoints];

    // Iterate through solutions and find matching endpoints
    for (const solutionItem of solutionItems) {
      // Find the requirement for this solution
      const req = apiReqs.find((r) => r.id === solutionItem.requirementId);

      if (!req || !req.endpoint) continue;

      const endpointConfig = req.endpoint;

      // Format the solution
      let formattedText: string;
      if ("text" in solutionItem.solution) {
        formattedText = solutionItem.solution.text;
      } else if (
        "overview" in solutionItem.solution &&
        "request" in solutionItem.solution &&
        "response" in solutionItem.solution
      ) {
        // API solution format - format it nicely
        const parts: string[] = [];
        parts.push(solutionItem.solution.overview);
        parts.push(`Request: ${solutionItem.solution.request}`);
        parts.push(
          `Response: ${solutionItem.solution.response.statusCode} ${solutionItem.solution.response.text}`
        );
        if (solutionItem.solution.errors && solutionItem.solution.errors.length > 0) {
          const errorStrings = solutionItem.solution.errors.map(
            (err) => `${err.statusCode}: ${err.text}`
          );
          parts.push(`Errors: ${errorStrings.join(", ")}`);
        }
        formattedText = parts.join("\n");
      } else {
        formattedText = JSON.stringify(solutionItem.solution);
      }

      // Find the endpoint that matches this requirement
      // Try to match by method + path first, then fall back to method only
      let matchingEndpointIndex = updatedEndpoints.findIndex(
        (endpoint) =>
          endpoint.method === endpointConfig.method &&
          (endpoint.path === endpointConfig.correctPath ||
            endpoint.path === "" ||
            endpointConfig.correctPath === "")
      );

      // If no match by path, try method only
      if (matchingEndpointIndex === -1) {
        matchingEndpointIndex = updatedEndpoints.findIndex(
          (endpoint) => endpoint.method === endpointConfig.method
        );
      }

      // If we found a matching endpoint, update its notes
      if (matchingEndpointIndex !== -1) {
        updatedEndpoints[matchingEndpointIndex] = {
          ...updatedEndpoints[matchingEndpointIndex],
          notes: formattedText,
        };
      }
    }

    return {
      ...prev,
      endpoints: updatedEndpoints,
    };
  });
}

/**
 * Solution inserter map using Open/Closed Principle
 * Add new step types by adding entries here
 */
const SOLUTION_INSERTERS: Record<
  StepType,
  (config: ProblemScoringConfig, context: InserterContext) => void
> = {
  functional: insertFunctional,
  nonFunctional: insertNonFunctional,
  api: insertApi,
};

/**
 * Insert solutions into the appropriate UI elements
 * Solutions are fetched from the config based on problem slug and step type
 */
export function insertSolutions(stepType: StepType, slug: string, context: InserterContext): void {
  const config = getScoringConfigSync(slug);
  if (!config) {
    console.warn(`No config found for slug: ${slug}`);
    return;
  }

  const inserter = SOLUTION_INSERTERS[stepType];
  if (!inserter) {
    console.warn(`No inserter found for step type: ${stepType}`);
    return;
  }
  inserter(config, context);
}
