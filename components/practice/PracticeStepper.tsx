"use client";

import { PRACTICE_STEPS, type PracticeStep } from "@/lib/practice/types";
import { useMemo } from "react";

type StepperLocks = {
  req: boolean;
  high: boolean;
  low: boolean;
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
  req: { label: "Requirements", description: "Scope & constraints" },
  high: { label: "High-Level", description: "Pick an architecture" },
  low: { label: "Low-Level", description: "Schemas, APIs, capacity" },
  review: { label: "Review", description: "Generate brief" },
};

const STEP_NUMBERS: Record<PracticeStep, number> = {
  req: 1,
  high: 2,
  low: 3,
  review: 4,
};

const getStepNumber = (stepId: PracticeStep): number => {
  return STEP_NUMBERS[stepId] || 1;
};

const isDisabled = (step: PracticeStep, locks: StepperLocks) => {
  switch (step) {
    case "req":
      return false;
    case "high":
      return !locks.req;
    case "low":
      return !locks.high;
    case "review":
      return !locks.low;
    default:
      return true;
  }
};

const isCompleted = (step: PracticeStep, locks: StepperLocks) => {
  switch (step) {
    case "req":
      return locks.req;
    case "high":
      return locks.high;
    case "low":
      return locks.low;
    case "review":
      return locks.low;
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
      className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/80 overflow-x-hidden"
    >
      <ol className="mx-auto flex w-full max-w-5xl list-none flex-row gap-2 px-3 py-3 justify-center sm:justify-start">
        {currentIndex === 0 ? (
          <li className="flex-shrink-0 w-[30vw] sm:hidden" aria-hidden />
        ) : null}
        {steps.map((step) => {
          const stepNumber = getStepNumber(step.id);
          const position = `${stepNumber} of ${PRACTICE_STEPS.length}`;
          const isCurrent = current === step.id;
          const stepIndex = PRACTICE_STEPS.indexOf(step.id);
          const isPrev = stepIndex === currentIndex - 1;
          const isNext = stepIndex === currentIndex + 1;
          const showOnMobile = isCurrent || isPrev || isNext;
          const statusLabel = step.completed ? "completed" : step.disabled ? "locked" : "available";

          return (
            <li
              key={step.id}
              className={`flex-shrink-0 ${!isCurrent ? 'flex justify-center items-center' : ''} ${showOnMobile ? '' : 'hidden sm:flex'} ${
                isCurrent ? 'w-[70vw] sm:w-auto' : (isPrev || isNext) ? 'w-[30vw] sm:w-auto' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (!step.disabled && !readOnly) {
                    onStepChange(step.id);
                  }
                }}
                disabled={step.disabled || readOnly}
                className={`group flex w-full flex-col rounded-lg border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCurrent ? 'px-4 py-3' : 'px-3 py-2'
                } ${
                  isCurrent
                    ? "border-blue-400 bg-blue-950 text-blue-100"
                    : step.completed
                      ? "border-emerald-400/70 bg-emerald-950/70 text-emerald-100"
                      : "border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:border-blue-300 hover:bg-blue-900/40"
                }`}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={step.disabled}
              >
                <span className={`flex min-w-0 items-center ${isCurrent ? 'gap-3' : 'gap-2'}`}>
                  <span
                    aria-hidden
                    className={`flex items-center justify-center rounded-full border font-semibold ${
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
                  <span className="flex min-w-0 w-full flex-col">
                    <span className={`block w-full font-semibold uppercase truncate tracking-tight sm:tracking-wide ${
                      isCurrent ? 'text-sm' : 'text-xs'
                    }`}>{step.label}</span>
                    <span className={`block w-full text-zinc-400 truncate ${
                      isCurrent ? 'text-xs' : 'text-xs hidden sm:block'
                    }`}>{step.description}</span>
                  </span>
                </span>
                <span className="sr-only">Step {position}, {statusLabel}</span>
              </button>
            </li>
          );
        })}
        {currentIndex === lastIndex ? (
          <li className="flex-shrink-0 w-[30vw] sm:hidden" aria-hidden />
        ) : null}
      </ol>
    </nav>
  );
};

export default PracticeStepper;
