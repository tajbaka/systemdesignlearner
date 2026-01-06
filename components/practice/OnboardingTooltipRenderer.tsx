"use client";

import { OnboardingTooltip } from "@/components/practice/OnboardingTooltip";
import type { OnboardingConfig } from "@/lib/practice/reference/schema";
import type { OnboardingStage } from "@/components/practice/PracticeOnboarding";

type OnboardingTooltipRendererProps = {
  isActive: boolean;
  hideTooltipTemp: boolean;
  stage: OnboardingStage;
  onboardingConfig: OnboardingConfig;
  onNext: () => void;
  onSkip: () => void;
  onHideTemp: () => void;
};

export function OnboardingTooltipRenderer({
  isActive,
  hideTooltipTemp,
  stage,
  onboardingConfig,
  onNext,
  onSkip,
  onHideTemp,
}: OnboardingTooltipRendererProps) {
  if (!isActive || hideTooltipTemp) return null;

  const handleNextWithHide = () => {
    onHideTemp();
    onNext();
  };

  switch (stage) {
    case "welcome":
      return (
        <OnboardingTooltip
          title="Welcome to System Design Practice!"
          description={onboardingConfig.welcome}
          position={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          arrow="top"
          onNext={onNext}
          onSkip={onSkip}
        />
      );

    case "functional-description":
      return (
        <OnboardingTooltip
          title="Step 1: Define Functionality"
          description={onboardingConfig.steps.functional}
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          highlightSelector="textarea[placeholder*='Example: shorten URLs']"
        />
      );

    case "functional-next":
      return (
        <OnboardingTooltip
          title="Continue"
          description="Once you've described the functionality, click the Next button at the bottom-right to proceed."
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={handleNextWithHide}
          onSkip={onSkip}
          pulseSelector="footer button[type='button']:not([disabled])"
          highlightSelector="footer button[type='button']:not([disabled])"
          nextLabel="Got it!"
        />
      );

    case "nonfunctional-description":
      return (
        <OnboardingTooltip
          title="Step 2: Performance Constraints"
          description={onboardingConfig.steps.nonFunctional}
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          highlightSelector="textarea[placeholder*='target 100ms']"
        />
      );

    case "nonfunctional-targets":
      return (
        <OnboardingTooltip
          title="Optional: Numeric Targets"
          description="You can expand 'Edit numeric targets' to set specific numbers. This helps you design more precisely."
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          highlightSelector="button:has(svg[class*='rotate'])"
        />
      );

    case "nonfunctional-next":
      return (
        <OnboardingTooltip
          title="Continue"
          description="Click Next at the bottom-right to move on to defining your API endpoints."
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={handleNextWithHide}
          onSkip={onSkip}
          pulseSelector="footer button[type='button']:not([disabled])"
          highlightSelector="footer button[type='button']:not([disabled])"
          nextLabel="Got it!"
        />
      );

    case "api-description":
      return (
        <OnboardingTooltip
          title="Step 3: Define API Endpoints"
          description={onboardingConfig.steps.api}
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          highlightSelector="article[class*='rounded-3xl']"
        />
      );

    case "api-next":
      return (
        <OnboardingTooltip
          title="Continue to Sandbox"
          description="Next up: design your system architecture visually with drag-and-drop components!"
          position={{ top: "200px", left: "20px" }}
          arrow="right"
          onNext={handleNextWithHide}
          onSkip={onSkip}
          pulseSelector="footer button[type='button']:not([disabled])"
          highlightSelector="footer button[type='button']:not([disabled])"
          nextLabel="Let's go!"
        />
      );

    case "sandbox-welcome":
      return (
        <OnboardingTooltip
          title="Step 4: Design Architecture"
          description={onboardingConfig.steps.highLevelDesign}
          position={{ top: "140px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
        />
      );

    case "sandbox-add-component":
      return (
        <OnboardingTooltip
          title="Add Components"
          description="Click the + button (bottom-right) to add caches, databases, load balancers, and more."
          position={{ top: "140px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          pulseSelector="button[aria-label='Open component palette']"
        />
      );

    case "sandbox-minimap":
      return (
        <OnboardingTooltip
          title="Navigation"
          description="Use the mini-map (bottom-left) to navigate around your diagram as it grows."
          position={{ top: "140px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          highlightSelector=".react-flow__minimap"
        />
      );

    case "sandbox-run":
      return (
        <OnboardingTooltip
          title="Test Your Design"
          description="Run the simulation to test if your architecture meets the requirements. The system evaluates latency, throughput, and patterns."
          position={{ top: "140px", left: "20px" }}
          arrow="right"
          onNext={onNext}
          onSkip={onSkip}
          nextLabel="Start building!"
        />
      );

    default:
      return null;
  }
}
