/**
 * Optimized AI Scoring with Parallel Execution & Deduplication
 *
 * Faster evaluation by running AI calls in parallel and removing duplicate feedback.
 */

import type {
  FunctionalScoringInput,
  FunctionalScoringConfig,
  ApiScoringInput,
  ApiScoringConfig,
  DesignScoringInput,
  DesignScoringConfig,
  FeedbackResult,
  FeedbackItem,
} from "../types";

import { evaluateFunctionalRequirements } from "../engines/functional";
import { evaluateApiDefinition } from "../engines/api";
import { evaluateDesign } from "../engines/design";

import {
  extractRequirementsWithAI,
  explainScoreWithAI,
  analyzeApiDesign,
  analyzeArchitecture,
  isAIAvailable,
} from "./gemini";

import {
  deduplicateFeedback,
  simplifyMessage,
  groupFeedbackByContext,
  mergeGroupedFeedback,
} from "./deduplication";

import type { EvaluationProgress } from "./progress";

/**
 * Optimized functional requirements evaluation
 * Runs rule-based + AI extraction in parallel
 */
export async function evaluateFunctionalOptimized(
  input: FunctionalScoringInput,
  config: FunctionalScoringConfig,
  options: {
    useAI?: boolean;
    explainScore?: boolean;
    progress?: EvaluationProgress;
  } = {}
): Promise<FeedbackResult & { aiExplanation?: string; aiEnhanced?: boolean }> {
  const useAI = options.useAI !== false && isAIAvailable();
  const progress = options.progress;

  progress?.start(0, "Analyzing requirements...");

  if (!useAI) {
    const result = evaluateFunctionalRequirements(input, config);
    progress?.complete(0);
    return result;
  }

  try {
    const allRequirements = [...config.coreRequirements, ...config.optionalRequirements].map(
      (r) => ({
        id: r.id,
        label: r.label,
        description: r.description,
      })
    );

    // Run rule-based and AI in parallel
    const [ruleBasedResult, aiExtracted] = await Promise.all([
      Promise.resolve(evaluateFunctionalRequirements(input, config)),
      extractRequirementsWithAI(input.functionalSummary, allRequirements),
    ]);

    progress?.update(0, 75, "Processing AI results...");

    // Merge results quickly
    let enhancedScore = ruleBasedResult.score;
    const allFeedback: FeedbackItem[] = [
      ...ruleBasedResult.blocking,
      ...ruleBasedResult.warnings,
      ...ruleBasedResult.positive,
    ];

    // Add AI-detected requirements
    for (const [reqId, aiFound] of Object.entries(aiExtracted)) {
      if (!aiFound) continue;

      const ruleFound = input.selectedRequirements[reqId] === true;
      if (ruleFound) continue; // Already counted

      const requirement = [...config.coreRequirements, ...config.optionalRequirements].find(
        (r) => r.id === reqId
      );

      if (requirement) {
        enhancedScore += requirement.weight * 0.8; // 80% credit for AI-detected
        allFeedback.push({
          category: "requirement",
          severity: "positive",
          message: `✓ ${requirement.label} (AI detected alternative phrasing)`,
          relatedTo: requirement.id,
        });

        // Remove blocking if existed
        const blockingIndex = allFeedback.findIndex(
          (f) => f.severity === "blocking" && f.relatedTo === requirement.id
        );
        if (blockingIndex >= 0) {
          allFeedback.splice(blockingIndex, 1);
        }
      }
    }

    // Deduplicate and simplify feedback
    const deduplicated = deduplicateFeedback(allFeedback);
    const blocking = deduplicated.filter((f) => f.severity === "blocking");
    const warnings = deduplicated.filter((f) => f.severity === "warning");
    const positive = deduplicated.filter((f) => f.severity === "positive");

    progress?.complete(0, "Analysis complete!");

    // Optional: Generate explanation asynchronously (don't block)
    let aiExplanation: string | undefined;
    if (options.explainScore) {
      progress?.start(1, "Generating personalized feedback...");
      aiExplanation = await explainScoreWithAI(
        { functionalSummary: input.functionalSummary },
        enhancedScore,
        config.maxScore,
        deduplicated.map((f) => ({ message: f.message, severity: f.severity })),
        "Functional Requirements"
      );
      progress?.complete(1);
    }

    return {
      score: Math.min(enhancedScore, config.maxScore),
      maxScore: config.maxScore,
      percentage: (Math.min(enhancedScore, config.maxScore) / config.maxScore) * 100,
      blocking,
      warnings,
      positive,
      suggestions: ruleBasedResult.suggestions,
      aiExplanation,
      aiEnhanced: true,
    };
  } catch (error) {
    console.error("AI enhancement failed:", error);
    progress?.error(0, "AI failed, using rule-based");
    return evaluateFunctionalRequirements(input, config);
  }
}

/**
 * Optimized API evaluation
 * Runs rule-based + AI analysis in parallel
 */
export async function evaluateApiOptimized(
  input: ApiScoringInput,
  config: ApiScoringConfig,
  options: {
    useAI?: boolean;
    explainScore?: boolean;
    progress?: EvaluationProgress;
  } = {}
): Promise<FeedbackResult & { aiExplanation?: string; aiEnhanced?: boolean }> {
  const useAI = options.useAI !== false && isAIAvailable();
  const progress = options.progress;

  progress?.start(0, "Analyzing API design...");

  if (!useAI) {
    const result = evaluateApiDefinition(input, config);
    progress?.complete(0);
    return result;
  }

  try {
    const functionalReqList = Object.entries(input.functionalRequirements)
      .filter(([_, v]) => v)
      .map(([k, _]) => k);

    // Run rule-based and AI analysis in parallel
    const [ruleBasedResult, aiAnalysis] = await Promise.all([
      Promise.resolve(evaluateApiDefinition(input, config)),
      analyzeApiDesign(input.endpoints, functionalReqList),
    ]);

    progress?.update(0, 70, "Merging feedback...");

    // Collect all feedback
    const allFeedback: FeedbackItem[] = [
      ...ruleBasedResult.blocking.map((f) => ({ ...f, message: simplifyMessage(f.message) })),
      ...ruleBasedResult.warnings.map((f) => ({ ...f, message: simplifyMessage(f.message) })),
      ...ruleBasedResult.positive.map((f) => ({ ...f, message: simplifyMessage(f.message) })),
    ];

    // Add unique AI insights
    for (const strength of aiAnalysis.strengths) {
      const isDuplicate = allFeedback.some((f) =>
        f.message.toLowerCase().includes(strength.toLowerCase().substring(0, 15))
      );

      if (!isDuplicate) {
        allFeedback.push({
          category: "architecture",
          severity: "positive",
          message: `✓ ${strength}`,
        });
      }
    }

    // Deduplicate and group by endpoint
    const grouped = groupFeedbackByContext(allFeedback);
    const merged = mergeGroupedFeedback(grouped);

    const blocking = merged.filter((f) => f.severity === "blocking");
    const warnings = merged.filter((f) => f.severity === "warning");
    const positive = merged.filter((f) => f.severity === "positive");

    // Limit to top items
    const topBlocking = blocking.slice(0, 3);
    const topWarnings = warnings.slice(0, 3);
    const topPositive = positive.slice(0, 3);

    // Generate improvement path if score is below 100%
    progress?.update(0, 85, "Generating improvement suggestions...");
    let improvementSuggestions: FeedbackItem[] = [];
    const percentage = ruleBasedResult.percentage;

    if (percentage < 100 && percentage >= 40) {
      try {
        const { generateImprovementPath } = await import("./gemini");
        const improvementPath = await generateImprovementPath(
          ruleBasedResult.score,
          config.maxScore,
          input.endpoints,
          {
            positive: topPositive,
            warnings: topWarnings,
            suggestions: aiAnalysis.suggestions.map((s) => ({ message: s })),
          },
          functionalReqList
        );

        improvementSuggestions = [
          ...improvementPath.improvements.map((msg) => ({
            category: "architecture" as const,
            severity: "info" as const,
            message: `📈 ${msg}`,
          })),
          ...improvementPath.examples.map((msg) => ({
            category: "architecture" as const,
            severity: "info" as const,
            message: `💡 ${msg}`,
          })),
        ];
      } catch (error) {
        console.error("Failed to generate improvement path:", error);
      }
    }

    progress?.complete(0, "API analysis complete!");

    // Optional explanation
    let aiExplanation: string | undefined;
    if (options.explainScore) {
      progress?.start(1, "Generating feedback...");
      aiExplanation = await explainScoreWithAI(
        { endpoints: input.endpoints },
        ruleBasedResult.score,
        config.maxScore,
        merged.map((f) => ({ message: f.message, severity: f.severity })),
        "API Definition"
      );
      progress?.complete(1);
    }

    // Combine AI suggestions with improvement path
    const allSuggestions = [
      ...aiAnalysis.suggestions.slice(0, 2).map((s) => ({
        category: "architecture" as const,
        severity: "info" as const,
        message: `💡 ${s}`,
      })),
      ...improvementSuggestions.slice(0, 3), // Top 3 improvement suggestions
    ];

    return {
      score: ruleBasedResult.score,
      maxScore: config.maxScore,
      percentage: ruleBasedResult.percentage,
      blocking: topBlocking,
      warnings: topWarnings,
      positive: topPositive,
      suggestions: allSuggestions,
      aiExplanation,
      aiEnhanced: true,
    };
  } catch (error) {
    console.error("AI enhancement failed:", error);
    progress?.error(0, "AI failed, using rule-based");
    return evaluateApiDefinition(input, config);
  }
}

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
