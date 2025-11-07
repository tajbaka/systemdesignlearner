import { useState, useEffect } from "react";
import type { FeedbackResult } from "@/lib/scoring/types";
import type { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";

type PracticeSessionValue = ReturnType<typeof usePracticeSession>;

type SandboxEvaluationResult = {
  feedback: FeedbackResult;
  canProceed: boolean;
};

/**
 * Builds feedback from simulation results, merging simulation and design scores
 */
function buildSandboxFeedback(
  session: PracticeSessionValue
): SandboxEvaluationResult | null {
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
      warnings: warnings.map(msg => ({
        message: msg,
        category: "performance" as const,
        severity: "warning" as const
      })),
      positive: [],
      suggestions: suggestions.map(msg => ({
        message: msg,
        category: "bestPractice" as const,
        severity: "info" as const
      })),
    };

    // Filter out AI feedback that contradicts rule-based acceptance criteria
    const acceptanceResults = result.acceptanceResults || {};
    const cachePresent = acceptanceResults["cache-present"] === true;
    const lbPresent = acceptanceResults["lb-service"] === true;
    const analyticsPresent = acceptanceResults["analytics"] === true;

    const filteredDesignBlocking = designScore.blocking.filter(b => {
      // Remove cache-related warnings if cache is actually present
      if (cachePresent && (b.relatedTo === "cache-aside" || b.relatedTo === "Cache (Redis)")) {
        console.log("[useSandboxEvaluation] Filtering out cache warning since cache is present:", b.message);
        return false;
      }
      // Remove LB-related warnings if LB is actually present
      if (lbPresent && (b.relatedTo === "Load Balancer" || b.relatedTo === "API Gateway")) {
        console.log("[useSandboxEvaluation] Filtering out LB warning since LB is present:", b.message);
        return false;
      }
      // Remove analytics warnings if analytics is actually present
      if (analyticsPresent && (b.relatedTo === "analytics" || b.relatedTo === "Message Queue (Kafka Topic)")) {
        console.log("[useSandboxEvaluation] Filtering out analytics warning since analytics is present:", b.message);
        return false;
      }
      return true;
    });

    // Also filter warnings
    const filteredDesignWarnings = designScore.warnings.filter(w => {
      if (cachePresent && (w.relatedTo === "cache-aside" || w.relatedTo === "Cache (Redis)")) {
        console.log("[useSandboxEvaluation] Filtering out cache warning since cache is present:", w.message);
        return false;
      }
      if (lbPresent && (w.relatedTo === "Load Balancer" || w.relatedTo === "API Gateway")) {
        console.log("[useSandboxEvaluation] Filtering out LB warning since LB is present:", w.message);
        return false;
      }
      if (analyticsPresent && (w.relatedTo === "analytics" || w.relatedTo === "Message Queue (Kafka Topic)")) {
        console.log("[useSandboxEvaluation] Filtering out analytics warning since analytics is present:", w.message);
        return false;
      }
      return true;
    });

    console.log("[useSandboxEvaluation] After filtering - filteredDesignBlocking:", filteredDesignBlocking);
    console.log("[useSandboxEvaluation] After filtering - filteredDesignWarnings:", filteredDesignWarnings);
    console.log("[useSandboxEvaluation] Simulation warnings:", simulationFeedback.warnings);

    const mergedFeedback: FeedbackResult = {
      score: designScore.score,
      maxScore: designScore.maxScore,
      percentage: designScore.percentage,
      blocking: [], // No blocking - allow continue
      warnings: [
        ...simulationFeedback.warnings,
        ...filteredDesignBlocking.map(b => ({ ...b, severity: "warning" as const })), // Convert blocking to warnings
        ...filteredDesignWarnings
      ],
      positive: designScore.positive,
      suggestions: [...simulationFeedback.suggestions, ...designScore.suggestions.slice(0, 2)],
    };

    return { feedback: mergedFeedback, canProceed: true };
  } else {
    // Passed - show design feedback
    return { feedback: designScore, canProceed: true };
  }
}

export function useSandboxEvaluation(
  session: PracticeSessionValue,
  currentStep: string,
  setScoringFeedback: (feedback: FeedbackResult | null) => void,
  setVerification: (state: { isVerifying: boolean; result: any; error: string | null }) => void
) {
  const [waitingForSimulation, setWaitingForSimulation] = useState(false);

  // Auto-show feedback when simulation completes
  useEffect(() => {
    const lastResult = session.state.run.lastResult ?? null;
    console.log("[useSandboxEvaluation useEffect] Auto-show feedback check:", {
      waitingForSimulation,
      currentStep,
      hasRun: Boolean(lastResult),
      hasDesignScore: session.state.scores?.design !== undefined,
      designScore: session.state.scores?.design
    });

    if (!waitingForSimulation || currentStep !== "sandbox") return;

    const hasRun = Boolean(lastResult);
    const hasDesignScore = session.state.scores?.design !== undefined;

    // Safety timeout: If simulation doesn't complete within 20 seconds, clear waiting state
    // This is a fallback - proper errors should be shown by RunStage
    const timeoutId = setTimeout(() => {
      if (waitingForSimulation) {
        console.log("[useSandboxEvaluation useEffect] Simulation timeout - clearing waiting state");
        setWaitingForSimulation(false);
        // Don't set verification error here - let RunStage handle error display
        setVerification({
          isVerifying: false,
          result: null,
          error: null,
        });
      }
    }, 20000);

    if (hasRun && hasDesignScore) {
      clearTimeout(timeoutId);
      console.log("[useSandboxEvaluation useEffect] Building merged feedback...");

      const evaluationResult = buildSandboxFeedback(session);
      if (evaluationResult) {
        setScoringFeedback(evaluationResult.feedback);
      }

      // Stop waiting and clear verifying AFTER setting feedback
      console.log("[useSandboxEvaluation useEffect] Clearing waitingForSimulation and verification");
      setWaitingForSimulation(false);
      setVerification({ isVerifying: false, result: null, error: null });
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [waitingForSimulation, session.state.run.lastResult, session.state.scores?.design, session.state.requirements, currentStep, setScoringFeedback, setVerification]);

  return {
    waitingForSimulation,
    setWaitingForSimulation,
    buildSandboxFeedback,
  };
}
