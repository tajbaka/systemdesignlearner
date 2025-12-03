"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PracticeStepper from "@/components/practice/PracticeStepper";
import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OnboardingProvider, useOnboarding } from "@/components/practice/PracticeOnboarding";
import { OnboardingTooltip } from "@/components/practice/OnboardingTooltip";
import { useUser } from "@clerk/nextjs";
import { PRACTICE_STEPS } from "@/lib/practice/types";
import { STEP_CONFIGS, getHelperText, completeStep } from "@/lib/practice/step-configs";
import { usePracticeScoring } from "@/hooks/usePracticeScoring";
import { useSandboxEvaluation } from "@/hooks/useSandboxEvaluation";
import { usePracticeNavigation } from "@/hooks/usePracticeNavigation";
import { useIterativeFeedback } from "@/hooks/useIterativeFeedback";
import { PracticeFooter } from "@/components/practice/PracticeFooter";
import { PracticeStepContent } from "@/components/practice/PracticeStepContent";
import { PracticeFeedbackPanel } from "@/components/practice/PracticeFeedbackPanel";
import { IterativeFeedbackModal } from "@/components/practice/IterativeFeedbackModal";
import { SCENARIOS } from "@/lib/scenarios";
import type { ApiEndpoint } from "@/lib/practice/types";

function PracticeFlowInner() {
  const router = useRouter();
  const session = usePracticeSession();
  const {
    hydrated,
    currentStep,
    isReadOnly,
    state,
    markStep,
    setAuth,
    setRequirements,
    setApiDefinition,
  } = session;
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const [apiMobileEditing, setApiMobileEditing] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const { stage, isActive, nextStage, skipOnboarding } = useOnboarding();
  const [hideTooltipTemp, setHideTooltipTemp] = useState(false);
  const { isSignedIn } = useUser();

  // Listen for API mobile editor state changes
  useEffect(() => {
    const handleEditorChange = (event: CustomEvent<{ editing: boolean }>) => {
      setApiMobileEditing(event.detail.editing);
    };

    window.addEventListener("apiMobileEditorChange", handleEditorChange as EventListener);
    return () => {
      window.removeEventListener("apiMobileEditorChange", handleEditorChange as EventListener);
    };
  }, []);

  // Track keyboard position using Visual Viewport API
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const updateKeyboardOffset = () => {
      if (!window.visualViewport) return;

      // Calculate the difference between layout viewport and visual viewport
      const layoutHeight = window.innerHeight;
      const visualHeight = window.visualViewport.height;
      const offset = layoutHeight - visualHeight - window.visualViewport.offsetTop;

      // Only set positive offsets (keyboard is open)
      setKeyboardOffset(Math.max(0, offset));

      // Prevent the page from scrolling when keyboard opens
      // Keep the scroll position at top to prevent header from being pushed out
      if (window.visualViewport.offsetTop > 0) {
        window.scrollTo(0, 0);
      }
    };

    window.visualViewport.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport.addEventListener("scroll", updateKeyboardOffset);

    // Initial check
    updateKeyboardOffset();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateKeyboardOffset);
        window.visualViewport.removeEventListener("scroll", updateKeyboardOffset);
      }
    };
  }, []);

  // Get scenario title from SCENARIOS
  const scenarioTitle = useMemo(() => {
    const scenario = SCENARIOS.find((s) => s.id === state.slug);
    return scenario?.title;
  }, [state.slug]);

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
  const { waitingForSimulation, setWaitingForSimulation, buildSandboxFeedback } =
    useSandboxEvaluation(session, currentStep, setScoringFeedback, setVerification);

  // Navigation hook
  const { handleNext, handleBack, proceedToNext } = usePracticeNavigation(session, {
    verification,
    setVerification,
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

    if (signedIn && !state.auth.isAuthed) {
      setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
      // Clear auth flow flag from URL after successful auth
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("auth_flow")) {
          url.searchParams.delete("auth_flow");
          window.history.replaceState({}, "", url.toString());
        }
      }
      return;
    }

    if (!signedIn && state.auth.isAuthed) {
      setAuth((prev) => ({ ...prev, isAuthed: false }));
      return;
    }

    // Check if we're in the middle of an auth flow (user clicked sign in, being redirected)
    const inAuthFlow =
      typeof window !== "undefined" && new URL(window.location.href).searchParams.has("auth_flow");

    // If not authenticated (and not signed in via Clerk) and has completed protected steps, clear them
    // Don't clear if user is signed in via Clerk - they're in the process of auth state sync
    // CRITICAL: Also don't clear if state was recently updated (within 10 seconds)
    // This prevents clearing progress when page reloads after Clerk auth redirect
    // and Clerk hasn't finished loading yet (isSignedIn is briefly false)
    // OAuth flows can take 5-8 seconds (redirect to provider + back + Clerk initialization)
    const recentlyUpdated = state.updatedAt && Date.now() - state.updatedAt < 10000;

    // Don't clear progress if we're in an auth flow (URL flag present)
    if (!state.auth.isAuthed && !signedIn && !recentlyUpdated && !inAuthFlow) {
      if (state.completed.score) {
        markStep("score", false);
      }
      if (state.completed.sandbox) {
        markStep("sandbox", false);
      }
    }
  }, [
    currentStep,
    hydrated,
    isReadOnly,
    isSignedIn,
    markStep,
    setAuth,
    router,
    state.slug,
    state.auth.isAuthed,
    state.completed.sandbox,
    state.completed.score,
    state.updatedAt,
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

  const nextDisabled = useMemo(
    () => (config?.nextDisabled ? config.nextDisabled(session) : false),
    [config, session]
  );
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
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden">
        <PracticeStepper
          scenario={session.state.slug}
          current={currentStep}
          progress={session.state.completed}
          scenarioTitle={scenarioTitle}
          isAuthenticated={state.auth.isAuthed || Boolean(isSignedIn)}
          readOnly={isReadOnly}
          hideMobileStepper={false}
        />

        <div
          className={
            isSandboxStep
              ? "flex-1 min-h-0 overflow-hidden"
              : "flex-1 min-h-0 overflow-y-auto sm:pt-[20px]"
          }
          style={{
            paddingBottom:
              !isSandboxStep && keyboardOffset > 0 ? `${keyboardOffset + 80}px` : undefined,
          }}
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
                className="fixed bottom-[100px] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/20 text-blue-100 transition hover:bg-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:bottom-36 sm:right-6 lg:bottom-[120px] lg:right-6"
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
              className="bg-blue-600 text-white border-blue-500 max-w-[160px] sm:max-w-xs p-2 sm:p-3"
              sideOffset={8}
            >
              <p className="text-xs sm:text-sm font-semibold">Add Components</p>
              <p className="text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                Click here to add services, databases, caches, and more to your architecture
              </p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {/* Iterative Feedback Modal - Shows in center of screen */}
        {/* Show for ALL scores when using iterative feedback for functional/nonFunctional/api/sandbox steps */}
        <IterativeFeedbackModal
          isOpen={
            !!iterativeFeedbackState.result &&
            (currentStep === "functional" ||
              currentStep === "nonFunctional" ||
              currentStep === "api")
          }
          currentStep={currentStep}
          result={iterativeFeedbackState.result!}
          onClose={() => clearIterativeFeedback()}
          onContinue={
            iterativeFeedbackState.result && !iterativeFeedbackState.result.ui.blocking
              ? proceedToNext
              : undefined
          }
          onInsertAnswer={(text) => {
            if (currentStep === "functional") {
              // REPLACE the content entirely with the correct answer
              setRequirements({
                ...state.requirements,
                functionalSummary: text,
              });
            } else if (currentStep === "nonFunctional") {
              // REPLACE the content entirely with the correct answer
              setRequirements({
                ...state.requirements,
                nonFunctional: {
                  ...state.requirements.nonFunctional,
                  notes: text,
                },
              });
            } else if (currentStep === "api") {
              // For API step, parse the answer and update both path and notes
              // Answer format: "POST /api/v1/urls\nRequest: {...}\nResponse: {...}"
              setApiDefinition((prev) => {
                if (prev.endpoints.length === 0) return prev;

                // Split the answer into parts (one per endpoint, separated by double newlines)
                const answerParts = text.split("\n\n").filter((part) => part.trim());

                // Track which endpoints have been updated
                const updatedEndpoints = prev.endpoints.map((ep) => ({ ...ep }));

                const normalizePath = (value: string) => value.replace(/^\/+/, "").toLowerCase();
                const assignedIndices = new Set<number>();

                for (const answerPart of answerParts) {
                  // Parse: "METHOD /path\nrest of documentation..."
                  // Match first line as "METHOD /path" and rest as notes
                  const lines = answerPart.split("\n");
                  const firstLine = lines[0] || "";
                  const match = firstLine.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)/i);

                  if (match) {
                    const method = match[1].toUpperCase() as ApiEndpoint["method"];
                    const path = match[2]; // e.g., "/api/v1/urls" or "/:code"
                    // Everything after the first line is the documentation
                    const documentation = lines.slice(1).join("\n").trim();
                    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

                    const findMatchingIndex = () =>
                      updatedEndpoints.findIndex(
                        (ep, idx) => !assignedIndices.has(idx) && ep.method.toUpperCase() === method
                      );

                    const findPathMatchIndex = () =>
                      updatedEndpoints.findIndex(
                        (ep, idx) =>
                          !assignedIndices.has(idx) &&
                          normalizePath(ep.path) === normalizePath(cleanPath)
                      );

                    let idx = findMatchingIndex();

                    // If HTTP method was wrong, fall back to matching by path (and eventually by position)
                    if (idx === -1) {
                      idx = findPathMatchIndex();
                    }
                    if (idx === -1) {
                      idx = updatedEndpoints.findIndex((_, i) => !assignedIndices.has(i));
                    }

                    if (idx !== -1) {
                      assignedIndices.add(idx);

                      // Update method and path (remove leading slash since UI adds it)
                      updatedEndpoints[idx].method = method;
                      updatedEndpoints[idx].path = cleanPath;

                      // REPLACE the notes with the documentation (not append)
                      if (documentation) {
                        updatedEndpoints[idx].notes = documentation;
                      }
                    }
                  }
                }

                return { ...prev, endpoints: updatedEndpoints };
              });
            }
            // Clear cached feedback since content changed
            clearIterativeFeedback();
          }}
          durationMs={iterativeFeedbackState.lastDurationMs ?? undefined}
        />

        <footer
          // className="backdrop-blur"
          style={{
            transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : "none",
          }}
        >
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
                session.setStepScore(
                  currentStep as "functional" | "nonFunctional" | "api",
                  undefined
                );
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
            onBackToSandbox={() => router.push(`/practice/${state.slug}/sandbox`)}
            apiMobileEditing={apiMobileEditing}
            voiceCaptureValue={
              currentStep === "functional"
                ? state.requirements.functionalSummary
                : currentStep === "nonFunctional"
                  ? state.requirements.nonFunctional.notes
                  : currentStep === "api" &&
                      apiMobileEditing &&
                      typeof window !== "undefined" &&
                      window._apiMobileEditorVoiceValue !== undefined
                    ? window._apiMobileEditorVoiceValue
                    : undefined
            }
            voiceCaptureOnChange={
              currentStep === "functional"
                ? (value: string) => {
                    setRequirements({
                      ...state.requirements,
                      functionalSummary: value,
                    });
                  }
                : currentStep === "nonFunctional"
                  ? (value: string) => {
                      setRequirements({
                        ...state.requirements,
                        nonFunctional: {
                          ...state.requirements.nonFunctional,
                          notes: value,
                        },
                      });
                    }
                  : currentStep === "api" &&
                      apiMobileEditing &&
                      typeof window !== "undefined" &&
                      window._apiMobileEditorVoiceOnChange
                    ? window._apiMobileEditorVoiceOnChange
                    : undefined
            }
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
