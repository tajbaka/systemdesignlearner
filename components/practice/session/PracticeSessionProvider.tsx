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
} from "@/lib/practice/types";
import type { FeedbackResult } from "@/lib/scoring/types";
import {
  makeDefaultApiDefinition,
  makeDefaultRequirements,
  makeInitialPracticeState,
} from "@/lib/practice/defaults";
import { loadPractice, savePractice } from "@/lib/practice/storage";
import { track } from "@/lib/analytics";

const PRACTICE_SLUG: PracticeState["slug"] = "url-shortener";

type LegacyLocked = {
  brief?: boolean;
  design?: boolean;
  run?: boolean;
};

type LegacyPracticeState = Partial<{
  slug: string;
  requirements: Requirements | {
    functional: Record<string, boolean>;
    nonFunctional: Partial<Requirements["nonFunctional"]>;
  };
  design: PracticeDesignState;
  run: PracticeRunState;
  locked: LegacyLocked;
  updatedAt: number;
}>;

const ensureRequirements = (value?: Requirements | LegacyPracticeState["requirements"]): Requirements => {
  const defaults = makeDefaultRequirements();
  if (!value) return defaults;

  const candidate = value as Requirements;
  const functionalSummary = typeof (candidate as Requirements).functionalSummary === "string"
    ? candidate.functionalSummary
    : "";

  const functional = {
    ...defaults.functional,
    ...(candidate?.functional ?? {}),
  };

  const nonFunctionalLegacy = (value as { nonFunctional?: Partial<Requirements["nonFunctional"]> }).nonFunctional;
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

const ensureApiDefinition = (value?: PracticeApiDefinitionState): PracticeApiDefinitionState => {
  if (!value || !Array.isArray(value.endpoints)) {
    return makeDefaultApiDefinition();
  }

  const endpoints = value.endpoints.map((endpoint, index) => ({
    id: endpoint.id ?? `endpoint-${index}`,
    method: endpoint.method ?? "GET",
    path: endpoint.path ?? "/",
    notes: endpoint.notes ?? "",
    suggested: Boolean(endpoint.suggested),
  }));

  return {
    endpoints,
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
  sandbox: Boolean(value?.sandbox),
  score: Boolean(value?.score),
});

const migrateLegacyProgress = (locked?: LegacyLocked): PracticeProgress => ({
  functional: Boolean(locked?.brief),
  nonFunctional: Boolean(locked?.brief),
  api: false,
  sandbox: Boolean(locked?.design),
  score: Boolean(locked?.run),
});

const mergeState = (raw: PracticeState | LegacyPracticeState | null): PracticeState => {
  const defaults = makeInitialPracticeState();
  if (!raw) return defaults;

  const candidate = raw as PracticeState;
  const isModern =
    typeof candidate.completed === "object" &&
    candidate.completed !== null &&
    Array.isArray((candidate as PracticeState).apiDefinition?.endpoints);

  if (isModern) {
    return {
      ...defaults,
      ...candidate,
      requirements: ensureRequirements(candidate.requirements),
      apiDefinition: ensureApiDefinition(candidate.apiDefinition),
      design: candidate.design ?? defaults.design,
      run: candidate.run ?? defaults.run,
      auth: ensureAuthState(candidate.auth),
      completed: ensureProgress(candidate.completed),
      updatedAt: candidate.updatedAt ?? Date.now(),
    };
  }

  const legacy = raw as LegacyPracticeState;
  return {
    ...defaults,
    slug: "url-shortener",
    requirements: ensureRequirements(legacy.requirements as Requirements),
    apiDefinition: ensureApiDefinition(),
    design: legacy.design ?? defaults.design,
    run: legacy.run ?? defaults.run,
    auth: ensureAuthState(),
    completed: migrateLegacyProgress(legacy.locked),
    updatedAt: legacy.updatedAt ?? Date.now(),
  };
};

const deriveInitialStep = (state: PracticeState): PracticeStep => {
  for (const step of PRACTICE_STEPS) {
    if (!state.completed[step]) {
      return step;
    }
  }
  return PRACTICE_STEPS[PRACTICE_STEPS.length - 1];
};

type PracticeSessionContextValue = {
  state: PracticeState;
  isReadOnly: boolean;
  hydrated: boolean;
  currentStep: PracticeStep;
  setStep: (step: PracticeStep) => void;
  goNext: () => void;
  goPrev: () => void;
  setRequirements: (value: Requirements) => void;
  setApiDefinition: (updater: (prev: PracticeApiDefinitionState) => PracticeApiDefinitionState) => void;
  setDesign: (updater: (prev: PracticeDesignState) => PracticeDesignState) => void;
  setRun: (updater: (prev: PracticeRunState) => PracticeRunState) => void;
  setAuth: (updater: (prev: PracticeAuthState) => PracticeAuthState) => void;
  markStep: (step: PracticeStep, value: boolean) => void;
  setStepScore: (step: keyof PracticeStepScores, result: FeedbackResult | undefined) => void;
};

const PracticeSessionContext = createContext<PracticeSessionContextValue | undefined>(undefined);

type PracticeSessionProviderProps = {
  children: React.ReactNode;
  sharedState?: PracticeState | null;
};

export function PracticeSessionProvider({ children, sharedState }: PracticeSessionProviderProps) {
  const [state, setState] = useState<PracticeState>(() => makeInitialPracticeState());
  const [hydrated, setHydrated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [currentStep, setCurrentStep] = useState<PracticeStep>("functional");
  const saveTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (sharedState) {
      const merged = mergeState(sharedState);
      setState(merged);
      setIsReadOnly(true);
      setCurrentStep("score");
      setHydrated(true);
      track("practice_shared_viewed", { slug: PRACTICE_SLUG });
      return;
    }

    const stored = loadPractice(PRACTICE_SLUG);
    const merged = mergeState(stored);
    setState(merged);
    setIsReadOnly(false);
    setCurrentStep(deriveInitialStep(merged));
    setHydrated(true);

    track("practice_start", {
      slug: PRACTICE_SLUG,
      isFirstVisit: !stored,
      hasProgress: Boolean(stored),
    });
  }, [sharedState]);

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

  const setStateWithTimestamp = useCallback(
    (updater: (prev: PracticeState) => PracticeState) => {
      if (isReadOnly) return;
      setState((prev) => {
        const next = updater(prev);
        return {
          ...next,
          updatedAt: Date.now(),
        };
      });
    },
    [isReadOnly]
  );

  const setRequirements = useCallback(
    (value: Requirements) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        requirements: ensureRequirements(value),
      }));
    },
    [setStateWithTimestamp]
  );

  const setApiDefinition = useCallback(
    (updater: (prev: PracticeApiDefinitionState) => PracticeApiDefinitionState) => {
      setStateWithTimestamp((prev) => ({
        ...prev,
        apiDefinition: ensureApiDefinition(updater(prev.apiDefinition)),
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

  const setStep = useCallback(
    (step: PracticeStep) => {
      if (isReadOnly) {
        setCurrentStep(step);
        return;
      }
      setCurrentStep(step);
      track("practice_step_viewed", { slug: PRACTICE_SLUG, step });
    },
    [isReadOnly]
  );

  const goNext = useCallback(() => {
    if (isReadOnly) return;
    const index = PRACTICE_STEPS.indexOf(currentStep);
    if (index === -1 || index >= PRACTICE_STEPS.length - 1) return;
    const next = PRACTICE_STEPS[index + 1];
    setStep(next);
  }, [currentStep, isReadOnly, setStep]);

  const goPrev = useCallback(() => {
    if (isReadOnly) return;
    const index = PRACTICE_STEPS.indexOf(currentStep);
    if (index <= 0) return;
    const prevStep = PRACTICE_STEPS[index - 1];
    setStep(prevStep);
  }, [currentStep, isReadOnly, setStep]);

  const value = useMemo<PracticeSessionContextValue>(
    () => ({
      state,
      isReadOnly,
      hydrated,
      currentStep,
      setStep,
      goNext,
      goPrev,
      setRequirements,
      setApiDefinition,
      setDesign,
      setRun,
      setAuth,
      markStep,
      setStepScore,
    }),
    [
      state,
      isReadOnly,
      hydrated,
      currentStep,
      setStep,
      goNext,
      goPrev,
      setRequirements,
      setApiDefinition,
      setDesign,
      setRun,
      setAuth,
      markStep,
      setStepScore,
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
