import { useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { PRACTICE_STEPS } from "../constants";
import type { PracticeStepWithRoute } from "../types";
import type { ProblemConfig } from "../types";
import { calculateMaxVisitedStep as calculateMaxVisitedStepUtil } from "@/domains/practice/utils/access-control";
import { stepStateStore, type ProblemState } from "../store/store";

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

/** Map config step keys to store submission fields */
const STEP_TO_STORE_KEY = {
  functional: "functionalRequirements",
  nonFunctional: "nonFunctionalRequirements",
  api: "apiDesign",
  highLevelDesign: "highLevelDesign",
} as const;

type StepKey = keyof typeof STEP_TO_STORE_KEY;
type StoreKey = (typeof STEP_TO_STORE_KEY)[StepKey];

/**
 * Derives step completion from the client-side store's evaluation submissions.
 * A step is complete when its submission exists and all results are complete.
 */
function getStoreCompletedSteps(problemState: ProblemState): Record<string, boolean> {
  const completed: Record<string, boolean> = {};

  for (const [stepKey, storeKey] of Object.entries(STEP_TO_STORE_KEY) as [StepKey, StoreKey][]) {
    const submission = problemState[storeKey].submission;
    if (submission?.results) {
      completed[stepKey] = submission.results.every((r) => r.complete);
    }
  }

  return completed;
}

/**
 * Calculates max visited step by merging server-side completion (config)
 * with client-side completion (store submissions).
 */
function calculateMaxVisitedStep(
  config: ProblemConfig | null,
  storeCompletedSteps: Record<string, boolean>
): number {
  if (!config?.steps) {
    return 0;
  }

  const stepsArray = Object.entries(config.steps).map(([stepType, step]) => ({
    ...step,
    stepType,
  }));

  return calculateMaxVisitedStepUtil(stepsArray, (step) => {
    return step.completed === true || storeCompletedSteps[step.stepType] === true;
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
  // Subscribe to the store to derive client-side step completion
  const storeCompletedSteps = useStore(
    stepStateStore,
    useShallow((s) => getStoreCompletedSteps(s.getProblemState(slug)))
  );

  // Get ordered practice steps directly from PRACTICE_STEPS
  const steps = useMemo<PracticeStepWithRoute[]>(() => {
    return Object.values(PRACTICE_STEPS).sort((a, b) => a.order - b.order);
  }, []);

  // Find activeStep based on PRACTICE_STEPS order
  const activeStep = useMemo(() => {
    if (!stepType) return -1;

    const step = PRACTICE_STEPS[stepType as keyof typeof PRACTICE_STEPS];
    if (!step) return -1;

    return steps.findIndex((s) => s.route === step.route);
  }, [stepType, steps]);

  // Calculate maxVisitedStep from both server config and client store
  const maxVisitedStep = useMemo(() => {
    return calculateMaxVisitedStep(config, storeCompletedSteps);
  }, [config, storeCompletedSteps]);

  return { activeStep, maxVisitedStep, steps };
}
