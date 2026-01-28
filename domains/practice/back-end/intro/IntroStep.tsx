"use client";

import { STEPS } from "../constants";
import { IntroStepUI } from "./components/IntroStepUI";
import type { StepComponentProps } from "../types";

export default function IntroStep({ config, handlers }: StepComponentProps) {
  const hints = config.articles || [];

  return (
    <IntroStepUI
      title={config.title}
      description={config.description}
      hints={hints}
      onStartPractice={() => handlers[STEPS.INTRO]("start")}
    />
  );
}
