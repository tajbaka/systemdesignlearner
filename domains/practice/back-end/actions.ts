/**
 * Consolidated API actions for practice problems.
 * Extend by adding new methods to the appropriate namespace.
 */

import type { SaveStepResponse } from "../lib/schemas/step-data";
import type {
  FunctionalRequirements,
  NonFunctionalRequirements,
  EndpointItem,
} from "./store/store";
import type { PracticeDesignState } from "./high-level-design/types";
import type { CachedExtractions } from "@/server/domains/practice/services/evaluation/types";
import { stepStateStore } from "./store/store";

type StepType = "functional" | "nonFunctional" | "api" | "highLevelDesign";

// ============================================================================
// Functional Requirements
// ============================================================================

const functional = {
  async save(slug: string, data: FunctionalRequirements): Promise<SaveStepResponse> {
    const response = await fetch(`/api/v2/practice/${slug}/functional`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save functional requirements");
    }

    return response.json();
  },

  async evaluate(slug: string, data: FunctionalRequirements) {
    const response = await fetch(`/api/v2/practice/${slug}/functional/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { textField: data.textField } }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Evaluation failed");
    }

    return response.json();
  },
};

// ============================================================================
// Non-Functional Requirements
// ============================================================================

const nonFunctional = {
  async save(slug: string, data: NonFunctionalRequirements): Promise<SaveStepResponse> {
    const response = await fetch(`/api/v2/practice/${slug}/nonFunctional`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save non-functional requirements");
    }

    return response.json();
  },

  async evaluate(slug: string, data: NonFunctionalRequirements) {
    const response = await fetch(`/api/v2/practice/${slug}/nonFunctional/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { textField: data.textField } }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Evaluation failed");
    }

    return response.json();
  },
};

// ============================================================================
// API Design
// ============================================================================

const api = {
  async save(slug: string, endpoints: EndpointItem[]): Promise<SaveStepResponse> {
    const response = await fetch(`/api/v2/practice/${slug}/api`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { endpoints } }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}) as { error?: string });
      throw new Error(error.error || "Failed to save API endpoints");
    }

    return response.json();
  },

  async evaluate(
    slug: string,
    endpoints: EndpointItem[],
    previousExtractions?: CachedExtractions,
    changedEndpointIds?: string[]
  ) {
    const normalizedEndpoints = endpoints.map((ep) => ({
      id: ep.id,
      method: { id: ep.method.id, value: ep.method.value },
      path: { id: ep.path.id, value: ep.path.value },
      description: { id: ep.description.id, value: ep.description.value },
    }));

    const response = await fetch(`/api/v2/practice/${slug}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { endpoints: normalizedEndpoints },
        previousExtractions,
        changedEndpointIds,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Evaluation failed");
    }

    return response.json();
  },
};

// ============================================================================
// High-Level Design
// ============================================================================

const highLevelDesign = {
  async save(slug: string, design: PracticeDesignState): Promise<SaveStepResponse> {
    const response = await fetch(`/api/v2/practice/${slug}/highLevelDesign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { design } }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save high-level design");
    }

    return response.json();
  },

  async evaluate(slug: string, design: PracticeDesignState | null) {
    const response = await fetch(`/api/v2/practice/${slug}/highLevelDesign/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { design } }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Evaluation failed");
    }

    return response.json();
  },
};

// ============================================================================
// Score
// ============================================================================

export type StepScore = {
  stepType: string;
  title: string;
  order: number;
  score: number;
  maxScore: number;
  completed: boolean;
};

export type ScoreResponse = {
  stepScores: StepScore[];
};

const score = {
  async get(slug: string): Promise<ScoreResponse> {
    const response = await fetch(`/api/v2/practice/${slug}/steps/evaluate`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch score");
    }

    return response.json();
  },
};

// ============================================================================
// Sync (bulk save cached evaluations after login)
// ============================================================================

// Keys that map step types to their problem state properties (only those with submission)
type StepDataKey =
  | "functionalRequirements"
  | "nonFunctionalRequirements"
  | "apiDesign"
  | "highLevelDesign";
const STEP_KEYS: Record<StepType, StepDataKey> = {
  functional: "functionalRequirements",
  nonFunctional: "nonFunctionalRequirements",
  api: "apiDesign",
  highLevelDesign: "highLevelDesign",
};

/**
 * Sync all cached step evaluations to the backend in a single request.
 * Called after user authenticates to persist their anonymous work.
 */
async function syncAll(slug: string): Promise<{ synced: number }> {
  const state = stepStateStore.getState();
  const problemState = state.problems[slug];

  if (!problemState) {
    console.log("[syncAll] No cached state for slug:", slug);
    return { synced: 0 };
  }

  const stepTypes: StepType[] = ["functional", "nonFunctional", "api", "highLevelDesign"];
  const steps: Array<{ stepType: StepType; evaluation: unknown; inputData: unknown }> = [];

  for (const stepType of stepTypes) {
    const stepKey = STEP_KEYS[stepType];
    const stepData = problemState[stepKey];

    if (stepData.submission) {
      // Extract input data based on step type
      let inputData: unknown;
      if (stepType === "functional" || stepType === "nonFunctional") {
        inputData = { textField: (stepData as { textField: unknown }).textField };
      } else if (stepType === "api") {
        inputData = { endpoints: (stepData as { endpoints: unknown }).endpoints };
      } else if (stepType === "highLevelDesign") {
        inputData = { design: (stepData as { design: unknown }).design };
      }

      steps.push({ stepType, evaluation: stepData.submission, inputData });
    }
  }

  if (steps.length === 0) {
    console.log("[syncAll] No evaluations to sync for slug:", slug);
    return { synced: 0 };
  }

  const response = await fetch(`/api/v2/practice/${slug}/steps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ steps }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to sync steps");
  }

  const result = await response.json();
  console.log("[syncAll] Successfully synced", result.synced, "steps for slug:", slug);
  return result;
}

// ============================================================================
// Consolidated Export
// ============================================================================

const practiceActions = {
  functional,
  nonFunctional,
  api,
  highLevelDesign,
  score,
  syncAll,
};

export default practiceActions;
