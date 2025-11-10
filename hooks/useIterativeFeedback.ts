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
      if (currentStep !== "functional" && currentStep !== "nonFunctional" && currentStep !== "api") {
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

        const stepKey = currentStep === "functional" ? "functional"
          : currentStep === "nonFunctional" ? "nonFunctional"
          : "api";
        const stepFeedback = currentStep === "functional"
          ? feedback.functional
          : currentStep === "nonFunctional"
          ? feedback.nonFunctional
          : feedback.api;

        const userContent = currentStep === "functional"
          ? session.state.requirements.functionalSummary
          : currentStep === "nonFunctional"
          ? session.state.requirements.nonFunctional.notes
          : session.state.apiDefinition.endpoints.map(ep =>
              `${ep.method} ${ep.path}: ${ep.notes}`
            ).join("\n\n");

        // Get fresh feedback from API
        const feedbackResponse = await fetch("/api/iterative-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_feedback",
            stepId: stepKey,
            userContent,
            previousQuestion: stepFeedback.currentQuestion,
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

        // Update session with new question and content
        session.updateIterativeFeedback(stepKey as "functional" | "nonFunctional" | "api", (prev) => ({
          ...prev,
          lastContent: userContent,
          currentQuestion: result.nextQuestion?.question ?? null,
        }));

        const durationMs = getNow() - startedAt;
        setState({ isLoading: false, result, error: null, lastDurationMs: durationMs });

        logger.info("Iterative feedback completed", {
          durationMs: Math.round(durationMs),
          blocking: result.ui.blocking,
          nextTopic: result.nextQuestion?.topicId ?? null,
        });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get iterative feedback";
        logger.error("Iterative feedback failed:", error);
        const durationMs = getNow() - startedAt;
        setState({ isLoading: false, result: null, error: errorMessage, lastDurationMs: durationMs });
        return null;
      }
    },
    []
  );

  /**
   * Reset feedback progress for a specific step or all steps
   */
  const resetFeedback = useCallback(
    (session: PracticeSessionValue, step?: PracticeStep) => {
      if (step && ["functional", "nonFunctional", "api", "sandbox"].includes(step)) {
        const stepKey = step === "sandbox" ? "design" : step;
        session.resetIterativeFeedback(stepKey as "functional" | "nonFunctional" | "api" | "design");
      } else {
        session.resetIterativeFeedback();
      }
      setState({ isLoading: false, result: null, error: null, lastDurationMs: null });
    },
    []
  );

  /**
   * Clear current state without resetting session
   */
  const clearState = useCallback(() => {
    setState({ isLoading: false, result: null, error: null, lastDurationMs: null });
  }, []);

  return {
    state,
    getFocusedFeedback,
    resetFeedback,
    clearState,
  };
}
