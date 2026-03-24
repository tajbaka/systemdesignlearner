import type { EvaluationResult } from "./types";

type Requirement = {
  id: string;
  weight?: number;
  solutions?: Array<{ text: string }>;
};

/**
 * Check if user input contains all solution texts.
 * If all requirements have matching solutions, returns a perfect evaluation result.
 * Otherwise returns null to indicate LLM evaluation is needed.
 */
export function checkExactSolutionMatch(
  userInput: string,
  requirements: Requirement[]
): EvaluationResult | null {
  const allSolutionsMatch = requirements.every((req) =>
    req.solutions?.some((sol) => userInput.includes(sol.text))
  );

  if (!allSolutionsMatch) {
    return null;
  }

  const totalScore = requirements.reduce((acc, req) => acc + (req.weight || 0), 0);

  return {
    feedback: "Evaluation complete.",
    score: totalScore,
    results: requirements.map((req) => ({
      id: req.id,
      complete: true,
    })),
  };
}
