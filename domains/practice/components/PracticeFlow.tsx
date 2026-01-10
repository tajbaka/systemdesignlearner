"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import PracticeStepper from "./PracticeStepper";
import { usePracticeSession } from "./PracticeSessionProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@clerk/nextjs";
import { PRACTICE_STEPS } from "@/domains/practice/types";
import { STEP_CONFIGS, getHelperText, completeStep } from "@/domains/practice/lib/step-configs";
import { useStepEvaluation } from "@/domains/practice/hooks/useStepEvaluation";
import { usePracticeNavigation } from "@/domains/practice/hooks/usePracticeNavigation";
import { useIterativeFeedback } from "@/domains/practice/hooks/useIterativeFeedback";
import { usePracticeFlowState } from "@/domains/practice/hooks/usePracticeFlowState";
import { usePracticeFlowKeyboard } from "@/domains/practice/hooks/usePracticeFlowKeyboard";
import { PracticeFooter } from "./PracticeFooter";
import { PracticeStepContent } from "./PracticeStepContent";
import { IterativeFeedbackModal } from "./IterativeFeedbackModal";
import { transformFeedbackToModal } from "@/domains/practice/lib/transformFeedbackToModal";
import { SCENARIOS } from "@/domains/practice/scenarios";
import { emit } from "@/domains/practice/lib/events";
import { insertSolutions } from "@/domains/practice/lib/solutionInserter";

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
  const { isSignedIn } = useUser();
  const {
    keyboardOffset,
    apiMobileEditing,
    apiMobileEditorValue,
    showTooltips,
    setShowTooltips,
    mobilePaletteOpen,
    setMobilePaletteOpen,
  } = usePracticeFlowState();

  // Get scenario data from SCENARIOS
  const scenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === state.slug);
  }, [state.slug]);
  const scenarioTitle = scenario?.title;

  // Iterative feedback hook
  const {
    state: iterativeFeedbackState,
    getFocusedFeedback,
    resetFeedback: _resetFeedback,
    clearState: clearIterativeFeedback,
    setFeedbackState,
  } = useIterativeFeedback();

  // Combined scoring and evaluation hook
  const {
    verification,
    setVerification,
    scoringFeedback,
    setScoringFeedback,
    evaluateStep,
    clearScoring,
    clearVerification,
  } = useStepEvaluation(session, getFocusedFeedback, setFeedbackState);

  // Navigation hook
  const { handleNext, handleBack, proceedToNext } = usePracticeNavigation(session, {
    evaluateStep,
    verification,
    setVerification,
    isSignedIn: isSignedIn ?? false,
    apiMobileEditing,
  });

  // Check if it's the first time visiting sandbox
  useEffect(() => {
    if (currentStep === "highLevelDesign" && hydrated) {
      const hasSeenSandboxTips = localStorage.getItem("practice-sandbox-tips-seen");
      if (!hasSeenSandboxTips) {
        setShowTooltips(true);
        localStorage.setItem("practice-sandbox-tips-seen", "true");
      }
    }
  }, [currentStep, hydrated, setShowTooltips]);

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
      if (state.completed.highLevelDesign) {
        markStep("highLevelDesign", false);
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
    state.completed.highLevelDesign,
    state.completed.score,
    state.updatedAt,
  ]);

  useEffect(() => {
    if (currentStep !== "highLevelDesign") {
      setMobilePaletteOpen(false);
    }
    // Clear verification, scoring, and iterative feedback state when step changes
    clearVerification();
    clearScoring();
    clearIterativeFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const config = STEP_CONFIGS[currentStep];
  const isDesignStep = currentStep === "highLevelDesign";

  const nextDisabled = useMemo(
    () => (config?.nextDisabled ? config.nextDisabled(session) : false),
    [config, session]
  );
  const showBack = config?.showBack ?? PRACTICE_STEPS.indexOf(currentStep) > 0;
  const showNext = config?.showNext ?? true;
  const nextLabel = config?.nextLabel ?? "Next";

  // Add Enter key support for navigation
  usePracticeFlowKeyboard({
    showNext,
    nextDisabled,
    isVerifying: verification.isVerifying,
    isReadOnly,
    handleNext,
  });

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
        Preparing the practice flow…
      </div>
    );
  }

  const _helperText = getHelperText(currentStep, nextDisabled, isReadOnly);

  return (
    <TooltipProvider>
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
            isDesignStep
              ? "flex-1 min-h-0 overflow-hidden sm:pt-[40px]"
              : "flex-1 min-h-0 overflow-y-auto sm:pt-[40px]"
          }
          style={{
            paddingBottom:
              !isDesignStep && keyboardOffset > 0 ? `${keyboardOffset + 80}px` : undefined,
          }}
        >
          <PracticeStepContent
            currentStep={currentStep}
            mobilePaletteOpen={mobilePaletteOpen}
            onMobilePaletteChange={setMobilePaletteOpen}
          />
        </div>
        {isDesignStep ? (
          <>
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
          </>
        ) : null}
        {/* Iterative Feedback Modal - Unified display for all steps */}
        {iterativeFeedbackState.result &&
          (currentStep === "functional" ||
            currentStep === "nonFunctional" ||
            currentStep === "api" ||
            currentStep === "highLevelDesign") &&
          (() => {
            const modalProps = transformFeedbackToModal(iterativeFeedbackState.result!, {
              scoringFeedback,
              onContinueAvailable: !!proceedToNext,
              stepType: currentStep as "functional" | "nonFunctional" | "api",
              slug: state.slug,
            });
            return (
              <IterativeFeedbackModal
                isOpen={true}
                {...modalProps}
                onClose={() => {
                  setScoringFeedback(null);
                  clearIterativeFeedback();
                  if (currentStep !== "highLevelDesign") {
                    session.setStepScore(
                      currentStep as "functional" | "nonFunctional" | "api",
                      undefined
                    );
                  }
                }}
                onRevise={() => {
                  setScoringFeedback(null);
                  clearIterativeFeedback();
                  if (currentStep !== "highLevelDesign") {
                    session.setStepScore(
                      currentStep as "functional" | "nonFunctional" | "api",
                      undefined
                    );
                  }
                }}
                onContinue={modalProps.showContinueButton ? proceedToNext : undefined}
                onInsert={
                  modalProps.solution && modalProps.solution.length > 0 && modalProps.stepType
                    ? () => {
                        insertSolutions(modalProps.stepType!, state.slug, {
                          state,
                          setRequirements,
                          setApiDefinition,
                        });
                        // Close modal after inserting
                        setScoringFeedback(null);
                        clearIterativeFeedback();
                      }
                    : undefined
                }
              />
            );
          })()}
        <footer
          className="bg-black border-t border-zinc-800"
          style={{
            transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : "none",
          }}
        >
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
            onBackToSandbox={() => router.push(`/practice/${state.slug}/highLevelDesign`)}
            apiMobileEditing={apiMobileEditing}
            voiceCaptureValue={
              currentStep === "functional"
                ? state.requirements.functionalSummary
                : currentStep === "nonFunctional"
                  ? state.requirements.nonFunctional.notes
                  : currentStep === "api" && apiMobileEditing
                    ? apiMobileEditorValue
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
                  : currentStep === "api" && apiMobileEditing
                    ? (value: string) => emit("apiEditor:voiceChange", { value })
                    : undefined
            }
          />
        </footer>{" "}
      </div>
    </TooltipProvider>
  );
}

export function PracticeFlow() {
  return <PracticeFlowInner />;
}

export default PracticeFlow;
