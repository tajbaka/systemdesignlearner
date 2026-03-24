import { track } from "@/lib/analytics";
import { STEPS } from "../../constants";
import practiceActions from "../../actions";
import type { NonFunctionalDeps, StepHandler } from "./types";

export function createNonFunctionalHandler(deps: NonFunctionalDeps): StepHandler {
  const {
    slug,
    router,
    isSignedIn: _isSignedIn,
    nonFunctionalRequirements,
    setNonFunctionalRequirements,
    setModalOpen,
    setIsActionLoading,
    setActionError,
    setStepCompletion,
  } = deps;

  return async (action, ...args) => {
    if (action === "back") {
      router.push(`/practice/${slug}/functional`);
      return;
    }

    if (action === "next") {
      track("practice_non_functional_attempted", { slug });

      try {
        if (nonFunctionalRequirements.submission) {
          setModalOpen(true);
          return;
        }

        setActionError(null);
        setIsActionLoading(true);

        const evaluationResponse = await practiceActions.nonFunctional.evaluate(
          slug,
          nonFunctionalRequirements
        );
        setIsActionLoading(false);

        const allComplete = evaluationResponse.results.every(
          (result: { complete: boolean }) => result.complete
        );
        const currentAttempts = nonFunctionalRequirements.attempts ?? 0;
        const newAttempts = allComplete ? 0 : currentAttempts + 1;

        setNonFunctionalRequirements({
          submission: evaluationResponse,
          attempts: newAttempts,
        });

        // Update step completion status for stepper
        setStepCompletion("nonFunctional", allComplete);

        track("practice_non_functional_completed", { slug, score: evaluationResponse.score });
        setModalOpen(true);
      } catch (error) {
        console.error("Failed to save/evaluate non-functional requirements:", error);
        track("practice_evaluation_error", {
          slug,
          step: "non_functional",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        setIsActionLoading(false);
        setActionError(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        );
      }
      return;
    }

    if (action === "continue") {
      setModalOpen(false);
      router.push(`/practice/${slug}/api`);
      return;
    }

    if (action === "revise") {
      track("practice_step_revised", {
        slug,
        step: "non_functional",
        attempts: nonFunctionalRequirements.attempts ?? 0,
      });
      setModalOpen(false);
      return;
    }

    if (action === "changeTextBox") {
      const [value] = args as [string];
      setNonFunctionalRequirements({
        textField: { ...nonFunctionalRequirements.textField, value },
        submission: undefined,
      });
      return;
    }

    if (action === "insert") {
      const [solutionText] = args as [string];
      track("practice_solution_inserted", {
        slug,
        step: "non_functional",
        attempts: nonFunctionalRequirements.attempts ?? 0,
      });
      setNonFunctionalRequirements({
        textField: { ...nonFunctionalRequirements.textField, value: solutionText },
        submission: undefined,
      });
      return;
    }

    if (action === "assistanceQuestion") {
      track("assistance_question_submitted", { slug, step: STEPS.NON_FUNCTIONAL });
    }
  };
}
