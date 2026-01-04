/**
 * Practice navigation hook - handles step transitions and URL routing.
 *
 * This hook is focused on navigation logic only. Step evaluation
 * and feedback management are delegated to useStepEvaluation.
 */

import { useRouter } from "next/navigation";
import type { PracticeStep } from "@/lib/practice/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { STEP_CONFIGS } from "@/lib/practice/step-configs";
import { logger } from "@/lib/logger";
import { PRACTICE_STEPS } from "@/lib/practice/types";
import { emit } from "@/lib/events";
import { evaluateStep, type StepEvaluationOptions } from "./useStepEvaluation";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

export type NavigationOptions = StepEvaluationOptions & {
  isSignedIn: boolean;
};

/** Convert step to URL format */
const stepToUrl = (step: PracticeStep): string => {
  if (step === "nonFunctional") return "non-functional";
  return step;
};

/** Get next step in sequence */
const getNextStep = (currentStep: PracticeStep): PracticeStep | null => {
  const currentIndex = PRACTICE_STEPS.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= PRACTICE_STEPS.length - 1) return null;
  return PRACTICE_STEPS[currentIndex + 1];
};

/** Get previous step in sequence */
const getPrevStep = (currentStep: PracticeStep): PracticeStep | null => {
  const currentIndex = PRACTICE_STEPS.indexOf(currentStep);
  if (currentIndex <= 0) return null;
  return PRACTICE_STEPS[currentIndex - 1];
};

export function usePracticeNavigation(session: PracticeSessionValue, options: NavigationOptions) {
  const router = useRouter();
  const { verification, setVerification, waitingForSimulation, isSignedIn } = options;

  /**
   * Navigate to the next step.
   * Called after evaluation passes or user confirms to proceed.
   */
  const proceedToNext = () => {
    const config = STEP_CONFIGS[session.currentStep];

    // Run step-specific onNext logic
    config?.onNext?.(session);

    // Navigate to next step URL
    const nextStep = getNextStep(session.currentStep);
    if (nextStep) {
      const nextUrl = `/practice/${session.state.slug}/${stepToUrl(nextStep)}`;
      router.push(nextUrl);
    }

    // Sync auth state if user is signed in at design step
    if (session.currentStep === "highLevelDesign" && isSignedIn && !session.state.auth.isAuthed) {
      session.setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
    }

    // Flush state to storage after React processes updates
    setTimeout(() => {
      session.flushToStorage();
    }, 50);
  };

  /**
   * Handle "Next" button click.
   * Evaluates the current step and either shows feedback or navigates.
   */
  const handleNext = async () => {
    try {
      if (session.isReadOnly) return;

      // Prevent double-clicks while verifying or waiting for simulation
      if (verification.isVerifying || waitingForSimulation) {
        return;
      }

      // Evaluate the current step
      const result = await evaluateStep(session.currentStep, session, options);

      // If evaluation is pending (waiting for simulation), don't proceed
      if (result.isPending) {
        return;
      }

      // If can proceed and no feedback to show, navigate immediately
      if (result.canProceed && !result.feedback) {
        proceedToNext();
        return;
      }

      // If can proceed but has feedback, it's already displayed via setScoringFeedback
      // User will need to click "Continue" to proceed
      // (handled by proceedToNext being called directly from UI)
    } catch (error) {
      logger.error("[handleNext] Unexpected error:", error);
      setVerification({
        isVerifying: false,
        result: {
          canProceed: false,
          blocking: [
            `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
          ],
          warnings: [],
        },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /**
   * Handle "Back" button click.
   * Navigates to the previous step.
   */
  const handleBack = () => {
    if (session.isReadOnly) return;

    // Close API editor if open (mobile)
    emit("apiEditor:close");

    // Navigate to previous step
    const prevStep = getPrevStep(session.currentStep);
    if (prevStep) {
      const prevUrl = `/practice/${session.state.slug}/${stepToUrl(prevStep)}`;
      router.push(prevUrl);
    }
  };

  return {
    handleNext,
    handleBack,
    proceedToNext,
  };
}
