import { useMemo } from "react";
import useStore from "./useStore";
import type { ProblemConfig } from "../types";
import type { StepHandlers } from "../types";
import type { EvaluationResult } from "@/server/domains/practice/services/evaluation/types";

// ============================================================================
// Types
// ============================================================================

export type ModalData = {
  title: string;
  description: string;
  hint?: { id: string; text: string; title?: string; href?: string };
  feedback?: string; // General feedback when no hint is available
  completedItems: string[];
};

type EvaluationProcessor = (evaluation: EvaluationResult, config: ProblemConfig) => ModalData;

// ============================================================================
// Processor for text-based requirements (functional, nonFunctional, api)
// ============================================================================

function processTextRequirements(
  evaluation: EvaluationResult,
  config: ProblemConfig,
  stepType: "functional" | "nonFunctional" | "api"
): ModalData {
  // Access the step directly by key
  const stepConfig = config.steps[stepType];

  if (!stepConfig) {
    console.error(`Step config not found for step: ${stepType}`);
    return {
      title: "Error",
      description: "Configuration not found",
      hint: undefined,
      feedback: undefined,
      completedItems: [],
    };
  }

  const scoreWeight = stepConfig.scoreWeight;
  const score = evaluation.score || 0;
  const percentage = scoreWeight > 0 ? Math.round((score / scoreWeight) * 100) : 0;

  const completedCount = evaluation.results.filter((result) => result.complete).length;
  const totalCount = evaluation.results.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  // Build completed items list
  const completedItems: string[] = evaluation.results
    .filter((result) => result.complete)
    .map((result) => {
      const requirement = stepConfig.requirements?.find((req) => req.id === result.id);
      return requirement ? `Completed ${requirement.label} requirement` : "";
    })
    .filter(Boolean);

  // Find hint for first incomplete result
  let hint: { id: string; text: string; title?: string; href?: string } | undefined;
  let feedback: string | undefined;
  const firstIncompleteResult = evaluation.results.find((result) => !result.complete);

  if (firstIncompleteResult) {
    // Try to get hint if available
    if (firstIncompleteResult.hintId) {
      const requirement = stepConfig.requirements?.find(
        (req) => req.id === firstIncompleteResult.id
      );
      if (requirement?.hints) {
        const foundHint = requirement.hints.find((h) => h.id === firstIncompleteResult.hintId);
        if (foundHint) {
          hint = {
            id: foundHint.id,
            text: foundHint.text,
            title: foundHint.title,
            href: foundHint.href,
          };
        }
      }
    }

    // If no hint, use the general feedback text
    if (!hint && firstIncompleteResult.feedback) {
      feedback = firstIncompleteResult.feedback;
    }
  }

  return {
    title: `Score: ${score}/${scoreWeight} (${percentage}%)`,
    description: allComplete ? "Perfect! All requirements met!" : "Let's Improve Your Answer",
    hint,
    feedback,
    completedItems,
  };
}

// ============================================================================
// Processor for high-level design
// ============================================================================

function processHighLevelDesign(evaluation: EvaluationResult, config: ProblemConfig): ModalData {
  // Access the step directly by key
  const stepConfig = config.steps.highLevelDesign;

  if (!stepConfig) {
    console.error("High-level design step config not found");
    return {
      title: "Error",
      description: "Configuration not found",
      hint: undefined,
      feedback: undefined,
      completedItems: [],
    };
  }

  const scoreWeight = stepConfig.scoreWeight;
  const score = evaluation.score || 0;
  const percentage = scoreWeight > 0 ? Math.round((score / scoreWeight) * 100) : 0;

  const completedCount = evaluation.results.filter((result) => result.complete).length;
  const totalCount = evaluation.results.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  // Build completed items list - look up edge descriptions from config
  const solution = stepConfig.requirements?.[0] as
    | {
        edges?: Array<{
          id: string;
          description?: string;
        }>;
      }
    | undefined;

  const completedItems: string[] = evaluation.results
    .filter((result) => result.complete)
    .map((result) => {
      const edge = solution?.edges?.find((e) => e.id === result.id);
      return edge?.description || "";
    })
    .filter(Boolean);

  // Find hint for first incomplete result
  let hint: { id: string; text: string; title?: string; href?: string } | undefined;
  let feedback: string | undefined;
  const firstIncompleteResult = evaluation.results.find((result) => !result.complete);

  if (firstIncompleteResult) {
    // Try to get hint if available
    if (firstIncompleteResult.hintId) {
      // Find the edge by ID and get its hint
      const solution = stepConfig.requirements?.[0] as
        | {
            edges?: Array<{
              id: string;
              hints?: Array<{ id: string; title: string; text: string; href?: string }>;
            }>;
          }
        | undefined;

      const edge = solution?.edges?.find((e) => e.id === firstIncompleteResult.id);
      if (edge?.hints) {
        const foundHint = edge.hints.find((h) => h.id === firstIncompleteResult.hintId);
        if (foundHint) {
          hint = {
            id: foundHint.id,
            text: foundHint.text,
            title: foundHint.title,
            href: foundHint.href,
          };
        }
      }
    }

    // If no hint, use the general feedback text
    if (!hint && firstIncompleteResult.feedback) {
      feedback = firstIncompleteResult.feedback;
    }
  }

  return {
    title: `Score: ${score}/${scoreWeight} (${percentage}%)`,
    description: allComplete
      ? "Perfect! All components and connections are correct!"
      : "Let's Improve Your Design",
    hint,
    feedback,
    completedItems,
  };
}

// ============================================================================
// Processors Registry
// ============================================================================

const EVALUATION_PROCESSORS: Record<string, EvaluationProcessor> = {
  functional: (evaluation, config) => {
    return processTextRequirements(evaluation, config, "functional");
  },

  nonFunctional: (evaluation, config) => {
    return processTextRequirements(evaluation, config, "nonFunctional");
  },

  api: (evaluation, config) => {
    return processTextRequirements(evaluation, config, "api");
  },

  highLevelDesign: (evaluation, config) => {
    return processHighLevelDesign(evaluation, config);
  },
};

function processEvaluationForModal(
  stepType: string,
  evaluation: EvaluationResult,
  config: ProblemConfig
): ModalData {
  const processor = EVALUATION_PROCESSORS[stepType];

  if (!processor) {
    throw new Error(`No evaluation processor found for step: ${stepType}`);
  }

  return processor(evaluation, config);
}

export function useFeedbackModal(
  stepType: string | null,
  config: ProblemConfig,
  handlers: StepHandlers,
  slug: string
) {
  const store = useStore(slug);
  const isModalOpen = store.isModalOpen;
  const setModalOpen = store.setModalOpen;

  const { functionalRequirements, nonFunctionalRequirements, apiDesign, highLevelDesign } = store;

  // Get results based on current step
  const currentResults = useMemo(() => {
    if (stepType === "functional") return functionalRequirements.submission;
    if (stepType === "nonFunctional") return nonFunctionalRequirements.submission;
    if (stepType === "api") return apiDesign.submission;
    if (stepType === "highLevelDesign") return highLevelDesign.submission;
    return null;
  }, [stepType, functionalRequirements, nonFunctionalRequirements, apiDesign, highLevelDesign]);

  // Process results for modal display
  const modalData = useMemo(() => {
    if (!currentResults || !stepType) {
      return {
        title: "",
        description: "",
        hint: undefined,
        feedback: undefined,
        completedItems: [],
      };
    }

    return processEvaluationForModal(stepType, currentResults, config);
  }, [currentResults, config, stepType]);

  // Determine button text based on whether all requirements are complete
  const buttonText = useMemo(() => {
    if (!currentResults) return "Continue";

    // Check if this is a text-based evaluation result (has results array)
    if ("results" in currentResults && Array.isArray(currentResults.results)) {
      const allComplete = currentResults.results.every((result) => result.complete);
      return allComplete ? "Continue" : "Revise";
    }

    return "Continue";
  }, [currentResults]);

  // Handler for button click - fires 'continue' or 'revise' action
  const onButtonClick = () => {
    if (!stepType || !(stepType in handlers)) return;

    const handler = handlers[stepType as keyof StepHandlers];
    const action = buttonText === "Continue" ? "continue" : "revise";
    handler(action as Parameters<typeof handler>[0]);
  };

  return {
    isModalOpen,
    setModalOpen,
    modalTitle: modalData.title,
    modalDescription: modalData.description,
    completedItems: modalData.completedItems,
    hint: modalData.hint,
    feedback: modalData.feedback,
    onButtonClick,
    buttonText,
  };
}
