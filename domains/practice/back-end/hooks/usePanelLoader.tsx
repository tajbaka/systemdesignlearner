"use client";

import type { ReactNode } from "react";
import { STEPS } from "../constants";
import type { LeftPanelTab } from "../layouts/StepWithLeftPanelLayout";
import { ProblemTabContent } from "../components/ProblemTabContent";

function Placeholder({ label }: { label: string }) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 text-sm text-zinc-400">
        {label} (placeholder)
      </div>
    </div>
  );
}

const SHARED_PROBLEM_TAB = <ProblemTabContent />;

const PANEL_CONTENT: Record<string, Partial<Record<LeftPanelTab, ReactNode>>> = {
  [STEPS.FUNCTIONAL]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <Placeholder label="Functional – Assistance" />,
  },
  [STEPS.NON_FUNCTIONAL]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <Placeholder label="Non-Functional – Assistance" />,
  },
  [STEPS.API]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <Placeholder label="API – Assistance" />,
  },
  [STEPS.HIGH_LEVEL_DESIGN]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <Placeholder label="High-Level Design – Assistance" />,
  },
  [STEPS.SCORE]: {
    overview: SHARED_PROBLEM_TAB,
    assistance: <Placeholder label="Score – Assistance" />,
  },
};

type UsePanelLoaderResult = {
  panelContent: Partial<Record<LeftPanelTab, ReactNode>> | null;
};

export function usePanelLoader({ step }: { step: string }): UsePanelLoaderResult {
  return { panelContent: PANEL_CONTENT[step] ?? null };
}
