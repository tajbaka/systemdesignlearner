"use client";

import type { ReactNode } from "react";
import { STEPS } from "../constants";
import type { LeftPanelTab } from "../layouts/StepWithLeftPanelLayout";

function Placeholder({ label }: { label: string }) {
  return (
    <div className="p-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 text-sm text-zinc-400">
        {label} (placeholder)
      </div>
    </div>
  );
}

const PANEL_CONTENT: Record<string, Partial<Record<LeftPanelTab, ReactNode>>> = {
  [STEPS.FUNCTIONAL]: {
    question: <Placeholder label="Functional – Question" />,
    assistance: <Placeholder label="Functional – Assistance" />,
    solution: <Placeholder label="Functional – Solution" />,
    discussion: <Placeholder label="Functional – Discussion" />,
  },
  [STEPS.NON_FUNCTIONAL]: {
    question: <Placeholder label="Non-Functional – Question" />,
    assistance: <Placeholder label="Non-Functional – Assistance" />,
    solution: <Placeholder label="Non-Functional – Solution" />,
    discussion: <Placeholder label="Non-Functional – Discussion" />,
  },
  [STEPS.API]: {
    question: <Placeholder label="API – Question" />,
    assistance: <Placeholder label="API – Assistance" />,
    solution: <Placeholder label="API – Solution" />,
    discussion: <Placeholder label="API – Discussion" />,
  },
  [STEPS.HIGH_LEVEL_DESIGN]: {
    question: <Placeholder label="High-Level Design – Question" />,
    assistance: <Placeholder label="High-Level Design – Assistance" />,
    solution: <Placeholder label="High-Level Design – Solution" />,
    discussion: <Placeholder label="High-Level Design – Discussion" />,
  },
  [STEPS.SCORE]: {
    question: <Placeholder label="Score – Question" />,
    assistance: <Placeholder label="Score – Assistance" />,
    solution: <Placeholder label="Score – Solution" />,
    discussion: <Placeholder label="Score – Discussion" />,
  },
};

type UsePanelLoaderResult = {
  panelContent: Partial<Record<LeftPanelTab, ReactNode>> | null;
};

export function usePanelLoader({ step }: { step: string }): UsePanelLoaderResult {
  return { panelContent: PANEL_CONTENT[step] ?? null };
}
