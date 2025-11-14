import type { ReactElement } from "react";
import type { PracticeStep } from "@/lib/practice/types";
import FunctionalRequirementsStep from "@/components/practice/steps/FunctionalRequirementsStep";
import NonFunctionalRequirementsStep from "@/components/practice/steps/NonFunctionalRequirementsStep";
import ApiDefinitionStep from "@/components/practice/steps/ApiDefinitionStep";
import SandboxStep from "@/components/practice/steps/SandboxStep";
import ScoreShareStep from "@/components/practice/steps/ScoreShareStep";

const STEP_COMPONENTS: Record<PracticeStep, (props?: Record<string, unknown>) => ReactElement> = {
  functional: () => <FunctionalRequirementsStep />,
  nonFunctional: () => <NonFunctionalRequirementsStep />,
  api: () => <ApiDefinitionStep />,
  sandbox: (props) => <SandboxStep {...(props as Parameters<typeof SandboxStep>[0])} />,
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
  const isSandboxStep = currentStep === "sandbox";

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

  return <div className="h-full sm:h-auto sm:px-4 sm:py-6">{stepContent}</div>;
}
