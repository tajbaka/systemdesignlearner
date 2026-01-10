/**
 * Practice navigation hook - handles step transitions and URL routing.
 *
 * This hook is focused on navigation logic only. Step evaluation
 * and feedback management are delegated to useStepEvaluation.
 */

import { useRouter } from "next/navigation";
import type { PracticeStep } from "@/domains/practice/types";
import type { usePracticeSession } from "@/domains/practice/components/PracticeSessionProvider";
import { STEP_CONFIGS } from "@/domains/practice/lib/step-configs";
import { logger } from "@/lib/logger";
import { PRACTICE_STEPS } from "@/domains/practice/types";
import { emit } from "@/domains/practice/lib/events";
import type { StepEvaluationResult, VerificationState } from "./useStepEvaluation";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

export type NavigationOptions = {
  evaluateStep: (step: PracticeStep) => Promise<StepEvaluationResult>;
  verification: VerificationState;
  setVerification: (state: VerificationState) => void;
  isSignedIn: boolean;
  /** Whether the API mobile editor is currently open */
  apiMobileEditing?: boolean;
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
  const { verification, setVerification, isSignedIn } = options;

  /**
   * Navigate to the next step.
   * Called after evaluation passes or user confirms to proceed.
   */
  const proceedToNext = () => {
    const config = STEP_CONFIGS[session.currentStep];
    const currentSlug = session.state.slug;

    // Compute next step URL before any state changes
    const nextStep = getNextStep(session.currentStep);
    const nextUrl = nextStep ? `/practice/${currentSlug}/${stepToUrl(nextStep)}` : null;

    // Run step-specific onNext logic (marks step as completed)
    config?.onNext?.(session);

    // Sync auth state if user is signed in at design step
    if (session.currentStep === "highLevelDesign" && isSignedIn && !session.state.auth.isAuthed) {
      session.setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
    }

    // Flush state to storage (localStorage sync, DB async in background)
    session.flushToStorage();

    // Navigate to next step URL
    if (nextUrl) {
      router.push(nextUrl);
    }
  };

  /**
   * Handle "Next" button click.
   * Evaluates the current step and either shows feedback or navigates.
   */
  const handleNext = async () => {
    try {
      if (session.isReadOnly) return;

      // Prevent double-clicks while verifying or waiting for simulation
      if (verification.isVerifying) {
        return;
      }

      // Evaluate the current step
      const result = await options.evaluateStep(session.currentStep);

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
   * On mobile API step with editor open: closes editor and returns to endpoint list.
   * On first step (functional): navigates to the intro page.
   * Otherwise: navigates to the previous step.
   */
  const handleBack = () => {
    if (session.isReadOnly) return;

    // If on API step with mobile editor open, just close the editor (don't navigate)
    if (session.currentStep === "api" && options.apiMobileEditing) {
      emit("apiEditor:close");
      return;
    }

    // Navigate to previous step
    const prevStep = getPrevStep(session.currentStep);
    if (prevStep) {
      const prevUrl = `/practice/${session.state.slug}/${stepToUrl(prevStep)}`;
      router.push(prevUrl);
    } else {
      // On first step, go back to the intro page
      router.push(`/practice/${session.state.slug}`);
    }
  };

  return {
    handleNext,
    handleBack,
    proceedToNext,
  };
}
