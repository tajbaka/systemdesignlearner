"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PracticeStepper from "@/components/practice/PracticeStepper";
import ReqForm from "@/components/practice/ReqForm";
import HighLevelPresets from "@/components/practice/HighLevelPresets";
import LowLevelEditor from "@/components/practice/LowLevelEditor";
import ReviewPanel from "@/components/practice/ReviewPanel";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import {
  makeInitialPracticeState,
  makeDefaultRequirements,
  makeDefaultLowLevel,
} from "@/lib/practice/defaults";
import type {
  HighLevelChoice,
  LowLevel,
  PracticeState,
  PracticeStep,
  Requirements,
} from "@/lib/practice/types";
import { track } from "@/lib/analytics";

const PRACTICE_SLUG = "url-shortener";

const deriveCurrentStep = (state: PracticeState): PracticeStep => {
  if (!state.locked.req) return "req";
  if (!state.locked.high) return "high";
  if (!state.locked.low) return "low";
  return "review";
};

const mergeState = (stored: PracticeState | null): PracticeState => {
  const base = makeInitialPracticeState();
  if (!stored) {
    return base;
  }
  const defaults = makeDefaultLowLevel();
  return {
    ...base,
    ...stored,
    requirements: stored.requirements ?? base.requirements ?? makeDefaultRequirements(),
    high: stored.high,
    low: stored.low
      ? {
          ...defaults,
          ...stored.low,
          schemas: {
            ...defaults.schemas,
            ...stored.low.schemas,
          },
          apis: stored.low.apis?.length ? stored.low.apis : defaults.apis,
          capacityAssumptions: {
            ...defaults.capacityAssumptions,
            ...stored.low.capacityAssumptions,
          },
        }
      : defaults,
    locked: {
      ...base.locked,
      ...stored.locked,
    },
    updatedAt: stored.updatedAt ?? Date.now(),
  };
};

export const PracticeFlow = () => {
  const [state, setState] = useState<PracticeState>(() => makeInitialPracticeState());
  const [currentStep, setCurrentStep] = useState<PracticeStep>("req");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadPractice(PRACTICE_SLUG);
    const merged = mergeState(stored);
    setState(merged);
    setCurrentStep(deriveCurrentStep(merged));
    setHydrated(true);
    if (!stored) {
      track("practice_started", { slug: PRACTICE_SLUG });
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const handle = window.setTimeout(() => {
      savePractice(state);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [state, hydrated]);

  const updateState = useCallback((updater: (prev: PracticeState) => PracticeState) => {
    setState((prev) => {
      const next = updater(prev);
      return {
        ...next,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleStepChange = (step: PracticeStep) => {
    setCurrentStep(step);
  };

  const handleRequirementsChange = (requirements: Requirements) => {
    updateState((prev) => ({
      ...prev,
      requirements,
    }));
  };

  const completeRequirements = (requirements: Requirements) => {
    updateState((prev) => ({
      ...prev,
      requirements,
      locked: { ...prev.locked, req: true },
    }));
    setCurrentStep("high");
    track("practice_step_completed", { slug: PRACTICE_SLUG, step: "requirements" });
  };

  const handleHighLevelChange = (high: HighLevelChoice) => {
    updateState((prev) => ({
      ...prev,
      high,
    }));
  };

  const completeHighLevel = (high: HighLevelChoice) => {
    updateState((prev) => ({
      ...prev,
      high,
      locked: { ...prev.locked, high: true },
    }));
    setCurrentStep("low");
    track("practice_step_completed", { slug: PRACTICE_SLUG, step: "high-level" });
  };

  const handleLowLevelChange = (low: LowLevel) => {
    updateState((prev) => ({
      ...prev,
      low,
    }));
  };

  const completeLowLevel = (low: LowLevel) => {
    updateState((prev) => ({
      ...prev,
      low,
      locked: { ...prev.locked, low: true },
    }));
    setCurrentStep("review");
    track("practice_step_completed", { slug: PRACTICE_SLUG, step: "low-level" });
  };

  const nextRenderableStep = useMemo(() => deriveCurrentStep(state), [state]);
  useEffect(() => {
    if (currentStep === "review" || !hydrated) return;
    if (currentStep !== nextRenderableStep) {
      setCurrentStep(nextRenderableStep);
    }
  }, [nextRenderableStep, currentStep, hydrated]);

  const handleExport = () => {
    track("practice_brief_exported", { slug: PRACTICE_SLUG });
  };

  const handleOpenSandbox = () => {
    track("practice_opened_sandbox", { slug: PRACTICE_SLUG });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-6">
      <PracticeStepper current={currentStep} locks={state.locked} onStepChange={handleStepChange} />
      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition-all dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
        {currentStep === "req" ? (
          <ReqForm
            value={state.requirements ?? makeDefaultRequirements()}
            locked={state.locked.req}
            onChange={handleRequirementsChange}
            onContinue={completeRequirements}
          />
        ) : null}
        {currentStep === "high" ? (
          <HighLevelPresets
            value={state.high}
            locked={state.locked.high}
            onChange={handleHighLevelChange}
            onContinue={completeHighLevel}
          />
        ) : null}
        {currentStep === "low" ? (
          <LowLevelEditor
            value={state.low}
            locked={state.locked.low}
            onChange={handleLowLevelChange}
            onContinue={completeLowLevel}
          />
        ) : null}
        {currentStep === "review" ? (
          <ReviewPanel
            state={state}
            sandboxAvailable
            onExport={handleExport}
            onOpenSandbox={handleOpenSandbox}
          />
        ) : null}
      </section>
    </main>
  );
};

export default PracticeFlow;
