"use client";

import { type ComponentType } from "react";
import { STEPS } from "../constants";
import type { StepComponentProps } from "../types";
import IntroStep from "../intro/IntroStep";
import FunctionalStep from "../functional/FunctionalStep";
import NonFunctionalStep from "../non-functional/NonFunctionalStep";
import ApiStep from "../api-design/ApiStep";
import HighLevelDesignStep from "../high-level-design/HighLevelDesignStep";
import ScoreStep from "../score/ScoreStep";

const STEP_COMPONENTS: Record<string, ComponentType<StepComponentProps>> = {
  [STEPS.INTRO]: IntroStep,
  [STEPS.FUNCTIONAL]: FunctionalStep,
  [STEPS.NON_FUNCTIONAL]: NonFunctionalStep,
  [STEPS.API]: ApiStep,
  [STEPS.HIGH_LEVEL_DESIGN]: HighLevelDesignStep,
  [STEPS.SCORE]: ScoreStep,
};

type useStepLoaderResult = {
  StepComponent: ComponentType<StepComponentProps> | null;
  error: Error | null;
};

type useStepLoaderProps = {
  step: string;
};

/**
 * Custom hook that returns a practice step component based on the step
 *
 * @param step - The step identifier (e.g., "intro", "functional", "api")
 * @returns An object containing the step component and error state
 */
export function useStepLoader({ step }: useStepLoaderProps): useStepLoaderResult {
  const StepComponent = STEP_COMPONENTS[step] || null;

  const error = StepComponent
    ? null
    : new Error(
        `No step component found for step: ${step}. Available steps: ${Object.keys(STEP_COMPONENTS).join(", ")}`
      );

  return { StepComponent, error };
}
