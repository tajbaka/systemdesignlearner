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
  const steps = useMemo<StepConfig[]>(
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

  return (
    <nav
      aria-label="Practice steps"
      className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/90"
    >
      <ol className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-3 py-3 sm:flex-row sm:items-stretch">
        {steps.map((step, index) => {
          const position = `${index + 1} of ${steps.length}`;
          const isCurrent = current === step.id;
          const statusLabel = step.completed ? "completed" : step.disabled ? "locked" : "available";

          return (
            <li key={step.id} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (!step.disabled && !readOnly) {
                    onStepChange(step.id);
                  }
                }}
                disabled={step.disabled || readOnly}
                className={`group flex w-full flex-col rounded-lg border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isCurrent
                    ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-100"
                    : step.completed
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-400/70 dark:bg-emerald-950/70 dark:text-emerald-100"
                      : "border-zinc-200 bg-white text-zinc-900 transition hover:border-blue-400 hover:bg-blue-50/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-blue-300 dark:hover:bg-blue-900/40"
                }`}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={step.disabled}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-semibold ${
                      isCurrent
                        ? "border-blue-500 bg-white text-blue-600 dark:border-blue-400 dark:bg-blue-950"
                        : step.completed
                          ? "border-emerald-400 bg-white text-emerald-600 dark:border-emerald-400/80 dark:bg-emerald-950/80"
                          : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold uppercase tracking-wide">{step.label}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{step.description}</span>
                  </span>
                </span>
                <span className="sr-only">Step {position}, {statusLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default PracticeStepper;
