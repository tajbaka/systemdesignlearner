"use client";

import { PRACTICE_STEPS, type PracticeProgress, type PracticeStep } from "@/lib/practice/types";
import { useMemo } from "react";

type PracticeStepperProps = {
  current: PracticeStep;
  progress: PracticeProgress;
  onStepChange: (step: PracticeStep) => void;
  readOnly?: boolean;
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
    label: "Non-Functional",
    description: "Latency, throughput, availability",
  },
  api: {
    id: "api",
    label: "API",
    description: "Endpoints & payloads",
  },
  sandbox: {
    id: "sandbox",
    label: "Sandbox",
    description: "Design and iterate visually",
  },
  auth: {
    id: "auth",
    label: "Save Progress",
    description: "Sign in or skip",
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

export function PracticeStepper({ current, progress, onStepChange, readOnly = false }: PracticeStepperProps) {
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
      className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
    >
      {/* Mobile */}
      <div className="sm:hidden py-5">
        <div
          className="relative mb-2 h-9 px-6"
          style={{ ["--dot" as any]: "36px" }}
        >
          <div
            className="absolute h-0.5 bg-zinc-800/70 -z-10"
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
              className="h-full bg-blue-500/80 transition-transform duration-500 origin-left"
              style={{
                transform: `scaleX(${
                  PRACTICE_STEPS.length > 1
                    ? currentIndex / (PRACTICE_STEPS.length - 1)
                    : 0
                })`,
              }}
            />
          </div>
          <ol className="relative z-10 flex h-9 items-center justify-between gap-2">
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
                    className={`relative z-20 mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border-blue-400 bg-blue-500 text-blue-950"
                        : completed
                          ? "border-emerald-400/60 bg-emerald-500 text-emerald-50"
                          : "border-zinc-700 bg-zinc-800 text-zinc-300"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-disabled={disabled}
                  >
                    <span aria-hidden>{stepNumber}</span>
                    <span className="sr-only">
                      Step {stepNumber} of {PRACTICE_STEPS.length}, {step.label}, {statusLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-3 px-6 text-center text-xs font-semibold uppercase tracking-wide text-zinc-300">
          {STEP_META[current].label}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden px-6 py-6 sm:block">
        <ol
          className="relative mx-auto flex max-w-5xl list-none items-start justify-between"
          style={{ ["--dot" as any]: "48px" }}
        >
          <div
            className="absolute h-0.5 bg-zinc-800/70 z-0"
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
              className="h-full bg-blue-500/80 transition-transform duration-500 origin-left"
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
              <li key={step.id} className="z-10 flex flex-1 flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!disabled) onStepChange(step.id);
                  }}
                  disabled={disabled}
                  className="group flex flex-col items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={disabled}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold transition ${
                      isCurrent
                        ? "bg-blue-500 text-blue-50 ring-4 ring-blue-500/30"
                        : completed
                          ? "bg-emerald-500 text-emerald-50 ring-2 ring-emerald-400/40"
                          : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200 group-disabled:opacity-50"
                    }`}
                  >
                    {completed && !isCurrent ? (
                      <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                        <path
                          d="M5 10.5 8.5 14l6.5-8"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      stepNumber
                    )}
                  </span>
                  <span className="text-center">
                    <span
                      className={`block text-xs font-semibold uppercase tracking-wide ${
                        isCurrent
                          ? "text-blue-300"
                          : completed
                            ? "text-emerald-300"
                            : "text-zinc-400 group-hover:text-zinc-300 group-disabled:opacity-50"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500 group-hover:text-zinc-400">
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
