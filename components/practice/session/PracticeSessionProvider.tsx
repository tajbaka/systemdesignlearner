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
  PRACTICE_STEPS,
  type PracticeApiDefinitionState,
  type PracticeAuthState,
  type PracticeDesignState,
  type PracticeProgress,
  type PracticeRunState,
  type PracticeState,
  type PracticeStep,
  type PracticeStepScores,
  type Requirements,
  type PracticeIterativeFeedback,
} from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import {
  makeDefaultApiDefinition,
  makeDefaultDesignState,
  makeDefaultRequirements,
  makeInitialPracticeState,
} from "@/lib/practice/defaults";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import { track } from "@/lib/analytics";
import { isLegacyPlaceholderContent } from "@/lib/practice/apiPlaceholders";

type LegacyLocked = {
  brief?: boolean;
  design?: boolean;
  run?: boolean;
};

type LegacyPracticeState = Partial<{
  slug: string;
  requirements:
    | Requirements
    | {
        functional: Record<string, boolean>;
        nonFunctional: Partial<Requirements["nonFunctional"]>;
      };
  design: PracticeDesignState;
  run: PracticeRunState;
  locked: LegacyLocked;
  updatedAt: number;
}>;

const ensureRequirements = (
  value?: Requirements | LegacyPracticeState["requirements"],
  slug = "url-shortener"
): Requirements => {
  const defaults = makeDefaultRequirements(slug);
  if (!value) return defaults;

  const candidate = value as Requirements;
  const functionalSummary =
    typeof (candidate as Requirements).functionalSummary === "string"
      ? candidate.functionalSummary
      : "";

  const functional = {
    ...defaults.functional,
    ...(candidate?.functional ?? {}),
  };

  const nonFunctionalLegacy = (value as { nonFunctional?: Partial<Requirements["nonFunctional"]> })
    .nonFunctional;
  const nonFunctional = {
    ...defaults.nonFunctional,
    ...(candidate?.nonFunctional ?? {}),
    ...(nonFunctionalLegacy ?? {}),
  };

  if (typeof nonFunctional.rateLimitNotes !== "string") {
    nonFunctional.rateLimitNotes = "";
  }

  if (typeof nonFunctional.notes !== "string") {
    nonFunctional.notes = "";
  }

  return {
    functionalSummary,
    functional,
    nonFunctional,
  };
};

const ensureApiDefinition = (
  value?: PracticeApiDefinitionState,
  slug = "url-shortener"
): PracticeApiDefinitionState => {
  if (!value || !Array.isArray(value.endpoints)) {
    return makeDefaultApiDefinition(slug);
  }

  const endpoints = value.endpoints.map((endpoint, index) => {
    const method = endpoint.method ?? "GET";
    const path = endpoint.path ?? "/";
    const rawNotes = typeof endpoint.notes === "string" ? endpoint.notes : "";
    const notes = isLegacyPlaceholderContent(rawNotes, method, path) ? "" : rawNotes;

    return {
      id: endpoint.id ?? `endpoint-${index}`,
      method,
      path,
      notes,
      suggested: Boolean(endpoint.suggested),
    };
  });

  return {
    endpoints,
  };
};

const sanitizeDesignState = (
  value?: PracticeDesignState,
  slug = "url-shortener"
): PracticeDesignState => {
  const design = value ?? makeDefaultDesignState(slug);
  const nodeIds = new Set(design.nodes.map((node) => node.id));
  const edgeIds = new Set(design.edges.map((edge) => edge.id));
  const hasLegacySeedEdge =
    design.edges.length === 0 || (design.edges.length === 1 && edgeIds.has("seed-edge-web-api"));
  const hasLegacySeedLayout =
    nodeIds.size === 2 && nodeIds.has("seed-web") && nodeIds.has("seed-api") && hasLegacySeedEdge;

  if (!hasLegacySeedLayout) {
    return design;
  }

  return {
    ...design,
    nodes: design.nodes.filter((node) => node.id !== "seed-api"),
    edges: design.edges.filter((edge) => edge.id !== "seed-edge-web-api"),
  };
};

const ensureAuthState = (value?: PracticeAuthState): PracticeAuthState => ({
  isAuthed: Boolean(value?.isAuthed),
  skipped: Boolean(value?.skipped),
});

const ensureProgress = (value?: PracticeProgress): PracticeProgress => ({
  functional: Boolean(value?.functional),
  nonFunctional: Boolean(value?.nonFunctional),
  api: Boolean(value?.api),
  highLevelDesign: Boolean(value?.highLevelDesign),
  score: Boolean(value?.score),
});

const migrateLegacyProgress = (locked?: LegacyLocked): PracticeProgress => ({
  functional: Boolean(locked?.brief),
  nonFunctional: Boolean(locked?.brief),
  api: false,
  highLevelDesign: Boolean(locked?.design),
  score: Boolean(locked?.run),
});

const ensureIterativeFeedback = (value?: PracticeIterativeFeedback): PracticeIterativeFeedback => ({
  functional: {
    coveredTopics: value?.functional?.coveredTopics ?? {},
    lastContent: value?.functional?.lastContent ?? "",
    currentQuestion: value?.functional?.currentQuestion ?? null,
    cachedResult: value?.functional?.cachedResult ?? null,
  },
  nonFunctional: {
    coveredTopics: value?.nonFunctional?.coveredTopics ?? {},
    lastContent: value?.nonFunctional?.lastContent ?? "",
    currentQuestion: value?.nonFunctional?.currentQuestion ?? null,
    cachedResult: value?.nonFunctional?.cachedResult ?? null,
  },
  api: {
    coveredTopics: value?.api?.coveredTopics ?? {},
    lastContent: value?.api?.lastContent ?? "",
    currentQuestion: value?.api?.currentQuestion ?? null,
    cachedResult: value?.api?.cachedResult ?? null,
  },
  design: {
    coveredTopics: value?.design?.coveredTopics ?? {},
    lastContent: value?.design?.lastContent ?? "",
    currentQuestion: value?.design?.currentQuestion ?? null,
    cachedResult: value?.design?.cachedResult ?? null,
  },
});

const mergeState = (
  raw: PracticeState | LegacyPracticeState | null,
  slug: string
): PracticeState => {
  const defaults = makeInitialPracticeState(slug);
  if (!raw) return defaults;

  const candidate = raw as PracticeState;
  const isModern =
    typeof candidate.completed === "object" &&
    candidate.completed !== null &&
    Array.isArray((candidate as PracticeState).apiDefinition?.endpoints);

  if (isModern) {
    // Use the slug from candidate if it exists, otherwise use the provided slug
    const finalSlug = candidate.slug || slug;
    return {
      ...defaults,
      ...candidate,
      slug: finalSlug,
      // Ensure currentStep exists, default to functional if not present (for backwards compatibility)
      currentStep: candidate.currentStep ?? defaults.currentStep,
      requirements: ensureRequirements(candidate.requirements, finalSlug),
      apiDefinition: ensureApiDefinition(candidate.apiDefinition, finalSlug),
      design: sanitizeDesignState(candidate.design ?? defaults.design, finalSlug),
      run: {
        ...defaults.run,
        ...(candidate.run ?? {}),
      },
      auth: ensureAuthState(candidate.auth),
      completed: ensureProgress(candidate.completed),
      scores: candidate.scores ?? defaults.scores,
      iterativeFeedback: ensureIterativeFeedback(candidate.iterativeFeedback),
      updatedAt: candidate.updatedAt ?? Date.now(),
    };
  }

  const legacy = raw as LegacyPracticeState;
  return {
    ...defaults,
    slug,
    requirements: ensureRequirements(legacy.requirements as Requirements, slug),
    apiDefinition: ensureApiDefinition(undefined, slug),
    design: sanitizeDesignState(legacy.design ?? defaults.design, slug),
    run: {
      ...defaults.run,
      ...(legacy.run ?? {}),
    },
    auth: ensureAuthState(),
    completed: migrateLegacyProgress(legacy.locked),
    iterativeFeedback: ensureIterativeFeedback(),
    updatedAt: legacy.updatedAt ?? Date.now(),
  };
};

const _deriveInitialStep = (state: PracticeState): PracticeStep => {
  for (const step of PRACTICE_STEPS) {
    if (!state.completed[step]) {
      return step;
    }
  }
  const lastStep = PRACTICE_STEPS[PRACTICE_STEPS.length - 1];
  return lastStep;
};

const ensureAuthProgressConsistency = (state: PracticeState): PracticeState => {
  // If authenticated, keep all progress as-is
  if (state.auth.isAuthed) {
    return state;
  }

  // If both sandbox and score are incomplete, no need to modify
  if (!state.completed.highLevelDesign && !state.completed.score) {
    return state;
  }

  // Don't clear progress during active sessions or auth transitions
  // Only clear if the session has been abandoned (e.g., cleared auth but kept progress)
  // This prevents clearing progress when user is actively going through the auth flow
  // The PracticeFlow component will handle step gating based on auth state
  return state;
};

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
