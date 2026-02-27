"use client";

import { type ReactNode } from "react";
import { useParams } from "next/navigation";
import { SLUGS_TO_STEPS, STEPS } from "../constants";
import { usePanelLoader } from "../hooks/usePanelLoader";
import { SidepanelLayout } from "./SidepanelLayout";
import { StepWithLeftPanel } from "./StepWithLeftPanelLayout";

type PracticeSidepanelWrapperProps = {
  children: ReactNode;
};

export function PracticeSidepanelWrapper({ children }: PracticeSidepanelWrapperProps) {
  const params = useParams<{ step?: string }>();
  const step = params.step ?? "";
  const stepType = SLUGS_TO_STEPS[step as keyof typeof SLUGS_TO_STEPS] || step;
  const { panelContent } = usePanelLoader({ step: stepType });

  if (stepType === STEPS.SCORE || !panelContent) {
    return <>{children}</>;
  }

  return (
    <SidepanelLayout>
      <StepWithLeftPanel>{panelContent}</StepWithLeftPanel>
      {children}
    </SidepanelLayout>
  );
}
