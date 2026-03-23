import { useMemo } from "react";
import useStore from "./useStore";
import type { EvaluationResult } from "@/server/domains/practice/services/evaluation/types";

export function useIncompleteRequirement(stepType: string | null, slug: string) {
  const { functionalRequirements, nonFunctionalRequirements, apiDesign, highLevelDesign } =
    useStore(slug);

  // Get results based on current step
  const currentResults = useMemo(() => {
    if (stepType === "functional") return functionalRequirements.submission;
    if (stepType === "nonFunctional") return nonFunctionalRequirements.submission;
    if (stepType === "api") return apiDesign.submission;
    if (stepType === "highLevelDesign") return highLevelDesign.submission;
    return null;
  }, [stepType, functionalRequirements, nonFunctionalRequirements, apiDesign, highLevelDesign]);

  // Find the first incomplete result that has itemIds (highlightable)
  const incompleteRequirement = useMemo(() => {
    if (!currentResults) return null;

    // Check if this is a text-based evaluation result (has results array)
    const textBasedResult = currentResults as EvaluationResult;

    if (textBasedResult.results) {
      // Find first incomplete result that has itemIds (can be highlighted)
      const incomplete = textBasedResult.results.find(
        (r) => !r.complete && r.itemIds && r.itemIds.length > 0
      );
      if (incomplete) {
        return {
          id: incomplete.id,
          itemId: incomplete.itemIds![0], // Pick first for backwards compat
          itemIds: incomplete.itemIds!, // Expose all for future use
        };
      }
    }

    return null;
  }, [currentResults]);

  return incompleteRequirement;
}
