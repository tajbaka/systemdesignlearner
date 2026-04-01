import { track } from "@/lib/analytics";
import { STEPS } from "../../constants";
import { stepStateStore } from "../../store/store";
import practiceActions from "../../actions";
import { reportActionError } from "./errorHandling";
import type { HighLevelDesignDeps, StepHandler, PracticeDesignState } from "./types";

export function createHighLevelDesignHandler(deps: HighLevelDesignDeps): StepHandler {
  const {
    slug,
    router,
    isSignedIn,
    openAuthModal,
    highLevelDesign,
    setHighLevelDesign,
    setModalOpen,
    setIsActionLoading,
    setActionError,
    setStepCompletion,
  } = deps;

  return async (action, ...args) => {
    if (action === "back") {
      router.push(`/practice/${slug}/api`);
      return;
    }

    if (action === "next") {
      track("practice_high_level_design_attempted", { slug });

      // Require auth before evaluation
      if (!isSignedIn) {
        stepStateStore.getState().setNeedsSync(slug, true);
        setHighLevelDesign({ submission: undefined });
        openAuthModal();
        return;
      }

      try {
        if (highLevelDesign.submission) {
          setModalOpen(true);
          return;
        }

        setActionError(null);
        setIsActionLoading(true);

        const evaluationResponse = await practiceActions.highLevelDesign.evaluate(
          slug,
          highLevelDesign.design
        );
        setIsActionLoading(false);

        const allComplete = evaluationResponse.results.every(
          (result: { complete: boolean }) => result.complete
        );
        const currentAttempts = highLevelDesign.attempts ?? 0;
        const newAttempts = allComplete ? 0 : currentAttempts + 1;

        setHighLevelDesign({
          submission: evaluationResponse,
          attempts: newAttempts,
        });

        // Update step completion status for stepper
        setStepCompletion("highLevelDesign", allComplete);

        track("practice_high_level_design_completed", { slug, score: evaluationResponse.score });
        setModalOpen(true);
      } catch (error) {
        reportActionError({
          slug,
          step: "high_level_design",
          error,
          message: "Failed to save/evaluate high-level design:",
          setActionError,
        });
        setIsActionLoading(false);
      }
      return;
    }

    if (action === "continue") {
      setModalOpen(false);
      router.push(`/practice/${slug}/score`);
      return;
    }

    if (action === "revise") {
      track("practice_step_revised", {
        slug,
        step: "high_level_design",
        attempts: highLevelDesign.attempts ?? 0,
      });
      setModalOpen(false);
      return;
    }

    if (action === "updateDesign") {
      const [diagramData] = args as [PracticeDesignState];
      setHighLevelDesign({ design: diagramData, submission: undefined });
      return;
    }

    if (action === "insert") {
      const [diagramData] = args as [PracticeDesignState];
      setHighLevelDesign({ design: diagramData, submission: undefined });
      return;
    }

    if (action === "assistanceQuestion") {
      track("assistance_question_submitted", { slug, step: STEPS.HIGH_LEVEL_DESIGN });
    }
  };
}
