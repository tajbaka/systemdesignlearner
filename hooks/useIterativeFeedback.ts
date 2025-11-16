import { useState, useCallback } from "react";
import type { PracticeStep } from "@/lib/practice/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { IterativeFeedbackResult } from "@/lib/scoring/ai/iterative";
import { logger } from "@/lib/logger";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

export type IterativeFeedbackState = {
  isLoading: boolean;
  result: IterativeFeedbackResult | null;
  error: string | null;
  lastDurationMs: number | null;
};

export function useIterativeFeedback() {
  const [state, setState] = useState<IterativeFeedbackState>({
    isLoading: false,
    result: null,
    error: null,
    lastDurationMs: null,
  });

  /**
   * Get focused feedback for the current step
   */
  const getFocusedFeedback = useCallback(
    async (
      currentStep: PracticeStep,
      session: PracticeSessionValue,
      _additionalContext?: string
    ): Promise<IterativeFeedbackResult | null> => {
      // Only run for steps that currently support the Gemini iterative loop
      if (
        currentStep !== "functional" &&
        currentStep !== "nonFunctional" &&
        currentStep !== "api"
      ) {
        return null;
      }

      setState({ isLoading: true, result: null, error: null, lastDurationMs: null });

      const getNow = () => {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
          return performance.now();
        }
        return Date.now();
      };
      const startedAt = getNow();

      try {
        const feedback = session.state.iterativeFeedback;
        if (!feedback) {
          throw new Error("Iterative feedback state not initialized");
        }

        const stepKey =
          currentStep === "functional"
            ? "functional"
            : currentStep === "nonFunctional"
              ? "nonFunctional"
              : "api";
        const stepFeedback =
          currentStep === "functional"
            ? feedback.functional
            : currentStep === "nonFunctional"
              ? feedback.nonFunctional
              : feedback.api;

        const userContent =
          currentStep === "functional"
            ? session.state.requirements.functionalSummary
            : currentStep === "nonFunctional"
              ? session.state.requirements.nonFunctional.notes
              : session.state.apiDefinition.endpoints
                  .map((ep) => `${ep.method} ${ep.path}: ${ep.notes}`)
                  .join("\n\n");

        // Check if we have a cached result for unchanged content
        if (stepFeedback.lastContent === userContent && stepFeedback.cachedResult) {
          logger.info("[useIterativeFeedback] Using cached result, content unchanged");
          const durationMs = getNow() - startedAt;
          setState({
            isLoading: false,
            result: stepFeedback.cachedResult,
            error: null,
            lastDurationMs: durationMs,
          });
          return stepFeedback.cachedResult;
        }

        // Track attempt count: increment if content changed but still working on same topic
        const currentAttemptCount = stepFeedback.attemptCount ?? 0;
        const isSameTopic = stepFeedback.lastContent && stepFeedback.currentQuestion;
        const newAttemptCount = isSameTopic ? currentAttemptCount + 1 : 1;

        // Get fresh feedback from API
        const feedbackResponse = await fetch("/api/iterative-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_feedback",
            stepId: stepKey,
            userContent,
            previousQuestion: stepFeedback.currentQuestion,
            attemptCount: newAttemptCount,
          }),
        });

        if (!feedbackResponse.ok) {
          let errorMessage = "Failed to get iterative feedback";
          try {
            const payload = await feedbackResponse.json();
            if (payload?.error) {
              errorMessage = String(payload.error);
            }
          } catch {
            // ignore JSON parse issues
          }
          throw new Error(errorMessage);
        }

        const result: IterativeFeedbackResult = await feedbackResponse.json();

        // Update session with new question, content, cached result, and attempt count
        // Reset attempt count if topic resolved (no blocking issues)
        session.updateIterativeFeedback(
          stepKey as "functional" | "nonFunctional" | "api",
          (prev) => ({
            ...prev,
            lastContent: userContent,
            currentQuestion: result.nextQuestion?.question ?? null,
            cachedResult: result, // Cache the result for instant display next time
            attemptCount: result.ui.blocking ? newAttemptCount : 0, // Reset if not blocking
          })
        );

        const durationMs = getNow() - startedAt;
        setState({ isLoading: false, result, error: null, lastDurationMs: durationMs });

        logger.info("Iterative feedback completed", {
          durationMs: Math.round(durationMs),
          blocking: result.ui.blocking,
          nextTopic: result.nextQuestion?.topicId ?? null,
        });
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get iterative feedback";
        logger.error("Iterative feedback failed:", error);
        const durationMs = getNow() - startedAt;
        setState({
          isLoading: false,
          result: null,
          error: errorMessage,
          lastDurationMs: durationMs,
        });
        return null;
      }
    },
    []
  );

  /**
   * Reset feedback progress for a specific step or all steps
   */
  const resetFeedback = useCallback((session: PracticeSessionValue, step?: PracticeStep) => {
    if (step && ["functional", "nonFunctional", "api", "sandbox"].includes(step)) {
      const stepKey = step === "sandbox" ? "design" : step;
      session.resetIterativeFeedback(stepKey as "functional" | "nonFunctional" | "api" | "design");
    } else {
      session.resetIterativeFeedback();
    }
    setState({ isLoading: false, result: null, error: null, lastDurationMs: null });
  }, []);

  /**
   * Clear current state without resetting session
   */
  const clearState = useCallback(() => {
    setState({ isLoading: false, result: null, error: null, lastDurationMs: null });
  }, []);

  /**
   * Set iterative feedback state directly (for sandbox design scoring)
   */
  const setFeedbackState = useCallback((newState: Partial<IterativeFeedbackState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  }, []);

  return {
    state,
    getFocusedFeedback,
    resetFeedback,
    clearState,
    setFeedbackState,
  };
}
