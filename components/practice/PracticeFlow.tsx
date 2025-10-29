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
import VerificationFeedback from "@/components/practice/VerificationFeedback";
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

const STEP_COMPONENTS: Record<PracticeStep, (props?: Record<string, unknown>) => ReactElement> = {
  functional: () => <FunctionalRequirementsStep />,
  nonFunctional: () => <NonFunctionalRequirementsStep />,
  api: () => <ApiDefinitionStep />,
  sandbox: (props) => <SandboxStep {...(props as Parameters<typeof SandboxStep>[0])} />,
  auth: () => <AuthGateStep />,
  score: () => <ScoreShareStep />,
};

type VerificationState = {
  isVerifying: boolean;
  result: { canProceed: boolean; blocking: string[]; warnings: string[] } | null;
  error: string | null;
};

export function PracticeFlow() {
  const session = usePracticeSession();
  const { hydrated, state, currentStep, setStep, goNext, goPrev, isReadOnly } = session;
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    isVerifying: false,
    result: null,
    error: null,
  });

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
    // Clear verification state when step changes
    setVerification({ isVerifying: false, result: null, error: null });
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

  const verifyStep = async () => {
    setVerification({ isVerifying: true, result: null, error: null });

    try {
      type VerificationBody =
        | { step: "functional"; summary: string; selectedFeatures: Record<string, boolean> }
        | { step: "nonFunctional"; notes: string; readRps: number; writeRps: number; p95RedirectMs: number; availability: string }
        | { step: "api"; endpoints: unknown[]; selectedFeatures: Record<string, boolean> };

      let body: VerificationBody | undefined;

      switch (currentStep) {
        case "functional":
          body = {
            step: "functional",
            summary: state.requirements.functionalSummary,
            selectedFeatures: state.requirements.functional,
          };
          break;

        case "nonFunctional":
          body = {
            step: "nonFunctional",
            notes: state.requirements.nonFunctional.notes,
            readRps: state.requirements.nonFunctional.readRps,
            writeRps: state.requirements.nonFunctional.writeRps,
            p95RedirectMs: state.requirements.nonFunctional.p95RedirectMs,
            availability: state.requirements.nonFunctional.availability,
          };
          break;

        case "api":
          body = {
            step: "api",
            endpoints: state.apiDefinition.endpoints,
            selectedFeatures: state.requirements.functional,
          };
          break;

        default:
          // No verification needed for other steps
          return { canProceed: true, blocking: [], warnings: [] };
      }

      const response = await fetch("/api/practice/verify-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "Verification failed";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setVerification({ isVerifying: false, result, error: null });
      return result;
    } catch (error) {
      console.error("Verification error:", error);
      setVerification({
        isVerifying: false,
        result: null,
        error: "Verification service unavailable. Please try again.",
      });
      return null;
    }
  };

  const proceedToNext = () => {
    config?.onNext?.(session);
    goNext();
  };

  const handleNext = async () => {
    if (isReadOnly) return;

    // Steps that need verification
    const stepsNeedingVerification: PracticeStep[] = ["functional", "nonFunctional", "api"];

    if (stepsNeedingVerification.includes(currentStep)) {
      const result = await verifyStep();

      if (!result) {
        // Verification API failed - user must retry
        return;
      }

      if (!result.canProceed) {
        // Blocking issues - user must revise
        return;
      }

      if (result.warnings.length > 0 && !verification.result) {
        // Show warnings, wait for user action
        return;
      }

      // Either no warnings, or user clicked "Continue Anyway"
      proceedToNext();
    } else {
      // No verification needed
      proceedToNext();
    }
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
              disabled={isReadOnly || nextDisabled || verification.isVerifying}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300"
            >
              <span className="sr-only">{verification.isVerifying ? "Verifying..." : nextLabel}</span>
              {verification.isVerifying ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
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
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
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
            ? "flex-1 min-h-0 overflow-hidden"
            : "flex-1 overflow-y-auto pb-28"
        }
      >
        {isSandboxStep ? <div className="h-full w-full">{stepContent}</div> : <div className="px-4 py-6">{stepContent}</div>}
      </div>

      {isSandboxStep ? (
        <button
          type="button"
          onClick={() => setMobilePaletteOpen(true)}
          disabled={isReadOnly}
          className="fixed bottom-32 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/20 text-blue-100 transition hover:bg-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:bottom-36 sm:right-6 lg:bottom-[120px] lg:right-6"
          aria-label="Open component palette"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
        {verification.error ? (
          <div className="mx-auto w-full max-w-5xl px-4 pt-4">
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4">
              <p className="text-sm text-rose-200">{verification.error}</p>
            </div>
          </div>
        ) : null}
        {verification.result && (verification.result.blocking.length > 0 || verification.result.warnings.length > 0) ? (
          <div className="mx-auto w-full max-w-5xl px-4 pt-4">
            <VerificationFeedback
              blocking={verification.result.blocking}
              warnings={verification.result.warnings}
              onRevise={() => setVerification({ isVerifying: false, result: null, error: null })}
              onContinue={verification.result.canProceed ? proceedToNext : undefined}
            />
          </div>
        ) : null}
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
