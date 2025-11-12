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

    const maxScore = config.maxScore;

    // Track which endpoints were matched
    const matchedRequired = new Set<string>();
    const matchedOptional = new Set<string>();

    // Calculate total weights
    const totalRequiredWeight = config.requiredEndpoints.reduce((sum, ep) => sum + ep.weight, 0);
    const totalOptionalWeight = config.optionalEndpoints.reduce((sum, ep) => sum + ep.weight, 0);

    // Evaluate required endpoints (core)
    let coreScore = 0;
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

        coreScore += endpointScore.score;

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
            const endpoint = matchResult.endpoint!;
            const isBodyMethod = endpoint.method === "POST" || endpoint.method === "PATCH";
            const needsBodyStructure = isBodyMethod &&
                                      requiredConfig.documentationHints.includes("body") &&
                                      !this.hasRequestBodyStructure(endpoint.notes);

            let actionable = `Add details about: ${requiredConfig.documentationHints.join(", ")}`;
            if (needsBodyStructure) {
              actionable = `Specify the request body structure (e.g., body: { "field": "value" }) and include: ${requiredConfig.documentationHints.join(", ")}`;
            }

            warnings.push({
              category: "architecture",
              severity: "warning",
              message: `Endpoint ${endpoint.path} needs better documentation.`,
              relatedTo: requiredConfig.id,
              actionable,
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
            actionable: `Add a ${requiredConfig.method} endpoint for: ${requiredConfig.purpose}`,
          });

          if (requiredConfig.exampleNotes) {
            suggestions.push({
              category: "architecture",
              severity: "info",
              message: `Example: ${requiredConfig.exampleNotes}`,
              relatedTo: requiredConfig.id,
            });
          }
        }
      }
    }

    // Scale core score to maxScore (100% = all required endpoints)
    const corePercentage = totalRequiredWeight > 0 ? coreScore / totalRequiredWeight : 0;
    const scaledCoreScore = corePercentage * maxScore;

    // Evaluate optional endpoints (bonus)
    let optionalScore = 0;
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

        optionalScore += endpointScore.score;

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

    // Scale optional score as bonus
    const optionalPercentage = totalOptionalWeight > 0 ? optionalScore / totalOptionalWeight : 0;
    const scaledOptionalScore = optionalPercentage * maxScore;

    if (matchedOptional.size > 0) {
      positive.push({
        category: "architecture",
        severity: "positive",
        message: `Bonus: You included ${matchedOptional.size} optional endpoint${matchedOptional.size > 1 ? "s" : ""} (+${scaledOptionalScore.toFixed(1)} points)`,
      });
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

    // Final score = core score (up to maxScore) + optional score (bonus)
    const score = scaledCoreScore + scaledOptionalScore;
    const percentage = (scaledCoreScore / maxScore) * 100;

    // Add blocking issue if score is too low (below 40%)
    if (percentage < 40 && blocking.length === 0) {
      // Generate specific actionable feedback based on what's missing
      const feedback = this.generateLowScoreFeedback(
        input,
        config,
        matchedRequired,
        percentage
      );

      blocking.push({
        category: "requirement",
        severity: "blocking",
        message: feedback.message,
        actionable: feedback.actionable,
      });
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

    // Normalize path - ensure it starts with /
    const normalizedPath = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;

    // Check path match (regex or exact)
    let pathMatch = false;
    if (config.pathPatternRegex) {
      try {
        const regex = new RegExp(config.pathPatternRegex);
        pathMatch = regex.test(normalizedPath);
      } catch (_e) {
        // Fallback to simple match
        pathMatch = normalizedPath.toLowerCase().includes(config.pathPattern.toLowerCase());
      }
    } else {
      // Simple substring match
      pathMatch = normalizedPath.toLowerCase().includes(config.pathPattern.toLowerCase());
    }

    // Additional validation: check if path follows the example structure
    if (pathMatch && config.examplePath) {
      pathMatch = this.validatePathStructure(normalizedPath, config.examplePath);
    }

    return methodMatch && pathMatch;
  }

  /**
   * Validate that the user's path follows the structure pattern from the example
   * Example: if examplePath is "/api/v1/shorten", user path should be "/api/v1/..."
   */
  private validatePathStructure(userPath: string, examplePath: string): boolean {
    // Extract the base path structure from example (everything before parameters)
    const exampleParts = examplePath.split('/').filter(p => p.length > 0);
    const userParts = userPath.split('/').filter(p => p.length > 0);

    // Check if user path has enough parts
    if (userParts.length < exampleParts.length - 1) {
      return false;
    }

    // Validate versioning pattern if present in example
    const versionPattern = /^v\d+$/;
    for (let i = 0; i < exampleParts.length; i++) {
      const examplePart = exampleParts[i];
      const userPart = userParts[i];

      // Skip parameter placeholders in example
      if (examplePart.startsWith('{') || examplePart.startsWith(':')) {
        continue;
      }

      // If example has version pattern, user should too
      if (versionPattern.test(examplePart)) {
        if (!userPart || !versionPattern.test(userPart)) {
          return false;
        }
      }

      // Check if example has "api" prefix, user should match base structure
      if (examplePart === 'api' && i === 0) {
        if (userPart !== 'api') {
          // Allow match if user is using similar base structure
          return true; // Be lenient on base prefix
        }
      }
    }

    return true;
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

    // Special validation for POST/PATCH requests - must specify body structure
    if ((endpoint.method === "POST" || endpoint.method === "PATCH") &&
        config.documentationHints.includes("body")) {
      const hasBodyStructure = this.hasRequestBodyStructure(notes);
      if (!hasBodyStructure) {
        return 0.3; // Significantly penalize missing body structure
      }
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
   * Check if documentation contains proper request body structure
   * Must mention "body" followed by description of what's in it (not just text explanation)
   */
  private hasRequestBodyStructure(notes: string): boolean {
    const normalizedNotes = notes.toLowerCase();

    // Must contain the word "body"
    if (!normalizedNotes.includes("body")) {
      return false;
    }

    // Check for structural patterns indicating body content definition
    const bodyStructurePatterns = [
      /body\s*:\s*\{/i,                    // body: {
      /body\s+contains\s+\{/i,             // body contains {
      /body\s*:\s*["']?\{/i,               // body: "{
      /\{\s*["']?\w+["']?\s*:\s*/,         // { "field": or { field:
      /body\s*:\s*\[/i,                    // body: [
    ];

    return bodyStructurePatterns.some(pattern => pattern.test(notes));
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

  /**
   * Generate specific, actionable feedback for low API scores
   */
  private generateLowScoreFeedback(
    input: ApiScoringInput,
    config: ApiScoringConfig,
    matchedRequired: Set<string>,
    percentage: number
  ): { message: string; actionable: string } {
    // Find missing required endpoints
    const missingRequired = config.requiredEndpoints.filter(
      (req) => !matchedRequired.has(req.id)
    );

    // Find endpoints with poor documentation
    const poorlyDocumented = input.endpoints.filter((endpoint) => {
      const matchingConfig = config.requiredEndpoints.find((config) =>
        this.endpointMatches(endpoint, config)
      );
      if (!matchingConfig) return false;
      return this.assessDocumentationQuality(endpoint, matchingConfig) < 0.6;
    });

    // Build specific feedback
    const issues: string[] = [];
    const actions: string[] = [];

    if (missingRequired.length > 0) {
      issues.push(`missing ${missingRequired.length} required endpoint${missingRequired.length > 1 ? "s" : ""}`);

      missingRequired.forEach((config) => {
        actions.push(
          `• Add ${config.method} ${config.examplePath || config.pathPattern} - ${config.purpose}`
        );
      });
    }

    if (poorlyDocumented.length > 0) {
      issues.push(`${poorlyDocumented.length} endpoint${poorlyDocumented.length > 1 ? "s need" : " needs"} better documentation`);

      poorlyDocumented.forEach((endpoint) => {
        const matchingConfig = config.requiredEndpoints.find((config) =>
          this.endpointMatches(endpoint, config)
        );
        if (matchingConfig) {
          actions.push(
            `• ${endpoint.method} ${endpoint.path}: Include ${matchingConfig.documentationHints.slice(0, 3).join(", ")}`
          );
        }
      });
    }

    // If we still don't have specific issues, check for empty notes
    if (actions.length === 0) {
      const emptyNotes = input.endpoints.filter(
        (e) => !e.notes || e.notes.trim().length < 20
      );
      if (emptyNotes.length > 0) {
        emptyNotes.forEach((endpoint) => {
          actions.push(
            `• ${endpoint.method} ${endpoint.path}: Add details about request body, response format, and error handling`
          );
        });
      }
    }

    const message = issues.length > 0
      ? `Your API design needs work: ${issues.join(", ")}. Score: ${percentage.toFixed(0)}% (need 40%+)`
      : `Your API design score is ${percentage.toFixed(0)}% (need 40%+). Improve endpoint documentation.`;

    const actionable = actions.length > 0
      ? `\n${actions.join("\n")}`
      : "Add request/response details, status codes, and error handling to your endpoint descriptions.";

    return { message, actionable };
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
