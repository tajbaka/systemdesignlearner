"use client";

import { type ReactNode, useState, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import {
  StepWithLeftPanel,
  LEFT_PANEL_TABS,
  type LeftPanelTab,
} from "./back-end/components/StepWithLeftPanel";
import { STEPS } from "./back-end/constants";
import { ProblemTabContent } from "./back-end/components/ProblemTabContent";
import { AssistanceChat } from "./back-end/AssistanceChat";

const STORAGE_KEY = "sidepanel-tab";

const LEFT_PANEL_CONTENT: Record<LeftPanelTab, ReactNode> = {
  overview: <ProblemTabContent />,
  assistance: <AssistanceChat />,
};

function readPersistedTab(): LeftPanelTab {
  if (typeof window === "undefined") return "overview";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (LEFT_PANEL_TABS as readonly string[]).includes(stored)) {
    return stored as LeftPanelTab;
  }
  return "overview";
}

type PracticeLeftPanelProps = {
  step: string;
  mobilePanelOpen: boolean;
  onCloseMobilePanel: () => void;
  children: ReactNode;
};

export function PracticeLeftPanel({
  step,
  mobilePanelOpen,
  onCloseMobilePanel,
  children,
}: PracticeLeftPanelProps) {
  const hasPanel = !!step && step !== STEPS.SCORE;
  const [activeTab, setActiveTabState] = useState<LeftPanelTab>(readPersistedTab);

  const setActiveTab = useCallback((tab: LeftPanelTab) => {
    setActiveTabState(tab);
    localStorage.setItem(STORAGE_KEY, tab);
  }, []);

  const panel = hasPanel ? (
    <StepWithLeftPanel activeTab={activeTab} onTabChange={setActiveTab}>
      {LEFT_PANEL_CONTENT[activeTab]}
    </StepWithLeftPanel>
  ) : null;

  return (
    <>
      {panel && (
        <aside
          className="hidden min-w-[14rem] w-[28rem] max-w-[45%] flex-shrink flex-col overflow-x-hidden overflow-y-auto border-r border-zinc-800 bg-zinc-950 md:flex"
          aria-label="Left panel"
        >
          {panel}
        </aside>
      )}

      <div className="min-w-0 flex-1 flex flex-col overflow-hidden md:contents">
        <div
          className={`flex flex-1 min-h-0 transition-transform duration-300 ease-in-out md:contents ${
            mobilePanelOpen ? "-translate-x-full z-[70]" : "translate-x-0"
          }`}
        >
          <div className="w-full flex-shrink-0 flex flex-col overflow-hidden md:contents">
            {children}
          </div>

          {panel && (
            <div
              className="relative flex w-full flex-shrink-0 flex-col bg-zinc-950 md:hidden"
              aria-label="Step information panel"
            >
              <button
                type="button"
                onClick={onCloseMobilePanel}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-6 items-center justify-center rounded-r-md bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                aria-label="Back to main view"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 overflow-y-auto min-h-0">{panel}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
