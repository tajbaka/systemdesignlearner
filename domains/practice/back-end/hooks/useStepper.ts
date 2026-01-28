import { useMemo } from "react";
import { PRACTICE_STEPS } from "../constants";
import type { PracticeStepWithRoute } from "../types";
import type { ProblemConfig } from "../types";

type UseStepperProps = {
  stepType: string | null;
  config: ProblemConfig | null;
};

type UseStepperResult = {
  activeStep: number;
  maxVisitedStep: number;
  steps: PracticeStepWithRoute[];
};

/**
 * Calculates the maximum visited step index based on completed steps.
 * maxVisitedStep = highest order of completed step + 1
 *
 * Example:
 * - If no steps completed: returns 0 (can access functional, order 0)
 * - If functional (order 0) completed: returns 1 (can access nonFunctional, order 1)
 * - If nonFunctional (order 1) completed: returns 2 (can access api, order 2)
 */
function calculateMaxVisitedStep(config: ProblemConfig | null): number {
  if (!config?.steps) {
    return 0; // No config, allow access to first step (functional)
  }

  // Get all completed steps with their order
  const completedSteps = Object.values(config.steps)
    .filter((step) => step.completed && step.order !== undefined)
    .map((step) => step.order!);

  // Find the highest completed order, default to -1 if none completed
  const highestCompletedOrder = completedSteps.length > 0 ? Math.max(...completedSteps) : -1;

  // Return the next step order (highest completed + 1)
  // If no steps are completed (highestCompletedOrder = -1), returns 0
  return highestCompletedOrder + 1;
}

/**
 * Custom hook that finds the activeStep and calculates maxVisitedStep
 * from completed steps in the config.
 *
 * Automatically redirects user if they try to access a step beyond maxVisitedStep.
 *
 * @param stepType - The current step type (e.g., "functional", "nonFunctional", "api")
 * @param config - Problem configuration with completion status
 * @returns activeStep, maxVisitedStep, and ordered practice steps
 */
export function useStepper({ stepType, config }: UseStepperProps): UseStepperResult {
  // Get ordered practice steps directly from PRACTICE_STEPS
  const steps = useMemo<PracticeStepWithRoute[]>(() => {
    return Object.values(PRACTICE_STEPS).sort((a, b) => a.order - b.order);
  }, []);

  // Find activeStep based on PRACTICE_STEPS order
  const activeStep = useMemo(() => {
    if (!stepType) return -1;

    // stepType is a key in PRACTICE_STEPS (e.g., "functional", "nonFunctional", "api")
    // Find the step that matches this stepType
    const step = PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS];
    if (!step) return -1;

    return steps.findIndex((s) => s.route === step.route);
  }, [stepType, steps]);

  // Calculate maxVisitedStep from completed steps in config
  const maxVisitedStep = useMemo(() => {
    return calculateMaxVisitedStep(config);
  }, [config]);

  return { activeStep, maxVisitedStep, steps };
}
