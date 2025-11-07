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
  NFRQuestion,
  QualitativeAspect,
} from "../types";

export class NonFunctionalScoringEngine implements IScoringEngine<NonFunctionalScoringInput, NonFunctionalScoringConfig> {
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
        actionable: "Describe performance, scalability, availability, and other quality attributes.",
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

    // Check for qualitative aspects (new structure)
    if (config.qualitativeAspects) {
      for (const aspect of config.qualitativeAspects) {
        const result = this.evaluateQualitativeAspect(aspect, notesLower);
        score += result.score;

        if (result.feedback) {
          if (result.feedback.severity === "positive") {
            positive.push(result.feedback);
          } else if (result.feedback.severity === "warning") {
            warnings.push(result.feedback);
          }
        }
      }
    }
    // Fallback to old questions structure if it exists
    else if (config.questions) {
      const applicableQuestions = this.getApplicableQuestions(
        config.questions,
        config.decisionRules || [],
        input.functionalRequirements || {}
      );

      for (const question of applicableQuestions) {
        const result = this.evaluateQuestion(question, input);
        score += result.score;

        if (result.feedback) {
          if (result.feedback.severity === "blocking") {
            blocking.push(result.feedback);
          } else if (result.feedback.severity === "warning") {
            warnings.push(result.feedback);
          } else if (result.feedback.severity === "positive") {
            positive.push(result.feedback);
          }
        }
      }
    }

    // Overall feedback
    const percentage = (score / maxScore) * 100;
    if (blocking.length === 0) {
      if (percentage >= 90) {
        positive.unshift({
          category: "performance",
          severity: "positive",
          message: "Excellent NFRs! You've covered all the key quality attributes.",
        });
      } else if (percentage >= 75) {
        positive.unshift({
          category: "performance",
          severity: "positive",
          message: "Good NFR coverage! Your requirements touch on important quality attributes.",
        });
      } else if (percentage >= 50) {
        suggestions.push({
          category: "performance",
          severity: "info",
          message: "Consider adding more detail about scalability, availability, or performance characteristics.",
        });
      } else {
        warnings.push({
          category: "requirement",
          severity: "warning",
          message: "Your NFRs could be more comprehensive. Think about performance, scale, availability, and reliability.",
          actionable: "Add specific qualities like 'fast redirects', 'high availability', or 'handles traffic spikes'.",
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

  /**
   * Determine which questions apply based on functional requirements
   */
  private getApplicableQuestions(
    allQuestions: NFRQuestion[],
    decisionRules: NonFunctionalScoringConfig["decisionRules"],
    functionalRequirements: Record<string, boolean>
  ): NFRQuestion[] {
    const applicable = new Set<string>();

    // Always include questions without requiredBy
    for (const question of allQuestions) {
      if (!question.requiredBy || question.requiredBy.length === 0) {
        applicable.add(question.id);
      }
    }

    // Apply decision rules
    if (decisionRules) {
      for (const rule of decisionRules) {
        const conditionMet = functionalRequirements[rule.condition.functionalRequirementId] === rule.condition.required;
        if (conditionMet) {
          rule.questions.forEach((q) => applicable.add(q));
        }
      }
    }

    // Check individual question requiredBy
    for (const question of allQuestions) {
      if (question.requiredBy && question.requiredBy.length > 0) {
        const required = question.requiredBy.some((reqId) => functionalRequirements[reqId] === true);
        if (required) {
          applicable.add(question.id);
        }
      }
    }

    return allQuestions.filter((q) => applicable.has(q.id));
  }

  /**
   * Evaluate a single NFR question
   */
  private evaluateQuestion(
    question: NFRQuestion,
    input: NonFunctionalScoringInput
  ): { score: number; feedback?: FeedbackItem } {
    const value = this.extractValue(question.id, input);

    // Skip evaluation if value is 0 (not provided by user)
    if (value === 0) {
      return { score: 0 };
    }

    if (value === null || value === undefined) {
      // Required question not answered
      if (question.requiredBy && question.requiredBy.length > 0) {
        return {
          score: 0,
          feedback: {
            category: "requirement",
            severity: "blocking",
            message: question.feedbackTemplates.missing || `Missing required value for: ${question.prompt}`,
            relatedTo: question.id,
            actionable: `Please specify ${question.prompt.toLowerCase()}`,
          },
        };
      }
      // Optional question not answered
      return { score: 0 };
    }

    // Evaluate numeric range
    if (typeof value === "number") {
      return this.evaluateNumericRange(question, value);
    }

    // Evaluate string/enum values (e.g., availability)
    if (typeof value === "string") {
      return this.evaluateStringValue(question, value);
    }

    return { score: 0 };
  }

  /**
   * Evaluate numeric range
   */
  private evaluateNumericRange(
    question: NFRQuestion,
    value: number
  ): { score: number; feedback?: FeedbackItem } {
    const range = question.optimalRanges;
    const weight = question.weight;

    // Check if value is too low
    if (range.min !== undefined && value < range.min) {
      return {
        score: weight * 0.3, // Partial credit
        feedback: {
          category: "performance",
          severity: "warning",
          message: question.feedbackTemplates.tooLow || `${question.prompt}: ${value} ${range.unit || ""} may be too low.`,
          relatedTo: question.id,
          actionable: `Consider a value closer to ${range.target || range.min} ${range.unit || ""}`,
        },
      };
    }

    // Check if value is too high
    if (range.max !== undefined && value > range.max) {
      return {
        score: weight * 0.5, // More partial credit (high is often better than low)
        feedback: {
          category: "performance",
          severity: "warning",
          message: question.feedbackTemplates.tooHigh || `${question.prompt}: ${value} ${range.unit || ""} is very high.`,
          relatedTo: question.id,
          actionable: `This requires significant infrastructure. Ensure your design scales appropriately.`,
        },
      };
    }

    // Value is within optimal range
    const isNearTarget = range.target && Math.abs(value - range.target) <= (range.target * 0.3);
    return {
      score: weight,
      feedback: {
        category: "performance",
        severity: "positive",
        message: isNearTarget
          ? question.feedbackTemplates.optimal
          : `${question.prompt}: ${value} ${range.unit || ""} is reasonable.`,
        relatedTo: question.id,
      },
    };
  }

  /**
   * Evaluate string/enum value
   */
  private evaluateStringValue(
    question: NFRQuestion,
    value: string
  ): { score: number; feedback?: FeedbackItem } {
    const weight = question.weight;

    // For availability, parse percentage
    if (question.id === "availability") {
      const percentage = parseFloat(value);
      if (!isNaN(percentage)) {
        return this.evaluateNumericRange(question, percentage);
      }
    }

    // Generic string evaluation - give full credit if provided
    return {
      score: weight,
      feedback: {
        category: "performance",
        severity: "positive",
        message: `${question.prompt} specified: ${value}`,
        relatedTo: question.id,
      },
    };
  }

  /**
   * Extract value from input based on question ID
   */
  private extractValue(questionId: string, input: NonFunctionalScoringInput): number | string | null {
    switch (questionId) {
      case "read-rps":
        return input.readRps;
      case "write-rps":
        return input.writeRps;
      case "p95-latency":
        return input.p95RedirectMs;
      case "availability":
        return input.availability;
      case "rate-limiting":
        return input.rateLimitNotes || null;
      default:
        return null;
    }
  }

  /**
   * Check for unrealistic combinations of requirements
   */
  private checkRealisticCombinations(input: NonFunctionalScoringInput): FeedbackItem[] {
    const warnings: FeedbackItem[] = [];

    // High RPS + low latency = challenging
    if (input.readRps > 50000 && input.p95RedirectMs < 10) {
      warnings.push({
        category: "performance",
        severity: "warning",
        message: "Achieving sub-10ms latency at 50K+ RPS is extremely challenging.",
        actionable: "Consider edge caching (CDN) or relaxing latency requirements slightly.",
      });
    }

    // Very high availability + missing redundancy hints
    const availabilityNum = parseFloat(input.availability);
    if (!isNaN(availabilityNum) && availabilityNum >= 99.99) {
      warnings.push({
        category: "performance",
        severity: "warning",
        message: "99.99% availability requires multi-region deployment, automated failover, and comprehensive monitoring.",
        actionable: "Ensure your design includes redundancy at every layer.",
      });
    }

    // Low write RPS but high read RPS = good (typical pattern)
    if (input.readRps > input.writeRps * 100) {
      // This is actually good, no warning needed
    }

    // High write RPS warning
    if (input.writeRps > 5000) {
      warnings.push({
        category: "performance",
        severity: "info",
        message: "High write throughput (5K+ RPS) requires careful database selection and potentially sharding.",
        actionable: "Consider write-optimized databases or event sourcing patterns.",
      });
    }

    return warnings;
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
