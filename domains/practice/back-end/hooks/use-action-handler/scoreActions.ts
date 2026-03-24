import { track } from "@/lib/analytics";
import { STEPS } from "../../constants";
import { stepStateStore } from "../../store/store";
import practiceActions from "../../actions";
import type { ScoreDeps, StepHandler } from "./types";

export function createScoreHandler(deps: ScoreDeps): StepHandler {
  const { slug, router, setScore, setActionError } = deps;

  return async (action) => {
    if (action === "back") {
      router.push(`/practice/${slug}/high-level-design`);
      return;
    }

    if (action === "home") {
      router.push("/practice");
      return;
    }

    if (action === "getScore") {
      try {
        const data = await practiceActions.score.get(slug);

        setScore({ stepScores: data.stepScores });

        const totalScore = data.stepScores.reduce((sum, step) => sum + step.score, 0);

        // Check if all steps passed on first attempt
        const freshState = stepStateStore.getState();
        const problemState = freshState.problems[slug];
        const allStepsPassedFirst =
          problemState &&
          (problemState.functionalRequirements.attempts ?? 0) === 0 &&
          (problemState.nonFunctionalRequirements.attempts ?? 0) === 0 &&
          (problemState.apiDesign.attempts ?? 0) === 0 &&
          (problemState.highLevelDesign.attempts ?? 0) === 0;

        track("practice_score_fetched", { slug, totalScore });

        if (allStepsPassedFirst) {
          track("practice_pass_first", { slug, totalScore });
        }
      } catch (error) {
        console.error("Failed to fetch score:", error);
        track("practice_evaluation_error", {
          slug,
          step: "score",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        setActionError(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        );
      }
      return;
    }

    if (action === "assistanceQuestion") {
      track("assistance_question_submitted", { slug, step: STEPS.SCORE });
    }
  };
}
