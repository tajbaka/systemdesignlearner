"use client";

import type { ReactNode } from "react";

export const LEFT_PANEL_TABS = ["overview", "ai tutor"] as const;
export type LeftPanelTab = (typeof LEFT_PANEL_TABS)[number];

type StepWithLeftPanelProps = {
  activeTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;
  children: ReactNode;
};

export function StepWithLeftPanel({ activeTab, onTabChange, children }: StepWithLeftPanelProps) {
  return (
    <div className="flex h-full flex-col min-w-0">
      <div
        className="flex flex-shrink-0 items-stretch border-b border-zinc-800 min-w-0 overflow-y-hidden"
        role="tablist"
        aria-label="Panel sections"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden lg:gap-2">
          {LEFT_PANEL_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`panel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => onTabChange(tab)}
              className={`flex-1 flex-shrink-0 min-w-[4.5rem] px-2 py-4 text-xs font-medium capitalize transition-colors border-b-2 -mb-px lg:px-4 lg:py-4 ${
                activeTab === tab
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="block truncate whitespace-nowrap">{tab}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        {children}
      </div>
    </div>
  );
}
