import { useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { PRACTICE_STEPS } from "../constants";
import type { PracticeStepWithRoute } from "../types";
import type { ProblemConfig } from "../types";
import { calculateMaxVisitedStep as calculateMaxVisitedStepUtil } from "@/domains/practice/utils/access-control";
import { stepStateStore } from "../store/store";

type UseStepperProps = {
  stepType: string | null;
  config: ProblemConfig | null;
  slug: string;
};

type UseStepperResult = {
  activeStep: number;
  maxVisitedStep: number;
  steps: PracticeStepWithRoute[];
};

/**
 * Calculates max visited step by merging server-side completion (config)
 * with client-side step completion from the store.
 *
 * stepCompletion takes precedence when a step has been evaluated this session,
 * otherwise falls back to server config.
 */
function calculateMaxVisitedStep(
  config: ProblemConfig | null,
  stepCompletion: Record<string, boolean>
): number {
  if (!config?.steps) {
    return 0;
  }

  const stepsArray = Object.entries(config.steps).map(([stepType, step]) => ({
    ...step,
    stepType,
  }));

  return calculateMaxVisitedStepUtil(stepsArray, (step) => {
    // Client stepCompletion takes precedence if set (evaluated this session)
    if (stepCompletion[step.stepType] !== undefined) {
      return stepCompletion[step.stepType];
    }
    // Fall back to server config
    return step.completed === true;
  });
}

/**
 * Custom hook that finds the activeStep and calculates maxVisitedStep
 * from completed steps in both server config and client-side store.
 *
 * Server data (config) provides initial hydration. The store provides
 * session-level truth — when a step is completed client-side, the stepper
 * updates immediately without waiting for a server refresh.
 */
export function useStepper({ stepType, config, slug }: UseStepperProps): UseStepperResult {
  // Track hydration state to show blank stepper until ready
  const isHydrated = useStore(stepStateStore, (s) => !s.loading);

  // Subscribe to stepCompletion from the store
  const stepCompletion = useStore(
    stepStateStore,
    useShallow((s) => s.getProblemState(slug).stepCompletion)
  );

  // Get ordered practice steps directly from PRACTICE_STEPS
  const steps = useMemo<PracticeStepWithRoute[]>(() => {
    return Object.values(PRACTICE_STEPS).sort((a, b) => a.order - b.order);
  }, []);

  // Find activeStep based on PRACTICE_STEPS order
  const activeStep = useMemo(() => {
    // Show blank stepper (no active step) during hydration
    if (!isHydrated) return -1;
    if (!stepType) return -1;

    const step = PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS];
    if (!step) return -1;

    return steps.findIndex((s) => s.route === step.route);
  }, [stepType, steps, isHydrated]);

  // Calculate maxVisitedStep from both server config and client stepCompletion
  const maxVisitedStep = useMemo(() => {
    // Show blank stepper (all steps neutral) during hydration
    if (!isHydrated) return -1;
    return calculateMaxVisitedStep(config, stepCompletion);
  }, [config, stepCompletion, isHydrated]);

  return { activeStep, maxVisitedStep, steps };
}
