"use client";

import { useEffect, useMemo, useState } from "react";
import PracticeStepper from "@/components/practice/PracticeStepper";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingProvider, useOnboarding } from "@/components/practice/PracticeOnboarding";
import { OnboardingTooltip } from "@/components/practice/OnboardingTooltip";
import { useUser } from "@clerk/nextjs";
import { AuthModal } from "@/components/practice/AuthModal";
import { PRACTICE_STEPS, type PracticeStep } from "@/lib/practice/types";
import { STEP_CONFIGS, getHelperText, completeStep } from "@/lib/practice/step-configs";
import { usePracticeScoring } from "@/hooks/usePracticeScoring";
import { useSandboxEvaluation } from "@/hooks/useSandboxEvaluation";
import { usePracticeNavigation } from "@/hooks/usePracticeNavigation";
import { useIterativeFeedback } from "@/hooks/useIterativeFeedback";
import { PracticeFooter } from "@/components/practice/PracticeFooter";
import { PracticeStepContent } from "@/components/practice/PracticeStepContent";
import { PracticeFeedbackPanel } from "@/components/practice/PracticeFeedbackPanel";
import { IterativeFeedbackModal } from "@/components/practice/IterativeFeedbackModal";

function PracticeFlowInner() {
  const session = usePracticeSession();
  const { hydrated, currentStep, setStep, isReadOnly, state, markStep, setAuth } = session;
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);

  const { stage, isActive, nextStage, skipOnboarding } = useOnboarding();
  const [hideTooltipTemp, setHideTooltipTemp] = useState(false);
  const { isSignedIn } = useUser();

  // Scoring hook
  const {
    verification,
    setVerification,
    scoringProgressSteps,
    scoringFeedback,
    setScoringFeedback,
    evaluateCurrentStep,
    clearScoring,
    clearVerification,
  } = usePracticeScoring();

  // Iterative feedback hook
  const {
    state: iterativeFeedbackState,
    getFocusedFeedback,
    resetFeedback: _resetFeedback,
    clearState: clearIterativeFeedback,
  } = useIterativeFeedback();

  // Sandbox evaluation hook
  const { waitingForSimulation, setWaitingForSimulation, buildSandboxFeedback } = useSandboxEvaluation(
    session,
    currentStep,
    setScoringFeedback,
    setVerification
  );

  // Navigation hook
  const {
    handleNext,
    handleBack,
    proceedToNext,
    showAuthModal,
    handleAuthModalAuthenticated,
    handleAuthModalClose,
  } = usePracticeNavigation(session, {
    verification,
    setVerification,
    scoringFeedback,
    setScoringFeedback,
    waitingForSimulation,
    setWaitingForSimulation,
    evaluateCurrentStep,
    buildSandboxFeedback,
    isSignedIn: isSignedIn ?? false,
    getFocusedFeedback,
  });

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
    if (hydrated && !isReadOnly && currentStep === "score" && (state.auth.isAuthed || isSignedIn)) {
      completeStep(session, "score");
    }
  }, [hydrated, isReadOnly, currentStep, session, state.auth.isAuthed, isSignedIn]);

  useEffect(() => {
    if (!hydrated || isReadOnly) return;
    const signedIn = Boolean(isSignedIn);

    if (!signedIn && state.auth.isAuthed) {
      setAuth((prev) => ({ ...prev, isAuthed: false }));
    }

    if (!state.auth.isAuthed) {
      if (state.completed.score) {
        markStep("score", false);
      }
      if (state.completed.sandbox) {
        markStep("sandbox", false);
      }
    }

    if (currentStep === "score" && (!signedIn || !state.auth.isAuthed)) {
      setStep("sandbox");
    }
  }, [
    currentStep,
    hydrated,
    isReadOnly,
    isSignedIn,
    markStep,
    setAuth,
    setStep,
    state.auth.isAuthed,
    state.completed.sandbox,
    state.completed.score,
  ]);

  useEffect(() => {
    if (currentStep !== "sandbox") {
      setMobilePaletteOpen(false);
      setRunPanelOpen(false);
    }
    // Clear verification, scoring, and iterative feedback state when step changes
    clearVerification();
    clearScoring();
    clearIterativeFeedback();
    setWaitingForSimulation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Expose callback to clear waiting state (called by RunStage on error)
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    window._clearWaitingForSimulation = () => {
      setWaitingForSimulation(false);
    };
    return () => {
      delete window._clearWaitingForSimulation;
    };
  }, [setWaitingForSimulation]);

  const config = STEP_CONFIGS[currentStep];
  const isSandboxStep = currentStep === "sandbox";

  const nextDisabled = useMemo(() => (config?.nextDisabled ? config.nextDisabled(session) : false), [config, session]);
  const showBack = config?.showBack ?? PRACTICE_STEPS.indexOf(currentStep) > 0;
  const showNext = config?.showNext ?? true;
  const nextLabel = config?.nextLabel ?? "Next";

  // Add Enter key support for navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger on Enter key
      if (event.key !== "Enter") return;

      // Don't trigger if user is typing in a textarea or input
      const target = event.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;

      // Don't trigger if next button is not shown or is disabled
      if (!showNext || nextDisabled || verification.isVerifying || isReadOnly) return;

      // Trigger the next button
      event.preventDefault();
      handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNext, nextDisabled, verification.isVerifying, isReadOnly, handleNext]);

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Preparing the practice flow…
      </div>
    );
  }

  const helperText = getHelperText(currentStep, nextDisabled, isReadOnly);

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
        slug={session.state.slug}
      />
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        <PracticeStepper
          current={currentStep}
          progress={session.state.completed}
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
              const result = await evaluateCurrentStep(currentStep, session);
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
          <PracticeStepContent
            currentStep={currentStep}
            mobilePaletteOpen={mobilePaletteOpen}
            onMobilePaletteChange={setMobilePaletteOpen}
            runPanelOpen={runPanelOpen}
            onRunPanelChange={setRunPanelOpen}
          />
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

        {/* Iterative Feedback Modal - Shows in center of screen */}
        {/* Show for ALL scores when using iterative feedback for functional/nonFunctional steps */}
        <IterativeFeedbackModal
          isOpen={
            !!iterativeFeedbackState.result &&
            (currentStep === "functional" || currentStep === "nonFunctional")
          }
          currentStep={currentStep}
          result={iterativeFeedbackState.result!}
          onClose={() => clearIterativeFeedback()}
          onContinue={iterativeFeedbackState.result && !iterativeFeedbackState.result.ui.blocking ? proceedToNext : undefined}
          durationMs={iterativeFeedbackState.lastDurationMs ?? undefined}
        />

        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <PracticeFeedbackPanel
            currentStep={currentStep}
            verification={verification}
            scoringProgressSteps={scoringProgressSteps}
            scoringFeedback={scoringFeedback}
            helperText={helperText}
            onRevise={() => {
              setScoringFeedback(null);
              clearIterativeFeedback(); // Also clear iterative feedback state
              if (currentStep !== "sandbox") {
                session.setStepScore(currentStep as "functional" | "nonFunctional" | "api", undefined);
              }
            }}
            onContinue={proceedToNext}
            onClearVerification={clearVerification}
            hasIterativeFeedback={!!iterativeFeedbackState.result}
          />

          <PracticeFooter
            currentStep={currentStep}
            showBack={showBack}
            showNext={showNext}
            nextLabel={nextLabel}
            nextDisabled={nextDisabled}
            isReadOnly={isReadOnly}
            isVerifying={verification.isVerifying}
            onBack={handleBack}
            onNext={handleNext}
            onBackToSandbox={() => setStep("sandbox")}
          />
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
