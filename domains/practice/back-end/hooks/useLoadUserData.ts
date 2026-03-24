import { useEffect, useRef } from "react";
import type { ProblemStepWithUserStep } from "@/app/api/v2/practice/schemas";
import { stepStateStore } from "../store/store";
import type { EndpointItem } from "../store/store";
import type { PracticeDesignState } from "../high-level-design/types";
import type { HttpMethod } from "../api-design/components/MethodSelect";
import { STEPS } from "../constants";

type StepDataLoader = (
  slug: string,
  userStepData: Record<string, unknown>,
  state: ReturnType<typeof stepStateStore.getState>
) => void;

/**
 * Map of step types to their data loader functions
 */
const stepDataLoaders: Record<string, StepDataLoader> = {
  [STEPS.FUNCTIONAL]: (slug, userStepData, state) => {
    // Data format: the entire functionalRequirements object with textField, submission, attempts
    const functionalData = userStepData as {
      textField?: { id: string; value: string };
      submission?: unknown;
      attempts?: number;
    };
    if (functionalData.textField) {
      state.setFunctionalRequirements(slug, {
        textField: functionalData.textField,
        // Don't load submission/attempts - user should re-evaluate
      });
    }
  },

  [STEPS.NON_FUNCTIONAL]: (slug, userStepData, state) => {
    // Data format: the entire nonFunctionalRequirements object with textField, submission, attempts
    const nonFunctionalData = userStepData as {
      textField?: { id: string; value: string };
      submission?: unknown;
      attempts?: number;
    };
    if (nonFunctionalData.textField) {
      state.setNonFunctionalRequirements(slug, {
        textField: nonFunctionalData.textField,
        // Don't load submission/attempts - user should re-evaluate
      });
    }
  },

  [STEPS.API]: (slug, userStepData, state) => {
    // Data format: { endpoints: [...] }
    const apiData = userStepData as {
      endpoints?: Array<{
        id: string;
        value: string;
        method: { id: string; value: string };
        path: { id: string; value: string };
        description: { id: string; value: string };
      }>;
    };
    if (apiData.endpoints && Array.isArray(apiData.endpoints)) {
      const endpoints: EndpointItem[] = apiData.endpoints.map((ep) => ({
        id: ep.id,
        value: ep.value,
        method: {
          id: ep.method.id,
          value: ep.method.value as HttpMethod,
        },
        path: {
          id: ep.path.id,
          value: ep.path.value,
        },
        description: {
          id: ep.description.id,
          value: ep.description.value,
        },
      }));
      state.setApiDesign(slug, { endpoints });
    }
  },

  [STEPS.HIGH_LEVEL_DESIGN]: (slug, userStepData, state) => {
    // Data format: { design: {...} }
    const hldData = userStepData as {
      design?: PracticeDesignState;
    };
    if (hldData.design) {
      state.setHighLevelDesign(slug, { design: hldData.design });
    }
  },
};

/**
 * Hook that loads saved user input data from the database into the store
 * This runs once when the component mounts with the fetched data
 *
 * Note: This will override localStorage data with database data if it exists.
 * For unauthenticated users, no database data will be loaded and localStorage
 * data (from persist middleware) will remain intact.
 */
export function useLoadUserData(slug: string, steps: ProblemStepWithUserStep[]) {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Only load once per slug
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    // Get the store state
    const state = stepStateStore.getState();

    // Iterate through each step and load user data if it exists
    for (const step of steps) {
      const userStepData = step.userStep?.data as Record<string, unknown> | null;
      if (!userStepData) continue;

      // Get the loader function for this step type
      const loader = stepDataLoaders[step.stepType];
      if (loader) {
        loader(slug, userStepData, state);
      }
    }

    // Mark loading as complete - this ensures loading is false after both
    // localStorage rehydration and database loading are complete
    state.setLoading(false);
  }, [slug, steps]);
}
