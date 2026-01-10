import type { IterativeFeedbackResult } from "@/domains/practice/scoring/iterative";
import type { FeedbackResult } from "@/domains/practice/types";
import { formatSolutionsForDisplay } from "./solutionFormatter";
import { getScoringConfigSync } from "../scoring";
import type { Solution } from "../types";

type FeedbackBox = {
  title: string;
  description: string;
};

export type SolutionItem = {
  requirementId: string;
  text: string;
};

export type ModalProps = {
  title: string;
  scoreDisplay: string;
  completedItems: string[];
  bonusFeature?: FeedbackBox;
  missingRequirement?: FeedbackBox;
  solution?: Array<SolutionItem> | null;
  rawSolutions?: Array<{ requirementId: string; solution: Solution }> | null; // Raw solutions for insertion
  stepType?: "functional" | "nonFunctional" | "api";
  showReviseButton: boolean;
  showContinueButton: boolean;
};

/**
 * Transform IterativeFeedbackResult to props for IterativeFeedbackModal
 */
export function transformFeedbackToModal(
  result: IterativeFeedbackResult,
  options?: {
    scoringFeedback?: FeedbackResult | null;
    onContinueAvailable?: boolean;
    stepType?: "functional" | "nonFunctional" | "api";
    slug?: string; // Problem slug to fetch solutions from config
  }
): ModalProps {
  const allTopicsCovered = result.coverage.allCovered;
  const blocking = result.ui.blocking;
  const nextPrompt = result.ui.nextPrompt;
  const showSolution = result.ui.showSolution ?? false;

  // Get title based on score
  const title = allTopicsCovered
    ? "Perfect Score!"
    : blocking
      ? "Let's Improve Your Answer"
      : "Great Progress!";

  // Score display
  const scoreDisplay = `Score: ${result.score.obtained}/${result.score.max} (${result.score.percentage}%)`;

  // Completed items - strip any checkmark text if present (icon handles visual indication)
  const completedItems = result.ui.coveredLines.map((line) => line.replace(/^✓\s*/, "").trim());

  // Bonus feature or missing requirement
  let bonusFeature: FeedbackBox | undefined = undefined;
  let missingRequirement: FeedbackBox | undefined = undefined;

  if (nextPrompt) {
    if (blocking) {
      missingRequirement = {
        title: "Missing requirement:",
        description: nextPrompt,
      };
    } else if (allTopicsCovered) {
      bonusFeature = {
        title: "💡 Bonus feature:",
        description: nextPrompt,
      };
    } else {
      bonusFeature = {
        title: "💡 To reach 100%:",
        description: nextPrompt,
      };
    }
  }

  // Button visibility
  const showReviseButton = !!(nextPrompt || !allTopicsCovered);
  const showContinueButton =
    !!(allTopicsCovered || !blocking) &&
    !!options?.onContinueAvailable &&
    !blocking &&
    (options.scoringFeedback?.percentage ?? 0) >= 40;

  // Fetch and format solutions from config if showSolution is true
  let formattedSolution: Array<SolutionItem> | null = null;
  let rawSolutions: Array<{ requirementId: string; solution: Solution }> | null = null;

  console.log(
    "[transformFeedbackToModal] showSolution:",
    showSolution,
    "stepType:",
    options?.stepType,
    "slug:",
    options?.slug
  );

  if (showSolution && options?.stepType && options?.slug) {
    const config = getScoringConfigSync(options.slug);
    console.log("[transformFeedbackToModal] config found:", !!config);
    if (config) {
      const solutionItems: Array<{ requirementId: string; solution: Solution }> = [];

      if (options.stepType === "functional") {
        const requirements = config.steps.functional.requirements || [];
        for (const req of requirements) {
          if (req.required && req.solutions && req.solutions.length > 0) {
            solutionItems.push({
              requirementId: req.id,
              solution: req.solutions[0],
            });
          }
        }
      } else if (options.stepType === "nonFunctional") {
        const requirements = config.steps.nonFunctional.requirements || [];
        for (const req of requirements) {
          if (req.required && req.solutions && req.solutions.length > 0) {
            solutionItems.push({
              requirementId: req.id,
              solution: req.solutions[0],
            });
          }
        }
      } else if (options.stepType === "api") {
        const requirements = config.steps.api.requirements || [];
        for (const req of requirements) {
          if (req.required && req.solutions && req.solutions.length > 0) {
            solutionItems.push({
              requirementId: req.id,
              solution: req.solutions[0],
            });
          }
        }
      }

      if (solutionItems.length > 0) {
        rawSolutions = solutionItems;
        // Format solutions for display
        const formatted = formatSolutionsForDisplay(options.stepType, solutionItems);
        if (Array.isArray(formatted)) {
          formattedSolution = formatted;
        } else {
          // For functional/non-functional, convert string to array format
          formattedSolution = [{ requirementId: "", text: formatted }];
        }
      }
    }
  }

  return {
    title,
    scoreDisplay,
    completedItems,
    bonusFeature,
    missingRequirement,
    solution: formattedSolution,
    rawSolutions,
    stepType: options?.stepType,
    showReviseButton,
    showContinueButton,
  };
}
