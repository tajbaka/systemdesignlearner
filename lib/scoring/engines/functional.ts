/**
 * Functional Requirements Scoring Engine
 *
 * Evaluates user's functional requirements summary against optimal solution
 * using keyword matching and semantic analysis.
 */

import type {
  FunctionalScoringConfig,
  FunctionalScoringInput,
  FeedbackResult,
  FeedbackItem,
  IScoringEngine,
  KeywordMatch,
} from "../types";

export class FunctionalScoringEngine
  implements IScoringEngine<FunctionalScoringInput, FunctionalScoringConfig>
{
  /**
   * Evaluate functional requirements
   */
  evaluate(input: FunctionalScoringInput, config: FunctionalScoringConfig): FeedbackResult {
    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    const suggestions: FeedbackItem[] = [];

    const maxScore = config.maxScore;

    // Normalize input text for matching
    const normalizedText = this.normalizeText(input.functionalSummary);

    // Check minimum text length
    if (config.minTextLength && input.functionalSummary.length < config.minTextLength) {
      blocking.push({
        category: "requirement",
        severity: "blocking",
        message: `Your description is too brief (${input.functionalSummary.length} chars). Please provide more detail about what the system should do.`,
        actionable: `Expand your description to at least ${config.minTextLength} characters. Describe the core functionality in detail.`,
      });
    }

    // Calculate total weights
    const totalCoreWeight = config.coreRequirements.reduce((sum, req) => sum + req.weight, 0);
    const totalOptionalWeight = config.optionalRequirements.reduce(
      (sum, req) => sum + req.weight,
      0
    );

    // Evaluate core requirements
    const coreResults = this.evaluateRequirements(
      config.coreRequirements,
      normalizedText,
      input.selectedRequirements,
      config.minKeywordsMatch
    );

    let coreScore = 0;
    for (const result of coreResults) {
      if (result.matched) {
        coreScore += result.requirement.weight;
        positive.push({
          category: "requirement",
          severity: "positive",
          message: `✓ ${result.requirement.label}: ${result.requirement.description}`,
          relatedTo: result.requirement.id,
        });
      } else if (result.requirement.required) {
        blocking.push({
          category: "requirement",
          severity: "blocking",
          message: `Missing core requirement: ${result.requirement.label}`,
          relatedTo: result.requirement.id,
          actionable: `Add details about ${result.requirement.label.toLowerCase()}. ${result.requirement.description}`,
        });

        // Provide example phrases
        if (result.requirement.examplePhrases && result.requirement.examplePhrases.length > 0) {
          suggestions.push({
            category: "requirement",
            severity: "info",
            message: `Example: "${result.requirement.examplePhrases[0]}"`,
            relatedTo: result.requirement.id,
          });
        }
      }
    }

    // Scale core score to maxScore (100% = all core requirements)
    const corePercentage = totalCoreWeight > 0 ? coreScore / totalCoreWeight : 0;
    const scaledCoreScore = corePercentage * maxScore;

    // Evaluate optional requirements
    const optionalResults = this.evaluateRequirements(
      config.optionalRequirements,
      normalizedText,
      input.selectedRequirements,
      config.minKeywordsMatch
    );

    let optionalScore = 0;
    const matchedOptional: string[] = [];
    for (const result of optionalResults) {
      if (result.matched) {
        optionalScore += result.requirement.weight;
        matchedOptional.push(result.requirement.label);
      }
    }

    // Scale optional score as bonus (percentage of maxScore based on optional weight ratio)
    const optionalPercentage = totalOptionalWeight > 0 ? optionalScore / totalOptionalWeight : 0;
    const scaledOptionalScore = optionalPercentage * maxScore;

    if (matchedOptional.length > 0) {
      positive.push({
        category: "requirement",
        severity: "positive",
        message: `Great! You included ${matchedOptional.length} optional feature${matchedOptional.length > 1 ? "s" : ""}: ${matchedOptional.join(", ")} (+${scaledOptionalScore.toFixed(1)} bonus points)`,
      });
    } else {
      suggestions.push({
        category: "requirement",
        severity: "info",
        message:
          "Consider adding optional features like custom aliases, analytics, or expiration to enhance your solution.",
      });
    }

    // Final score = core score (up to maxScore) + optional score (bonus)
    const score = scaledCoreScore + scaledOptionalScore;
    const percentage = (scaledCoreScore / maxScore) * 100;

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
   * Evaluate a list of requirements against user input
   */
  private evaluateRequirements(
    requirements: FunctionalScoringConfig["coreRequirements"],
    normalizedText: string,
    selectedRequirements: Record<string, boolean>,
    minKeywordsMatch: number
  ): Array<{ requirement: (typeof requirements)[0]; matched: boolean; matches: KeywordMatch[] }> {
    return requirements.map((requirement) => {
      // Check if requirement was explicitly selected (from checkbox/form)
      const explicitlySelected = selectedRequirements[requirement.id] === true;

      // Check keyword matches in text
      const matches = this.matchKeywords(requirement.keywords, normalizedText);
      const matchCount = matches.filter((m) => m.found).length;
      const hasEnoughMatches = matchCount >= minKeywordsMatch;

      const matched = explicitlySelected || hasEnoughMatches;

      return { requirement, matched, matches };
    });
  }

  /**
   * Match keywords in text
   */
  private matchKeywords(keywords: string[], text: string): KeywordMatch[] {
    return keywords.map((keyword) => {
      const regex = new RegExp(`\\b${this.escapeRegex(keyword.toLowerCase())}`, "i");
      const found = regex.test(text);

      let context: string | undefined;
      if (found) {
        const match = text.match(
          new RegExp(`.{0,20}${this.escapeRegex(keyword.toLowerCase())}.{0,20}`, "i")
        );
        context = match ? match[0] : undefined;
      }

      return { keyword, found, context };
    });
  }

  /**
   * Normalize text for matching: lowercase, remove punctuation, etc.
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

/**
 * Convenience function to evaluate functional requirements
 */
export function evaluateFunctionalRequirements(
  input: FunctionalScoringInput,
  config: FunctionalScoringConfig
): FeedbackResult {
  const engine = new FunctionalScoringEngine();
  return engine.evaluate(input, config);
}
