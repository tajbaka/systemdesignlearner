/**
 * Hybrid Scoring Engine
 *
 * Combines fast rule-based scoring with AI-powered semantic understanding.
 * Falls back to pure rules if AI is unavailable.
 */

import type {
  FunctionalScoringInput,
  FunctionalScoringConfig,
  FeedbackResult,
  ApiScoringInput,
  ApiScoringConfig,
  DesignScoringInput,
  DesignScoringConfig,
} from "../types";

import { evaluateFunctionalRequirements } from "../engines/functional";
import { evaluateApiDefinition } from "../engines/api";
import { evaluateDesign } from "../engines/design";

import {
  extractRequirementsWithAI,
  explainScoreWithAI,
  validateAlternativeSolution,
  analyzeApiDesign,
  analyzeArchitecture,
  isAIAvailable,
} from "./gemini";

// Deduplication utilities available but not currently used
// import { deduplicateFeedback, consolidateFeedback, extractUniqueAIInsights, simplifyMessage, groupFeedbackByContext, mergeGroupedFeedback } from "./deduplication";

import type { EvaluationProgress } from "./progress";

/**
 * Enhanced functional requirements evaluation with AI
 */
export async function evaluateFunctionalWithAI(
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

  // Step 1: Run rule-based scoring (always fast)
  progress?.start(0, "Running rule-based analysis...");
  const ruleBasedResult = evaluateFunctionalRequirements(input, config);
  progress?.complete(0, "Rule-based complete");

  if (!useAI) {
    return ruleBasedResult;
  }

  try {
    // Step 2: Use AI to extract requirements from text
    const allRequirements = [
      ...config.coreRequirements.map((r) => ({
        id: r.id,
        label: r.label,
        description: r.description,
      })),
      ...config.optionalRequirements.map((r) => ({
        id: r.id,
        label: r.label,
        description: r.description,
      })),
    ];

    const aiExtracted = await extractRequirementsWithAI(input.functionalSummary, allRequirements);

    // Step 3: Combine rule-based + AI results
    let enhancedScore = ruleBasedResult.score;
    const enhancedPositive = [...ruleBasedResult.positive];
    const enhancedBlocking = [...ruleBasedResult.blocking];
    const enhancedWarnings = [...ruleBasedResult.warnings];

    // Check for requirements that rules missed but AI found
    for (const [reqId, aiFound] of Object.entries(aiExtracted)) {
      const ruleFound = input.selectedRequirements[reqId] === true;
      const requirement = [...config.coreRequirements, ...config.optionalRequirements].find(
        (r) => r.id === reqId
      );

      if (!requirement) continue;

      // AI found it but rules didn't - validate with AI
      if (aiFound && !ruleFound) {
        const validation = await validateAlternativeSolution(
          input.functionalSummary,
          {
            id: requirement.id,
            label: requirement.label,
            description: requirement.description,
            keywords: requirement.keywords,
          },
          "Functional Requirements Step"
        );

        if (validation.isValid && validation.confidence > 0.7) {
          // Give credit for creative solution
          enhancedScore += requirement.weight * validation.confidence;
          enhancedPositive.push({
            category: "requirement",
            severity: "positive",
            message: `✓ ${requirement.label} (detected via AI): ${validation.reasoning}`,
            relatedTo: requirement.id,
          });

          // Remove blocking if it existed
          const blockingIndex = enhancedBlocking.findIndex((b) => b.relatedTo === requirement.id);
          if (blockingIndex >= 0) {
            enhancedBlocking.splice(blockingIndex, 1);
          }
        }
      }
    }

    // Step 4: Generate natural language explanation
    let aiExplanation: string | undefined;
    if (options.explainScore) {
      aiExplanation = await explainScoreWithAI(
        { functionalSummary: input.functionalSummary },
        enhancedScore,
        config.maxScore,
        [
          ...enhancedBlocking.map((f) => ({ message: f.message, severity: f.severity })),
          ...enhancedWarnings.map((f) => ({ message: f.message, severity: f.severity })),
          ...enhancedPositive.map((f) => ({ message: f.message, severity: f.severity })),
        ],
        "Functional Requirements"
      );
    }

    return {
      score: Math.min(enhancedScore, config.maxScore), // Cap at max
      maxScore: config.maxScore,
      percentage: (Math.min(enhancedScore, config.maxScore) / config.maxScore) * 100,
      blocking: enhancedBlocking,
      warnings: enhancedWarnings,
      positive: enhancedPositive,
      suggestions: ruleBasedResult.suggestions,
      aiExplanation,
      aiEnhanced: true,
    };
  } catch (error) {
    console.error("AI enhancement failed, falling back to rule-based:", error);
    return ruleBasedResult;
  }
}

/**
 * Enhanced API evaluation with AI analysis
 */
export async function evaluateApiWithAI(
  input: ApiScoringInput,
  config: ApiScoringConfig,
  options: {
    useAI?: boolean;
    explainScore?: boolean;
  } = {}
): Promise<FeedbackResult & { aiExplanation?: string; aiEnhanced?: boolean; aiAnalysis?: unknown }> {
  const useAI = options.useAI !== false && isAIAvailable();

  // Step 1: Run rule-based scoring
  const ruleBasedResult = evaluateApiDefinition(input, config);

  if (!useAI) {
    return ruleBasedResult;
  }

  try {
    // Step 2: AI analysis of API design
    const functionalReqList = Object.entries(input.functionalRequirements)
      .filter(([_, v]) => v)
      .map(([k, _]) => k);

    const aiAnalysis = await analyzeApiDesign(input.endpoints, functionalReqList);

    // Step 3: Blend AI insights with rule-based results
    const enhancedPositive = [...ruleBasedResult.positive];
    const enhancedSuggestions = [...ruleBasedResult.suggestions];

    // Add AI-detected strengths
    for (const strength of aiAnalysis.strengths) {
      if (!enhancedPositive.some((p) => p.message.includes(strength.substring(0, 20)))) {
        enhancedPositive.push({
          category: "architecture",
          severity: "positive",
          message: `✓ ${strength} (AI detected)`,
        });
      }
    }

    // Add AI suggestions
    for (const suggestion of aiAnalysis.suggestions) {
      enhancedSuggestions.push({
        category: "architecture",
        severity: "info",
        message: `💡 ${suggestion}`,
      });
    }

    // Step 4: Generate explanation
    let aiExplanation: string | undefined;
    if (options.explainScore) {
      aiExplanation = await explainScoreWithAI(
        { endpoints: input.endpoints },
        ruleBasedResult.score,
        config.maxScore,
        [
          ...ruleBasedResult.blocking.map((f) => ({ message: f.message, severity: f.severity })),
          ...ruleBasedResult.warnings.map((f) => ({ message: f.message, severity: f.severity })),
          ...enhancedPositive.map((f) => ({ message: f.message, severity: f.severity })),
        ],
        "API Definition"
      );
    }

    return {
      ...ruleBasedResult,
      positive: enhancedPositive,
      suggestions: enhancedSuggestions,
      aiExplanation,
      aiEnhanced: true,
      aiAnalysis,
    };
  } catch (error) {
    console.error("AI enhancement failed for API:", error);
    return ruleBasedResult;
  }
}

/**
 * Enhanced design evaluation with AI architecture analysis
 */
export async function evaluateDesignWithAI(
  input: DesignScoringInput,
  config: DesignScoringConfig,
  options: {
    useAI?: boolean;
    explainScore?: boolean;
  } = {}
): Promise<FeedbackResult & { aiExplanation?: string; aiEnhanced?: boolean; aiAnalysis?: unknown }> {
  const useAI = options.useAI !== false && isAIAvailable();

  // Step 1: Run rule-based scoring
  const ruleBasedResult = evaluateDesign(input, config);

  if (!useAI) {
    return ruleBasedResult;
  }

  try {
    // Step 2: AI architecture analysis
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

    const aiAnalysis = await analyzeArchitecture(components, connections, {
      functional: functionalReqList,
      readRps: input.nfrValues.readRps,
      writeRps: input.nfrValues.writeRps,
      latency: input.nfrValues.p95RedirectMs,
    });

    // Step 3: Enhance feedback with AI insights
    const enhancedPositive = [...ruleBasedResult.positive];
    const enhancedWarnings = [...ruleBasedResult.warnings];
    const enhancedSuggestions = [...ruleBasedResult.suggestions];

    // Add AI-detected patterns
    for (const pattern of aiAnalysis.patterns) {
      enhancedPositive.push({
        category: "architecture",
        severity: "positive",
        message: `✓ ${pattern} (AI detected)`,
      });
    }

    // Add AI-detected anti-patterns
    for (const antiPattern of aiAnalysis.antiPatterns) {
      enhancedWarnings.push({
        category: "architecture",
        severity: "warning",
        message: `⚠️ ${antiPattern}`,
      });
    }

    // Add scalability concerns
    for (const concern of aiAnalysis.scalabilityConcerns) {
      enhancedWarnings.push({
        category: "performance",
        severity: "warning",
        message: `📊 ${concern}`,
      });
    }

    // Add recommendations
    for (const rec of aiAnalysis.recommendations) {
      enhancedSuggestions.push({
        category: "architecture",
        severity: "info",
        message: `💡 ${rec}`,
      });
    }

    // Step 4: Generate explanation
    let aiExplanation: string | undefined;
    if (options.explainScore) {
      aiExplanation = await explainScoreWithAI(
        {
          designComponents: components.map((c) => `${c.kind} (x${c.replicas})`),
        },
        ruleBasedResult.score,
        config.maxScore,
        [
          ...ruleBasedResult.blocking.map((f) => ({ message: f.message, severity: f.severity })),
          ...enhancedWarnings.map((f) => ({ message: f.message, severity: f.severity })),
          ...enhancedPositive.map((f) => ({ message: f.message, severity: f.severity })),
        ],
        "High-Level Design"
      );
    }

    return {
      ...ruleBasedResult,
      positive: enhancedPositive,
      warnings: enhancedWarnings,
      suggestions: enhancedSuggestions,
      aiExplanation,
      aiEnhanced: true,
      aiAnalysis,
    };
  } catch (error) {
    console.error("AI enhancement failed for design:", error);
    return ruleBasedResult;
  }
}

/**
 * Batch explain multiple step results
 */
export async function explainOverallScore(
  results: {
    functional?: FeedbackResult;
    nonFunctional?: FeedbackResult;
    api?: FeedbackResult;
    design?: FeedbackResult;
    simulation?: FeedbackResult;
  },
  totalScore: number,
  grade: string
): Promise<string> {
  if (!isAIAvailable()) {
    return `You scored ${totalScore}/100 (Grade ${grade}). Review the feedback for each step to improve your solution.`;
  }

  try {
    const allFeedback = Object.entries(results)
      .filter(([_, result]) => result)
      .map(([step, result]) => ({
        step,
        score: result!.score,
        maxScore: result!.maxScore,
        feedback: [
          ...result!.blocking.map((f) => f.message),
          ...result!.warnings.map((f) => f.message),
          ...result!.positive.map((f) => f.message),
        ],
      }));

    return await explainScoreWithAI(
      {},
      totalScore,
      100,
      allFeedback.flatMap((f) => f.feedback.map((msg) => ({ message: msg, severity: "info" }))),
      "Overall Practice Session"
    );
  } catch (error) {
    console.error("Error explaining overall score:", error);
    return `You scored ${totalScore}/100 (Grade ${grade}). Great effort! Review the feedback for each step.`;
  }
}
