"use client";

import { stepStateStore, type ProblemState } from "./store";
import { useStore } from "zustand";

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
  return useStore(stepStateStore, (state) => {
    const problemState = state.getProblemState(slug);

    return {
      // Problem-specific state
      ...problemState,
      // Global state
      loading: state.loading,
      isModalOpen: state.isModalOpen,
      isActionLoading: state.isActionLoading,
      // Actions scoped to this problem
      setFunctionalRequirements: (data) => state.setFunctionalRequirements(slug, data),
      setNonFunctionalRequirements: (data) => state.setNonFunctionalRequirements(slug, data),
      setApiDesign: (data) => state.setApiDesign(slug, data),
      setHighLevelDesign: (data) => state.setHighLevelDesign(slug, data),
      setScore: (data) => state.setScore(slug, data),
      setLoading: state.setLoading,
      setModalOpen: state.setModalOpen,
      setIsActionLoading: state.setIsActionLoading,
      setViewedTooltip: (stepType) => state.setViewedTooltip(slug, stepType),
      resetState: () => state.resetState(slug),
    };
  });
}
