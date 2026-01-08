import { useState, useCallback } from "react";
import type { PracticeStep } from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { ProgressStep } from "@/lib/scoring/ai/progress";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import {
  scoreFunctionalRequirements,
  scoreNonFunctionalRequirements,
  scoreApiDefinition,
  loadScoringConfig,
} from "@/lib/scoring/index";
import { logger } from "@/lib/logger";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

export type VerificationState = {
  isVerifying: boolean;
  result: { canProceed: boolean; blocking: string[]; warnings: string[] } | null;
  error: string | null;
};

export function usePracticeScoring() {
  const [verification, setVerification] = useState<VerificationState>({
    isVerifying: false,
    result: null,
    error: null,
  });
  const [scoringProgressSteps, setScoringProgressSteps] = useState<ProgressStep[]>([]);
  const [scoringFeedback, setScoringFeedback] = useState<FeedbackResult | null>(null);

  const evaluateCurrentStep = async (
    currentStep: PracticeStep,
    session: PracticeSessionValue
  ): Promise<FeedbackResult | null> => {
    setScoringProgressSteps([]);
    setScoringFeedback(null);

    try {
      const config = await loadScoringConfig(session.state.slug);
      let result: FeedbackResult;

      switch (currentStep) {
        case "functional": {
          result = await scoreFunctionalRequirements(
            {
              functionalSummary: session.state.requirements.functionalSummary,
              selectedRequirements: session.state.requirements.functional,
            },
            config,
            session.state.slug
          );
          break;
        }

        case "nonFunctional": {
          result = await scoreNonFunctionalRequirements(
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
          break;
        }

        case "api": {
          // Filter out empty placeholder endpoints before scoring
          const validEndpoints = session.state.apiDefinition.endpoints.filter(
            (ep) => ep.path.trim().length > 0
          );

          result = await scoreApiDefinition(
            {
              endpoints: validEndpoints,
              functionalRequirements: session.state.requirements.functional,
            },
            config,
            session.state.slug
          );
          break;
        }

        case "highLevelDesign": {
          // For sandbox, we don't evaluate design here - we check simulation results
          // Design scoring happens during simulation
          return null;
        }

        default:
          return null;
      }

      setScoringFeedback(result);
      session.setStepScore(currentStep as "functional" | "nonFunctional" | "api", result);
      return result;
    } catch (error) {
      logger.error("Scoring evaluation failed:", error);
      return null;
    } finally {
      setScoringProgressSteps([]);
    }
  };

  const clearScoring = useCallback(() => {
    setScoringFeedback(null);
    setScoringProgressSteps([]);
  }, []);

  const clearVerification = useCallback(() => {
    setVerification({ isVerifying: false, result: null, error: null });
  }, []);

  return {
    verification,
    setVerification,
    scoringProgressSteps,
    scoringFeedback,
    setScoringFeedback,
    evaluateCurrentStep,
    clearScoring,
    clearVerification,
  };
}
