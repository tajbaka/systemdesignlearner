import type { ApiSolution, Solution } from "../types";

export function isApiSolution(solution: unknown): solution is ApiSolution {
  return (
    !!solution &&
    typeof solution === "object" &&
    "overview" in solution &&
    "request" in solution &&
    "response" in solution
  );
}

export function formatApiSolution(solution: ApiSolution): string {
  const parts: string[] = [];

  if (solution.overview) {
    parts.push(solution.overview);
  }

  if (solution.request) {
    parts.push(`\nRequest: ${solution.request}`);
  }

  if (solution.response) {
    parts.push(`\nResponse (${solution.response.statusCode}): ${solution.response.text}`);
  }

  if (solution.errors && solution.errors.length > 0) {
    parts.push("\nError Codes:");
    solution.errors.forEach((error) => {
      parts.push(`- ${error.statusCode}: ${error.text}`);
    });
  }

  return parts.join("\n");
}

export function formatSolution(solution: Solution): string {
  if (isApiSolution(solution)) {
    return formatApiSolution(solution);
  }
  if ("text" in solution) {
    return solution.text;
  }
  return "";
}
