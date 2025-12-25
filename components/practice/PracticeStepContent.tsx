import type { ReactElement } from "react";
import type { PracticeStep } from "@/lib/practice/types";
import FunctionalRequirementsStep from "@/components/practice/steps/FunctionalRequirementsStep";
import NonFunctionalRequirementsStep from "@/components/practice/steps/NonFunctionalRequirementsStep";
import ApiDefinitionStep from "@/components/practice/steps/ApiDefinitionStep";
import SandboxStep from "@/components/practice/steps/SandboxStep";
import ScoreShareStep from "@/components/practice/steps/ScoreShareStep";
import IntroStep from "@/components/practice/steps/IntroStep";

const STEP_COMPONENTS: Record<PracticeStep, (props?: Record<string, unknown>) => ReactElement> = {
  intro: () => <IntroStep />,
  functional: () => <FunctionalRequirementsStep />,
  nonFunctional: () => <NonFunctionalRequirementsStep />,
  api: () => <ApiDefinitionStep />,
  highLevelDesign: (props) => <SandboxStep {...(props as Parameters<typeof SandboxStep>[0])} />,
  score: () => <ScoreShareStep />,
};

type PracticeStepContentProps = {
  currentStep: PracticeStep;
  mobilePaletteOpen?: boolean;
  onMobilePaletteChange?: (open: boolean) => void;
  runPanelOpen?: boolean;
  onRunPanelChange?: (open: boolean) => void;
};

export function PracticeStepContent({
  currentStep,
  mobilePaletteOpen,
  onMobilePaletteChange,
  runPanelOpen,
  onRunPanelChange,
}: PracticeStepContentProps) {
  const StepComponent = STEP_COMPONENTS[currentStep];
  const isSandboxStep = currentStep === "highLevelDesign";

  const sandboxProps = isSandboxStep
    ? {
        mobilePaletteOpen,
        onMobilePaletteChange,
        runPanelOpen,
        onRunPanelChange,
      }
    : undefined;

  const stepContent = StepComponent ? <StepComponent {...(sandboxProps ?? {})} /> : null;

  if (isSandboxStep) {
    return <div className="h-full w-full">{stepContent}</div>;
  }

  return <div className="h-full w-full sm:h-auto">{stepContent}</div>;
}
