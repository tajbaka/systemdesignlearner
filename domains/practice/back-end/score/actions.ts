export type StepScore = {
  stepType: string;
  title: string;
  order: number;
  score: number;
  maxScore: number;
  completed: boolean;
};

export type ScoreResponse = {
  stepScores: StepScore[];
};

/**
 * Get the total score for a problem
 * @param scenarioSlug - The problem slug (e.g., "url-shortener")
 * @returns The total score and individual step scores
 */
async function getScore(scenarioSlug: string): Promise<ScoreResponse> {
  const response = await fetch(`/api/v2/practice/${scenarioSlug}/steps/evaluate`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch score");
  }

  return response.json();
}

const scoreActions = {
  getScore,
};

export default scoreActions;
