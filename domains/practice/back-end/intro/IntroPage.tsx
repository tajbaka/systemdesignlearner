"use client";

import { STEPS } from "../constants";
import { IntroStepUI } from "./components/IntroStepUI";
import { usePractice } from "../context/PracticeContext";

export function IntroPage() {
  const { config, handlers } = usePractice();
  const hints = config.articles || [];

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
