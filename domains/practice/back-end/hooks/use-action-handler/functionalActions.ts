import { track } from "@/lib/analytics";
import { STEPS } from "../../constants";
import practiceActions from "../../actions";
import { reportActionError } from "./errorHandling";
import type { FunctionalDeps, StepHandler } from "./types";

export function createFunctionalHandler(deps: FunctionalDeps): StepHandler {
  const {
    slug,
    router,
    isSignedIn: _isSignedIn,
    functionalRequirements,
    setFunctionalRequirements,
    setModalOpen,
    setIsActionLoading,
    setActionError,
    setStepCompletion,
  } = deps;

  return async (action, ...args) => {
    if (action === "back") {
      router.push(`/practice/${slug}`);
      return;
    }

    if (action === "next") {
      track("practice_functional_attempted", { slug });

      try {
        if (functionalRequirements.submission) {
          setModalOpen(true);
          return;
        }

        setActionError(null);
        setIsActionLoading(true);

        const evaluationResponse = await practiceActions.functional.evaluate(
          slug,
          functionalRequirements
        );
        setIsActionLoading(false);

        const allComplete = evaluationResponse.results.every(
          (result: { complete: boolean }) => result.complete
        );
        const currentAttempts = functionalRequirements.attempts ?? 0;
        const newAttempts = allComplete ? 0 : currentAttempts + 1;

        setFunctionalRequirements({
          submission: evaluationResponse,
          attempts: newAttempts,
        });

        // Update step completion status for stepper
        setStepCompletion("functional", allComplete);

        track("practice_functional_completed", { slug, score: evaluationResponse.score });
        setModalOpen(true);
      } catch (error) {
        reportActionError({
          slug,
          step: "functional",
          error,
          message: "Failed to save/evaluate functional requirements:",
          setActionError,
        });
        setIsActionLoading(false);
      }
      return;
    }

    if (action === "continue") {
      setModalOpen(false);
      router.push(`/practice/${slug}/non-functional`);
      return;
    }

    if (action === "revise") {
      track("practice_step_revised", {
        slug,
        step: "functional",
        attempts: functionalRequirements.attempts ?? 0,
      });
      setModalOpen(false);
      return;
    }

    if (action === "changeTextBox") {
      const [value] = args as [string];
      setFunctionalRequirements({
        textField: { ...functionalRequirements.textField, value },
        submission: undefined,
      });
      return;
    }

    if (action === "insert") {
      const [solutionText] = args as [string];
      track("practice_solution_inserted", {
        slug,
        step: "functional",
        attempts: functionalRequirements.attempts ?? 0,
      });
      setFunctionalRequirements({
        textField: { ...functionalRequirements.textField, value: solutionText },
        submission: undefined,
      });
      return;
    }

    if (action === "assistanceQuestion") {
      track("assistance_question_submitted", { slug, step: STEPS.FUNCTIONAL });
    }
  };
}
