"use client";
import React, { useState, useEffect } from "react";
import { buttonBase } from "./styles";

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  action?: "drag" | "connect" | "run" | "complete";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to System Design Sandbox",
    content: "Let's build your first system! We'll create a Spotify-like music streaming service. This tutorial will guide you through the basics.",
    action: "complete"
  },
  {
    id: "drag-components", 
    title: "Step 1: Add Components",
    content: "Drag these components from the palette to the board: Web Client → CDN → API Gateway → Service → Cache (Redis) → DB (Postgres) → Object Store (S3)",
    action: "drag"
  },
  {
    id: "connect-components",
    title: "Step 2: Connect Components", 
    content: "Now connect the components in order by clicking on a component's output port and dragging to the next component's input port.",
    action: "connect"
  },
  {
    id: "run-simulation",
    title: "Step 3: Run Simulation",
    content: "Click the 'Run' button to test your design. We'll see if it meets the performance requirements for Spotify's streaming scenario.",
    action: "run"
  },
  {
    id: "review-results",
    title: "Tutorial Complete!",
    content: "Great job! You've built your first system. Review the results and try optimizing the design. Use hints if you need help improving the score.",
    action: "complete"
  }
];

export interface TutorialProps {
  isVisible: boolean;
  onClose: () => void;
  onStepComplete: (stepId: string, data?: unknown) => void;
  currentStep: number;
}

export default function Tutorial({ isVisible, onClose, onStepComplete, currentStep }: TutorialProps) {
  if (!isVisible || currentStep >= TUTORIAL_STEPS.length) return null;

  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      onStepComplete(step.id);
    } else {
      // Tutorial complete
      onStepComplete(step.id);
      onClose();
    }
  };

  const handleSkip = () => {
    // Mark tutorial as completed in localStorage
    localStorage.setItem("sds-tutorial-complete", "true");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-1">{step.title}</h3>
            <div className="text-xs text-zinc-400">
              Step {currentStep + 1} of {TUTORIAL_STEPS.length}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-zinc-400 hover:text-zinc-300 text-sm"
          >
            Skip Tutorial
          </button>
        </div>
        
        <p className="text-sm text-zinc-300 leading-relaxed mb-6">
          {step.content}
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-zinc-800 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => onStepComplete("back")}
              className={`${buttonBase} bg-zinc-700 text-zinc-300 hover:bg-zinc-600 flex-1`}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-500 flex-1`}
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tutorial manager hook
export function useTutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if tutorial should be shown
    const tutorialComplete = localStorage.getItem("sds-tutorial-complete");
    if (!tutorialComplete) {
      setIsVisible(true);
    }
  }, []);

  const handleStepComplete = (stepId: string) => {
    if (stepId === "back" && currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial complete
      localStorage.setItem("sds-tutorial-complete", "true");
      setIsVisible(false);
    }
  };

  const closeTutorial = () => {
    localStorage.setItem("sds-tutorial-complete", "true");
    setIsVisible(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem("sds-tutorial-complete");
    setCurrentStep(0);
    setIsVisible(true);
  };

  return {
    isVisible,
    currentStep,
    onStepComplete: handleStepComplete,
    onClose: closeTutorial,
    resetTutorial,
    currentStepData: isVisible ? TUTORIAL_STEPS[currentStep] : null
  };
}
