import { useState } from "react";
import type { PracticeStep } from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { VerificationState } from "./usePracticeScoring";
import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import { STEP_CONFIGS } from "@/lib/practice/step-configs";
import { logger } from "@/lib/logger";
import { validateDesignForScenario } from "@/lib/practice/validation";
import { SCENARIOS } from "@/lib/scenarios";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

function getStepName(step: PracticeStep): string {
  switch (step) {
    case "functional":
      return "Functional Requirements";
    case "nonFunctional":
      return "Non-Functional Requirements";
    case "api":
      return "API Definition";
    case "sandbox":
      return "System Design";
    case "score":
      return "Score & Share";
    default:
      return step;
  }
}

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
  // Iterative feedback functions
  getFocusedFeedback?: (
    currentStep: PracticeStep,
    session: PracticeSessionValue,
    additionalContext?: string
  ) => Promise<IterativeFeedbackResult | null>;
};

export function usePracticeNavigation(
  session: PracticeSessionValue,
  options: NavigationOptions
) {
  const scenario = SCENARIOS.find((item) => item.id === session.state.slug) ?? SCENARIOS[0];
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
    getFocusedFeedback,
  } = options;

  const proceedToNext = () => {
    const config = STEP_CONFIGS[session.currentStep];
    const advance = () => {
      config?.onNext?.(session);
      session.goNext();
    };

    // After completing sandbox (step 4), check if user needs to authenticate
    if (session.currentStep === "sandbox") {
      // If user has already authenticated, proceed
      if (session.state.auth.isAuthed) {
        advance();
      }
      // If user is signed in via Clerk but hasn't been marked as authenticated yet
      // This handles the case where they signed in from navbar
      else if (isSignedIn) {
        session.setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
        advance();
      }
      // Otherwise, show auth modal (no skip option - must sign in)
      else {
        // Close the feedback modal before showing auth modal
        setScoringFeedback(null);
        setShowAuthModal(true);
      }
      return;
    }

    advance();
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

    let functionalCoverage: IterativeFeedbackResult | null = null;

    if (stepsNeedingScoring.includes(session.currentStep)) {
      if (session.currentStep === "functional" && getFocusedFeedback) {
        setVerification({ isVerifying: true, result: null, error: null });

        try {
          functionalCoverage = await getFocusedFeedback("functional", session);
        } catch (error) {
          logger.error("Error getting functional coverage:", error);
        }

        if (functionalCoverage?.ui.blocking) {
          setVerification({ isVerifying: false, result: null, error: null });
          return;
        }

        setVerification({ isVerifying: false, result: null, error: null });
      }
      if (session.currentStep === "sandbox") {
        const result = session.state.run.lastResult ?? null;
        const hasRun = Boolean(result);
        const hasDesignScore = session.state.scores?.design !== undefined;

        // If simulation hasn't been run or design score is missing, run it automatically
        if (!hasRun || !hasDesignScore) {
          const validation = validateDesignForScenario(
            scenario,
            session.state.design.nodes,
            session.state.design.edges
          );

          if (!validation.ok) {
            setWaitingForSimulation(false);

            const validationFeedback: FeedbackResult = {
              score: 0,
              maxScore: 35,
              percentage: 0,
              blocking: [
                {
                  category: "architecture",
                  severity: "blocking",
                  message: validation.message,
                  actionable:
                    validation.missingComponents.length > 0
                      ? `Add: ${validation.missingComponents.join(", ")}`
                      : undefined,
                },
              ],
              warnings: [],
              positive: [],
              suggestions: [],
            };

            setScoringFeedback(validationFeedback);
            setVerification({ isVerifying: false, result: null, error: null });
            return;
          }

          if (window._runSimulation) {
            logger.info("Automatically running simulation from Next button");
            setWaitingForSimulation(true);
            if (typeof window.requestAnimationFrame === "function") {
              window.requestAnimationFrame(() => {
                window._runSimulation?.();
              });
            } else {
              setTimeout(() => window._runSimulation?.(), 0);
            }
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

        setVerification({ isVerifying: true, result: null, error: null });

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

      // Non-sandbox steps: run evaluation first to check score
      setVerification({ isVerifying: true, result: null, error: null });

      // Run scoring evaluation first to determine if we need iterative feedback
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

      // Check if score is below threshold (40%)
      const scorePercentage = result.percentage ?? 0;
      const hasBlockingIssues = result.blocking.length > 0;

      // Steps that support iterative feedback
      const stepsWithIterativeFeedback: PracticeStep[] = ["functional"];

      // For scores 40-99%, get improvement question FIRST, then set feedback once
      // This prevents the iterative feedback modal from showing and ensures everything loads together
      if (scorePercentage >= 40 && scorePercentage < 100 && stepsWithIterativeFeedback.includes(session.currentStep)) {
        try {
          const improvementQuestion =
            functionalCoverage?.ui.nextPrompt ?? functionalCoverage?.nextQuestion?.question ?? null;

          if (improvementQuestion) {
            const updatedResult = {
              ...result,
              improvementQuestion,
            };
            setScoringFeedback(updatedResult as any);
            logger.info("Added improvement question:", improvementQuestion);
          } else {
            setScoringFeedback(result);
          }
        } catch (error) {
          logger.error("Error getting improvement question:", error);
          // Set feedback with original result
          setScoringFeedback(result);
        }
      } else {
        // Not in 40-99% range, set feedback immediately
        setScoringFeedback(result);
      }

      // Show final feedback (score >= 40% or no iterative feedback)
      // Check if there are blocking issues
      if (hasBlockingIssues) {
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
