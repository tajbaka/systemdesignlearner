import { useMemo } from "react";
import type {
  ProblemConfig,
  FunctionalRequirement,
  NonFunctionalRequirement,
  ApiRequirement,
  DesignSolution,
} from "../types";
import type { ProblemResponse, ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";

type RawProblemData = {
  problem: ProblemResponse;
  steps: ProblemStepWithUserStep[];
};

/**
 * Transforms raw problem data from API into ProblemConfig format
 */
function transformProblemData(rawData: RawProblemData): ProblemConfig {
  const { problem, steps } = rawData;

  // Calculate total score from all steps
  const totalScore = steps.reduce((sum, step) => {
    return sum + (step.scoreWeight ?? 0);
  }, 0);

  // Transform links to articles
  const articles = problem.links?.map((link, index) => ({
    id: `article-${index}`,
    href: link.href,
    title: link.label,
  }));

  // Transform steps array into object keyed by stepType
  const stepConfigs = steps
    .sort((a, b) => a.order - b.order)
    .reduce<Partial<ProblemConfig["steps"]>>((acc, step) => {
      const stepData = step.data as {
        requirements?: unknown;
        solutions?: unknown;
      } | null;

      // Check if step is completed
      const isCompleted = step.userStep?.status === "completed";

      // Map stepType to the correct key with proper typing
      switch (step.stepType) {
        case "functional":
          acc.functional = {
            scoreWeight: step.scoreWeight ?? 0,
            requirements: (stepData?.requirements as FunctionalRequirement[] | undefined) ?? [],
            completed: isCompleted,
            order: step.order,
          };
          break;
        case "nonFunctional":
          acc.nonFunctional = {
            scoreWeight: step.scoreWeight ?? 0,
            requirements: (stepData?.requirements as NonFunctionalRequirement[] | undefined) ?? [],
            completed: isCompleted,
            order: step.order,
          };
          break;
        case "api":
          acc.api = {
            scoreWeight: step.scoreWeight ?? 0,
            requirements: (stepData?.requirements as ApiRequirement[] | undefined) ?? [],
            completed: isCompleted,
            order: step.order,
          };
          break;
        case "highLevelDesign":
          acc.highLevelDesign = {
            scoreWeight: step.scoreWeight ?? 0,
            requirements: (stepData?.requirements as DesignSolution[] | undefined) ?? [],
            completed: isCompleted,
            order: step.order,
          };
          break;
      }

      return acc;
    }, {}) as ProblemConfig["steps"];

  return {
    problemId: problem.id,
    type: problem.category,
    title: problem.title ?? "",
    description: problem.description ?? "",
    totalScore,
    difficulty: problem.difficulty ?? "medium",
    articles: articles ?? undefined,
    steps: stepConfigs,
    metadata: {
      version: problem.versionNumber.toString(),
    },
  };
}

export function useTransformData(data: RawProblemData): ProblemConfig | null {
  return useMemo(() => {
    try {
      return transformProblemData(data);
    } catch (err) {
      console.error("Error transforming problem data:", err);
      return null;
    }
  }, [data]);
}
