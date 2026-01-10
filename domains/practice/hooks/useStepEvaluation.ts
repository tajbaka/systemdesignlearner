/**
 * Step evaluation hook - combines scoring and evaluation in one place.
 * Uses Open/Closed Principle with a registry pattern for step handlers.
 */

import { useState, useCallback } from "react";
import type { PracticeStep, PracticeStepScores } from "@/domains/practice/types";
import type { FeedbackResult } from "@/domains/practice/types";
import type { usePracticeSession } from "@/domains/practice/components/PracticeSessionProvider";
import type { IterativeFeedbackResult } from "@/domains/practice/scoring/iterative";
import {
  scoreFunctionalRequirements,
  scoreNonFunctionalRequirements,
  scoreApiDefinition,
  scoreHighLevelDesign,
  loadScoringConfig,
  iterativeToFeedbackResult,
} from "@/domains/practice/scoring/index";
import { emit } from "@/domains/practice/lib/events";
import { logger } from "@/lib/logger";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

export type VerificationState = {
  isVerifying: boolean;
  result: { canProceed: boolean; blocking: string[]; warnings: string[] } | null;
  error: string | null;
};

export type StepEvaluationResult = {
  canProceed: boolean;
  isPending: boolean;
  feedback: FeedbackResult | null;
};

/**
 * Step handler interface - each step defines its own scoring and evaluation logic
 */
type StepHandler = {
  /**
   * Run the scoring function for this step
   * Returns FeedbackResult for session storage, but may internally use IterativeFeedbackResult
   */
  score: (
    session: PracticeSessionValue
  ) => Promise<FeedbackResult | IterativeFeedbackResult | null>;

  /**
   * Evaluate the step (handles iterative feedback, scoring, merging, etc.)
   */
  evaluate: (
    session: PracticeSessionValue,
    options: {
      setVerification: (state: VerificationState) => void;
      setScoringFeedback: (feedback: FeedbackResult | null) => void;
      getFocusedFeedback?: (
        step: PracticeStep,
        session: PracticeSessionValue,
        additionalContext?: string
      ) => Promise<IterativeFeedbackResult | null>;
      setIterativeFeedback?: (
        state: Partial<{
          result: IterativeFeedbackResult | null;
          isLoading: boolean;
          error: string | null;
          lastDurationMs: number | null;
        }>
      ) => void;
    }
  ) => Promise<StepEvaluationResult>;

  /**
   * Get cached score for this step
   */
  getCachedScore: (session: PracticeSessionValue) => FeedbackResult | undefined;
};

/**
 * Merge iterative feedback with scoring result
 */
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

/**
 * Helper to evaluate steps (functional, nonFunctional, api, highLevelDesign)
 */
async function evaluateIterativeStepHelper(
  step: PracticeStep,
  session: PracticeSessionValue,
  handler: StepHandler,
  options: {
    setVerification: (state: VerificationState) => void;
    setScoringFeedback: (feedback: FeedbackResult | null) => void;
    getFocusedFeedback?: (
      step: PracticeStep,
      session: PracticeSessionValue,
      additionalContext?: string
    ) => Promise<IterativeFeedbackResult | null>;
    setIterativeFeedback?: (
      state: Partial<{
        result: IterativeFeedbackResult | null;
        isLoading: boolean;
        error: string | null;
        lastDurationMs: number | null;
      }>
    ) => void;
  }
): Promise<StepEvaluationResult> {
  const { setVerification, setScoringFeedback, getFocusedFeedback } = options;

  // Check for cached score
  const cachedScore = handler.getCachedScore(session);
  if (cachedScore) {
    logger.info(`[evaluateStep] Using cached score for ${step}, skipping evaluation`);

    if (getFocusedFeedback) {
      setVerification({ isVerifying: true, result: null, error: null });
      try {
        const iterativeCoverage = await getFocusedFeedback(step, session);
        setVerification({ isVerifying: false, result: null, error: null });

        if (iterativeCoverage?.ui.blocking) {
          return { canProceed: false, isPending: false, feedback: null };
        }

        if (iterativeCoverage) {
          return { canProceed: false, isPending: false, feedback: null };
        }
      } catch (error) {
        logger.error(`Error getting ${step} cached coverage:`, error);
        setVerification({ isVerifying: false, result: null, error: null });
      }
    }

    if (cachedScore.blocking.length > 0) {
      return { canProceed: false, isPending: false, feedback: cachedScore };
    }
    return { canProceed: false, isPending: false, feedback: cachedScore };
  }

  // Get iterative feedback first
  let iterativeCoverage: IterativeFeedbackResult | null = null;
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

  // Run scoring
  setVerification({ isVerifying: true, result: null, error: null });
  const result = await handler.score(session);
  setVerification({ isVerifying: false, result: null, error: null });

  if (!result) {
    return { canProceed: false, isPending: false, feedback: null };
  }

  // Convert IterativeFeedbackResult to FeedbackResult if needed
  // (This helper is only used for steps that return FeedbackResult, not highLevelDesign)
  let feedbackResult: FeedbackResult;
  if ("coverage" in result) {
    // It's an IterativeFeedbackResult, convert it
    feedbackResult = iterativeToFeedbackResult(result);
  } else {
    // It's already a FeedbackResult
    feedbackResult = result;
  }

  // Merge with iterative feedback if available
  let alignedResult = feedbackResult;
  if (iterativeCoverage && !iterativeCoverage.ui.blocking) {
    alignedResult = mergeIterativeScore(feedbackResult, iterativeCoverage);
    session.setStepScore(step as keyof PracticeStepScores, alignedResult);
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

  setScoringFeedback(alignedResult);
  session.setStepScore(step as keyof PracticeStepScores, alignedResult);

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
 * STEP HANDLERS - Each step defines its own scoring and evaluation logic
 * Follows Open/Closed Principle - add new steps by adding entries here
 */
const STEP_HANDLERS: Record<PracticeStep, StepHandler> = {
  functional: {
    score: async (session) => {
      const config = await loadScoringConfig(session.state.slug);
      if (!config) {
        logger.error(`Scoring config not found for slug: ${session.state.slug}`);
        return null;
      }
      const result = await scoreFunctionalRequirements(
        {
          functionalSummary: session.state.requirements.functionalSummary,
          selectedRequirements: session.state.requirements.functional,
        },
        config,
        session.state.slug
      );
      session.setStepScore("functional", result);
      return result;
    },
    evaluate: (session, options) =>
      evaluateIterativeStepHelper("functional", session, STEP_HANDLERS.functional, options),
    getCachedScore: (session) => session.state.scores?.functional,
  },

  nonFunctional: {
    score: async (session) => {
      const config = await loadScoringConfig(session.state.slug);
      if (!config) {
        logger.error(`Scoring config not found for slug: ${session.state.slug}`);
        return null;
      }
      const result = await scoreNonFunctionalRequirements(
        {
          readRps: session.state.requirements.nonFunctional.readRps,
          writeRps: session.state.requirements.nonFunctional.writeRps,
          p95RedirectMs: session.state.requirements.nonFunctional.p95RedirectMs,
          availability: session.state.requirements.nonFunctional.availability,
          rateLimitNotes: session.state.requirements.nonFunctional.rateLimitNotes,
          notes: session.state.requirements.nonFunctional.notes,
          functionalRequirements: session.state.requirements.functional,
        },
        config,
        session.state.slug
      );
      session.setStepScore("nonFunctional", result);
      return result;
    },
    evaluate: (session, options) =>
      evaluateIterativeStepHelper("nonFunctional", session, STEP_HANDLERS.nonFunctional, options),
    getCachedScore: (session) => session.state.scores?.nonFunctional,
  },

  api: {
    score: async (session) => {
      const config = await loadScoringConfig(session.state.slug);
      if (!config) {
        logger.error(`Scoring config not found for slug: ${session.state.slug}`);
        return null;
      }
      const validEndpoints = session.state.apiDefinition.endpoints.filter(
        (ep) => ep.path.trim().length > 0
      );
      const result = await scoreApiDefinition(
        {
          endpoints: validEndpoints,
          functionalRequirements: session.state.requirements.functional,
        },
        config,
        session.state.slug
      );
      session.setStepScore("api", result);
      return result;
    },
    evaluate: (session, options) =>
      evaluateIterativeStepHelper("api", session, STEP_HANDLERS.api, options),
    getCachedScore: (session) => session.state.scores?.api,
  },

  highLevelDesign: {
    score: async (session) => {
      const config = await loadScoringConfig(session.state.slug);
      if (!config) {
        logger.error(`Scoring config not found for slug: ${session.state.slug}`);
        return null;
      }
      const iterativeResult = await scoreHighLevelDesign(
        {
          nodes: session.state.design.nodes,
          edges: session.state.design.edges,
        },
        config,
        session.state.slug
      );
      // Convert to FeedbackResult for session storage (backward compatibility)
      const feedbackResult = iterativeToFeedbackResult(iterativeResult);
      session.setStepScore("design", feedbackResult);
      // Return IterativeFeedbackResult for display
      return iterativeResult;
    },
    evaluate: async (session, options) => {
      const { setScoringFeedback, setIterativeFeedback } = options;

      // Run scoring (returns IterativeFeedbackResult)
      const scoreResult = await STEP_HANDLERS.highLevelDesign.score(session);
      if (!scoreResult) {
        return { canProceed: false, isPending: false, feedback: null };
      }

      // score() returns IterativeFeedbackResult for highLevelDesign
      if (!("coverage" in scoreResult)) {
        // This shouldn't happen, but handle it gracefully
        const feedbackResult = scoreResult as FeedbackResult;
        setScoringFeedback(feedbackResult);
        return { canProceed: false, isPending: true, feedback: feedbackResult };
      }

      const iterativeResult = scoreResult;

      // Store IterativeFeedbackResult for display
      if (setIterativeFeedback) {
        setIterativeFeedback({
          result: iterativeResult,
          isLoading: false,
          error: null,
          lastDurationMs: null,
        });
      }

      // Convert to FeedbackResult for setScoringFeedback (for backward compatibility)
      const feedbackResult = iterativeToFeedbackResult(iterativeResult);
      setScoringFeedback(feedbackResult);

      // Trigger simulation via event bus
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => emit("simulation:run"));
      } else {
        setTimeout(() => emit("simulation:run"), 0);
      }

      return { canProceed: false, isPending: true, feedback: feedbackResult };
    },
    getCachedScore: (session) => session.state.scores?.design,
  },

  score: {
    score: async () => null,
    evaluate: async () => ({ canProceed: true, isPending: false, feedback: null }),
    getCachedScore: () => undefined,
  },
};

/**
 * Main hook - combines scoring and evaluation in one place
 */
export function useStepEvaluation(
  session: PracticeSessionValue,
  getFocusedFeedback?: (
    currentStep: PracticeStep,
    session: PracticeSessionValue,
    additionalContext?: string
  ) => Promise<IterativeFeedbackResult | null>,
  setIterativeFeedback?: (
    state: Partial<{
      result: IterativeFeedbackResult | null;
      isLoading: boolean;
      error: string | null;
      lastDurationMs: number | null;
    }>
  ) => void
) {
  const [verification, setVerification] = useState<VerificationState>({
    isVerifying: false,
    result: null,
    error: null,
  });
  const [scoringFeedback, setScoringFeedback] = useState<FeedbackResult | null>(null);

  const evaluateStep = useCallback(
    async (step: PracticeStep): Promise<StepEvaluationResult> => {
      const handler = STEP_HANDLERS[step];
      if (!handler) {
        logger.warn(`[evaluateStep] No handler found for step: ${step}`);
        return { canProceed: true, isPending: false, feedback: null };
      }

      return handler.evaluate(session, {
        setVerification,
        setScoringFeedback,
        getFocusedFeedback,
        setIterativeFeedback,
      });
    },
    [session, getFocusedFeedback, setIterativeFeedback]
  );

  // Expose scoring function for direct access if needed
  const scoreStep = useCallback(
    async (step: PracticeStep): Promise<FeedbackResult | null> => {
      const handler = STEP_HANDLERS[step];
      if (!handler) {
        logger.warn(`[scoreStep] No handler found for step: ${step}`);
        return null;
      }
      const result = await handler.score(session);
      if (!result) {
        return null;
      }
      // Convert IterativeFeedbackResult to FeedbackResult if needed
      if ("coverage" in result) {
        return iterativeToFeedbackResult(result);
      }
      return result;
    },
    [session]
  );

  const clearScoring = useCallback(() => {
    setScoringFeedback(null);
  }, []);

  const clearVerification = useCallback(() => {
    setVerification({ isVerifying: false, result: null, error: null });
  }, []);

  return {
    // State
    verification,
    setVerification,
    scoringFeedback,
    setScoringFeedback,
    // Functions
    evaluateStep,
    scoreStep,
    // Clear functions
    clearScoring,
    clearVerification,
  };
}

// VerificationState is now defined in this file
