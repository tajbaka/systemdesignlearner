"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type PracticeApiDefinitionState,
  type PracticeAuthState,
  type PracticeDesignState,
  type PracticeRunState,
  type PracticeState,
  type PracticeStep,
  type PracticeStepScores,
  type Requirements,
  type PracticeIterativeFeedback,
} from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import { makeInitialPracticeState } from "@/lib/practice/defaults";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import { track } from "@/lib/analytics";
import {
  ensureApiDefinition,
  ensureAuthProgressConsistency,
  ensureIterativeFeedback,
  ensureRequirements,
  mergeState,
} from "@/lib/practice/migration";

type PracticeSessionContextValue = {
  state: PracticeState;
  isReadOnly: boolean;
  hydrated: boolean;
  currentStep: PracticeStep;
  setRequirements: (value: Requirements) => void;
  setApiDefinition: (
    updater: (prev: PracticeApiDefinitionState) => PracticeApiDefinitionState
  ) => void;
  setDesign: (updater: (prev: PracticeDesignState) => PracticeDesignState) => void;
  setRun: (updater: (prev: PracticeRunState) => PracticeRunState) => void;
  setAuth: (updater: (prev: PracticeAuthState) => PracticeAuthState) => void;
  markStep: (step: PracticeStep, value: boolean) => void;
  setStepScore: (step: keyof PracticeStepScores, result: FeedbackResult | undefined) => void;
  updateIterativeFeedback: (
    step: keyof PracticeIterativeFeedback,
    updater: (
      prev: PracticeIterativeFeedback[keyof PracticeIterativeFeedback]
    ) => PracticeIterativeFeedback[keyof PracticeIterativeFeedback]
  ) => void;
  resetIterativeFeedback: (step?: keyof PracticeIterativeFeedback) => void;
  flushToStorage: () => void;
};

const PracticeSessionContext = createContext<PracticeSessionContextValue | undefined>(undefined);

type PracticeSessionProviderProps = {
  children: React.ReactNode;
  slug: string;
  initialStep: PracticeStep;
  sharedState?: PracticeState | null;
};

export function PracticeSessionProvider({
  children,
  slug,
  initialStep,
  sharedState,
}: PracticeSessionProviderProps) {
  const [state, setState] = useState<PracticeState>(() => {
    const initial = makeInitialPracticeState(slug);
    // Use initialStep from URL instead of deriving from state
    return { ...initial, currentStep: initialStep };
  });
  const [hydrated, setHydrated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const saveTimeout = useRef<number | null>(null);
  const latestStateRef = useRef(state);

  useEffect(() => {
    if (sharedState) {
      let merged = mergeState(sharedState, slug);
      // Use initialStep from URL for shared state too
      merged = { ...merged, currentStep: initialStep };
      setState(merged);
      setIsReadOnly(true);
      setHydrated(true);
      track("practice_shared_viewed", { slug });
      return;
    }

    const stored = loadPractice(slug);
    let merged = ensureAuthProgressConsistency(mergeState(stored, slug));
    // Use initialStep from URL instead of deriving
    merged = { ...merged, currentStep: initialStep };
    setState(merged);
    setIsReadOnly(false);
    setHydrated(true);

    track("practice_start", {
      slug,
      step: initialStep,
      isFirstVisit: !stored,
      hasProgress: Boolean(stored),
    });
  }, [sharedState, slug, initialStep]);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!hydrated || isReadOnly) return;
    if (typeof window === "undefined") return;

    if (saveTimeout.current) {
      window.clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = window.setTimeout(() => {
      savePractice(state);
      saveTimeout.current = null;
    }, 400);

    return () => {
      if (saveTimeout.current) {
        window.clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    };
  }, [state, hydrated, isReadOnly]);

  useEffect(() => {
    if (!hydrated || isReadOnly) return;
    if (typeof window === "undefined") return;

    const persistImmediately = () => {
      savePractice(latestStateRef.current);
    };

    window.addEventListener("beforeunload", persistImmediately);
    window.addEventListener("pagehide", persistImmediately);

    return () => {
      window.removeEventListener("beforeunload", persistImmediately);
      window.removeEventListener("pagehide", persistImmediately);
    };
  }, [hydrated, isReadOnly]);

  const setStateWithTimestamp = useCallback(
    (updater: (prev: PracticeState) => PracticeState) => {
      if (isReadOnly) return;
      setState((prev) => {
        const next = {
          ...updater(prev),
          updatedAt: Date.now(),
        };
        latestStateRef.current = next;
        return next;
      });
    },
    [isReadOnly]
  );

  const setRequirements = useCallback(
    (value: Requirements) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        requirements: ensureRequirements(value, prev.slug),
      }));
    },
    [setStateWithTimestamp]
  );

  const setApiDefinition = useCallback(
    (updater: (prev: PracticeApiDefinitionState) => PracticeApiDefinitionState) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        apiDefinition: ensureApiDefinition(updater(prev.apiDefinition), prev.slug),
      }));
    },
    [setStateWithTimestamp]
  );

  const setDesign = useCallback(
    (updater: (prev: PracticeDesignState) => PracticeDesignState) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        design: updater(prev.design),
      }));
    },
    [setStateWithTimestamp]
  );

  const setRun = useCallback(
    (updater: (prev: PracticeRunState) => PracticeRunState) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        run: updater(prev.run),
      }));
    },
    [setStateWithTimestamp]
  );

  const setAuth = useCallback(
    (updater: (prev: PracticeAuthState) => PracticeAuthState) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        auth: updater(prev.auth),
      }));
    },
    [setStateWithTimestamp]
  );

  const markStep = useCallback(
    (step: PracticeStep, value: boolean) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        completed: {
          ...prev.completed,
          [step]: value,
        },
      }));
    },
    [setStateWithTimestamp]
  );

  const setStepScore = useCallback(
    (step: keyof PracticeStepScores, result: FeedbackResult | undefined) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        scores: {
          ...prev.scores,
          [step]: result,
        },
      }));
    },
    [setStateWithTimestamp]
  );

  const updateIterativeFeedback = useCallback(
    (
      step: keyof PracticeIterativeFeedback,
      updater: (
        prev: PracticeIterativeFeedback[keyof PracticeIterativeFeedback]
      ) => PracticeIterativeFeedback[keyof PracticeIterativeFeedback]
    ) => {
      setStateWithTimestamp((prev) => {
        const iterativeFeedback = prev.iterativeFeedback || ensureIterativeFeedback();
        return {
          ...prev,
          iterativeFeedback: {
            ...iterativeFeedback,
            [step]: updater(iterativeFeedback[step]),
          },
        };
      });
    },
    [setStateWithTimestamp]
  );

  const resetIterativeFeedback = useCallback(
    (step?: keyof PracticeIterativeFeedback) => {
      setStateWithTimestamp((prev) => {
        if (step) {
          // Reset specific step
          const iterativeFeedback = prev.iterativeFeedback || ensureIterativeFeedback();
          return {
            ...prev,
            iterativeFeedback: {
              ...iterativeFeedback,
              [step]: {
                coveredTopics: {},
                lastContent: "",
                currentQuestion: null,
                cachedResult: null,
              },
            },
          };
        }
        // Reset all
        return {
          ...prev,
          iterativeFeedback: ensureIterativeFeedback(),
        };
      });
      track("practice_iterative_feedback_reset", { slug: state.slug, step: step || "all" });
    },
    [setStateWithTimestamp, state.slug]
  );

  const flushToStorage = useCallback(() => {
    if (isReadOnly) return;
    // Clear any pending save timeout and save immediately
    if (saveTimeout.current) {
      window.clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    savePractice(latestStateRef.current);
  }, [isReadOnly]);

  const value = useMemo<PracticeSessionContextValue>(
    () => ({
      state,
      isReadOnly,
      hydrated,
      currentStep: state.currentStep,
      setRequirements,
      setApiDefinition,
      setDesign,
      setRun,
      setAuth,
      markStep,
      setStepScore,
      updateIterativeFeedback,
      resetIterativeFeedback,
      flushToStorage,
    }),
    [
      state,
      isReadOnly,
      hydrated,
      setRequirements,
      setApiDefinition,
      setDesign,
      setRun,
      setAuth,
      markStep,
      setStepScore,
      updateIterativeFeedback,
      resetIterativeFeedback,
      flushToStorage,
    ]
  );

  return (
    <PracticeSessionContext.Provider value={value}>{children}</PracticeSessionContext.Provider>
  );
}

export const usePracticeSession = (): PracticeSessionContextValue => {
  const context = useContext(PracticeSessionContext);
  if (!context) {
    throw new Error("usePracticeSession must be used within PracticeSessionProvider");
  }
  return context;
};
