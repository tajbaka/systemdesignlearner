"use client";

import { createContext, useCallback, useContext, useState, type ReactNode, Children } from "react";
import { ChevronRight } from "lucide-react";

type SidepanelContextValue = {
  openMobilePanel: () => void;
};

const SidepanelContext = createContext<SidepanelContextValue | null>(null);

export function useSidepanel() {
  return useContext(SidepanelContext);
}

type SidepanelLayoutProps = {
  children: ReactNode;
};

export function SidepanelLayout({ children }: SidepanelLayoutProps) {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const openMobilePanel = useCallback(() => setMobilePanelOpen(true), []);
  const closeMobilePanel = useCallback(() => setMobilePanelOpen(false), []);

  const childArray = Children.toArray(children);
  const panel = childArray[0];
  const step = childArray.slice(1);

  return (
    <SidepanelContext.Provider value={{ openMobilePanel }}>
      <div className="flex h-full w-full flex-1 flex-col md:flex-row md:min-h-0 md:pl-16">
        {/* Desktop panel */}
        <aside
          className="hidden min-w-[14rem] w-[28rem] max-w-[45%] flex-shrink flex-col overflow-x-hidden overflow-y-auto border-r border-zinc-800 bg-zinc-950 md:flex"
          aria-label="Left panel"
        >
          {panel}
        </aside>

        {/* Mobile: sliding track */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden md:contents">
          <div
            className={`flex flex-1 min-h-0 transition-transform duration-300 ease-in-out md:contents ${
              mobilePanelOpen ? "-translate-x-full" : "translate-x-0"
            }`}
          >
            <div className="w-full flex-shrink-0 flex flex-col overflow-hidden md:contents">
              {step}
            </div>

            <div
              className="flex w-full flex-shrink-0 flex-col bg-zinc-950 md:hidden"
              aria-label="Step information panel"
            >
              {panel}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed close arrow — outside the transformed container so fixed positioning works */}
      {mobilePanelOpen && (
        <button
          type="button"
          onClick={closeMobilePanel}
          className="fixed right-0 top-1/2 z-50 flex h-12 w-6 -translate-y-1/2 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset md:hidden"
          aria-label="Back to step"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
        </button>
      )}
    </SidepanelContext.Provider>
  );
}
