"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HttpMethod } from "../api-design/components/MethodSelect";
import type { PracticeDesignState } from "../high-level-design/types";
import type {
  EvaluationResult,
  APIEvaluationResult,
} from "@/app/api/v2/practice/(evaluation)/types";

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
};

export interface StepStateStoreState {
  loading: boolean;
  // Nested problems state indexed by slug
  problems: Record<string, ProblemState>;

  // Global modal state (not scoped to problem)
  isModalOpen: boolean;
  isActionLoading: boolean;

  // Actions - now require slug parameter
  setFunctionalRequirements: (slug: string, data: Partial<FunctionalRequirements>) => void;
  setNonFunctionalRequirements: (slug: string, data: Partial<NonFunctionalRequirements>) => void;
  setApiDesign: (slug: string, data: Partial<ApiDesign>) => void;
  setHighLevelDesign: (slug: string, data: Partial<HighLevelDesign>) => void;
  setScore: (slug: string, data: Partial<Score>) => void;

  setLoading: (loading: boolean) => void;
  setModalOpen: (isOpen: boolean) => void;
  setIsActionLoading: (isLoading: boolean) => void;
  setViewedTooltip: (slug: string, stepType: string) => void;
  resetState: (slug: string) => void;

  // Helper to get or initialize problem state
  getProblemState: (slug: string) => ProblemState;
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
  | "setViewedTooltip"
  | "resetState"
  | "getProblemState"
> = {
  problems: {},
  loading: true,
  isModalOpen: false,
  isActionLoading: false,
};

export const stepStateStore = create<StepStateStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Helper to get or initialize problem state
      getProblemState: (slug: string): ProblemState => {
        const state = get();
        if (!state.problems[slug]) {
          // Initialize new problem state
          set({
            problems: {
              ...state.problems,
              [slug]: createInitialProblemState(),
            },
          });
          return get().problems[slug];
        }

        // Migrate old problem state if viewedTooltips is missing
        const problemState = state.problems[slug];
        if (!problemState.viewedTooltips) {
          const migratedState = {
            ...problemState,
            viewedTooltips: [],
          };
          set({
            problems: {
              ...state.problems,
              [slug]: migratedState,
            },
          });
          return migratedState;
        }

        return problemState;
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

      resetState: (slug: string) => {
        const state = get();
        set({
          problems: {
            ...state.problems,
            [slug]: createInitialProblemState(),
          },
        });
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
                attempts: undefined, // Don't persist attempts
              },
              nonFunctionalRequirements: {
                ...problemState.nonFunctionalRequirements,
                attempts: undefined, // Don't persist attempts
              },
              apiDesign: {
                ...problemState.apiDesign,
                attempts: undefined, // Don't persist attempts
              },
              highLevelDesign: {
                ...problemState.highLevelDesign,
                attempts: undefined, // Don't persist attempts
              },
            },
          ])
        ),
      }),
    }
  )
);
