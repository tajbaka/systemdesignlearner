"use client";

import { Step } from "./Step";
import { cn } from "@/lib/utils";

export interface StepperStep {
  title: string;
  description: string;
}

export interface StepperProps {
  steps: StepperStep[];
  activeStep?: number;
  maxVisitedStep?: number;
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

export function Stepper({
  steps,
  activeStep,
  maxVisitedStep,
  className,
  onStepClick,
}: StepperProps) {
  const progressValue =
    steps.length > 1 && activeStep !== undefined ? activeStep / (steps.length - 1) : 0;

  return (
    <nav
      aria-label="Steps"
      className={cn(
        "bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80",
        className
      )}
    >
      {/* Mobile Stepper - Numbers only */}
      <div className="sm:hidden" style={{ paddingBottom: "5px" }}>
        <div
          className="relative mb-2 h-6 pl-16 pr-6"
          style={{ "--dot": "24px" } as React.CSSProperties}
        >
          {/* Background line */}
          <div
            className="absolute h-0.5 bg-zinc-800/40 -z-10"
            style={{
              left: "calc(var(--dot) / 2)",
              right: "calc(var(--dot) / 2)",
              top: "calc(var(--dot) / 2 - 1px)",
            }}
            aria-hidden
          />
          {/* Progress line */}
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
                transform: `scaleX(${progressValue})`,
              }}
            />
          </div>
          <ol className="relative z-10 flex h-6 items-center justify-between gap-2">
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              const isCompleted = maxVisitedStep !== undefined && index <= maxVisitedStep;
              const isClickable = maxVisitedStep !== undefined && index <= maxVisitedStep;

              return (
                <li key={index} className="flex-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (isClickable && onStepClick) {
                        onStepClick(index);
                      }
                    }}
                    disabled={!isClickable}
                    className={cn(
                      "relative z-20 mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50",
                      !isClickable && "cursor-not-allowed",
                      isClickable && "cursor-pointer",
                      isActive
                        ? "bg-blue-500/80 text-blue-50 ring-2 ring-blue-400/30 scale-110"
                        : isCompleted
                          ? "bg-emerald-500/60 text-emerald-50 scale-100"
                          : "bg-zinc-800/40 text-zinc-500 scale-90"
                    )}
                    style={{ opacity: isActive ? 0.9 : isCompleted ? 0.7 : 0.4 }}
                    aria-current={isActive ? "step" : undefined}
                    aria-disabled={!isClickable}
                  >
                    {isCompleted && !isActive ? (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                        <circle cx="6" cy="6" r="2" />
                      </svg>
                    ) : (
                      <span aria-hidden>{index + 1}</span>
                    )}
                    <span className="sr-only">
                      Step {index + 1} of {steps.length}, {step.title},{" "}
                      {isCompleted ? "completed" : !isClickable ? "locked" : "available"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Desktop Stepper - Full labels */}
      <div className="hidden px-6 py-4 sm:block lg:pl-20">
        <ol
          className="relative mx-auto flex max-w-5xl list-none items-start justify-between"
          style={{ "--dot": "40px" } as React.CSSProperties}
        >
          {/* Background line */}
          <div
            className="absolute h-0.5 bg-zinc-800/40 z-0"
            style={{
              left: "calc(var(--dot) / 2)",
              right: "calc(var(--dot) / 2)",
              top: "calc(var(--dot) / 2 - 1px)",
            }}
            aria-hidden
          />
          {/* Progress line */}
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
                transform: `scaleX(${progressValue})`,
              }}
            />
          </div>

          {steps.map((step, index) => {
            const isActive = activeStep === index;
            const isCompleted = maxVisitedStep !== undefined && index <= maxVisitedStep;
            const isClickable = maxVisitedStep !== undefined && index <= maxVisitedStep;

            return (
              <li
                key={index}
                className={cn(
                  "z-10 flex flex-1 flex-col items-center",
                  isClickable && "cursor-pointer"
                )}
                style={{
                  opacity: isActive ? 0.9 : isCompleted ? 0.7 : 0.4,
                }}
                onClick={() => {
                  if (isClickable && onStepClick) {
                    onStepClick(index);
                  }
                }}
              >
                <Step
                  number={index + 1}
                  title={step.title}
                  description={step.description}
                  isActive={isActive}
                  isCompleted={isCompleted}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
