import { useState } from "react";
import type { PracticeStep } from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { VerificationState } from "./usePracticeScoring";
import { STEP_CONFIGS } from "@/lib/practice/step-configs";
import { logger } from "@/lib/logger";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

type NavigationOptions = {
  verification: VerificationState;
  setVerification: (state: VerificationState) => void;
  scoringFeedback: FeedbackResult | null;
  setScoringFeedback: (feedback: FeedbackResult | null) => void;
  waitingForSimulation: boolean;
  setWaitingForSimulation: (waiting: boolean) => void;
  evaluateCurrentStep: (
    currentStep: PracticeStep,
    session: PracticeSessionValue
  ) => Promise<FeedbackResult | null>;
  buildSandboxFeedback: (session: PracticeSessionValue) => { feedback: FeedbackResult; canProceed: boolean } | null;
  isSignedIn: boolean;
};

export function usePracticeNavigation(
  session: PracticeSessionValue,
  options: NavigationOptions
) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const {
    verification,
    setVerification,
    scoringFeedback,
    setScoringFeedback,
    waitingForSimulation,
    setWaitingForSimulation,
    evaluateCurrentStep,
    buildSandboxFeedback,
    isSignedIn,
  } = options;

  const proceedToNext = () => {
    const config = STEP_CONFIGS[session.currentStep];
    config?.onNext?.(session);

    // After completing sandbox (step 4), check if user needs to authenticate
    if (session.currentStep === "sandbox") {
      // If user has already authenticated, proceed
      if (session.state.auth.isAuthed) {
        session.goNext();
      }
      // If user is signed in via Clerk but hasn't been marked as authenticated yet
      // This handles the case where they signed in from navbar
      else if (isSignedIn) {
        session.setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
        session.goNext();
      }
      // Otherwise, show auth modal (no skip option - must sign in)
      else {
        setShowAuthModal(true);
      }
    } else {
      session.goNext();
    }
  };

  const handleNext = async () => {
    if (session.isReadOnly) return;

    // Prevent double-clicks while already verifying or waiting for simulation
    if (verification.isVerifying || waitingForSimulation) {
      console.log("[handleNext] Already verifying or waiting, ignoring click");
      return;
    }

    // Steps that need scoring evaluation (including sandbox for design scoring)
    const stepsNeedingScoring: PracticeStep[] = ["functional", "nonFunctional", "api", "sandbox"];

    if (stepsNeedingScoring.includes(session.currentStep)) {
      // Always run scoring evaluation (no bypass for already scored)
      setVerification({ isVerifying: true, result: null, error: null });

      // For sandbox step, check simulation status
      if (session.currentStep === "sandbox") {
        const hasRun = session.state.run.lastResult !== null;
        const result = session.state.run.lastResult;
        const hasPassed = result?.scoreBreakdown?.outcome === "pass";
        const hasDesignScore = session.state.scores?.design !== undefined;

        // If simulation hasn't been run or design score is missing, run it automatically
        if (!hasRun || !hasDesignScore) {
          if (window._runSimulation) {
            logger.info("Automatically running simulation from Next button");
            setWaitingForSimulation(true);
            // Trigger simulation - the useEffect will handle showing feedback when complete
            window._runSimulation();
            return;
          } else {
            // Fallback: Show message if function not available
            setVerification({
              isVerifying: false,
              result: {
                canProceed: false,
                blocking: ["Unable to run simulation. Please refresh the page and try again."],
                warnings: [],
              },
              error: null,
            });
            return;
          }
        }

        // If we reach here, simulation has already been run
        // Check if feedback is already showing
        if (scoringFeedback) {
          // Feedback is already shown, check if can proceed
          if (scoringFeedback.blocking.length === 0) {
            // Can proceed - clear simulation state first
            setWaitingForSimulation(false);
            setVerification({ isVerifying: false, result: null, error: null });
            proceedToNext();
          }
          // Otherwise stay on page with feedback
          return;
        }

        // Need to show feedback - build it from current state
        const evaluationResult = buildSandboxFeedback(session);
        if (!evaluationResult) {
          setVerification({
            isVerifying: false,
            result: {
              canProceed: false,
              blocking: ["Design evaluation is missing. Please run the simulation again."],
              warnings: [],
            },
            error: null,
          });
          return;
        }

        setScoringFeedback(evaluationResult.feedback);
        setWaitingForSimulation(false);
        setVerification({ isVerifying: false, result: null, error: null });
        return;
      }

      // For other steps, run scoring evaluation
      const result = await evaluateCurrentStep(session.currentStep, session);
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

  const handleBack = () => {
    if (session.isReadOnly) return;
    session.goPrev();
  };

  const handleAuthModalAuthenticated = () => {
    session.setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
    setShowAuthModal(false);
    session.goNext();
  };

  const handleAuthModalClose = () => {
    // Don't allow closing without authenticating
    // User must sign in to proceed
  };

  return {
    handleNext,
    handleBack,
    proceedToNext,
    showAuthModal,
    setShowAuthModal,
    handleAuthModalAuthenticated,
    handleAuthModalClose,
  };
}
