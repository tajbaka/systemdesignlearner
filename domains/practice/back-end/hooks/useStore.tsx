"use client";

import { useEffect, useMemo } from "react";
import { stepStateStore, type ProblemState } from "../store/store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

// Type for the scoped problem state with actions
export type ScopedProblemState = ProblemState & {
  loading: boolean;
  isModalOpen: boolean;
  isActionLoading: boolean;
  setFunctionalRequirements: (data: Partial<ProblemState["functionalRequirements"]>) => void;
  setNonFunctionalRequirements: (data: Partial<ProblemState["nonFunctionalRequirements"]>) => void;
  setApiDesign: (data: Partial<ProblemState["apiDesign"]>) => void;
  setHighLevelDesign: (data: Partial<ProblemState["highLevelDesign"]>) => void;
  setScore: (data: Partial<ProblemState["score"]>) => void;
  setLoading: (loading: boolean) => void;
  setModalOpen: (isOpen: boolean) => void;
  setIsActionLoading: (isLoading: boolean) => void;
  setViewedTooltip: (stepType: string) => void;
  resetState: () => void;
};

// Hook to get scoped problem state
export default function useStepStore(slug: string): ScopedProblemState {
  // Select only the plain data — useShallow prevents re-renders when values are equal
  const state = useStore(
    stepStateStore,
    useShallow((s) => {
      const problemState = s.getProblemState(slug);
      return {
        ...problemState,
        loading: s.loading,
        isModalOpen: s.isModalOpen,
        isActionLoading: s.isActionLoading,
      };
    })
  );

  // Lazily persist the problem state into the store on first mount
  useEffect(() => {
    stepStateStore.getState().ensureProblemState(slug);
  }, [slug]);

  // Stable action references — only recreated when slug changes
  const actions = useMemo(() => {
    const store = stepStateStore.getState();
    return {
      setFunctionalRequirements: (data: Partial<ProblemState["functionalRequirements"]>) =>
        stepStateStore.getState().setFunctionalRequirements(slug, data),
      setNonFunctionalRequirements: (data: Partial<ProblemState["nonFunctionalRequirements"]>) =>
        stepStateStore.getState().setNonFunctionalRequirements(slug, data),
      setApiDesign: (data: Partial<ProblemState["apiDesign"]>) =>
        stepStateStore.getState().setApiDesign(slug, data),
      setHighLevelDesign: (data: Partial<ProblemState["highLevelDesign"]>) =>
        stepStateStore.getState().setHighLevelDesign(slug, data),
      setScore: (data: Partial<ProblemState["score"]>) =>
        stepStateStore.getState().setScore(slug, data),
      setLoading: store.setLoading,
      setModalOpen: store.setModalOpen,
      setIsActionLoading: store.setIsActionLoading,
      setViewedTooltip: (stepType: string) =>
        stepStateStore.getState().setViewedTooltip(slug, stepType),
      resetState: () => stepStateStore.getState().resetState(slug),
    };
  }, [slug]);

  return { ...state, ...actions };
}
