"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlacedNode, Edge } from "@/app/components/types";
import PracticeStepper from "@/components/practice/PracticeStepper";
import BriefStage from "@/components/practice/stages/BriefStage";
import DesignStage from "@/components/practice/stages/DesignStage";
import RunStage from "@/components/practice/stages/RunStage";
import ReviewPanel from "@/components/practice/ReviewPanel";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import {
  makeInitialPracticeState,
  makeDefaultRequirements,
} from "@/lib/practice/defaults";
import type {
  PracticeDesignState,
  PracticeRunState,
  PracticeState,
  PracticeStep,
  Requirements,
} from "@/lib/practice/types";
import { track } from "@/lib/analytics";

const PRACTICE_SLUG = "url-shortener";

const deriveCurrentStep = (state: PracticeState): PracticeStep => {
  if (!state.locked.brief) return "brief";
  if (!state.locked.design) return "design";
  if (!state.locked.run) return "run";
  return "review";
};

type LegacyPracticeState = Partial<{
  slug: string;
  requirements: Requirements;
  locked: { req?: boolean; high?: boolean; low?: boolean };
}>;

const cloneNodes = (nodes: PlacedNode[]) =>
  nodes.map((node) => ({
    ...node,
    spec: { ...node.spec },
  }));

const cloneEdges = (edges: Edge[]) => edges.map((edge) => ({ ...edge }));

const mergeState = (
  stored: PracticeState | LegacyPracticeState | null
): PracticeState => {
  const base = makeInitialPracticeState();
  if (!stored) {
    return base;
  }

  const isLegacy =
    !("design" in stored) ||
    !("run" in stored) ||
    !(
      "locked" in stored &&
      stored.locked &&
      typeof (stored as PracticeState).locked === "object" &&
      "brief" in (stored as PracticeState).locked
    );

  if (isLegacy) {
    const legacy = stored as LegacyPracticeState;
    const legacyRequirements = legacy.requirements
      ? {
          functional: {
            ...base.requirements.functional,
            ...legacy.requirements.functional,
          },
          nonFunctional: {
            ...base.requirements.nonFunctional,
            ...legacy.requirements.nonFunctional,
          },
        }
      : base.requirements;

    return {
      ...base,
      requirements: legacyRequirements,
      locked: {
        brief: Boolean(legacy.locked?.req),
        design: false,
        run: false,
      },
      updatedAt: Date.now(),
    };
  }

  const state = stored as PracticeState;

  const mergedDesign: PracticeDesignState = {
    ...base.design,
    ...state.design,
    nodes:
      state.design?.nodes?.length
        ? cloneNodes(state.design.nodes)
        : cloneNodes(base.design.nodes),
    edges: state.design?.edges
      ? cloneEdges(state.design.edges)
      : cloneEdges(base.design.edges),
  };

  const mergedRun: PracticeRunState = {
    ...base.run,
    ...state.run,
  };

  return {
    ...base,
    ...state,
    requirements: state.requirements ?? base.requirements,
    design: mergedDesign,
    run: mergedRun,
    locked: {
      brief: Boolean(state.locked?.brief),
      design: Boolean(state.locked?.design),
      run: Boolean(state.locked?.run),
    },
    updatedAt: state.updatedAt ?? Date.now(),
  };
};

type PracticeFlowProps = {
  sharedState?: PracticeState | null;
};

export const PracticeFlow = ({ sharedState }: PracticeFlowProps) => {
  const [state, setState] = useState<PracticeState>(() =>
    makeInitialPracticeState()
  );
  const [currentStep, setCurrentStep] = useState<PracticeStep>("brief");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (sharedState) {
      const readOnlyState = mergeState(sharedState);
      const lockedState: PracticeState = {
        ...readOnlyState,
        locked: { brief: true, design: true, run: true },
      };
      setState(lockedState);
      setCurrentStep("review");
      setHydrated(true);
      track("practice_shared_viewed", { slug: PRACTICE_SLUG });
      return;
    }

    const stored = loadPractice(PRACTICE_SLUG);
    const merged = mergeState(stored);
    setState(merged);
    setCurrentStep(deriveCurrentStep(merged));
    setHydrated(true);

    if (!stored) {
      track("practice_started", { slug: PRACTICE_SLUG });
    }
  }, [sharedState]);

  useEffect(() => {
    if (!hydrated || sharedState) return;
    const timeout = window.setTimeout(() => {
      savePractice(state);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [state, hydrated, sharedState]);

  const updateState = useCallback(
    (updater: (prev: PracticeState) => PracticeState) => {
      if (sharedState) return;
      setState((prev) => {
        const next = updater(prev);
        const updated = {
          ...next,
          updatedAt: Date.now(),
        };
        setCurrentStep((current) => {
          const derived = deriveCurrentStep(updated);
          return derived === current ? current : derived;
        });
        return updated;
      });
    },
    [sharedState]
  );

  const updateDesign = useCallback(
    (updater: (prev: PracticeDesignState) => PracticeDesignState) => {
      updateState((prev) => ({
        ...prev,
        design: updater(prev.design),
      }));
    },
    [updateState]
  );

  const updateRun = useCallback(
    (updater: (prev: PracticeRunState) => PracticeRunState) => {
      updateState((prev) => ({
        ...prev,
        run: updater(prev.run),
      }));
    },
    [updateState]
  );

  const handleStepChange = (step: PracticeStep) => {
    setCurrentStep(step);
    track("practice_step_viewed", { slug: PRACTICE_SLUG, step });
  };

  const handleRequirementsChange = (requirements: Requirements) => {
    updateState((prev) => ({
      ...prev,
      requirements,
    }));
    track("practice_requirements_changed", {
      slug: PRACTICE_SLUG,
      enabled: Object.values(requirements.functional).filter(Boolean).length,
      read_rps: requirements.nonFunctional.readRps,
      write_rps: requirements.nonFunctional.writeRps,
      p95_latency: requirements.nonFunctional.p95RedirectMs,
      availability: requirements.nonFunctional.availability,
    });
  };

  const completeBrief = (requirements: Requirements) => {
    const wasCompleted = state.locked.brief;
    updateState((prev) => ({
      ...prev,
      requirements,
      locked: wasCompleted ? prev.locked : { ...prev.locked, brief: true },
    }));
    if (!wasCompleted) {
      track("practice_step_completed", { slug: PRACTICE_SLUG, step: "brief" });
    }
  };

  const completeDesign = () => {
    const wasCompleted = state.locked.design;
    updateState((prev) => ({
      ...prev,
      locked: wasCompleted ? prev.locked : { ...prev.locked, design: true },
    }));
    if (!wasCompleted) {
      track("practice_step_completed", { slug: PRACTICE_SLUG, step: "design" });
    }
  };

  const completeRun = () => {
    const wasCompleted = state.locked.run;
    updateState((prev) => ({
      ...prev,
      locked: wasCompleted ? prev.locked : { ...prev.locked, run: true },
    }));
    if (!wasCompleted) {
      track("practice_step_completed", { slug: PRACTICE_SLUG, step: "run" });
    }
  };

  const goBackToBrief = () => {
    updateState((prev) => ({
      ...prev,
      locked: {
        ...prev.locked,
        brief: false,
        design: false,
        run: false,
      },
    }));
    setCurrentStep("brief");
    track("practice_design_back_to_brief", { slug: PRACTICE_SLUG });
  };

  const goBackToDesign = () => {
    setCurrentStep("design");
    track("practice_step_goback", { slug: PRACTICE_SLUG, from: "run", to: "design" });
  };

  const nextRenderableStep = useMemo(
    () => deriveCurrentStep(state),
    [state]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (currentStep !== nextRenderableStep) {
      setCurrentStep(nextRenderableStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRenderableStep, hydrated]);

  const isReadOnly = Boolean(sharedState);

  const isDesignStep = currentStep === "design";

  return (
    <div className="flex w-full flex-col gap-6">
      <PracticeStepper
        current={currentStep}
        locks={state.locked}
        onStepChange={handleStepChange}
        readOnly={isReadOnly}
      />

      {currentStep === "brief" ? (
        <BriefStage
          value={state.requirements ?? makeDefaultRequirements()}
          locked={isReadOnly}
          onChange={handleRequirementsChange}
          onComplete={completeBrief}
          readOnly={isReadOnly}
        />
      ) : (
        <section
          className={`transition-all ${
            isDesignStep
              ? "bg-transparent p-0 sm:p-0 border-none shadow-none"
              : "rounded-3xl border border-zinc-700 bg-zinc-900 p-4 shadow-sm sm:p-6"
          }`}
        >
          {currentStep === "design" ? (
            <DesignStage
              design={state.design}
              requirements={state.requirements}
              locked={isReadOnly}
              readOnly={isReadOnly}
              designComplete={state.locked.design}
              updateDesign={updateDesign}
              onContinue={completeDesign}
              onGoBack={goBackToBrief}
            />
          ) : null}

          {currentStep === "run" ? (
            <RunStage
              design={state.design}
              run={state.run}
              requirements={state.requirements}
              locked={isReadOnly}
              readOnly={isReadOnly}
              updateRun={updateRun}
              onContinue={completeRun}
              onGoBack={goBackToDesign}
            />
          ) : null}

          {currentStep === "review" ? (
            <ReviewPanel
              state={state}
              readOnly={isReadOnly}
            />
          ) : null}
        </section>
      )}
    </div>
  );
};

export default PracticeFlow;
