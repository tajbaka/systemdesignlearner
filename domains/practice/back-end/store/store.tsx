"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HttpMethod } from "../api-design/components/MethodSelect";
import type { PracticeDesignState } from "../high-level-design/types";
import type {
  EvaluationResult,
  APIEvaluationResult,
} from "@/server/domains/practice/services/evaluation/types";

// Step-specific data types with results
export type FunctionalRequirements = {
  textField: {
    id: string;
    value: string;
  };
  submission?: EvaluationResult;
  attempts?: number;
};

export type NonFunctionalRequirements = {
  textField: {
    id: string;
    value: string;
  };
  submission?: EvaluationResult;
  attempts?: number;
};

export type EndpointItem = {
  id: string;
  value: string;
  method: {
    id: string;
    value: HttpMethod;
  };
  path: {
    id: string;
    value: string;
  };
  description: {
    id: string;
    value: string;
  };
};

export type ApiDesign = {
  endpoints: EndpointItem[];
  submission?: APIEvaluationResult;
  attempts?: number;
};

export type HighLevelDesign = {
  design: PracticeDesignState;
  submission?: EvaluationResult;
  attempts?: number;
};

export type StepScore = {
  stepType: string;
  title: string;
  order: number;
  score: number;
  maxScore: number;
  completed: boolean;
};

export type Score = {
  stepScores: StepScore[];
};

// Per-problem state
export type ProblemState = {
  functionalRequirements: FunctionalRequirements;
  nonFunctionalRequirements: NonFunctionalRequirements;
  apiDesign: ApiDesign;
  highLevelDesign: HighLevelDesign;
  score: Score;
  viewedTooltips: string[]; // Track which step tooltips have been viewed (stored as array for persistence)
  needsSync: boolean; // Flag to trigger backend sync after auth
  stepCompletion: Record<string, boolean>; // Explicit step completion status, updated only after evaluation
};

export interface StepStateStoreState {
  loading: boolean;
  // Nested problems state indexed by slug
  problems: Record<string, ProblemState>;

  // Global modal state (not scoped to problem)
  isModalOpen: boolean;
  isActionLoading: boolean;
  actionError: string | null;

  // Actions - now require slug parameter
  setFunctionalRequirements: (slug: string, data: Partial<FunctionalRequirements>) => void;
  setNonFunctionalRequirements: (slug: string, data: Partial<NonFunctionalRequirements>) => void;
  setApiDesign: (slug: string, data: Partial<ApiDesign>) => void;
  setHighLevelDesign: (slug: string, data: Partial<HighLevelDesign>) => void;
  setScore: (slug: string, data: Partial<Score>) => void;

  setLoading: (loading: boolean) => void;
  setModalOpen: (isOpen: boolean) => void;
  setIsActionLoading: (isLoading: boolean) => void;
  setActionError: (error: string | null) => void;
  setViewedTooltip: (slug: string, stepType: string) => void;
  setNeedsSync: (slug: string, needsSync: boolean) => void;
  setStepCompletion: (slug: string, stepType: string, completed: boolean) => void;
  resetState: (slug: string) => void;
  clearAllProblems: () => void;

  // Helper to get or initialize problem state (pure read — safe inside selectors)
  getProblemState: (slug: string) => ProblemState;
  // Ensure a problem slug is initialized in the store (call from effects, not selectors)
  ensureProblemState: (slug: string) => void;
}

export type StepStateStore = StepStateStoreState;

// Helper function to create initial problem state
const createInitialProblemState = (): ProblemState => ({
  functionalRequirements: {
    textField: {
      id: `functional-textfield-${crypto.randomUUID()}`,
      value: "",
    },
    submission: undefined,
    attempts: 0,
  },
  nonFunctionalRequirements: {
    textField: {
      id: `nonfunctional-textfield-${crypto.randomUUID()}`,
      value: "",
    },
    submission: undefined,
    attempts: 0,
  },
  apiDesign: {
    endpoints: [
      (() => {
        const baseId = crypto.randomUUID();
        return {
          id: `endpoint-${baseId}`,
          value: "",
          method: {
            id: `method-${baseId}`,
            value: "GET" as HttpMethod,
          },
          path: {
            id: `path-${baseId}`,
            value: "",
          },
          description: {
            id: `description-${baseId}`,
            value: "",
          },
        };
      })(),
    ],
    submission: undefined,
    attempts: 0,
  },
  highLevelDesign: {
    design: {
      nodes: [
        {
          id: "Client-1",
          type: "Client",
          name: "Client",
          x: 100,
          y: 250,
        },
      ],
      edges: [],
    },
    submission: undefined,
    attempts: 0,
  },
  score: {
    stepScores: [],
  },
  viewedTooltips: [],
  needsSync: false,
  stepCompletion: {},
});

const initialState: Omit<
  StepStateStoreState,
  | "setFunctionalRequirements"
  | "setNonFunctionalRequirements"
  | "setApiDesign"
  | "setHighLevelDesign"
  | "setScore"
  | "setLoading"
  | "setModalOpen"
  | "setIsActionLoading"
  | "setActionError"
  | "setViewedTooltip"
  | "setNeedsSync"
  | "setStepCompletion"
  | "resetState"
  | "clearAllProblems"
  | "getProblemState"
  | "ensureProblemState"
> = {
  problems: {},
  loading: true,
  isModalOpen: false,
  isActionLoading: false,
  actionError: null,
};

export const stepStateStore = create<StepStateStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Helper to get or initialize problem state.
      // Pure read — returns defaults without calling set() so it's safe inside selectors.
      // The actual write to the store happens lazily on the first action call.
      getProblemState: (slug: string): ProblemState => {
        const state = get();
        const problemState = state.problems[slug];

        if (!problemState) {
          return createInitialProblemState();
        }

        // Migrate old problem state if fields are missing
        let migrated = problemState;
        if (!problemState.viewedTooltips) {
          migrated = { ...migrated, viewedTooltips: [] };
        }
        if (problemState.needsSync === undefined) {
          migrated = { ...migrated, needsSync: false };
        }
        if (!problemState.stepCompletion) {
          migrated = { ...migrated, stepCompletion: {} };
        }

        return migrated;
      },

      // Ensure a problem slug is initialized in the store (call from effects, not selectors)
      ensureProblemState: (slug: string) => {
        const state = get();
        if (!state.problems[slug]) {
          set({
            problems: {
              ...state.problems,
              [slug]: createInitialProblemState(),
            },
          });
        } else {
          // Migrate existing state if needed
          let needsUpdate = false;
          let updated = state.problems[slug];
          if (!updated.viewedTooltips) {
            updated = { ...updated, viewedTooltips: [] };
            needsUpdate = true;
          }
          if (updated.needsSync === undefined) {
            updated = { ...updated, needsSync: false };
            needsUpdate = true;
          }
          if (!updated.stepCompletion) {
            updated = { ...updated, stepCompletion: {} };
            needsUpdate = true;
          }
          if (needsUpdate) {
            set({
              problems: {
                ...state.problems,
                [slug]: updated,
              },
            });
          }
        }
      },

      setFunctionalRequirements: (slug: string, data: Partial<FunctionalRequirements>) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              functionalRequirements: { ...problemState.functionalRequirements, ...data },
            },
          },
        });
      },

      setNonFunctionalRequirements: (slug: string, data: Partial<NonFunctionalRequirements>) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              nonFunctionalRequirements: { ...problemState.nonFunctionalRequirements, ...data },
            },
          },
        });
      },

      setApiDesign: (slug: string, data: Partial<ApiDesign>) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              apiDesign: { ...problemState.apiDesign, ...data },
            },
          },
        });
      },

      setHighLevelDesign: (slug: string, data: Partial<HighLevelDesign>) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              highLevelDesign: { ...problemState.highLevelDesign, ...data },
            },
          },
        });
      },

      setScore: (slug: string, data: Partial<Score>) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              score: { ...problemState.score, ...data },
            },
          },
        });
      },

      setLoading: (loading) => set({ loading }),

      setModalOpen: (isOpen) => {
        set({ isModalOpen: isOpen });
      },

      setIsActionLoading: (isLoading) => set({ isActionLoading: isLoading }),

      setActionError: (error) => set({ actionError: error }),

      setViewedTooltip: (slug: string, stepType: string) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        const viewedTooltips = [...(problemState.viewedTooltips || [])];

        // Add stepType if not already present
        if (!viewedTooltips.includes(stepType)) {
          viewedTooltips.push(stepType);
        }

        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              viewedTooltips,
            },
          },
        });
      },

      setNeedsSync: (slug: string, needsSync: boolean) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              needsSync,
            },
          },
        });
      },

      setStepCompletion: (slug: string, stepType: string, completed: boolean) => {
        const state = get();
        const problemState = state.getProblemState(slug);
        set({
          problems: {
            ...state.problems,
            [slug]: {
              ...problemState,
              stepCompletion: {
                ...problemState.stepCompletion,
                [stepType]: completed,
              },
            },
          },
        });
      },

      resetState: (slug: string) => {
        const state = get();
        set({
          problems: {
            ...state.problems,
            [slug]: createInitialProblemState(),
          },
        });
      },

      clearAllProblems: () => {
        set({ problems: {} });
      },
    }),
    {
      name: "practice-backend-problems-state",
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
      partialize: (state) => ({
        ...state,
        problems: Object.fromEntries(
          Object.entries(state.problems).map(([slug, problemState]) => [
            slug,
            {
              ...problemState,
              functionalRequirements: {
                ...problemState.functionalRequirements,
                attempts: undefined,
              },
              nonFunctionalRequirements: {
                ...problemState.nonFunctionalRequirements,
                attempts: undefined,
              },
              apiDesign: {
                ...problemState.apiDesign,
                attempts: undefined,
              },
              highLevelDesign: {
                ...problemState.highLevelDesign,
                attempts: undefined,
              },
            },
          ])
        ),
      }),
    }
  )
);
