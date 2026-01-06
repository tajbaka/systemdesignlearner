/**
 * Step evaluation hook - handles scoring, validation, and feedback for practice steps.
 *
 * Extracted from usePracticeNavigation to separate concerns:
 * - This hook: evaluation logic, feedback management, proceed/block decisions
 * - usePracticeNavigation: URL routing and step transitions
 */

import type { PracticeStep } from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { VerificationState } from "./usePracticeScoring";
import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import { SCENARIOS } from "@/lib/scenarios";
import { validateDesignForScenario } from "@/lib/practice/validation";
import { evaluateDesignGuidance } from "@/lib/practice/designGuidance";
import { emit } from "@/lib/events";
import { logger } from "@/lib/logger";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

/** Type guard for iterative feedback steps */
export const isIterativeStep = (
  step: PracticeStep
): step is "functional" | "nonFunctional" | "api" =>
  step === "functional" || step === "nonFunctional" || step === "api";

/**
 * Merge base feedback with iterative feedback scores.
 * Used when iterative AI feedback is available alongside rule-based scoring.
 */
export const mergeIterativeScore = (
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

export type StepEvaluationOptions = {
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
  getFocusedFeedback?: (
    currentStep: PracticeStep,
    session: PracticeSessionValue,
    additionalContext?: string
  ) => Promise<IterativeFeedbackResult | null>;
};

export type StepEvaluationResult = {
  /** Whether the user can proceed to the next step */
  canProceed: boolean;
  /** Whether evaluation is still in progress (waiting for simulation) */
  isPending: boolean;
  /** Feedback to display (if any) */
  feedback: FeedbackResult | null;
};

/**
 * Get cached score for a step if available.
 */
function getCachedScore(
  step: PracticeStep,
  session: PracticeSessionValue
): FeedbackResult | undefined {
  switch (step) {
    case "functional":
      return session.state.scores?.functional;
    case "nonFunctional":
      return session.state.scores?.nonFunctional;
    case "api":
      return session.state.scores?.api;
    default:
      return undefined;
  }
}

/**
 * Evaluate an iterative step (functional, nonFunctional, api) with cached score.
 */
async function evaluateWithCachedScore(
  step: PracticeStep,
  session: PracticeSessionValue,
  cachedScore: FeedbackResult,
  options: StepEvaluationOptions
): Promise<StepEvaluationResult> {
  const { setVerification, getFocusedFeedback } = options;

  logger.info(`[evaluateStep] Using cached score for ${step}, skipping evaluation`);

  // Re-trigger iterative feedback with cached content
  if (getFocusedFeedback) {
    setVerification({ isVerifying: true, result: null, error: null });

    try {
      const iterativeCoverage = await getFocusedFeedback(step, session);
      logger.info(`[evaluateStep] Cached iterative coverage result:`, {
        score: iterativeCoverage?.score.percentage,
        blocking: iterativeCoverage?.ui.blocking,
      });

      setVerification({ isVerifying: false, result: null, error: null });

      if (iterativeCoverage?.ui.blocking) {
        return { canProceed: false, isPending: false, feedback: null };
      }

      // Show modal if we have iterative coverage - user can decide to continue
      if (iterativeCoverage) {
        return { canProceed: false, isPending: false, feedback: null };
      }
    } catch (error) {
      logger.error(`Error getting ${step} cached coverage:`, error);
      setVerification({ isVerifying: false, result: null, error: null });
    }
  }

  // No iterative feedback - check cached score for blocking issues
  if (cachedScore.blocking.length > 0) {
    return { canProceed: false, isPending: false, feedback: cachedScore };
  }

  return { canProceed: false, isPending: false, feedback: cachedScore };
}

/**
 * Evaluate an iterative step (functional, nonFunctional, api) without cached score.
 */
async function evaluateIterativeStep(
  step: PracticeStep,
  session: PracticeSessionValue,
  options: StepEvaluationOptions
): Promise<StepEvaluationResult> {
  const { setVerification, setScoringFeedback, evaluateCurrentStep, getFocusedFeedback } = options;

  let iterativeCoverage: IterativeFeedbackResult | null = null;

  // Get iterative feedback first
  if (getFocusedFeedback) {
    setVerification({ isVerifying: true, result: null, error: null });

    try {
      iterativeCoverage = await getFocusedFeedback(step, session);
      logger.info(`[evaluateStep] Iterative coverage result:`, {
        score: iterativeCoverage?.score.percentage,
        blocking: iterativeCoverage?.ui.blocking,
      });
    } catch (error) {
      logger.error(`Error getting ${step} coverage:`, error);
    }

    if (iterativeCoverage?.ui.blocking) {
      setVerification({ isVerifying: false, result: null, error: null });
      return { canProceed: false, isPending: false, feedback: null };
    }

    setVerification({ isVerifying: false, result: null, error: null });
  }

  // Run scoring evaluation
  setVerification({ isVerifying: true, result: null, error: null });
  const result = await evaluateCurrentStep(step, session);
  setVerification({ isVerifying: false, result: null, error: null });

  if (!result) {
    return {
      canProceed: false,
      isPending: false,
      feedback: null,
    };
  }

  // Merge with iterative feedback if available
  let alignedResult = result;
  if (iterativeCoverage && !iterativeCoverage.ui.blocking) {
    alignedResult = mergeIterativeScore(result, iterativeCoverage);
    if (isIterativeStep(step)) {
      session.setStepScore(step, alignedResult);
    }
  }

  // Add improvement question for scores 40-99%
  const scorePercentage = alignedResult.percentage ?? 0;
  if (scorePercentage >= 40 && scorePercentage < 100 && iterativeCoverage) {
    const improvementQuestion =
      iterativeCoverage.ui.nextPrompt ?? iterativeCoverage.nextQuestion?.question ?? null;

    if (improvementQuestion) {
      alignedResult = { ...alignedResult, improvementQuestion };
    }
  }

  // Persist feedback
  setScoringFeedback(alignedResult);
  if (isIterativeStep(step)) {
    session.setStepScore(step, alignedResult);
  }

  const hasBlockingIssues = alignedResult.blocking.length > 0;
  const hasFeedback =
    alignedResult.warnings.length > 0 ||
    alignedResult.suggestions.length > 0 ||
    alignedResult.positive.length > 0;

  return {
    canProceed: !hasBlockingIssues && !hasFeedback,
    isPending: false,
    feedback: alignedResult,
  };
}

/**
 * Evaluate the design step (highLevelDesign) which requires simulation.
 */
async function evaluateDesignStep(
  session: PracticeSessionValue,
  options: StepEvaluationOptions
): Promise<StepEvaluationResult> {
  const { setVerification, setScoringFeedback, setWaitingForSimulation, buildSandboxFeedback } =
    options;

  const scenario = SCENARIOS.find((s) => s.id === session.state.slug) ?? SCENARIOS[0];

  // Check for core design guidance issues first
  const guidance = evaluateDesignGuidance(session.state.design, session.state.slug);
  if (guidance && guidance.level === "core") {
    const feedback: FeedbackResult = {
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
    };
    setScoringFeedback(feedback);
    return { canProceed: false, isPending: false, feedback };
  }

  const result = session.state.run.lastResult ?? null;
  const hasRun = Boolean(result);
  const hasDesignScore = session.state.scores?.design !== undefined;

  // If simulation hasn't been run, trigger it
  if (!hasRun || !hasDesignScore) {
    const validation = validateDesignForScenario(
      scenario,
      session.state.design.nodes,
      session.state.design.edges
    );

    if (!validation.ok) {
      setWaitingForSimulation(false);
      const feedback: FeedbackResult = {
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
      setScoringFeedback(feedback);
      return { canProceed: false, isPending: false, feedback };
    }

    logger.info("Automatically running simulation from Next button");
    setWaitingForSimulation(true);

    // Trigger simulation via event bus
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => emit("simulation:run"));
    } else {
      setTimeout(() => emit("simulation:run"), 0);
    }

    return { canProceed: false, isPending: true, feedback: null };
  }

  // Simulation has been run - build and show feedback
  setVerification({ isVerifying: true, result: null, error: null });

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
    return { canProceed: false, isPending: false, feedback: null };
  }

  setScoringFeedback(evaluationResult.feedback);
  setWaitingForSimulation(false);
  setVerification({ isVerifying: false, result: null, error: null });

  return {
    canProceed: evaluationResult.canProceed,
    isPending: false,
    feedback: evaluationResult.feedback,
  };
}

/**
 * Main step evaluation function.
 * Determines if user can proceed and what feedback to show.
 */
export async function evaluateStep(
  step: PracticeStep,
  session: PracticeSessionValue,
  options: StepEvaluationOptions
): Promise<StepEvaluationResult> {
  const stepsNeedingScoring: PracticeStep[] = [
    "functional",
    "nonFunctional",
    "api",
    "highLevelDesign",
  ];

  // Steps that don't need scoring can proceed immediately
  if (!stepsNeedingScoring.includes(step)) {
    return { canProceed: true, isPending: false, feedback: null };
  }

  // Check for cached score (except for design step)
  if (step !== "highLevelDesign") {
    const cachedScore = getCachedScore(step, session);
    if (cachedScore) {
      return evaluateWithCachedScore(step, session, cachedScore, options);
    }
  }

  // Handle design step separately (requires simulation)
  if (step === "highLevelDesign") {
    return evaluateDesignStep(session, options);
  }

  // Handle iterative steps (functional, nonFunctional, api)
  if (isIterativeStep(step)) {
    return evaluateIterativeStep(step, session, options);
  }

  // Fallback: proceed
  return { canProceed: true, isPending: false, feedback: null };
}

/**
 * Hook for step evaluation.
 * Provides the evaluateStep function bound to the session and options.
 */
export function useStepEvaluation(session: PracticeSessionValue, options: StepEvaluationOptions) {
  const evaluate = async (step: PracticeStep): Promise<StepEvaluationResult> => {
    return evaluateStep(step, session, options);
  };

  return { evaluateStep: evaluate };
}
