/**
 * Non-Functional Requirements Scoring Engine
 *
 * Evaluates user's NFRs qualitatively based on whether they mention
 * key aspects like performance, scalability, availability, etc.
 */

import type {
  NonFunctionalScoringConfig,
  NonFunctionalScoringInput,
  FeedbackResult,
  FeedbackItem,
  IScoringEngine,
  QualitativeAspect,
} from "../types";

export class NonFunctionalScoringEngine
  implements IScoringEngine<NonFunctionalScoringInput, NonFunctionalScoringConfig>
{
  /**
   * Evaluate non-functional requirements qualitatively
   */
  evaluate(input: NonFunctionalScoringInput, config: NonFunctionalScoringConfig): FeedbackResult {
    const blocking: FeedbackItem[] = [];
    const warnings: FeedbackItem[] = [];
    const positive: FeedbackItem[] = [];
    const suggestions: FeedbackItem[] = [];

    let score = 0;
    const maxScore = config.maxScore;
    const notes = input.notes || "";
    const notesLower = notes.toLowerCase();

    // Check minimum text length
    const minLength = config.minTextLength || 50;
    if (notes.trim().length < minLength) {
      blocking.push({
        category: "requirement",
        severity: "blocking",
        message: `Please provide more detail about your non-functional requirements (at least ${minLength} characters).`,
        actionable:
          "Describe performance, scalability, availability, and other quality attributes.",
      });
      return {
        score: 0,
        maxScore,
        percentage: 0,
        blocking,
        warnings,
        positive,
        suggestions,
      };
    }

    // Check for coreRequirements and optionalRequirements (new structure)
    if (config.coreRequirements || config.optionalRequirements) {
      // Calculate total weights
      const totalCoreWeight = (config.coreRequirements || []).reduce(
        (sum, req) => sum + req.weight,
        0
      );
      const totalOptionalWeight = (config.optionalRequirements || []).reduce(
        (sum, req) => sum + req.weight,
        0
      );

      // Evaluate core requirements
      let coreScore = 0;
      for (const req of config.coreRequirements || []) {
        const result = this.evaluateQualitativeAspect(req, notesLower);
        coreScore += result.score;

        if (result.feedback) {
          if (result.feedback.severity === "positive") {
            positive.push(result.feedback);
          } else if (result.feedback.severity === "warning") {
            warnings.push(result.feedback);
          }
        }
      }

      // Scale core score to maxScore (100% = all core requirements)
      const corePercentage = totalCoreWeight > 0 ? coreScore / totalCoreWeight : 0;
      const scaledCoreScore = corePercentage * maxScore;

      // Evaluate optional requirements
      let optionalScore = 0;
      const matchedOptional: string[] = [];
      for (const req of config.optionalRequirements || []) {
        const result = this.evaluateQualitativeAspect(req, notesLower);
        if (result.score > 0) {
          optionalScore += result.score;
          matchedOptional.push(req.label);
        }

        if (result.feedback) {
          if (result.feedback.severity === "positive") {
            positive.push(result.feedback);
          } else if (result.feedback.severity === "warning") {
            warnings.push(result.feedback);
          }
        }
      }

      // Scale optional score as bonus
      const optionalPercentage = totalOptionalWeight > 0 ? optionalScore / totalOptionalWeight : 0;
      const scaledOptionalScore = optionalPercentage * maxScore;

      if (matchedOptional.length > 0) {
        positive.push({
          category: "performance",
          severity: "positive",
          message: `Bonus: You addressed ${matchedOptional.length} optional aspect${matchedOptional.length > 1 ? "s" : ""} (+${scaledOptionalScore.toFixed(1)} points)`,
        });
      }

      // Final score = core + optional (bonus)
      score = scaledCoreScore + scaledOptionalScore;
    }

    // Overall feedback
    const percentage = (score / maxScore) * 100;

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
   * Evaluate a qualitative aspect by checking for keywords
   */
  private evaluateQualitativeAspect(
    aspect: QualitativeAspect,
    notesLower: string
  ): { score: number; feedback?: FeedbackItem } {
    // Check if any keywords are mentioned
    const mentionedKeywords = aspect.keywords.filter((keyword) =>
      notesLower.includes(keyword.toLowerCase())
    );

    if (mentionedKeywords.length > 0) {
      return {
        score: aspect.weight,
        feedback: {
          category: "performance",
          severity: "positive",
          message: `Good! You mentioned ${aspect.label.toLowerCase()} concerns.`,
          relatedTo: aspect.id,
        },
      };
    }

    return { score: 0 };
  }
}

/**
 * Convenience function to evaluate non-functional requirements
 */
export function evaluateNonFunctionalRequirements(
  input: NonFunctionalScoringInput,
  config: NonFunctionalScoringConfig
): FeedbackResult {
  const engine = new NonFunctionalScoringEngine();
  return engine.evaluate(input, config);
}
