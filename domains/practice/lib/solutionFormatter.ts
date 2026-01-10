/**
 * Solution Formatter
 *
 * Formats solutions for display in the modal using the Open/Closed Principle.
 * Each step type has its own formatter method.
 */

import type { Solution } from "../types";

export type SolutionItem = {
  requirementId: string;
  solution: Solution;
};

type StepType = "functional" | "nonFunctional" | "api";

/**
 * Format a single solution to display text
 */
function formatSolution(solution: Solution): string {
  if ("text" in solution) {
    // Simple solution format
    return solution.text;
  } else if ("overview" in solution && "request" in solution && "response" in solution) {
    // API solution format - format it nicely
    const parts: string[] = [];
    parts.push(solution.overview);
    parts.push(`Request: ${solution.request}`);
    parts.push(`Response: ${solution.response.statusCode} ${solution.response.text}`);
    if (solution.errors && solution.errors.length > 0) {
      const errorStrings = solution.errors.map((err) => `${err.statusCode}: ${err.text}`);
      parts.push(`Errors: ${errorStrings.join(", ")}`);
    }
    return parts.join("\n");
  } else {
    // Fallback (shouldn't happen)
    return JSON.stringify(solution);
  }
}

/**
 * Format solutions for functional requirements step
 */
function formatFunctional(solutions: SolutionItem[]): string {
  return solutions.map((item) => formatSolution(item.solution)).join("\n\n");
}

/**
 * Format solutions for non-functional requirements step
 */
function formatNonFunctional(solutions: SolutionItem[]): string {
  return solutions.map((item) => formatSolution(item.solution)).join("\n\n");
}

/**
 * Format solutions for API design step
 */
function formatApi(solutions: SolutionItem[]): Array<{ requirementId: string; text: string }> {
  return solutions.map((item) => ({
    requirementId: item.requirementId,
    text: formatSolution(item.solution),
  }));
}

/**
 * Solution formatter map using Open/Closed Principle
 * Add new step types by adding entries here
 */
const SOLUTION_FORMATTERS: Record<
  StepType,
  (solutions: SolutionItem[]) => string | Array<{ requirementId: string; text: string }>
> = {
  functional: formatFunctional,
  nonFunctional: formatNonFunctional,
  api: formatApi,
};

/**
 * Format solutions for display in the modal
 */
export function formatSolutionsForDisplay(
  stepType: StepType,
  solutions: SolutionItem[]
): string | Array<{ requirementId: string; text: string }> {
  const formatter = SOLUTION_FORMATTERS[stepType];
  if (!formatter) {
    // Fallback: just format all as text
    return solutions.map((item) => formatSolution(item.solution)).join("\n\n");
  }
  return formatter(solutions);
}
