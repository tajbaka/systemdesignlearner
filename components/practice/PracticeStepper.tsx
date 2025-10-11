"use client";

import { PRACTICE_STEPS, type PracticeStep } from "@/lib/practice/types";
import { useMemo } from "react";

type StepperLocks = {
  brief: boolean;
  design: boolean;
  run: boolean;
};

type PracticeStepperProps = {
  current: PracticeStep;
  locks: StepperLocks;
  onStepChange: (step: PracticeStep) => void;
  readOnly?: boolean;
};

type StepConfig = {
  id: PracticeStep;
  label: string;
  description: string;
  disabled: boolean;
  completed: boolean;
};

const stepLabels: Record<PracticeStep, { label: string; description: string }> = {
  brief: { label: "Brief", description: "Scope & constraints" },
  design: { label: "Design", description: "Build the system" },
  run: { label: "Run", description: "Simulate & iterate" },
  review: { label: "Review", description: "Highlights & share" },
};

const STEP_NUMBERS: Record<PracticeStep, number> = {
  brief: 1,
  design: 2,
  run: 3,
  review: 4,
};

const getStepNumber = (stepId: PracticeStep): number => {
  return STEP_NUMBERS[stepId] || 1;
};

const isDisabled = (step: PracticeStep, locks: StepperLocks) => {
  switch (step) {
    case "brief":
      return false;
    case "design":
      return !locks.brief;
    case "run":
      return !locks.design;
    case "review":
      return !locks.run;
    default:
      return true;
  }
};

const isCompleted = (step: PracticeStep, locks: StepperLocks) => {
  switch (step) {
    case "brief":
      return locks.brief;
    case "design":
      return locks.design;
    case "run":
      return locks.run;
    case "review":
      return locks.run;
    default:
      return false;
  }
};

export const PracticeStepper = ({ current, locks, onStepChange, readOnly = false }: PracticeStepperProps) => {
  const allSteps = useMemo<StepConfig[]>(
    () =>
      PRACTICE_STEPS.map((id) => ({
        id,
        label: stepLabels[id].label,
        description: stepLabels[id].description,
        disabled: isDisabled(id, locks),
        completed: isCompleted(id, locks),
      })),
    [locks]
  );

  const steps = useMemo<StepConfig[]>(() => {
    // Always render all steps to preserve fixed numbering and total count
    return allSteps;
  }, [allSteps]);

  const currentIndex = useMemo(() => PRACTICE_STEPS.indexOf(current), [current]);
  const lastIndex = PRACTICE_STEPS.length - 1;

  return (
    <nav
      aria-label="Practice steps"
      className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80"
    >
      {/* Mobile view - carousel style */}
      <div className="sm:hidden px-3 py-4">
        <ol className="flex items-center justify-center gap-2 list-none">
          {steps.map((step) => {
            const stepNumber = getStepNumber(step.id);
            const position = `${stepNumber} of ${PRACTICE_STEPS.length}`;
            const isCurrent = current === step.id;
            const stepIndex = PRACTICE_STEPS.indexOf(step.id);
            const isPrev = stepIndex === currentIndex - 1;
            const isNext = stepIndex === currentIndex + 1;
            const showOnMobile = isCurrent || isPrev || isNext;
            const statusLabel = step.completed ? "completed" : step.disabled ? "locked" : "available";

            if (!showOnMobile) return null;

            return (
              <li key={step.id} className={isCurrent ? "flex-1" : ""}>
                <button
                  type="button"
                  onClick={() => {
                    if (!step.disabled && !readOnly) {
                      onStepChange(step.id);
                    }
                  }}
                  disabled={step.disabled || readOnly}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isCurrent
                      ? "border-blue-400 bg-blue-950 text-blue-100"
                      : step.completed
                        ? "border-emerald-400/70 bg-emerald-950/70 text-emerald-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-100"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={step.disabled}
                >
                  <span
                    aria-hidden
                    className={`flex-shrink-0 flex items-center justify-center rounded-full border font-semibold ${
                      isCurrent ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm'
                    } ${
                      isCurrent
                        ? "border-blue-400 bg-blue-950 text-blue-100"
                        : step.completed
                          ? "border-emerald-400/80 bg-emerald-950/80 text-emerald-100"
                          : "border-zinc-600 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {stepNumber}
                  </span>
                  {isCurrent && (
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold uppercase text-sm truncate">{step.label}</span>
                      <span className="block text-zinc-400 text-xs truncate">{step.description}</span>
                    </span>
                  )}
                  <span className="sr-only">Step {position}, {statusLabel}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Desktop view - minimal line style */}
      <div className="hidden sm:block px-6 py-6">
        <ol className="relative flex items-start justify-between list-none max-w-4xl mx-auto">
          {/* Progress line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-zinc-800" aria-hidden />
          <div
            className="absolute top-5 left-0 h-0.5 bg-blue-500 transition-all duration-500"
            style={{ width: `${(currentIndex / (PRACTICE_STEPS.length - 1)) * 100}%` }}
            aria-hidden
          />

          {steps.map((step) => {
            const stepNumber = getStepNumber(step.id);
            const position = `${stepNumber} of ${PRACTICE_STEPS.length}`;
            const isCurrent = current === step.id;
            const statusLabel = step.completed ? "completed" : step.disabled ? "locked" : "available";

            return (
              <li key={step.id} className="relative flex flex-col items-center z-10 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!step.disabled && !readOnly) {
                      onStepChange(step.id);
                    }
                  }}
                  disabled={step.disabled || readOnly}
                  className="group flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 rounded disabled:cursor-not-allowed transition"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={step.disabled}
                >
                  {/* Circle */}
                  <span
                    className={`flex items-center justify-center rounded-full font-semibold transition-all ${
                      isCurrent ? 'h-11 w-11 text-base' : 'h-10 w-10 text-sm'
                    } ${
                      isCurrent
                        ? "bg-blue-500 text-white ring-4 ring-blue-500/30"
                        : step.completed
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-300 group-disabled:opacity-50"
                    }`}
                  >
                    {step.completed && !isCurrent ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNumber
                    )}
                  </span>

                  {/* Label */}
                  <span className="flex flex-col items-center text-center mt-1">
                    <span className={`font-semibold uppercase tracking-wide transition-colors ${
                      isCurrent ? 'text-blue-400 text-sm' : step.completed ? 'text-emerald-400 text-xs' : 'text-zinc-400 text-xs group-hover:text-zinc-300 group-disabled:opacity-50'
                    }`}>
                      {step.label}
                    </span>
                    <span className={`text-xs transition-colors mt-0.5 ${
                      isCurrent ? 'text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-400 group-disabled:opacity-50'
                    }`}>
                      {step.description}
                    </span>
                  </span>

                  <span className="sr-only">Step {position}, {statusLabel}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default PracticeStepper;
