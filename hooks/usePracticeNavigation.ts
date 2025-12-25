import { useRouter } from "next/navigation";
import type { PracticeStep } from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { VerificationState } from "./usePracticeScoring";
import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import { STEP_CONFIGS } from "@/lib/practice/step-configs";
import { logger } from "@/lib/logger";
import { PRACTICE_STEPS } from "@/lib/practice/types";

const STEPS_WITH_ITERATIVE: PracticeStep[] = ["functional", "nonFunctional", "api"];

const isIterativeStep = (step: PracticeStep): step is "functional" | "nonFunctional" | "api" =>
  step === "functional" || step === "nonFunctional" || step === "api";

const mergeIterativeScore = (
  base: FeedbackResult,
  iterative: IterativeFeedbackResult
): FeedbackResult => {
  const merged: FeedbackResult = {
    ...base,
    score: iterative.score.obtained,
    maxScore: iterative.score.max,
    percentage: iterative.score.percentage,
  };

  if (iterative.coverage.allCovered) {
    merged.blocking = [];
    merged.warnings = [];
  }

  if (iterative.ui.coveredLines.length > 0) {
    merged.positive = iterative.ui.coveredLines.map((line) => ({
      category: "bestPractice",
      severity: "positive",
      message: line,
    }));
  }

  return merged;
};
import { validateDesignForScenario } from "@/lib/practice/validation";
import { SCENARIOS } from "@/lib/scenarios";
import { evaluateDesignGuidance } from "@/lib/practice/designGuidance";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

type NavigationOptions = {
  verification: VerificationState;
  setVerification: (state: VerificationState) => void;
  setScoringFeedback: (feedback: FeedbackResult | null) => void;
  waitingForSimulation: boolean;
  setWaitingForSimulation: (waiting: boolean) => void;
  evaluateCurrentStep: (
    currentStep: PracticeStep,
    session: PracticeSessionValue
  ) => Promise<FeedbackResult | null>;
  buildSandboxFeedback: (
    session: PracticeSessionValue
  ) => { feedback: FeedbackResult; canProceed: boolean } | null;
  isSignedIn: boolean;
  // Iterative feedback functions
  getFocusedFeedback?: (
    currentStep: PracticeStep,
    session: PracticeSessionValue,
    additionalContext?: string
  ) => Promise<IterativeFeedbackResult | null>;
};

// Helper to convert step to URL format
const stepToUrl = (step: PracticeStep): string => {
  if (step === "nonFunctional") return "non-functional";
  return step;
};

// Get next step in sequence
const getNextStep = (currentStep: PracticeStep): PracticeStep | null => {
  const currentIndex = PRACTICE_STEPS.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= PRACTICE_STEPS.length - 1) return null;
  return PRACTICE_STEPS[currentIndex + 1];
};

// Get previous step in sequence
const getPrevStep = (currentStep: PracticeStep): PracticeStep | null => {
  const currentIndex = PRACTICE_STEPS.indexOf(currentStep);
  if (currentIndex <= 0) return null;
  return PRACTICE_STEPS[currentIndex - 1];
};

export function usePracticeNavigation(session: PracticeSessionValue, options: NavigationOptions) {
  const router = useRouter();
  const scenario = SCENARIOS.find((item) => item.id === session.state.slug) ?? SCENARIOS[0];
  const {
    verification,
    setVerification,
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

      // Get next step and navigate via URL
      const nextStep = getNextStep(session.currentStep);
      if (nextStep) {
        const nextUrl = `/practice/${session.state.slug}/${stepToUrl(nextStep)}`;
        router.push(nextUrl);
      }

      // CRITICAL: Flush to storage after React processes the state updates
      // Use setTimeout to ensure state updates have been batched and ref updated
      setTimeout(() => {
        session.flushToStorage();
      }, 50);
    };

    // After completing sandbox (step 4), check if user is signed in via Clerk
    // If so, mark them as authenticated before advancing
    if (session.currentStep === "highLevelDesign" && isSignedIn && !session.state.auth.isAuthed) {
      session.setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
    }

    advance();
  };

  const handleNext = async () => {
    try {
      if (session.isReadOnly) return;

      // Prevent double-clicks while already verifying or waiting for simulation
      if (verification.isVerifying || waitingForSimulation) {
        return;
      }

      // Steps that need scoring evaluation (including sandbox for design scoring)
      const stepsNeedingScoring: PracticeStep[] = [
        "functional",
        "nonFunctional",
        "api",
        "highLevelDesign",
      ];

      let iterativeCoverage: IterativeFeedbackResult | null = null;

      if (stepsNeedingScoring.includes(session.currentStep)) {
        // Check if we have a cached score for this step (only for steps that are scored)
        const cachedScore =
          session.currentStep === "functional"
            ? session.state.scores?.functional
            : session.currentStep === "nonFunctional"
              ? session.state.scores?.nonFunctional
              : session.currentStep === "api"
                ? session.state.scores?.api
                : null;

        logger.info(
          `[handleNext] Step: ${session.currentStep}, has cached score: ${!!cachedScore}`
        );

        // If we have a cached score, use it immediately (skip re-evaluation)
        if (cachedScore && session.currentStep !== "highLevelDesign") {
          logger.info(
            `[handleNext] Using cached score for ${session.currentStep}, skipping evaluation`
          );

          // Re-trigger the iterative feedback with the cached content
          if (getFocusedFeedback) {
            setVerification({ isVerifying: true, result: null, error: null });

            try {
              logger.info(
                `[handleNext] Getting iterative feedback for cached ${session.currentStep}`
              );
              iterativeCoverage = await getFocusedFeedback(session.currentStep, session);
              logger.info(`[handleNext] Cached iterative coverage result:`, {
                score: iterativeCoverage?.score.percentage,
                blocking: iterativeCoverage?.ui.blocking,
                hasNextPrompt: !!iterativeCoverage?.ui.nextPrompt,
              });
            } catch (error) {
              logger.error(`Error getting ${session.currentStep} cached coverage:`, error);
            }

            if (iterativeCoverage?.ui.blocking) {
              logger.info(
                `[handleNext] Cached iterative feedback blocking, showing modal and returning`
              );
              setVerification({ isVerifying: false, result: null, error: null });
              return;
            }

            setVerification({ isVerifying: false, result: null, error: null });

            // Always show the modal if we have iterative coverage (let user decide to continue)
            if (iterativeCoverage) {
              // Show the modal - user can click Continue to proceed
              return;
            }
          }

          // If no iterative feedback system, check the cached score for what to do
          if (cachedScore.blocking.length > 0) {
            // Show cached feedback with blocking issues
            setScoringFeedback(cachedScore);
            return;
          }

          // Show cached feedback and let user continue
          setScoringFeedback(cachedScore);
          return;
        }

        // Only run iterative feedback if we don't have a cached score
        if (
          (session.currentStep === "functional" ||
            session.currentStep === "nonFunctional" ||
            session.currentStep === "api") &&
          getFocusedFeedback &&
          !cachedScore
        ) {
          setVerification({ isVerifying: true, result: null, error: null });

          try {
            logger.info(`[handleNext] Getting iterative feedback for ${session.currentStep}`);
            iterativeCoverage = await getFocusedFeedback(session.currentStep, session);
            logger.info(`[handleNext] Iterative coverage result:`, {
              score: iterativeCoverage?.score.percentage,
              blocking: iterativeCoverage?.ui.blocking,
              hasNextPrompt: !!iterativeCoverage?.ui.nextPrompt,
            });
          } catch (error) {
            logger.error(`Error getting ${session.currentStep} coverage:`, error);
          }

          if (iterativeCoverage?.ui.blocking) {
            logger.info(`[handleNext] Iterative feedback blocking, showing modal and returning`);
            setVerification({ isVerifying: false, result: null, error: null });
            return;
          }

          setVerification({ isVerifying: false, result: null, error: null });
        }
        if (session.currentStep === "highLevelDesign") {
          const guidance = evaluateDesignGuidance(session.state.design, session.state.slug);
          if (guidance && guidance.level === "core") {
            setScoringFeedback({
              score: 0,
              maxScore: session.state.scores?.design?.maxScore ?? 35,
              percentage: 0,
              blocking: [
                {
                  category: "architecture",
                  severity: "blocking",
                  message: guidance.summary,
                },
              ],
              warnings: [],
              positive: [],
              suggestions: [],
              improvementQuestion: guidance.question,
            });
            setVerification({ isVerifying: false, result: null, error: null });
            return;
          }

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
          // Build and show feedback
          const evaluationResultCheck = buildSandboxFeedback(session);
          if (!evaluationResultCheck) {
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

          setScoringFeedback(evaluationResultCheck.feedback);
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

        let alignedResult = result;
        const shouldAlignWithIterative =
          iterativeCoverage &&
          STEPS_WITH_ITERATIVE.includes(session.currentStep) &&
          !iterativeCoverage.ui.blocking;

        if (shouldAlignWithIterative) {
          alignedResult = mergeIterativeScore(result, iterativeCoverage!);
          if (isIterativeStep(session.currentStep)) {
            session.setStepScore(session.currentStep, alignedResult);
          }
        }

        const persistFeedback = (feedback: FeedbackResult) => {
          setScoringFeedback(feedback);
          if (session.currentStep !== "highLevelDesign") {
            const stepKey = session.currentStep as "functional" | "nonFunctional" | "api";
            session.setStepScore(stepKey, feedback);
          }
        };

        // For scores 40-99%, get improvement question FIRST, then set feedback once
        // This prevents the iterative feedback modal from showing and ensures everything loads together
        if (
          scorePercentage >= 40 &&
          scorePercentage < 100 &&
          STEPS_WITH_ITERATIVE.includes(session.currentStep)
        ) {
          try {
            const improvementQuestion =
              iterativeCoverage?.ui.nextPrompt ?? iterativeCoverage?.nextQuestion?.question ?? null;

            if (improvementQuestion) {
              const updatedResult: FeedbackResult = {
                ...alignedResult,
                improvementQuestion,
              };
              persistFeedback(updatedResult);
              logger.info("Added improvement question:", improvementQuestion);
            } else {
              persistFeedback(alignedResult);
            }
          } catch (error) {
            logger.error("Error getting improvement question:", error);
            // Set feedback with original result
            persistFeedback(alignedResult);
          }
        } else {
          // Not in 40-99% range, set feedback immediately
          persistFeedback(alignedResult);
        }

        // Show final feedback (score >= 40% or no iterative feedback)
        // Check if there are blocking issues
        if (hasBlockingIssues) {
          // Show feedback, user must revise
          return;
        }

        // If warnings, suggestions, or positive feedback, show it and allow continue
        if (
          result.warnings.length > 0 ||
          result.suggestions.length > 0 ||
          result.positive.length > 0
        ) {
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

  const handleBack = () => {
    if (session.isReadOnly) return;

    // Check if API step mobile editor is open
    if (typeof window !== "undefined" && window._apiMobileEditorClose) {
      window._apiMobileEditorClose();
      return;
    }

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
