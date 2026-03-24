import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { STEPS } from "../../constants";
import type { StepHandlers } from "../../types";
import useStepStateStore from "../useStore";

import { createIntroHandler } from "./introActions";
import { createFunctionalHandler } from "./functionalActions";
import { createNonFunctionalHandler } from "./nonFunctionalActions";
import { createApiHandler } from "./apiActions";
import { createHighLevelDesignHandler } from "./highLevelDesignActions";
import { createScoreHandler } from "./scoreActions";

type UseActionHandlerOptions = {
  isSignedIn: boolean;
  openAuthModal: () => void;
};

/**
 * Hook that maps steps to their handler functions.
 * Each step has isolated handler logic in its own file.
 */
export function useActionHandler(slug: string, options?: UseActionHandlerOptions): StepHandlers {
  const { isSignedIn = false, openAuthModal = () => {} } = options ?? {};
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    functionalRequirements,
    setFunctionalRequirements,
    nonFunctionalRequirements,
    setNonFunctionalRequirements,
    apiDesign,
    setApiDesign,
    highLevelDesign,
    setHighLevelDesign,
    setScore,
    setModalOpen,
    setIsActionLoading,
    setActionError,
    setStepCompletion,
  } = useStepStateStore(slug);

  const handlers: StepHandlers = useMemo(
    () => ({
      [STEPS.INTRO]: createIntroHandler({
        slug,
        router,
        isSignedIn,
        setModalOpen,
        setIsActionLoading,
        setActionError,
        setStepCompletion,
      }),

      [STEPS.FUNCTIONAL]: createFunctionalHandler({
        slug,
        router,
        isSignedIn,
        functionalRequirements,
        setFunctionalRequirements,
        setModalOpen,
        setIsActionLoading,
        setActionError,
        setStepCompletion,
      }),

      [STEPS.NON_FUNCTIONAL]: createNonFunctionalHandler({
        slug,
        router,
        isSignedIn,
        nonFunctionalRequirements,
        setNonFunctionalRequirements,
        setModalOpen,
        setIsActionLoading,
        setActionError,
        setStepCompletion,
      }),

      [STEPS.API]: createApiHandler({
        slug,
        router,
        isSignedIn,
        searchParams,
        apiDesign,
        setApiDesign,
        setModalOpen,
        setIsActionLoading,
        setActionError,
        setStepCompletion,
      }),

      [STEPS.HIGH_LEVEL_DESIGN]: createHighLevelDesignHandler({
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
      }),

      [STEPS.SCORE]: createScoreHandler({
        slug,
        router,
        isSignedIn,
        setScore,
        setModalOpen,
        setIsActionLoading,
        setActionError,
        setStepCompletion,
      }),
    }),
    [
      slug,
      router,
      searchParams,
      functionalRequirements,
      setFunctionalRequirements,
      nonFunctionalRequirements,
      setNonFunctionalRequirements,
      apiDesign,
      setApiDesign,
      highLevelDesign,
      setHighLevelDesign,
      setScore,
      setModalOpen,
      setIsActionLoading,
      setActionError,
      setStepCompletion,
      isSignedIn,
      openAuthModal,
    ]
  );

  return handlers;
}
