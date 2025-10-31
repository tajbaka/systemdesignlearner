/**
 * API Definition Scoring Engine
 *
 * Evaluates user's API endpoints against optimal design:
 * - Correct HTTP methods
 * - Appropriate path patterns
 * - Documentation quality
 * - Alignment with functional requirements
 */

import type {
  ApiScoringConfig,
  ApiScoringInput,
  FeedbackResult,
  FeedbackItem,
  IScoringEngine,
  ApiEndpointConfig,
  KeywordMatch,
} from "../types";
import type { ApiEndpoint } from "@/lib/practice/types";

export class ApiScoringEngine implements IScoringEngine<ApiScoringInput, ApiScoringConfig> {
  /**
   * Evaluate API definitions
   */
  evaluate(input: ApiScoringInput, config: ApiScoringConfig): FeedbackResult {
    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    const suggestions: FeedbackItem[] = [];

    let score = 0;
    const maxScore = config.maxScore;

    // Track which endpoints were matched
    const matchedRequired = new Set<string>();
    const matchedOptional = new Set<string>();

    // Evaluate required endpoints
    for (const requiredConfig of config.requiredEndpoints) {
      const matchResult = this.findMatchingEndpoint(input.endpoints, requiredConfig);

      if (matchResult.matched) {
        matchedRequired.add(requiredConfig.id);

        // Calculate score for this endpoint
        const endpointScore = this.scoreEndpoint(
          matchResult.endpoint!,
          requiredConfig,
          config.evaluationCriteria
        );

        score += endpointScore.score;

        // Add feedback
        if (endpointScore.perfect) {
          positive.push({
            category: "architecture",
            severity: "positive",
            message: `✓ ${requiredConfig.method} ${requiredConfig.examplePath || requiredConfig.pathPattern}: Well-documented and properly designed.`,
            relatedTo: requiredConfig.id,
          });
        } else {
          // Endpoint exists but has issues
          if (endpointScore.methodIssue) {
            warnings.push({
              category: "architecture",
              severity: "warning",
              message: `Endpoint ${matchResult.endpoint!.path} should use ${requiredConfig.method} method.`,
              relatedTo: requiredConfig.id,
              actionable: `Change method to ${requiredConfig.method}`,
            });
          }

          if (endpointScore.documentationIssue) {
            warnings.push({
              category: "architecture",
              severity: "warning",
              message: `Endpoint ${matchResult.endpoint!.path} needs better documentation.`,
              relatedTo: requiredConfig.id,
              actionable: `Add details about: ${requiredConfig.documentationHints.join(", ")}`,
            });

            if (requiredConfig.exampleNotes) {
              suggestions.push({
                category: "architecture",
                severity: "info",
                message: `Example: "${requiredConfig.exampleNotes}"`,
                relatedTo: requiredConfig.id,
              });
            }
          }
        }
      } else {
        // Required endpoint missing
        const requirementsMet = requiredConfig.requiredBy.every(
          (reqId) => input.functionalRequirements[reqId] === true
        );

        if (requirementsMet || requiredConfig.requiredBy.length === 0) {
          blocking.push({
            category: "requirement",
            severity: "blocking",
            message: `Missing required endpoint: ${requiredConfig.method} ${requiredConfig.examplePath || requiredConfig.pathPattern}`,
            relatedTo: requiredConfig.id,
            actionable: `Add endpoint for: ${requiredConfig.purpose}`,
          });

          if (requiredConfig.examplePath) {
            suggestions.push({
              category: "architecture",
              severity: "info",
              message: `Example path: ${requiredConfig.examplePath}`,
              relatedTo: requiredConfig.id,
            });
          }
        }
      }
    }

    // Evaluate optional endpoints
    for (const optionalConfig of config.optionalEndpoints) {
      // Check if this optional endpoint is required by selected functional requirements
      const requirementsMet = optionalConfig.requiredBy.some(
        (reqId) => input.functionalRequirements[reqId] === true
      );

      const matchResult = this.findMatchingEndpoint(input.endpoints, optionalConfig);

      if (matchResult.matched) {
        matchedOptional.add(optionalConfig.id);

        const endpointScore = this.scoreEndpoint(
          matchResult.endpoint!,
          optionalConfig,
          config.evaluationCriteria
        );

        score += endpointScore.score;

        positive.push({
          category: "architecture",
          severity: "positive",
          message: `✓ Optional endpoint: ${optionalConfig.method} ${matchResult.endpoint!.path}`,
          relatedTo: optionalConfig.id,
        });
      } else if (requirementsMet) {
        // Optional endpoint is missing but was required by selected features
        warnings.push({
          category: "requirement",
          severity: "warning",
          message: `Recommended endpoint for selected features: ${optionalConfig.method} ${optionalConfig.examplePath || optionalConfig.pathPattern}`,
          relatedTo: optionalConfig.id,
          actionable: `Add endpoint for: ${optionalConfig.purpose}`,
        });
      }
    }

    // Check for extra endpoints (not necessarily bad)
    const unmatchedEndpoints = input.endpoints.filter((endpoint) => {
      return ![...config.requiredEndpoints, ...config.optionalEndpoints].some((configEndpoint) => {
        return this.endpointMatches(endpoint, configEndpoint);
      });
    });

    if (unmatchedEndpoints.length > 0) {
      suggestions.push({
        category: "architecture",
        severity: "info",
        message: `You have ${unmatchedEndpoints.length} additional endpoint${unmatchedEndpoints.length > 1 ? "s" : ""} not in the standard design. Make sure they align with your requirements.`,
      });
    }

    // Overall feedback
    const percentage = (score / maxScore) * 100;
    if (blocking.length === 0) {
      if (percentage >= 90) {
        positive.unshift({
          category: "architecture",
          severity: "positive",
          message: "Excellent API design! All endpoints are well-documented and follow REST best practices.",
        });
      } else if (percentage >= 75) {
        positive.unshift({
          category: "architecture",
          severity: "positive",
          message: "Good API design! Core endpoints are present. Consider improving documentation.",
        });
      }
    }

    return {
      score,
      maxScore,
      percentage,
      blocking,
      warnings,
      positive,
      suggestions,
    };
  }

  /**
   * Find a user endpoint that matches the config
   */
  private findMatchingEndpoint(
    endpoints: ApiEndpoint[],
    config: ApiEndpointConfig
  ): { matched: boolean; endpoint?: ApiEndpoint } {
    const matching = endpoints.find((endpoint) => this.endpointMatches(endpoint, config));
    return matching ? { matched: true, endpoint: matching } : { matched: false };
  }

  /**
   * Check if an endpoint matches the configuration
   */
  private endpointMatches(endpoint: ApiEndpoint, config: ApiEndpointConfig): boolean {
    // Check method match (exact or flexible)
    const methodMatch = endpoint.method === config.method;

    // Check path match (regex or exact)
    let pathMatch = false;
    if (config.pathPatternRegex) {
      try {
        const regex = new RegExp(config.pathPatternRegex);
        pathMatch = regex.test(endpoint.path);
      } catch (e) {
        // Fallback to simple match
        pathMatch = endpoint.path.toLowerCase().includes(config.pathPattern.toLowerCase());
      }
    } else {
      // Simple substring match
      pathMatch = endpoint.path.toLowerCase().includes(config.pathPattern.toLowerCase());
    }

    return methodMatch && pathMatch;
  }

  /**
   * Score an individual endpoint
   */
  private scoreEndpoint(
    endpoint: ApiEndpoint,
    config: ApiEndpointConfig,
    criteria: ApiScoringConfig["evaluationCriteria"]
  ): {
    score: number;
    perfect: boolean;
    methodIssue: boolean;
    documentationIssue: boolean;
  } {
    let score = 0;
    let perfect = true;
    let methodIssue = false;
    let documentationIssue = false;

    const totalCriteriaWeight =
      criteria.hasCorrectMethods +
      criteria.pathDesignQuality +
      criteria.documentationQuality +
      criteria.alignsWithRequirements;

    const endpointMaxScore = config.weight;
    const criteriaToScoreRatio = endpointMaxScore / totalCriteriaWeight;

    // 1. Correct method
    if (endpoint.method === config.method) {
      score += criteria.hasCorrectMethods * criteriaToScoreRatio;
    } else {
      methodIssue = true;
      perfect = false;
      score += criteria.hasCorrectMethods * criteriaToScoreRatio * 0.5; // Partial credit
    }

    // 2. Path design quality (assuming match found, give full credit)
    score += criteria.pathDesignQuality * criteriaToScoreRatio;

    // 3. Documentation quality
    const docQuality = this.assessDocumentationQuality(endpoint, config);
    if (docQuality >= 0.8) {
      score += criteria.documentationQuality * criteriaToScoreRatio;
    } else {
      documentationIssue = true;
      perfect = false;
      score += criteria.documentationQuality * criteriaToScoreRatio * docQuality;
    }

    // 4. Aligns with requirements (assuming it was matched, give full credit)
    score += criteria.alignsWithRequirements * criteriaToScoreRatio;

    return { score, perfect, methodIssue, documentationIssue };
  }

  /**
   * Assess documentation quality (0.0 to 1.0)
   */
  private assessDocumentationQuality(endpoint: ApiEndpoint, config: ApiEndpointConfig): number {
    const notes = endpoint.notes || "";

    // Check minimum length
    if (config.minDocumentationLength && notes.length < config.minDocumentationLength) {
      return 0.3; // Very low quality
    }

    // Check for documentation hints (keywords)
    const matches = this.matchKeywords(config.documentationHints, notes);
    const matchCount = matches.filter((m) => m.found).length;
    const matchRatio = matchCount / config.documentationHints.length;

    // Score based on match ratio
    if (matchRatio >= 0.8) return 1.0;
    if (matchRatio >= 0.6) return 0.8;
    if (matchRatio >= 0.4) return 0.6;
    if (matchRatio >= 0.2) return 0.4;
    return 0.3;
  }

  /**
   * Match keywords in text
   */
  private matchKeywords(keywords: string[], text: string): KeywordMatch[] {
    const normalizedText = text.toLowerCase();
    return keywords.map((keyword) => {
      const found = normalizedText.includes(keyword.toLowerCase());
      return { keyword, found };
    });
  }
}

/**
 * Convenience function to evaluate API definitions
 */
export function evaluateApiDefinition(
  input: ApiScoringInput,
  config: ApiScoringConfig
): FeedbackResult {
  const engine = new ApiScoringEngine();
  return engine.evaluate(input, config);
}
