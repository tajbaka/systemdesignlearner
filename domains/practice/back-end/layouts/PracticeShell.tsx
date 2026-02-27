"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import type { ProblemResponse, ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";
import useStore from "../store/useStore";
import { useActionHandler } from "../hooks/useActionHandler";
import { useTransformData } from "../hooks/useTransformData";
import { useLoadUserData } from "../hooks/useLoadUserData";
import { usePanelLoader } from "../hooks/usePanelLoader";
import { PracticeFooter, LeftArrowIcon } from "../components/PracticeFooter";
import { Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SLUGS_TO_STEPS } from "../constants";
import { PracticeProvider, usePractice } from "../context/PracticeContext";
import { StepWithLeftPanel } from "./StepWithLeftPanelLayout";
import { getCategoryLayout } from "@/domains/practice/layouts/categoryRegistry";

type SidepanelContextValue = {
  openMobilePanel: () => void;
};

const SidepanelContext = createContext<SidepanelContextValue | null>(null);

export function useSidepanel() {
  return useContext(SidepanelContext);
}

type RawProblemData = {
  problem: ProblemResponse;
  steps: ProblemStepWithUserStep[];
};

type PracticeShellProps = {
  rawData: RawProblemData;
  children: ReactNode;
};

export function PracticeShell({ rawData, children }: PracticeShellProps) {
  const params = useParams<{ slug: string; step?: string }>();
  const slug = params.slug;
  const stepSlug = params.step;
  const stepType = stepSlug
    ? SLUGS_TO_STEPS[stepSlug as keyof typeof SLUGS_TO_STEPS] || stepSlug
    : null;

  const { loading: stepStateLoading } = useStore(slug);

  useLoadUserData(slug, rawData.steps);

  const config = useTransformData(rawData);
  const handlers = useActionHandler(slug);

  const loading = stepStateLoading;

  if (!stepSlug) {
    if (!config) return null;
    return (
      <PracticeProvider value={{ config, handlers, slug, stepType: null, loading }}>
        <Sidebar theme="dark" />
        <div className="flex h-full w-full flex-1 flex-col overflow-hidden">{children}</div>
      </PracticeProvider>
    );
  }

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-400">Error</div>
          <div className="mt-2 text-sm text-zinc-400">Failed to load problem configuration</div>
        </div>
      </div>
    );
  }

  return (
    <PracticeProvider value={{ config, handlers, slug, stepType, loading }}>
      <ShellContent>{children}</ShellContent>
    </PracticeProvider>
  );
}

type ShellContentProps = {
  children: ReactNode;
};

function ShellContent({ children }: ShellContentProps) {
  const { config, stepType } = usePractice();

  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const openMobilePanel = useCallback(() => setMobilePanelOpen(true), []);
  const closeMobilePanel = useCallback(() => setMobilePanelOpen(false), []);

  const { panelContent } = usePanelLoader({ step: stepType ?? "" });
  const hasPanel = !!panelContent;

  const panelElement = hasPanel ? <StepWithLeftPanel>{panelContent}</StepWithLeftPanel> : null;

  const CategoryLayout = getCategoryLayout(config.type);

  return (
    <SidepanelContext.Provider value={{ openMobilePanel }}>
      <Sidebar theme="dark" />
      <TooltipProvider>
        <div className="flex h-full w-full flex-1 flex-col md:flex-row md:min-h-0 md:pl-16">
          {/* Desktop: left panel as sibling */}
          {panelElement && (
            <aside
              className="hidden min-w-[14rem] w-[28rem] max-w-[45%] flex-shrink flex-col overflow-x-hidden overflow-y-auto border-r border-zinc-800 bg-zinc-950 md:flex"
              aria-label="Left panel"
            >
              {panelElement}
            </aside>
          )}

          {/* Mobile: sliding track with panel */}
          <div className="min-w-0 flex-1 flex flex-col overflow-hidden md:contents">
            <div
              className={`flex flex-1 min-h-0 transition-transform duration-300 ease-in-out md:contents ${
                mobilePanelOpen ? "-translate-x-full" : "translate-x-0"
              }`}
            >
              <div className="w-full flex-shrink-0 flex flex-col overflow-hidden md:contents">
                <CategoryLayout>{children}</CategoryLayout>
              </div>

              {panelElement && (
                <div
                  className="flex w-full flex-shrink-0 flex-col bg-zinc-950 md:hidden"
                  aria-label="Step information panel"
                >
                  <div className="flex-1 overflow-y-auto min-h-0">{panelElement}</div>
                  <footer className="bg-black border-t border-zinc-800 flex-shrink-0">
                    <div className="mx-auto w-full px-4">
                      <PracticeFooter
                        leftButton={{
                          show: true,
                          onClick: closeMobilePanel,
                          icon: <LeftArrowIcon />,
                        }}
                      />
                    </div>
                  </footer>
                </div>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    </SidepanelContext.Provider>
  );
}
