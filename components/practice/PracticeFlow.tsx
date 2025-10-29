"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import PracticeStepper from "@/components/practice/PracticeStepper";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import FunctionalRequirementsStep from "@/components/practice/steps/FunctionalRequirementsStep";
import NonFunctionalRequirementsStep from "@/components/practice/steps/NonFunctionalRequirementsStep";
import ApiDefinitionStep from "@/components/practice/steps/ApiDefinitionStep";
import SandboxStep from "@/components/practice/steps/SandboxStep";
import AuthGateStep from "@/components/practice/steps/AuthGateStep";
import ScoreShareStep from "@/components/practice/steps/ScoreShareStep";
import { PRACTICE_STEPS, type PracticeStep } from "@/lib/practice/types";
import { track } from "@/lib/analytics";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

type StepConfig = {
  id: PracticeStep;
  showBack?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  nextDisabled?: (session: PracticeSessionValue) => boolean;
  onNext?: (session: PracticeSessionValue) => void;
};

const completeStep = (session: PracticeSessionValue, step: PracticeStep) => {
  if (session.isReadOnly || session.state.completed[step]) return;
  session.markStep(step, true);
  track("practice_step_completed", { slug: session.state.slug, step });
};

const STEP_CONFIGS: Record<PracticeStep, StepConfig> = {
  functional: {
    id: "functional",
    showBack: false,
    nextLabel: "Next",
    nextDisabled: (session) => !session.state.requirements.functionalSummary.trim(),
    onNext: (session) => completeStep(session, "functional"),
  },
  nonFunctional: {
    id: "nonFunctional",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => {
      const nf = session.state.requirements.nonFunctional;
      return nf.readRps <= 0 || nf.writeRps <= 0 || nf.p95RedirectMs <= 0;
    },
    onNext: (session) => completeStep(session, "nonFunctional"),
  },
  api: {
    id: "api",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => session.state.apiDefinition.endpoints.length === 0,
    onNext: (session) => completeStep(session, "api"),
  },
  sandbox: {
    id: "sandbox",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => session.state.run.lastResult?.scoreBreakdown?.outcome !== "pass",
    onNext: (session) => completeStep(session, "sandbox"),
  },
  auth: {
    id: "auth",
    showBack: true,
    nextLabel: "Next",
    nextDisabled: (session) => !(session.state.auth.isAuthed || session.state.auth.skipped),
    onNext: (session) => completeStep(session, "auth"),
  },
  score: {
    id: "score",
    showBack: true,
    showNext: false,
  },
};

const STEP_COMPONENTS: Record<PracticeStep, (props?: any) => ReactElement> = {
  functional: () => <FunctionalRequirementsStep />,
  nonFunctional: () => <NonFunctionalRequirementsStep />,
  api: () => <ApiDefinitionStep />,
  sandbox: (props) => <SandboxStep {...props} />,
  auth: () => <AuthGateStep />,
  score: () => <ScoreShareStep />,
};

export function PracticeFlow() {
  const session = usePracticeSession();
  const { hydrated, state, currentStep, setStep, goNext, goPrev, isReadOnly } = session;
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !isReadOnly && currentStep === "score") {
      completeStep(session, "score");
    }
  }, [hydrated, isReadOnly, currentStep, session]);

  useEffect(() => {
    if (currentStep !== "sandbox") {
      setMobilePaletteOpen(false);
      setRunPanelOpen(false);
    }
  }, [currentStep]);

  const config = STEP_CONFIGS[currentStep];
  const StepComponent = STEP_COMPONENTS[currentStep];
  const isSandboxStep = currentStep === "sandbox";

  const nextDisabled = useMemo(() => (config?.nextDisabled ? config.nextDisabled(session) : false), [config, session]);
  const showBack = config?.showBack ?? PRACTICE_STEPS.indexOf(currentStep) > 0;
  const showNext = config?.showNext ?? true;
  const nextLabel = config?.nextLabel ?? "Next";

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Preparing the practice flow…
      </div>
    );
  }

  const handleBack = () => {
    if (isReadOnly) return;
    goPrev();
  };

  const handleNext = () => {
    if (isReadOnly) return;
    config?.onNext?.(session);
    goNext();
  };

  const sandboxProps = currentStep === "sandbox"
    ? {
        mobilePaletteOpen,
        onMobilePaletteChange: setMobilePaletteOpen,
        runPanelOpen,
        onRunPanelChange: setRunPanelOpen,
      }
    : undefined;

  const stepContent = StepComponent ? <StepComponent {...(sandboxProps ?? {})} /> : null;

  const renderFooter = () => {
    if (currentStep === "score") {
      return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep("sandbox")}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            ← Back to sandbox
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-blue-500 px-6 text-sm font-semibold text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Home
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={isReadOnly}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ← Back
          </button>
        ) : (
          <span className="h-11" />
        )}

        <div className="flex items-center gap-2">
          {showNext ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isReadOnly || nextDisabled}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
            >
              <span className="sr-only">{nextLabel}</span>
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const helperText = () => {
    if (isReadOnly) return null;
    if (currentStep === "sandbox" && nextDisabled) {
      return "Run the simulation and achieve a passing score to continue.";
    }
    if (currentStep === "auth" && nextDisabled) {
      return "Sign in or skip to unlock the finish step.";
    }
    if (currentStep === "nonFunctional" && nextDisabled) {
      return "Enter positive numbers for throughput and latency targets.";
    }
    return null;
  };

  const helper = helperText();

  return (
    <div className="flex w-full flex-1 flex-col gap-6 pb-28 min-h-0">
      <PracticeStepper
        current={currentStep}
        progress={state.completed}
        onStepChange={(step) => setStep(step)}
        readOnly={isReadOnly}
        hideMobileStepper={isSandboxStep}
      />

      <div
        className={
          isSandboxStep
            ? "flex-1 min-h-0 flex flex-col gap-6"
            : "flex flex-col gap-6"
        }
      >
        {isSandboxStep ? <div className="flex-1 min-h-0">{stepContent}</div> : stepContent}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
        {renderFooter()}
        {helper ? (
          <div className="mx-auto w-full max-w-5xl px-4 pb-4 text-xs text-amber-200">
            {helper}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

export default PracticeFlow;
