"use client";

import { PRACTICE_STEPS, type PracticeProgress, type PracticeStep } from "@/lib/practice/types";
import { useMemo } from "react";

type PracticeStepperProps = {
  current: PracticeStep;
  progress: PracticeProgress;
  onStepChange: ((step: PracticeStep) => void) | ((step: PracticeStep) => Promise<void>);
  readOnly?: boolean;
  hideMobileStepper?: boolean;
  scenarioTitle?: string;
};

type StepMeta = {
  id: PracticeStep;
  label: string;
  description: string;
};

const STEP_META: Record<PracticeStep, StepMeta> = {
  functional: {
    id: "functional",
    label: "Functional Requirements",
    description: "Define what the system must do",
  },
  nonFunctional: {
    id: "nonFunctional",
    label: "Non-Functional Requirements",
    description: "Latency, throughput, availability",
  },
  api: {
    id: "api",
    label: "API Design",
    description: "Endpoints & payloads",
  },
  sandbox: {
    id: "sandbox",
    label: "Sandbox",
    description: "Design and iterate visually",
  },
  score: {
    id: "score",
    label: "Finish",
    description: "Scorecard & sharing",
  },
};

const getStepNumber = (stepId: PracticeStep): number =>
  PRACTICE_STEPS.indexOf(stepId) + 1;

const computeUnlockedIndex = (progress: PracticeProgress): number => {
  let max = -1;
  PRACTICE_STEPS.forEach((step, index) => {
    if (progress[step]) {
      max = index;
    }
  });
  return max;
};

export function PracticeStepper({
  current,
  progress,
  onStepChange,
  readOnly = false,
  hideMobileStepper = false,
  scenarioTitle,
}: PracticeStepperProps) {
  const currentIndex = useMemo(() => PRACTICE_STEPS.indexOf(current), [current]);
  const unlockedIndex = useMemo(() => computeUnlockedIndex(progress), [progress]);

  const steps = useMemo(() => PRACTICE_STEPS.map((step) => STEP_META[step]), []);

  const isStepDisabled = (step: PracticeStep) => {
    if (readOnly) return false;
    const stepIndex = PRACTICE_STEPS.indexOf(step);
    if (stepIndex === 0) return false;
    return stepIndex > unlockedIndex + 1;
  };

  const isStepCompleted = (step: PracticeStep) => Boolean(progress[step]);

  return (
    <nav
      aria-label="Practice steps"
      className="sm:sticky sm:top-0 z-20 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
    >
      {/* Scenario Title - Shows on all screen sizes above the steps */}
      {scenarioTitle && (
        <div className="flex items-center justify-center px-6 lg:pl-20" style={{ paddingTop: '22px', paddingBottom: '22px' }}>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            {scenarioTitle}
          </h2>
        </div>
      )}

      {/* Mobile Stepper */}
      {!hideMobileStepper ? (
        <div className="sm:hidden animate-in fade-in duration-300 delay-200" style={{ paddingBottom: '5px' }}>
          <div
            className="relative mb-2 h-6 px-6"
            style={{ "--dot": "24px" } as React.CSSProperties}
          >
            <div
              className="absolute h-0.5 bg-zinc-800/40 -z-10"
              style={{
                left: "calc(var(--dot) / 2)",
                right: "calc(var(--dot) / 2)",
                top: "calc(var(--dot) / 2 - 1px)"
              }}
              aria-hidden
            />
            <div
              className="absolute overflow-hidden -z-10"
              style={{
                left: "calc(var(--dot) / 2)",
                right: "calc(var(--dot) / 2)",
                top: "calc(var(--dot) / 2 - 1px)",
                height: "2px",
              }}
              aria-hidden
            >
              <div
                className="h-full bg-blue-400/60 transition-transform duration-500 origin-left"
                style={{
                  transform: `scaleX(${
                    PRACTICE_STEPS.length > 1
                      ? currentIndex / (PRACTICE_STEPS.length - 1)
                      : 0
                  })`,
                }}
              />
            </div>
            <ol className="relative z-10 flex h-6 items-center justify-between gap-2">
              {steps.map((step) => {
                const stepNumber = getStepNumber(step.id);
                const disabled = isStepDisabled(step.id);
                const completed = isStepCompleted(step.id);
                const isCurrent = current === step.id;
                const statusLabel = completed ? "completed" : disabled ? "locked" : "available";

                return (
                  <li key={step.id} className="flex-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (!disabled) onStepChange(step.id);
                      }}
                      disabled={disabled}
                      className={`relative z-20 mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:cursor-not-allowed ${
                        isCurrent
                          ? "bg-blue-500/80 text-blue-50 ring-2 ring-blue-400/30 scale-110"
                          : completed
                            ? "bg-emerald-500/60 text-emerald-50 scale-100"
                            : "bg-zinc-800/40 text-zinc-500 scale-90"
                      }`}
                      style={{ opacity: isCurrent ? 0.9 : completed ? 0.7 : 0.4 }}
                      aria-current={isCurrent ? "step" : undefined}
                      aria-disabled={disabled}
                    >
                      {completed && !isCurrent ? (
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                          <circle cx="6" cy="6" r="2" />
                        </svg>
                      ) : (
                        <span aria-hidden>{stepNumber}</span>
                      )}
                      <span className="sr-only">
                        Step {stepNumber} of {PRACTICE_STEPS.length}, {step.label}, {statusLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : null}

      {/* Desktop */}
      <div className="hidden px-6 py-4 sm:block lg:pl-20 animate-in fade-in duration-300 delay-200">
        <ol
          className="relative mx-auto flex max-w-5xl list-none items-start justify-between"
          style={{ "--dot": "40px" } as React.CSSProperties}
        >
          <div
            className="absolute h-0.5 bg-zinc-800/40 z-0"
            style={{
              left: "calc(var(--dot) / 2)",
              right: "calc(var(--dot) / 2)",
              top: "calc(var(--dot) / 2 - 1px)",
            }}
            aria-hidden
          />
          <div
            className="absolute overflow-hidden z-0"
            style={{
              left: "calc(var(--dot) / 2)",
              right: "calc(var(--dot) / 2)",
              top: "calc(var(--dot) / 2 - 1px)",
              height: "2px",
            }}
            aria-hidden
          >
            <div
              className="h-full bg-blue-400/60 transition-transform duration-500 origin-left"
              style={{
                transform: `scaleX(${
                  PRACTICE_STEPS.length > 1
                    ? currentIndex / (PRACTICE_STEPS.length - 1)
                    : 0
                })`,
              }}
            />
          </div>

          {steps.map((step) => {
            const stepNumber = getStepNumber(step.id);
            const disabled = isStepDisabled(step.id);
            const completed = isStepCompleted(step.id);
            const isCurrent = current === step.id;
            const statusLabel = completed ? "completed" : disabled ? "locked" : "available";

            return (
              <li key={step.id} className="z-10 flex flex-1 flex-col items-center" style={{ opacity: isCurrent ? 0.9 : completed ? 0.7 : 0.4 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!disabled) onStepChange(step.id);
                  }}
                  disabled={disabled}
                  className="group flex flex-col items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={disabled}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                      isCurrent
                        ? "bg-blue-500/80 text-blue-50 ring-2 ring-blue-400/30 scale-110"
                        : completed
                          ? "bg-emerald-500/60 text-emerald-50 scale-100"
                          : "bg-zinc-800/40 text-zinc-500 group-hover:bg-zinc-700/60 group-hover:text-zinc-300 group-disabled:opacity-50 scale-90"
                    }`}
                  >
                    {completed && !isCurrent ? (
                      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                        <circle cx="8" cy="8" r="2.5" />
                      </svg>
                    ) : (
                      stepNumber
                    )}
                  </span>
                  <span className="text-center">
                    <span
                      className={`block text-[11px] font-medium uppercase tracking-wider ${
                        isCurrent
                          ? "text-blue-300"
                          : completed
                            ? "text-emerald-300"
                            : "text-zinc-500 group-hover:text-zinc-400 group-disabled:opacity-50"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-zinc-600 group-hover:text-zinc-500">
                      {step.description}
                    </span>
                  </span>
                  <span className="sr-only">
                    Step {stepNumber} of {PRACTICE_STEPS.length}, {statusLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export default PracticeStepper;
