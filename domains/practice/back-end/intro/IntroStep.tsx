"use client";

import { STEPS } from "../constants";
import { IntroStepUI } from "./components/IntroStepUI";
import type { StepComponentProps } from "../types";

export default function IntroStep({ config, handlers }: StepComponentProps) {
  const hints = config.articles || [];

  // Check if user has started practice by checking if any steps are completed
  const hasStarted = Object.values(config.steps).some((step) => step.completed === true);

  return (
    <IntroStepUI
      title={config.title}
      description={config.description}
      hints={hints}
      buttonText={hasStarted ? "Continue" : "Start Practice"}
      onStartPractice={() => handlers[STEPS.INTRO]("start", hasStarted)}
    />
  );
}
