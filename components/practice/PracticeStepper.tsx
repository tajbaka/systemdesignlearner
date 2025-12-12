"use client";

import Link from "next/link";
import { PRACTICE_STEPS, type PracticeProgress, type PracticeStep } from "@/lib/practice/types";
import { useMemo, useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type PracticeStepperProps = {
  scenario: string;
  current: PracticeStep;
  progress: PracticeProgress;
  readOnly?: boolean;
  hideMobileStepper?: boolean;
  scenarioTitle?: string;
  isAuthenticated?: boolean;
};

type StepMeta = {
  id: PracticeStep;
  label: string;
  description: string;
  learnMoreLink: string;
};

const STEP_META: Record<PracticeStep, StepMeta> = {
  functional: {
    id: "functional",
    label: "Functional Requirements",
    description: "Define what the system must do",
    learnMoreLink: "/learn/system-design-structure#functional-requirements",
  },
  nonFunctional: {
    id: "nonFunctional",
    label: "Non-Functional Requirements",
    description: "Latency, throughput, availability",
    learnMoreLink: "/learn/system-design-structure#non-functional-requirements",
  },
  api: {
    id: "api",
    label: "API Design",
    description: "Endpoints & payloads",
    learnMoreLink: "/learn/system-design-structure#api-design",
  },
  highLevelDesign: {
    id: "highLevelDesign",
    label: "Hight Level Design",
    description: "Design and iterate visually",
    learnMoreLink: "/learn/system-design-structure#high-level-design",
  },
  score: {
    id: "score",
    label: "Finish",
    description: "Scorecard & sharing",
    learnMoreLink: "/learn/system-design-structure",
  },
};

const getStepNumber = (stepId: PracticeStep): number => PRACTICE_STEPS.indexOf(stepId) + 1;

const computeUnlockedIndex = (progress: PracticeProgress): number => {
  let max = -1;
  PRACTICE_STEPS.forEach((step, index) => {
    if (progress[step]) {
      max = index;
    }
  });
  return max;
};

// Convert step name to URL-friendly format
const stepToUrl = (step: PracticeStep): string => {
  if (step === "nonFunctional") return "non-functional";
  return step;
};

// Build step URL
const getStepUrl = (scenario: string, step: PracticeStep): string => {
  return `/practice/${scenario}/${stepToUrl(step)}`;
};

// Step descriptions and learn more links for tooltips
const STEP_TOOLTIP_INFO: Record<
  PracticeStep,
  { title: string; description: string; learnMoreLink: string }
> = {
  functional: {
    title: "Functional Requirements",
    description: "Describe what users can do and the core capabilities the system must provide.",
    learnMoreLink: "/learn/system-design-structure#functional-requirements",
  },
  nonFunctional: {
    title: "Non-Functional Requirements",
    description:
      "Define performance constraints: latency targets, throughput, and availability goals.",
    learnMoreLink: "/learn/system-design-structure#non-functional-requirements",
  },
  api: {
    title: "API Design",
    description:
      "Define the HTTP endpoints your service exposes and their request/response formats.",
    learnMoreLink: "/learn/system-design-structure#api-design",
  },
  highLevelDesign: {
    title: "Architecture Design",
    description: "Design your system architecture visually with drag-and-drop components.",
    learnMoreLink: "/learn/system-design-structure#high-level-design-design-diagram",
  },
  score: {
    title: "Scorecard & Results",
    description: "Review your scorecard and share your results.",
    learnMoreLink: "/learn/system-design-structure",
  },
};

export function PracticeStepper({
  scenario,
  current,
  progress,
  readOnly = false,
  hideMobileStepper = false,
  scenarioTitle,
  isAuthenticated: isAuthenticatedProp,
}: PracticeStepperProps) {
  const { isSignedIn } = useUser();
  const currentIndex = useMemo(() => PRACTICE_STEPS.indexOf(current), [current]);
  const unlockedIndex = useMemo(() => computeUnlockedIndex(progress), [progress]);

  const steps = useMemo(() => PRACTICE_STEPS.map((step) => STEP_META[step]), []);

  // Use prop if provided, otherwise check Clerk
  const isAuthenticated = isAuthenticatedProp ?? isSignedIn;

  // State to control tooltip visibility - show automatically on step transitions
  const [tooltipOpen, setTooltipOpen] = useState(false);
  // Track if tooltip was opened by click (so it stays open on hover)
  const clickedRef = useRef(false);
  // Track if device supports touch (mobile)
  const isTouchDeviceRef = useRef(false);

  // Detect touch device on mount
  useEffect(() => {
    isTouchDeviceRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // Automatically show tooltip when step changes, but only if user is NOT logged in
  useEffect(() => {
    if (current && STEP_TOOLTIP_INFO[current] && !isSignedIn) {
      setTooltipOpen(true);
      clickedRef.current = false; // Reset on step change
    }
  }, [current, isSignedIn]);

  const isStepDisabled = (step: PracticeStep) => {
    if (readOnly) return false;
    const stepIndex = PRACTICE_STEPS.indexOf(step);
    if (stepIndex === 0) return false;

    // Score step (index 4) requires authentication
    if (step === "score" && !isAuthenticated) return true;

    return stepIndex > unlockedIndex + 1;
  };

  const isStepCompleted = (step: PracticeStep) => Boolean(progress[step]);

  return (
    <nav
      aria-label="Practice steps"
      className="bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
    >
      {/* Scenario Title - Shows on all screen sizes above the steps */}
      {scenarioTitle && (
        <div
          className="relative flex items-center justify-center pl-16 pr-6 lg:pl-20 lg:pr-6"
          style={{ paddingTop: "22px", paddingBottom: "22px" }}
        >
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{scenarioTitle}</h2>
          {/* Tooltip button - shows on all screen sizes when there's a current step */}
          {current && STEP_TOOLTIP_INFO[current] && (
            <div className="absolute right-6">
              <Tooltip
                open={tooltipOpen}
                onOpenChange={(open) => {
                  // On touch devices, ignore hover-based changes (clicks are handled in onClick)
                  if (isTouchDeviceRef.current) {
                    // Only allow programmatic changes, not hover/touch events from Tooltip
                    // Clicks are explicitly handled in the button's onClick handler
                    return;
                  }
                  // Desktop: Allow hover to open/close only if tooltip wasn't opened by click
                  if (open) {
                    // Opening: allow hover to open if not clicked
                    if (!clickedRef.current) {
                      setTooltipOpen(true);
                    }
                  } else {
                    // Closing: only allow if not opened by click
                    if (!clickedRef.current) {
                      setTooltipOpen(false);
                    }
                  }
                }}
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Toggle tooltip state on click (works on both mobile and desktop)
                      const newState = !tooltipOpen;
                      clickedRef.current = newState; // Mark as clicked if opening
                      setTooltipOpen(newState);
                      // Reset clicked state when closing via click
                      if (!newState) {
                        clickedRef.current = false;
                      }
                    }}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${
                      tooltipOpen
                        ? "border-blue-400/60 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/80"
                        : "border-zinc-600/60 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300 hover:border-zinc-500/60"
                    }`}
                    aria-label="Help"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 11.5V8M8 5.5h.01" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="rounded-lg border-2 border-blue-500 bg-blue-600 text-white shadow-xl max-w-xs px-4 py-3"
                  sideOffset={8}
                  onPointerDownOutside={() => {
                    // Close when clicking outside, and reset clicked state
                    setTooltipOpen(false);
                    clickedRef.current = false;
                  }}
                >
                  <h3 className="text-sm font-bold mb-1.5">{STEP_TOOLTIP_INFO[current].title}</h3>
                  <p className="text-sm mb-2">{STEP_TOOLTIP_INFO[current].description}</p>
                  <Link
                    href={STEP_TOOLTIP_INFO[current].learnMoreLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100 hover:text-white underline transition-colors"
                  >
                    Learn more
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </Link>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {/* Mobile Stepper */}
      {!hideMobileStepper ? (
        <div
          className="sm:hidden animate-in fade-in duration-300 delay-200"
          style={{ paddingBottom: "5px" }}
        >
          <div
            className="relative mb-2 h-6 pl-16 pr-6"
            style={{ "--dot": "24px" } as React.CSSProperties}
          >
            <div
              className="absolute h-0.5 bg-zinc-800/40 -z-10"
              style={{
                left: "calc(var(--dot) / 2)",
                right: "calc(var(--dot) / 2)",
                top: "calc(var(--dot) / 2 - 1px)",
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
                    PRACTICE_STEPS.length > 1 ? currentIndex / (PRACTICE_STEPS.length - 1) : 0
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
                    <Link
                      href={disabled ? `#` : getStepUrl(scenario, step.id)}
                      onClick={(e) => {
                        if (disabled) e.preventDefault();
                      }}
                      className={`relative z-20 mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${
                        disabled ? "cursor-not-allowed" : "cursor-pointer"
                      } ${
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
                    </Link>
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
                  PRACTICE_STEPS.length > 1 ? currentIndex / (PRACTICE_STEPS.length - 1) : 0
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
              <li
                key={step.id}
                className="z-10 flex flex-1 flex-col items-center"
                style={{ opacity: isCurrent ? 0.9 : completed ? 0.7 : 0.4 }}
              >
                <Link
                  href={disabled ? `#` : getStepUrl(scenario, step.id)}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  className={`group flex flex-col items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-disabled={disabled}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                      isCurrent
                        ? "bg-blue-500/80 text-blue-50 ring-2 ring-blue-400/30 scale-110"
                        : completed
                          ? "bg-emerald-500/60 text-emerald-50 scale-100"
                          : disabled
                            ? "bg-zinc-800/40 text-zinc-500 opacity-50 scale-90"
                            : "bg-zinc-800/40 text-zinc-500 group-hover:bg-zinc-700/60 group-hover:text-zinc-300 scale-90"
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
                            : disabled
                              ? "text-zinc-500 opacity-50"
                              : "text-zinc-500 group-hover:text-zinc-400"
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
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export default PracticeStepper;
