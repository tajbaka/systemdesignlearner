import { useState, useEffect } from "react";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import type { VerificationState } from "./usePracticeScoring";
import { evaluateDesignGuidance } from "@/lib/practice/designGuidance";

/** Safety timeout for simulation completion - fallback if simulation hangs */
const SIMULATION_COMPLETION_TIMEOUT_MS = 20000;

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

type DesignEvaluationResult = {
  feedback: FeedbackResult;
  canProceed: boolean;
};

/**
 * Builds feedback from simulation results, merging simulation and design scores
 */
function buildDesignFeedback(session: PracticeSessionValue): DesignEvaluationResult | null {
  const result = session.state.run.lastResult;
  const designScore = session.state.scores?.design;

  if (!result || !designScore) {
    return null;
  }

  const hasPassed = result.scoreBreakdown?.outcome === "pass";

  if (!hasPassed) {
    // Build failure feedback - treat as warnings, not blocking
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!result.meetsLatency) {
      warnings.push(
        `Latency too high: Your design has ${result.latencyMsP95.toFixed(0)}ms p95 latency, but the target is ${session.state.requirements.nonFunctional.p95RedirectMs}ms or less.`
      );
      suggestions.push(
        "Consider adding caching layers, CDN for static content, or optimizing database queries."
      );
    }

    if (result.failedByChaos) {
      warnings.push(
        "Your architecture failed under chaos testing. Single points of failure detected."
      );
      suggestions.push(
        "Add redundancy, load balancing, database replication, or failover mechanisms to improve resilience."
      );
    }

    if (result.acceptanceScore !== undefined && result.acceptanceScore < 100) {
      const missingFeatures: string[] = [];
      if (result.acceptanceResults) {
        Object.entries(result.acceptanceResults).forEach(([key, passed]) => {
          if (!passed) {
            missingFeatures.push(key.replace(/-/g, " "));
          }
        });
      }

      if (missingFeatures.length > 0) {
        warnings.push(`Missing requirements: ${missingFeatures.join(", ")}`);
      }
    }

    const simulationFeedback: FeedbackResult = {
      score: result.scoreBreakdown?.totalScore ?? 0,
      maxScore: 30,
      percentage: result.scoreBreakdown?.totalScore ?? 0,
      blocking: [], // No hard blocking - allow continue
      warnings: warnings.map((msg) => ({
        message: msg,
        category: "performance" as const,
        severity: "warning" as const,
      })),
      positive: [],
      suggestions: suggestions.map((msg) => ({
        message: msg,
        category: "bestPractice" as const,
        severity: "info" as const,
      })),
    };

    // Filter out AI feedback that contradicts rule-based acceptance criteria
    const acceptanceResults = result.acceptanceResults || {};
    const cachePresent = acceptanceResults["cache-present"] === true;
    const lbPresent = acceptanceResults["lb-service"] === true;
    const analyticsPresent = acceptanceResults["analytics"] === true;

    const filteredDesignBlocking = designScore.blocking.filter((b) => {
      // Remove cache-related warnings if cache is actually present
      if (cachePresent && (b.relatedTo === "cache-aside" || b.relatedTo === "Cache (Redis)")) {
        return false;
      }
      // Remove LB-related warnings if LB is actually present
      if (lbPresent && (b.relatedTo === "Load Balancer" || b.relatedTo === "API Gateway")) {
        return false;
      }
      // Remove analytics warnings if analytics is actually present
      if (
        analyticsPresent &&
        (b.relatedTo === "analytics" || b.relatedTo === "Message Queue (Kafka Topic)")
      ) {
        return false;
      }
      return true;
    });

    // Also filter warnings
    const filteredDesignWarnings = designScore.warnings.filter((w) => {
      if (cachePresent && (w.relatedTo === "cache-aside" || w.relatedTo === "Cache (Redis)")) {
        return false;
      }
      if (lbPresent && (w.relatedTo === "Load Balancer" || w.relatedTo === "API Gateway")) {
        return false;
      }
      if (
        analyticsPresent &&
        (w.relatedTo === "analytics" || w.relatedTo === "Message Queue (Kafka Topic)")
      ) {
        return false;
      }
      return true;
    });

    const mergedFeedback: FeedbackResult = {
      score: designScore.score,
      maxScore: designScore.maxScore,
      percentage: designScore.percentage,
      blocking: [], // No blocking - allow continue
      warnings: [
        ...simulationFeedback.warnings,
        ...filteredDesignBlocking.map((b) => ({ ...b, severity: "warning" as const })), // Convert blocking to warnings
        ...filteredDesignWarnings,
      ],
      positive: designScore.positive,
      suggestions: [...simulationFeedback.suggestions, ...designScore.suggestions.slice(0, 2)],
      bonus: designScore.bonus,
      totalScore: designScore.totalScore,
      totalMaxScore: designScore.totalMaxScore,
    };

    const bonusGuidance = evaluateDesignGuidance(session.state.design, session.state.slug);
    if (bonusGuidance && bonusGuidance.level === "bonus") {
      mergedFeedback.improvementQuestion = bonusGuidance.question;
      if (!mergedFeedback.warnings.some((warning) => warning.message === bonusGuidance.summary)) {
        mergedFeedback.warnings.push({
          category: "architecture",
          severity: "info",
          message: bonusGuidance.summary,
        });
      }
    }

    return { feedback: mergedFeedback, canProceed: true };
  } else {
    // Passed - show design feedback and optional nudges
    const baseFeedback: FeedbackResult = { ...designScore };
    const bonusGuidance = evaluateDesignGuidance(session.state.design, session.state.slug);
    if (bonusGuidance && bonusGuidance.level === "bonus") {
      baseFeedback.improvementQuestion = bonusGuidance.question;
    }
    return { feedback: baseFeedback, canProceed: true };
  }
}

export function useDesignEvaluation(
  session: PracticeSessionValue,
  currentStep: string,
  setScoringFeedback: (feedback: FeedbackResult | null) => void,
  setVerification: (state: VerificationState) => void
) {
  const [waitingForSimulation, setWaitingForSimulation] = useState(false);

  // Auto-show feedback when simulation completes
  useEffect(() => {
    const lastResult = session.state.run.lastResult ?? null;

    if (!waitingForSimulation || currentStep !== "highLevelDesign") return;

    const hasRun = Boolean(lastResult);
    const hasDesignScore = session.state.scores?.design !== undefined;

    // Safety timeout: If simulation doesn't complete, clear waiting state
    // This is a fallback - proper errors should be shown by RunStage
    const timeoutId = setTimeout(() => {
      if (waitingForSimulation) {
        setWaitingForSimulation(false);
        // Don't set verification error here - let RunStage handle error display
        setVerification({
          isVerifying: false,
          result: null,
          error: null,
        });
      }
    }, SIMULATION_COMPLETION_TIMEOUT_MS);

    if (hasRun && hasDesignScore) {
      clearTimeout(timeoutId);

      const evaluationResult = buildDesignFeedback(session);
      if (evaluationResult) {
        setScoringFeedback(evaluationResult.feedback);
      }

      // Stop waiting and clear verifying AFTER setting feedback
      setWaitingForSimulation(false);
      setVerification({ isVerifying: false, result: null, error: null });
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [
    waitingForSimulation,
    session,
    session.state.run.lastResult,
    session.state.scores?.design,
    session.state.requirements,
    currentStep,
    setScoringFeedback,
    setVerification,
  ]);

  return {
    waitingForSimulation,
    setWaitingForSimulation,
    buildDesignFeedback,
  };
}
