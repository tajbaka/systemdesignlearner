"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import PracticeStepper from "@/components/practice/PracticeStepper";
import { logger } from "@/lib/logger";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import FunctionalRequirementsStep from "@/components/practice/steps/FunctionalRequirementsStep";
import NonFunctionalRequirementsStep from "@/components/practice/steps/NonFunctionalRequirementsStep";
import ApiDefinitionStep from "@/components/practice/steps/ApiDefinitionStep";
import SandboxStep from "@/components/practice/steps/SandboxStep";
import ScoreShareStep from "@/components/practice/steps/ScoreShareStep";
import VerificationFeedback from "@/components/practice/VerificationFeedback";
import { EvaluationProgress } from "@/components/practice/EvaluationProgress";
import { PRACTICE_STEPS, type PracticeStep } from "@/lib/practice/types";
import { track } from "@/lib/analytics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingProvider, useOnboarding } from "@/components/practice/PracticeOnboarding";
import { OnboardingTooltip } from "@/components/practice/OnboardingTooltip";
import { useUser } from "@clerk/nextjs";
import { AuthModal } from "@/components/practice/AuthModal";
import {
  evaluateFunctionalOptimized,
  evaluateNonFunctionalRequirements,
  evaluateApiOptimized,
  createFunctionalProgress,
  createApiProgress,
  loadScoringConfig,
} from "@/lib/scoring/index";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { ProgressStep } from "@/lib/scoring/ai/progress";

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
    nextDisabled: (session) => {
      const endpoints = session.state.apiDefinition.endpoints;
      if (endpoints.length === 0) return true;
      // Require at least some meaningful content in notes for each endpoint
      return endpoints.some(ep => !ep.notes.trim() || ep.notes.trim().length < 10);
    },
    onNext: (session) => completeStep(session, "api"),
  },
  sandbox: {
    id: "sandbox",
    showBack: true,
    nextLabel: "Run & Continue",
    nextDisabled: () => false, // Always enabled - will trigger run if needed
    onNext: (session) => completeStep(session, "sandbox"),
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
  score: () => <ScoreShareStep />,
};

type VerificationState = {
  isVerifying: boolean;
  result: { canProceed: boolean; blocking: string[]; warnings: string[] } | null;
  error: string | null;
};

function PracticeFlowInner() {
  const session = usePracticeSession();
  const { hydrated, state, currentStep, setStep, goNext, goPrev, isReadOnly, setAuth, setStepScore } = session;
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const [verification, setVerification] = useState<VerificationState>({
    isVerifying: false,
    result: null,
    error: null,
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [scoringProgressSteps, setScoringProgressSteps] = useState<ProgressStep[]>([]);
  const [scoringFeedback, setScoringFeedback] = useState<FeedbackResult | null>(null);

  const { stage, isActive, nextStage, skipOnboarding } = useOnboarding();
  const [hideTooltipTemp, setHideTooltipTemp] = useState(false);
  const { isSignedIn } = useUser();

  // Reset hideTooltipTemp when stage changes
  useEffect(() => {
    setHideTooltipTemp(false);
  }, [stage]);

  // Check if it's the first time visiting sandbox (fallback for users who skip onboarding)
  useEffect(() => {
    if (currentStep === "sandbox" && hydrated && !isActive) {
      const hasSeenSandboxTips = localStorage.getItem("practice-sandbox-tips-seen");
      if (!hasSeenSandboxTips) {
        setShowTooltips(true);
        localStorage.setItem("practice-sandbox-tips-seen", "true");
      }
    }
  }, [currentStep, hydrated, isActive]);

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
    // Clear verification and scoring state when step changes
    setVerification({ isVerifying: false, result: null, error: null });
    setScoringFeedback(null);
    setScoringProgressSteps([]);
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

  const evaluateCurrentStep = async (): Promise<FeedbackResult | null> => {
    setScoringProgressSteps([]);
    setScoringFeedback(null);

    try {
      const config = await loadScoringConfig("url-shortener");
      let result: FeedbackResult;

      switch (currentStep) {
        case "functional": {
          const progress = createFunctionalProgress();
          progress.onProgress(setScoringProgressSteps);

          result = await evaluateFunctionalOptimized(
            {
              functionalSummary: state.requirements.functionalSummary,
              selectedRequirements: state.requirements.functional,
            },
            config.steps.functional,
            {
              useAI: true,
              explainScore: true,
              progress,
            }
          );
          break;
        }

        case "nonFunctional": {
          result = evaluateNonFunctionalRequirements(
            {
              readRps: state.requirements.nonFunctional.readRps,
              writeRps: state.requirements.nonFunctional.writeRps,
              p95RedirectMs: state.requirements.nonFunctional.p95RedirectMs,
              availability: state.requirements.nonFunctional.availability,
              rateLimitNotes: state.requirements.nonFunctional.rateLimitNotes,
              functionalRequirements: state.requirements.functional,
            },
            config.steps.nonFunctional
          );
          break;
        }

        case "api": {
          const progress = createApiProgress();
          progress.onProgress(setScoringProgressSteps);

          result = await evaluateApiOptimized(
            {
              endpoints: state.apiDefinition.endpoints,
              functionalRequirements: state.requirements.functional,
            },
            config.steps.api,
            {
              useAI: true,
              explainScore: true,
              progress,
            }
          );
          break;
        }

        case "sandbox": {
          // For sandbox, we don't evaluate design here - we check simulation results
          // Design scoring happens during simulation
          return null;
        }

        default:
          return null;
      }

      setScoringFeedback(result);
      setStepScore(currentStep as "functional" | "nonFunctional" | "api", result);
      return result;
    } catch (error) {
      logger.error("Scoring evaluation failed:", error);
      return null;
    } finally {
      setScoringProgressSteps([]);
    }
  };

  const proceedToNext = () => {
    config?.onNext?.(session);

    // After completing sandbox (step 4), check if user needs to authenticate
    if (currentStep === "sandbox") {
      // If user has already authenticated, proceed
      if (state.auth.isAuthed) {
        goNext();
      }
      // If user is signed in via Clerk but hasn't been marked as authenticated yet
      // This handles the case where they signed in from navbar
      else if (isSignedIn) {
        setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
        goNext();
      }
      // Otherwise, show auth modal (no skip option - must sign in)
      else {
        setShowAuthModal(true);
      }
    } else {
      goNext();
    }
  };

  const handleNext = async () => {
    if (isReadOnly) return;

    // Steps that need scoring evaluation (including sandbox for design scoring)
    const stepsNeedingScoring: PracticeStep[] = ["functional", "nonFunctional", "api", "sandbox"];

    if (stepsNeedingScoring.includes(currentStep)) {
      // Always run scoring evaluation (no bypass for already scored)
      setVerification({ isVerifying: true, result: null, error: null });

      // For sandbox step, check simulation first
      if (currentStep === "sandbox") {
        const hasRun = state.run.lastResult !== null;
        const result = state.run.lastResult;
        const hasPassed = result?.scoreBreakdown?.outcome === "pass";

        if (!hasRun) {
          // Show message that simulation needs to be run
          setVerification({
            isVerifying: false,
            result: {
              canProceed: false,
              blocking: ["You must run the simulation and achieve a passing score before continuing."],
              warnings: [],
            },
            error: null,
          });
          return;
        }

        if (!hasPassed && result) {
          // Build detailed feedback based on what failed
          const blocking: string[] = [];
          const warnings: string[] = [];

          // Check SLO issues
          if (!result.meetsLatency) {
            blocking.push(
              `Latency too high: Your design has ${result.latencyMsP95.toFixed(0)}ms p95 latency, but the target is ${state.requirements.nonFunctional.p95RedirectMs}ms or less.`
            );
          }

          if (!result.meetsRps) {
            blocking.push(
              `Insufficient capacity: Your design handles ${result.capacityRps.toFixed(0)} RPS, but needs ${state.requirements.nonFunctional.readRps} RPS.`
            );
          }

          // Check if chaos engineering failed
          if (result.failedByChaos) {
            blocking.push(
              "Your architecture failed under chaos testing. Consider adding redundancy, load balancing, or failover mechanisms."
            );
          }

          // Check acceptance criteria
          if (result.acceptanceScore !== undefined && result.acceptanceScore < 100) {
            const missingFeatures: string[] = [];
            if (result.acceptanceResults) {
              Object.entries(result.acceptanceResults).forEach(([key, passed]) => {
                if (!passed) {
                  missingFeatures.push(key.replace(/-/g, " "));
                }
              });
            }

            if (missingFeatures.length > 0) {
              blocking.push(
                `Missing requirements: ${missingFeatures.join(", ")}`
              );
            }
          }

          // Add score information
          if (result.scoreBreakdown) {
            const score = result.scoreBreakdown;
            warnings.push(
              `Current score: ${score.totalScore.toFixed(0)}/100 (SLO: ${score.sloScore.toFixed(0)}/60, Checklist: ${score.checklistScore.toFixed(0)}/30, Cost: ${score.costScore.toFixed(0)}/10)`
            );
          }

          setVerification({
            isVerifying: false,
            result: {
              canProceed: false,
              blocking: blocking.length > 0 ? blocking : ["Your design didn't pass the simulation. Please review the results and try again."],
              warnings,
            },
            error: null,
          });
          return;
        }

        // Passed! Proceed to next
        setVerification({ isVerifying: false, result: null, error: null });
        proceedToNext();
        return;
      }

      // For other steps, run scoring evaluation
      const result = await evaluateCurrentStep();
      setVerification({ isVerifying: false, result: null, error: null });

      if (!result) {
        // Evaluation failed - show error
        setVerification({
          isVerifying: false,
          result: null,
          error: "Evaluation failed. Please try again.",
        });
        return;
      }

      // Always show feedback (even for perfect scores)
      // Check if there are blocking issues (score too low)
      if (result.blocking.length > 0) {
        // Show feedback, user must revise
        return;
      }

      // If warnings, suggestions, or positive feedback, show it and allow continue
      if (result.warnings.length > 0 || result.suggestions.length > 0 || result.positive.length > 0) {
        // Feedback is already shown via scoringFeedback state
        // User can click "Continue" to proceed
        return;
      }

      // Edge case: no feedback at all (shouldn't happen), proceed automatically
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            <span className="sr-only">Back to sandbox</span>
            <svg aria-hidden className="h-4 w-4" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12l-4-4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-blue-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <span className="sr-only">Home</span>
            <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 3L3 9v8a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9l-7-6z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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

  const handleAuthModalAuthenticated = () => {
    setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
    setShowAuthModal(false);
    goNext();
  };

  const handleAuthModalClose = () => {
    // Don't allow closing without authenticating
    // User must sign in to proceed
  };

  const helperText = () => {
    if (isReadOnly) return null;
    if (currentStep === "sandbox" && nextDisabled) {
      return "Run the simulation and achieve a passing score to continue.";
    }
    if (currentStep === "nonFunctional" && nextDisabled) {
      return "Enter positive numbers for throughput and latency targets.";
    }
    if (currentStep === "api" && nextDisabled) {
      return "Add meaningful descriptions (at least 10 characters) for each API endpoint.";
    }
    return null;
  };

  const helper = helperText();

  // Render onboarding tooltips based on stage
  const renderOnboardingTooltip = () => {
    if (!isActive || hideTooltipTemp) return null;

    switch (stage) {
      case "welcome":
        return (
          <OnboardingTooltip
            title="Welcome to System Design Practice!"
            description="Let's walk through building a URL shortener together. I'll guide you step by step through defining requirements, designing the architecture, and testing your solution."
            position={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            arrow="top"
            onNext={nextStage}
            onSkip={skipOnboarding}
          />
        );

      case "functional-description":
        return (
          <OnboardingTooltip
            title="Step 1: Define Functionality"
            description="Describe the core features of your URL shortener in the text area to the right. What should users be able to do?"
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            highlightSelector="textarea[placeholder*='Example: shorten URLs']"
          />
        );

      case "functional-next":
        return (
          <OnboardingTooltip
            title="Continue"
            description="Once you've described the functionality, click the Next button at the bottom-right to proceed."
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={() => {
              setHideTooltipTemp(true);
              nextStage();
            }}
            onSkip={skipOnboarding}
            pulseSelector="footer button[type='button']:not([disabled])"
            highlightSelector="footer button[type='button']:not([disabled])"
            nextLabel="Got it!"
          />
        );

      case "nonfunctional-description":
        return (
          <OnboardingTooltip
            title="Step 2: Performance Constraints"
            description="Describe performance requirements: latency targets, throughput (requests/sec), and availability goals."
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            highlightSelector="textarea[placeholder*='target 100ms']"
          />
        );

      case "nonfunctional-targets":
        return (
          <OnboardingTooltip
            title="Optional: Numeric Targets"
            description="You can expand 'Edit numeric targets' to set specific numbers. This helps you design more precisely."
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            highlightSelector="button:has(svg[class*='rotate'])"
          />
        );

      case "nonfunctional-next":
        return (
          <OnboardingTooltip
            title="Continue"
            description="Click Next at the bottom-right to move on to defining your API endpoints."
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={() => {
              setHideTooltipTemp(true);
              nextStage();
            }}
            onSkip={skipOnboarding}
            pulseSelector="footer button[type='button']:not([disabled])"
            highlightSelector="footer button[type='button']:not([disabled])"
            nextLabel="Got it!"
          />
        );

      case "api-description":
        return (
          <OnboardingTooltip
            title="Step 3: Define API Endpoints"
            description="Define the HTTP endpoints your service exposes. Describe request/response formats for creating short URLs and redirecting."
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            highlightSelector="article[class*='rounded-3xl']"
          />
        );

      case "api-next":
        return (
          <OnboardingTooltip
            title="Continue to Sandbox"
            description="Next up: design your system architecture visually with drag-and-drop components!"
            position={{ top: "200px", left: "20px" }}
            arrow="right"
            onNext={() => {
              setHideTooltipTemp(true);
              nextStage();
            }}
            onSkip={skipOnboarding}
            pulseSelector="footer button[type='button']:not([disabled])"
            highlightSelector="footer button[type='button']:not([disabled])"
            nextLabel="Let's go!"
          />
        );

      case "sandbox-welcome":
        return (
          <OnboardingTooltip
            title="Step 4: Design Architecture"
            description="Drag components to move them, connect them by dragging from edges. Build your architecture visually."
            position={{ top: "140px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
          />
        );

      case "sandbox-add-component":
        return (
          <OnboardingTooltip
            title="Add Components"
            description="Click the + button (bottom-right) to add caches, databases, load balancers, and more."
            position={{ top: "140px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            pulseSelector="button[aria-label='Open component palette']"
          />
        );

      case "sandbox-minimap":
        return (
          <OnboardingTooltip
            title="Navigation"
            description="Use the mini-map (bottom-left) to navigate around your diagram as it grows."
            position={{ top: "140px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            highlightSelector=".react-flow__minimap"
          />
        );

      case "sandbox-run":
        return (
          <OnboardingTooltip
            title="Test Your Design"
            description="Run the simulation to test if your architecture meets the requirements. The system evaluates latency, throughput, and patterns."
            position={{ top: "140px", left: "20px" }}
            arrow="right"
            onNext={nextStage}
            onSkip={skipOnboarding}
            nextLabel="Start building!"
          />
        );

      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      {renderOnboardingTooltip()}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onAuthenticated={handleAuthModalAuthenticated}
        slug={state.slug}
      />
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        <PracticeStepper
          current={currentStep}
          progress={state.completed}
          onStepChange={async (step) => {
            // If navigating forward and current step needs scoring, evaluate it first
            const stepsNeedingScoring: PracticeStep[] = ["functional", "nonFunctional", "api", "sandbox"];
            const currentIndex = PRACTICE_STEPS.indexOf(currentStep);
            const targetIndex = PRACTICE_STEPS.indexOf(step);

            if (
              !isReadOnly &&
              targetIndex > currentIndex &&
              stepsNeedingScoring.includes(currentStep)
            ) {
              // Always evaluate current step before allowing navigation (no bypass)
              setVerification({ isVerifying: true, result: null, error: null });
              const result = await evaluateCurrentStep();
              setVerification({ isVerifying: false, result: null, error: null });

              if (result && result.blocking.length === 0) {
                // Evaluation passed or has warnings only, allow navigation
                setStep(step);
              } else if (!result) {
                // Evaluation failed
                setVerification({
                  isVerifying: false,
                  result: null,
                  error: "Please complete the current step before continuing.",
                });
              }
              // If blocking issues, stay on current step and show feedback
            } else {
              // No evaluation needed or navigating backward
              setStep(step);
            }
          }}
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
          <Tooltip open={showTooltips} onOpenChange={setShowTooltips}>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-blue-600 text-white border-blue-500 max-w-xs"
              sideOffset={8}
            >
              <p className="font-semibold">Add Components</p>
              <p className="text-xs mt-1">Click here to add services, databases, caches, and more to your architecture</p>
            </TooltipContent>
          </Tooltip>
        ) : null}

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
        {verification.error ? (
          <div className="mx-auto w-full max-w-5xl px-4 pt-4">
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4">
              <p className="text-sm text-rose-200">{verification.error}</p>
            </div>
          </div>
        ) : null}
        {scoringProgressSteps.length > 0 && (
          <div className="mx-auto w-full max-w-5xl px-4 pt-4">
            <EvaluationProgress steps={scoringProgressSteps} />
          </div>
        )}
        {scoringFeedback && (
          <div className="mx-auto w-full max-w-5xl px-4 pt-4">
            <VerificationFeedback
              feedbackResult={scoringFeedback}
              showScore={true}
              onRevise={() => {
                setScoringFeedback(null);
                // Clear the score so user can try again
                setStepScore(currentStep as "functional" | "nonFunctional" | "api", undefined);
              }}
              onContinue={scoringFeedback.blocking.length === 0 ? proceedToNext : undefined}
            />
          </div>
        )}
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
    </TooltipProvider>
  );
}

// Wrapper component that provides onboarding context
export function PracticeFlow() {
  return (
    <OnboardingProvider>
      <PracticeFlowInner />
    </OnboardingProvider>
  );
}

export default PracticeFlow;
