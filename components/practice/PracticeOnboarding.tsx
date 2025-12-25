"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { PracticeStep } from "@/lib/practice/types";

type OnboardingStage =
  | "welcome"
  | "functional-description"
  | "functional-next"
  | "nonfunctional-description"
  | "nonfunctional-targets"
  | "nonfunctional-next"
  | "api-description"
  | "api-next"
  | "sandbox-welcome"
  | "sandbox-add-component"
  | "sandbox-minimap"
  | "sandbox-run"
  | "complete";

type OnboardingContextType = {
  stage: OnboardingStage;
  isActive: boolean;
  nextStage: () => void;
  skipOnboarding: () => void;
  currentStep: PracticeStep;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

type OnboardingProviderProps = {
  children: ReactNode;
};

const STAGE_BY_STEP: Record<PracticeStep, OnboardingStage[]> = {
  functional: ["welcome", "functional-description", "functional-next"],
  nonFunctional: ["nonfunctional-description", "nonfunctional-targets", "nonfunctional-next"],
  api: ["api-description", "api-next"],
  highLevelDesign: ["sandbox-welcome", "sandbox-add-component", "sandbox-minimap", "sandbox-run"],
  score: [],
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { currentStep, hydrated } = usePracticeSession();
  const [stage, setStage] = useState<OnboardingStage>("complete");
  const [isActive, setIsActive] = useState(false);
  const [previousStep, setPreviousStep] = useState<PracticeStep | null>(null);

  // Initialize onboarding on first visit
  useEffect(() => {
    if (!hydrated) return;

    // DISABLED: Tooltips are hidden for now
    // const hasCompletedOnboarding = localStorage.getItem("practice-onboarding-completed");

    // if (!hasCompletedOnboarding) {
    //   setIsActive(true);
    //   setStage("welcome");
    // }

    // Keep onboarding disabled
    setIsActive(false);
    setStage("complete");
  }, [hydrated]);

  // Update stage when step changes during active onboarding
  useEffect(() => {
    if (!isActive || stage === "complete") return;

    // Detect step change
    if (previousStep !== currentStep && previousStep !== null) {
      const stagesForCurrentStep = STAGE_BY_STEP[currentStep];
      if (stagesForCurrentStep && stagesForCurrentStep.length > 0) {
        // User advanced to next step, move to first stage of new step
        setStage(stagesForCurrentStep[0]);
      }
    }

    setPreviousStep(currentStep);
  }, [currentStep, isActive, stage, previousStep]);

  const nextStage = () => {
    const stagesForCurrentStep = STAGE_BY_STEP[currentStep];
    const currentStageIndex = stagesForCurrentStep.indexOf(stage);

    if (currentStageIndex !== -1 && currentStageIndex < stagesForCurrentStep.length - 1) {
      // Move to next stage in current step
      setStage(stagesForCurrentStep[currentStageIndex + 1]);
    } else {
      // This was the last stage for current step, wait for step change
      // The useEffect above will handle moving to the next step's stages
    }
  };

  const skipOnboarding = () => {
    setIsActive(false);
    setStage("complete");
    localStorage.setItem("practice-onboarding-completed", "true");
  };

  const completeOnboarding = () => {
    setIsActive(false);
    setStage("complete");
    localStorage.setItem("practice-onboarding-completed", "true");
  };

  // Complete onboarding when reaching sandbox run stage after some time
  useEffect(() => {
    if (stage === "sandbox-run" && isActive) {
      const timer = setTimeout(() => {
        completeOnboarding();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [stage, isActive]);

  return (
    <OnboardingContext.Provider
      value={{
        stage,
        isActive,
        nextStage,
        skipOnboarding,
        currentStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
