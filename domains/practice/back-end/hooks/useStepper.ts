import { useMemo } from "react";
import { PRACTICE_STEPS } from "../constants";
import type { PracticeStepWithRoute } from "../types";
import type { ProblemConfig } from "../types";
import { calculateMaxVisitedStep as calculateMaxVisitedStepUtil } from "@/domains/practice/utils/access-control";

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
 * Wrapper function to calculate max visited step from problem config.
 * Uses the shared calculateMaxVisitedStep utility.
 */
function calculateMaxVisitedStep(config: ProblemConfig | null): number {
  if (!config?.steps) {
    return 0; // No config, allow access to first step (functional)
  }

  const stepsArray = Object.values(config.steps);

  return calculateMaxVisitedStepUtil(stepsArray, (step) => step.completed === true);
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
