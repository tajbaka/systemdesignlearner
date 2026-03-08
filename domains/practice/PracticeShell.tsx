"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import type { ProblemResponse, ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";
import useStore from "./back-end/hooks/useStore";
import { useActionHandler } from "./back-end/hooks/useActionHandler";
import { useTransformData } from "./back-end/hooks/useTransformData";
import { useLoadUserData } from "./back-end/hooks/useLoadUserData";
import { Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SLUGS_TO_STEPS } from "./back-end/constants";
import { PracticeProvider, usePractice } from "./back-end/context/PracticeContext";
import { PracticeLeftPanel } from "./PracticeLeftPanel";
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
      <PracticeProvider value={{ config, handlers, slug, stepSlug: null, stepType: null, loading }}>
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
    <PracticeProvider
      value={{ config, handlers, slug, stepSlug: stepSlug ?? null, stepType, loading }}
    >
      <ShellContent>{children}</ShellContent>
    </PracticeProvider>
  );
}

type ShellContentProps = {
  children: ReactNode;
};

const PANEL_PARAM = "panel";

function ShellContent({ children }: ShellContentProps) {
  const { config, stepType } = usePractice();
  const searchParams = useSearchParams();
  const router = useRouter();

  const mobilePanelOpen = searchParams.get(PANEL_PARAM) === "open";

  const openMobilePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(PANEL_PARAM, "open");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const closeMobilePanel = useCallback(() => {
    router.back();
  }, [router]);

  const CategoryLayout = getCategoryLayout(config.type);

  return (
    <SidepanelContext.Provider value={{ openMobilePanel }}>
      <div className={mobilePanelOpen ? "hidden md:block" : ""}>
        <Sidebar theme="dark" />
      </div>
      <TooltipProvider>
        <div className="flex h-full w-full flex-1 flex-col md:flex-row md:min-h-0 md:pl-16">
          <PracticeLeftPanel
            step={stepType ?? ""}
            mobilePanelOpen={mobilePanelOpen}
            onCloseMobilePanel={closeMobilePanel}
          >
            <CategoryLayout>{children}</CategoryLayout>
          </PracticeLeftPanel>
        </div>
      </TooltipProvider>
    </SidepanelContext.Provider>
  );
}
