"use client";

import type { ReactNode } from "react";
import { STEPS } from "../constants";
import type { LeftPanelTab } from "../components/StepWithLeftPanel";
import { ProblemTabContent } from "../components/ProblemTabContent";
import { AssistanceChat } from "../components/AssistanceChat";

const SHARED_PROBLEM_TAB = <ProblemTabContent />;

const PANEL_CONTENT: Record<string, Partial<Record<LeftPanelTab, ReactNode>>> = {
  [STEPS.FUNCTIONAL]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <AssistanceChat />,
  },
  [STEPS.NON_FUNCTIONAL]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <AssistanceChat />,
  },
  [STEPS.API]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <AssistanceChat />,
  },
  [STEPS.HIGH_LEVEL_DESIGN]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <AssistanceChat />,
  },
  [STEPS.SCORE]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <AssistanceChat />,
  },
};

type UsePanelLoaderResult = {
  panelContent: Partial<Record<LeftPanelTab, ReactNode>> | null;
};

export function usePanelLoader({ step }: { step: string }): UsePanelLoaderResult {
  return { panelContent: PANEL_CONTENT[step] ?? null };
}
