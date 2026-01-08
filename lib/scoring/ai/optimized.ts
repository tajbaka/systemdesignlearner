/**
 * Optimized Design Evaluation
 *
 * Enhanced design evaluation with AI-powered architecture analysis.
 * Only design evaluation uses this optimized approach; functional/API use AI-only.
 */

import type { DesignScoringInput, DesignScoringConfig, FeedbackResult } from "../types";

import { evaluateDesign } from "../engines/design";

import { explainScoreWithAI, analyzeArchitecture, isAIAvailable } from "./gemini";

import { deduplicateFeedback } from "./deduplication";

import type { EvaluationProgress } from "./progress";

/**
 * Optimized design evaluation
 * Runs rule-based + AI architecture analysis in parallel
 */
export async function evaluateDesignOptimized(
  input: DesignScoringInput,
  config: DesignScoringConfig,
  options: {
    useAI?: boolean;
    explainScore?: boolean;
    progress?: EvaluationProgress;
  } = {}
): Promise<FeedbackResult & { aiExplanation?: string; aiEnhanced?: boolean }> {
  const useAI = options.useAI !== false && isAIAvailable();
  const progress = options.progress;

  progress?.start(0, "Analyzing architecture...");

  if (!useAI) {
    const result = evaluateDesign(input, config);
    progress?.complete(0);
    return result;
  }

  try {
    const functionalReqList = Object.entries(input.functionalRequirements)
      .filter(([_, v]) => v)
      .map(([k, _]) => k);

    const components = input.nodes.map((n) => ({
      kind: n.spec.kind,
      replicas: n.replicas || 1,
    }));

    const connections = input.edges.map((e) => {
      const fromNode = input.nodes.find((n) => n.id === e.from);
      const toNode = input.nodes.find((n) => n.id === e.to);
      return {
        from: fromNode?.spec.kind || e.from,
        to: toNode?.spec.kind || e.to,
      };
    });

    // Run rule-based and AI in parallel
    const [ruleBasedResult, aiAnalysis] = await Promise.all([
      Promise.resolve(evaluateDesign(input, config)),
      analyzeArchitecture(components, connections, {
        functional: functionalReqList,
        readRps: input.nfrValues.readRps,
        writeRps: input.nfrValues.writeRps,
        latency: input.nfrValues.p95RedirectMs,
      }),
    ]);

    progress?.update(0, 85, "Processing insights...");

    // Deduplicate all feedback
    const allFeedback = deduplicateFeedback([
      ...ruleBasedResult.blocking,
      ...ruleBasedResult.warnings,
      ...ruleBasedResult.positive,
    ]);

    const blocking = allFeedback.filter((f) => f.severity === "blocking").slice(0, 3);
    const warnings = allFeedback.filter((f) => f.severity === "warning").slice(0, 3);
    const positive = allFeedback.filter((f) => f.severity === "positive").slice(0, 3);

    // Add top AI recommendations as suggestions
    const suggestions = aiAnalysis.recommendations.slice(0, 2).map((rec) => ({
      category: "architecture" as const,
      severity: "info" as const,
      message: `💡 ${rec}`,
    }));

    progress?.complete(0, "Design analysis complete!");

    // Optional explanation
    let aiExplanation: string | undefined;
    if (options.explainScore) {
      progress?.start(1, "Generating insights...");
      aiExplanation = await explainScoreWithAI(
        { designComponents: components.map((c) => `${c.kind} (x${c.replicas})`) },
        ruleBasedResult.score,
        config.maxScore,
        allFeedback.map((f) => ({ message: f.message, severity: f.severity })),
        "High-Level Design"
      );
      progress?.complete(1);
    }

    return {
      score: ruleBasedResult.score,
      maxScore: config.maxScore,
      percentage: ruleBasedResult.percentage,
      blocking,
      warnings,
      positive,
      suggestions,
      aiExplanation,
      aiEnhanced: true,
    };
  } catch (error) {
    console.error("AI enhancement failed:", error);
    progress?.error(0, "AI failed, using rule-based");
    return evaluateDesign(input, config);
  }
}
