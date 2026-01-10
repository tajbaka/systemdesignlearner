import type { ReactElement } from "react";
import type { PracticeStep } from "@/domains/practice/types";
import FunctionalRequirementsStep from "./FunctionalRequirementsStep";
import NonFunctionalRequirementsStep from "./NonFunctionalRequirementsStep";
import ApiDefinitionStep from "./ApiDefinitionStep";
import HighLevelDesignStep from "./HighLevelDesignStep";
import ScoreShareStep from "./ScoreShareStep";

const STEP_COMPONENTS: Record<PracticeStep, (props?: Record<string, unknown>) => ReactElement> = {
  functional: () => <FunctionalRequirementsStep />,
  nonFunctional: () => <NonFunctionalRequirementsStep />,
  api: () => <ApiDefinitionStep />,
  highLevelDesign: (props) => (
    <HighLevelDesignStep {...(props as Parameters<typeof HighLevelDesignStep>[0])} />
  ),
  score: () => <ScoreShareStep />,
};

type PracticeStepContentProps = {
  currentStep: PracticeStep;
  mobilePaletteOpen?: boolean;
  onMobilePaletteChange?: (open: boolean) => void;
};

export function PracticeStepContent({
  currentStep,
  mobilePaletteOpen,
  onMobilePaletteChange,
}: PracticeStepContentProps) {
  const StepComponent = STEP_COMPONENTS[currentStep];
  const isDesignStep = currentStep === "highLevelDesign";

  const designProps = isDesignStep
    ? {
        mobilePaletteOpen,
        onMobilePaletteChange,
      }
    : undefined;

  const stepContent = StepComponent ? <StepComponent {...(designProps ?? {})} /> : null;

  if (isDesignStep) {
    return <div className="h-full w-full">{stepContent}</div>;
  }

  return <div className="h-full w-full sm:h-auto">{stepContent}</div>;
}
