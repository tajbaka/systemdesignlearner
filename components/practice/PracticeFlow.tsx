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

type PracticeFlowProps = {
  sharedState?: PracticeState | null;
};

export const PracticeFlow = ({ sharedState }: PracticeFlowProps) => {
  const [state, setState] = useState<PracticeState>(() => makeInitialPracticeState());
  const [currentStep, setCurrentStep] = useState<PracticeStep>("req");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (sharedState) {
      // Shared state: read-only mode, all steps locked
      const readOnlyState = {
        ...sharedState,
        locked: { req: true, high: true, low: true },
      };
      setState(readOnlyState);
      setCurrentStep("review"); // Always show review for shared states
      setHydrated(true);
      track("practice_shared_viewed", { slug: PRACTICE_SLUG });
    } else {
      // Normal editable mode
      const stored = loadPractice(PRACTICE_SLUG);
      const merged = mergeState(stored);
      setState(merged);
      setCurrentStep(deriveCurrentStep(merged));
      setHydrated(true);
      if (!stored) {
        track("practice_started", { slug: PRACTICE_SLUG });
      }
    }
  }, [sharedState]);

  useEffect(() => {
    if (!hydrated || sharedState) return; // Don't autosave in read-only mode
    const handle = window.setTimeout(() => {
      savePractice(state);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [state, hydrated, sharedState]);

  const updateState = useCallback((updater: (prev: PracticeState) => PracticeState) => {
    if (sharedState) return; // No updates in read-only mode
    setState((prev) => {
      const next = updater(prev);
      return {
        ...next,
        updatedAt: Date.now(),
      };
    });
  }, [sharedState]);

  const handleStepChange = (step: PracticeStep) => {
    setCurrentStep(step);
    track("practice_step_viewed", { slug: PRACTICE_SLUG, step });
  };

  const handleRequirementsChange = (requirements: Requirements) => {
    updateState((prev) => ({
      ...prev,
      requirements,
    }));
    track("practice_requirement_changed", {
      slug: PRACTICE_SLUG,
      functional_enabled: Object.values(requirements.functional).filter(Boolean).length,
      read_rps: requirements.nonFunctional.readRps,
      write_rps: requirements.nonFunctional.writeRps,
      p95_latency: requirements.nonFunctional.p95RedirectMs,
      availability: requirements.nonFunctional.availability
    });
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
    track("practice_preset_selected", {
      slug: PRACTICE_SLUG,
      preset: high.presetId,
      components_count: high.components.length
    });
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
    track("practice_lowlevel_modified", {
      slug: PRACTICE_SLUG,
      schemas_count: Object.keys(low.schemas).length,
      apis_count: low.apis.length,
      cache_hit: low.capacityAssumptions.cacheHit,
      read_rps: low.capacityAssumptions.readRps
    });
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
    if (!hydrated) return;
    if (currentStep !== nextRenderableStep) {
      setCurrentStep(nextRenderableStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRenderableStep, hydrated]);

  const handleExport = () => {
    track("practice_brief_exported", { slug: PRACTICE_SLUG });
  };

  const handleOpenSandbox = () => {
    track("practice_opened_sandbox", { slug: PRACTICE_SLUG });
  };

  const isReadOnly = !!sharedState;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-6">
      <PracticeStepper
        current={currentStep}
        locks={state.locked}
        onStepChange={handleStepChange}
        readOnly={isReadOnly}
      />
      <section className="rounded-3xl border border-zinc-700 bg-zinc-900 p-4 shadow-sm transition-all sm:p-6">
        {currentStep === "req" ? (
          <ReqForm
            value={state.requirements ?? makeDefaultRequirements()}
            locked={isReadOnly}
            onChange={handleRequirementsChange}
            onContinue={completeRequirements}
            readOnly={isReadOnly}
          />
        ) : null}
        {currentStep === "high" ? (
          <HighLevelPresets
            value={state.high}
            locked={isReadOnly}
            onChange={handleHighLevelChange}
            onContinue={completeHighLevel}
            readOnly={isReadOnly}
          />
        ) : null}
        {currentStep === "low" ? (
          <LowLevelEditor
            value={state.low}
            locked={isReadOnly}
            onChange={handleLowLevelChange}
            onContinue={completeLowLevel}
            readOnly={isReadOnly}
          />
        ) : null}
        {currentStep === "review" ? (
          <ReviewPanel
            state={state}
            sandboxAvailable
            onExport={handleExport}
            onOpenSandbox={handleOpenSandbox}
            readOnly={isReadOnly}
          />
        ) : null}
      </section>
    </main>
  );
};

export default PracticeFlow;
